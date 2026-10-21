"use client";

import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { CheckInDirection } from "@/domain/types/checkin";
import type { CheckInPassengerInfo } from "@/domain/interfaces/checkin-repository";
import {
  validateCheckInAction,
  syncOfflineCheckInsAction,
  loadCaravanCheckInTokensAction,
  exportPassengerManifestCsvAction,
  markNoShowsAction,
} from "@/app/(admin)/[estaca_slug]/estaca/checkin/actions";
import {
  cacheValidTokens,
  getCachedValidTokens,
  savePendingCheckIn,
  getPendingCheckIns,
  removePendingCheckIns,
  getPendingCheckInsCount,
} from "@/infrastructure/storage/checkin-offline-db";

interface QrCodeScannerProps {
  caravanId: string;
  initialDirection?: CheckInDirection;
}

export function QrCodeScanner({
  caravanId,
  initialDirection = "ida",
}: QrCodeScannerProps) {
  const [direction, setDirection] = useState<CheckInDirection>(initialDirection);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastPassenger, setLastPassenger] = useState<{
    name?: string;
    seat?: number;
    ward?: string;
    status: "success" | "duplicate" | "error" | "offline";
    message: string;
  } | null>(null);

  const [cachedPassengerCount, setCachedPassengerCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCaching, setIsCaching] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Carrega contagens locais do IndexedDB para a caravana atual (A08)
    getPendingCheckInsCount(caravanId)
      .then(setPendingCount)
      .catch(() => {});
    getCachedValidTokens(caravanId)
      .then((tokens) => setCachedPassengerCount(tokens.length))
      .catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [caravanId]);

  const handleStartScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          await processScannedToken(decodedText);
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 1500);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: unknown) {
      setLastPassenger({
        status: "error",
        message:
          "Não foi possível acessar a câmera. Verifique as permissões de acesso ao dispositivo.",
      });
    }
  };

  const handleStopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const processScannedToken = async (token: string) => {
    // 1. Modo Online
    if (navigator.onLine) {
      try {
        const result = await validateCheckInAction(token, direction);
        if (result.success) {
          // Busca dados amigáveis se tiver em cache
          const cached = await getCachedValidTokens().catch(() => []);
          const match = cached.find((c) => c.token === token);

          setLastPassenger({
            name: match?.passengerName,
            seat: match?.seatNumber,
            ward: match?.wardName,
            status: "success",
            message: `Check-in de ${direction.toUpperCase()} confirmado com sucesso!`,
          });
        } else {
          setLastPassenger({
            status: "error",
            message: result.error || "Erro ao validar QR Code.",
          });
        }
      } catch (err: unknown) {
        // Se falhou por queda súbita de rede, tenta fallback offline
        await handleOfflineCheckIn(token);
      }
    } else {
      // 2. Modo Offline
      await handleOfflineCheckIn(token);
    }
  };

  const handleOfflineCheckIn = async (token: string) => {
    try {
      const cached = await getCachedValidTokens(caravanId);
      const match = cached.find((c) => c.token === token);

      if (!match) {
        setLastPassenger({
          status: "error",
          message: "QR Code não reconhecido nesta caravana. Certifique-se de que o passageiro está confirmado e o cache atualizado.",
        });
        return;
      }

      await savePendingCheckIn(
        {
          token,
          direction,
          checkedInBy: "local-leader",
          checkedInAt: new Date().toISOString(),
        },
        caravanId
      );

      const count = await getPendingCheckInsCount(caravanId);
      setPendingCount(count);

      setLastPassenger({
        name: match.passengerName,
        seat: match.seatNumber,
        ward: match.wardName,
        status: "offline",
        message: `Check-in de ${direction.toUpperCase()} gravado OFFLINE. Sincronize ao obter sinal.`,
      });
    } catch (err: unknown) {
      setLastPassenger({
        status: "error",
        message: "Erro ao gravar check-in offline no armazenamento local.",
      });
    }
  };

  const handleSyncOffline = async () => {
    if (!navigator.onLine) {
      alert("Dispositivo ainda está sem conexão com a internet.");
      return;
    }

    setIsSyncing(true);
    try {
      const pending = await getPendingCheckIns(caravanId);
      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      const result = await syncOfflineCheckInsAction(pending);
      if (result.success && result.data) {
        const processedTokens = result.data.results
          .filter((r) => r.status === "synced" || r.status === "duplicate")
          .map((r) => r.token);

        // Remove do IndexedDB apenas os itens confirmados ou duplicatas (A08)
        await removePendingCheckIns(processedTokens, caravanId);
        const count = await getPendingCheckInsCount(caravanId);
        setPendingCount(count);

        if (result.data.failedCount > 0) {
          setLastPassenger({
            status: "error",
            message: `Sincronização parcial: ${result.data.syncedCount} check-ins gravados, ${result.data.duplicateCount} duplicados ignorados e ${result.data.failedCount} pendências falharam e permaneceram no aparelho.`,
          });
        } else {
          setLastPassenger({
            status: "success",
            message: `Sincronização concluída! ${result.data.syncedCount} novos check-ins gravados (${result.data.duplicateCount} duplicados ignorados).`,
          });
        }
      } else {
        alert(result.error || "Erro ao sincronizar check-ins pendentes.");
      }
    } catch (err: unknown) {
      alert("Falha na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadOfflineCache = async () => {
    setIsCaching(true);
    try {
      const result = await loadCaravanCheckInTokensAction(caravanId);
      if (result.success && result.data) {
        await cacheValidTokens(result.data as CheckInPassengerInfo[], caravanId);
        setCachedPassengerCount(result.data.length);
        alert(
          `Sucesso! ${result.data.length} passageiros confirmados carregados para uso offline durante o embarque.`
        );
      } else {
        alert(result.error || "Não foi possível carregar os passageiros.");
      }
    } catch {
      alert("Erro ao baixar dados para uso offline.");
    } finally {
      setIsCaching(false);
    }
  };

  const handleDownloadManifestCsv = async () => {
    try {
      const result = await exportPassengerManifestCsvAction(caravanId);
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `manifesto-caravana-${caravanId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(result.error || "Não foi possível gerar o manifesto.");
      }
    } catch {
      alert("Erro ao exportar o manifesto em CSV.");
    }
  };

  const handleMarkNoShows = async () => {
    if (
      !confirm(
        "Atenção: Tem certeza de que deseja encerrar o embarque de IDA? Passageiros confirmados sem check-in serão marcados como NO-SHOW (sem crédito automático)."
      )
    ) {
      return;
    }

    try {
      const result = await markNoShowsAction(caravanId);
      if (result.success && result.data) {
        alert(
          `Embarque encerrado com sucesso! ${result.data.markedCount} passageiro(s) marcado(s) como NO-SHOW.`
        );
      } else {
        alert(result.error || "Erro ao encerrar embarque.");
      }
    } catch {
      alert("Falha ao registrar no-shows.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Status e Controles */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#e0e2e2] bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <div>
            <span className="font-bold text-[#212225]">
              {isOnline ? "Conexão Ativa (Online)" : "Modo Offline (Sem Internet)"}
            </span>
            <p className="text-xs text-[#53575b]">
              {cachedPassengerCount > 0
                ? `${cachedPassengerCount} passageiros cacheados localmente.`
                : "Nenhum dado cacheado para uso sem internet."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleSyncOffline}
              disabled={isSyncing}
              className="sgct-button-primary bg-amber-600 hover:bg-amber-700 text-xs px-3 py-1.5"
            >
              {isSyncing
                ? "Sincronizando..."
                : `Sincronizar Pendências (${pendingCount})`}
            </button>
          )}

          <button
            onClick={handleDownloadOfflineCache}
            disabled={isCaching || !isOnline}
            className="sgct-button-secondary text-xs px-3 py-1.5"
            title="Baixar lista de passageiros confirmados para validar mesmo sem internet"
          >
            {isCaching ? "Baixando..." : "Atualizar Cache Offline"}
          </button>

          <button
            onClick={handleDownloadManifestCsv}
            disabled={!isOnline}
            className="sgct-button-secondary text-xs px-3 py-1.5"
            title="Exportar lista consolidada de passageiros (incluindo crianças de colo) para ANTT/DER"
          >
            Exportar Manifesto (CSV)
          </button>

          <button
            onClick={handleMarkNoShows}
            disabled={!isOnline}
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
            title="Encerrar embarque e marcar no-show para quem não compareceu"
          >
            Encerrar Embarque
          </button>
        </div>
      </div>

      {/* Seletor de Direção: Ida vs Volta */}
      <div className="flex rounded-xl border border-[#e0e2e2] bg-[#f7f8f8] p-1.5 text-center">
        <button
          type="button"
          onClick={() => setDirection("ida")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
            direction === "ida"
              ? "bg-brand-700 text-white shadow-sm"
              : "text-[#53575b] hover:text-[#212225]"
          }`}
        >
          Embarque de Ida (Templo)
        </button>
        <button
          type="button"
          onClick={() => setDirection("volta")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
            direction === "volta"
              ? "bg-brand-700 text-white shadow-sm"
              : "text-[#53575b] hover:text-[#212225]"
          }`}
        >
          Embarque de Volta (Retorno)
        </button>
      </div>

      {/* Área da Câmera / Scanner */}
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border-2 border-[#bdc0c0] bg-black p-2 shadow-card">
        <div id="reader" className="w-full min-h-[280px]" />

        {!isScanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 p-6 text-center text-white backdrop-blur-sm">
            <p className="mb-4 text-sm font-medium text-slate-200">
              Aponte a câmera para o QR Code no celular do passageiro ou comprovante impresso.
            </p>
            <button
              onClick={handleStartScanner}
              className="sgct-button-primary bg-brand-600 hover:bg-brand-500"
            >
              Ativar Câmera e Escanear
            </button>
          </div>
        ) : (
          <div className="mt-2 text-center">
            <button
              onClick={handleStopScanner}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Pausar Leitura
            </button>
          </div>
        )}
      </div>

      {/* Painel de Feedback da Última Leitura */}
      {lastPassenger && (
        <div
          role="status"
          className={`rounded-xl border p-5 transition-all ${
            lastPassenger.status === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : lastPassenger.status === "offline"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {lastPassenger.status === "success"
                  ? "✓ Presença Confirmada"
                  : lastPassenger.status === "offline"
                  ? "⏳ Salvo no Dispositivo"
                  : "⚠ Atenção"}
              </p>
              <h4 className="mt-1 text-lg font-bold">
                {lastPassenger.name || "Passageiro"}
              </h4>
              {lastPassenger.seat && (
                <p className="text-sm font-semibold">
                  Poltrona {lastPassenger.seat} • {lastPassenger.ward}
                </p>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm">{lastPassenger.message}</p>
        </div>
      )}
    </div>
  );
}
