"use client";

import React, { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  X,
  Loader2,
} from "lucide-react";

export type FeedbackModalType = "error" | "warning" | "info" | "success" | "confirm";
export type ConfirmVariant = "danger" | "warning" | "primary";

export interface FeedbackModalOptions {
  type?: FeedbackModalType;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ConfirmVariant;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface FeedbackModalProps extends FeedbackModalOptions {
  isOpen: boolean;
  onClose: () => void;
  isPending?: boolean;
}

const emptySubscribe = () => () => {};

export function FeedbackModal({
  isOpen,
  type = "info",
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  onClose,
  isPending = false,
}: FeedbackModalProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Travar o scroll do body enquanto o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPending) {
        if (onCancel) onCancel();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isPending, onCancel, onClose]);

  if (!isOpen || !isMounted || typeof document === "undefined") {
    return null;
  }

  const isConfirm = type === "confirm";

  // Configuração visual por tipo
  const typeConfig = {
    error: {
      badgeBg: "bg-danger-50 text-danger-600 ring-danger-200",
      icon: AlertCircle,
      defaultConfirm: "Entendido",
      buttonClass: "inline-flex min-h-11 items-center justify-center rounded-xl bg-danger-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-danger-700 transition-colors disabled:opacity-50",
    },
    warning: {
      badgeBg: "bg-warning-50 text-warning-700 ring-warning-200",
      icon: AlertTriangle,
      defaultConfirm: "Entendido",
      buttonClass: "inline-flex min-h-11 items-center justify-center rounded-xl bg-warning-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-warning-700 transition-colors disabled:opacity-50",
    },
    info: {
      badgeBg: "bg-brand-50 text-brand-700 ring-brand-200",
      icon: Info,
      defaultConfirm: "OK",
      buttonClass: "sgct-button-primary",
    },
    success: {
      badgeBg: "bg-success-50 text-success-700 ring-success-200",
      icon: CheckCircle2,
      defaultConfirm: "Concluído",
      buttonClass: "inline-flex min-h-11 items-center justify-center rounded-xl bg-success-700 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-success-800 transition-colors disabled:opacity-50",
    },
    confirm: {
      badgeBg:
        confirmVariant === "danger"
          ? "bg-danger-50 text-danger-600 ring-danger-200"
          : confirmVariant === "warning"
          ? "bg-warning-50 text-warning-700 ring-warning-200"
          : "bg-brand-50 text-brand-700 ring-brand-200",
      icon:
        confirmVariant === "danger"
          ? AlertTriangle
          : confirmVariant === "warning"
          ? AlertTriangle
          : HelpCircle,
      defaultConfirm: "Confirmar",
      buttonClass:
        confirmVariant === "danger"
          ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-danger-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-danger-700 transition-colors disabled:opacity-50"
          : confirmVariant === "warning"
          ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-warning-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-warning-700 transition-colors disabled:opacity-50"
          : "sgct-button-primary",
    },
  }[type];

  const Icon = typeConfig.icon;

  const handleConfirmClick = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return createPortal(
    <div
      role={isConfirm || type === "error" || type === "warning" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      aria-describedby="feedback-modal-desc"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          handleCancelClick();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#e0e2e2] my-auto animate-in zoom-in-95 duration-200">
        {/* Botão de Fechar no canto superior direito */}
        {!isPending && (
          <button
            type="button"
            onClick={handleCancelClick}
            aria-label="Fechar"
            className="absolute top-4 right-4 rounded-lg p-1.5 text-[#707478] hover:bg-[#eff0f0] hover:text-[#212225] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Ícone e Conteúdo */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 mb-4 shrink-0 ${typeConfig.badgeBg}`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>

          <h3 id="feedback-modal-title" className="text-xl font-bold text-[#212225] w-full">
            {title}
          </h3>

          <div
            id="feedback-modal-desc"
            className="mt-2 text-sm text-[#53575b] leading-relaxed whitespace-pre-line w-full"
          >
            {message}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-[#e0e2e2]">
          {isConfirm && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancelClick}
              className="sgct-button-secondary w-full sm:w-auto min-h-11"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirmClick}
            className={`${typeConfig.buttonClass} w-full sm:w-auto min-h-11`}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel || typeConfig.defaultConfirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook para gerenciar e renderizar FeedbackModals com facilidade e zero boilerplate.
 */
export function useFeedbackModal() {
  const [modalState, setModalState] = useState<
    FeedbackModalOptions & { isOpen: boolean; isPending?: boolean }
  >({
    isOpen: false,
    title: "",
    message: "",
  });

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false, isPending: false }));
  }, []);

  const showConfirm = useCallback(
    (options: {
      title: string;
      message: React.ReactNode;
      confirmLabel?: string;
      cancelLabel?: string;
      confirmVariant?: ConfirmVariant;
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
    }) => {
      setModalState({
        isOpen: true,
        type: "confirm",
        isPending: false,
        ...options,
        onConfirm: async () => {
          try {
            setModalState((prev) => ({ ...prev, isPending: true }));
            await options.onConfirm();
            closeModal();
          } catch (err: unknown) {
            setModalState({
              isOpen: true,
              type: "error",
              isPending: false,
              title: "Erro na operação",
              message: err instanceof Error ? err.message : "Ocorreu um erro ao processar a ação.",
              confirmLabel: "Fechar",
            });
          }
        },
      });
    },
    [closeModal]
  );

  const showError = useCallback(
    (
      options:
        | {
            title?: string;
            message: React.ReactNode;
            confirmLabel?: string;
            onConfirm?: () => void;
          }
        | string
    ) => {
      if (typeof options === "string") {
        setModalState({
          isOpen: true,
          type: "error",
          isPending: false,
          title: "Atenção / Erro",
          message: options,
        });
      } else {
        setModalState({
          isOpen: true,
          type: "error",
          isPending: false,
          title: options.title || "Ocorreu um erro",
          message: options.message,
          confirmLabel: options.confirmLabel,
          onConfirm: options.onConfirm,
        });
      }
    },
    []
  );

  const showWarning = useCallback(
    (
      options:
        | {
            title?: string;
            message: React.ReactNode;
            confirmLabel?: string;
            onConfirm?: () => void;
          }
        | string
    ) => {
      if (typeof options === "string") {
        setModalState({
          isOpen: true,
          type: "warning",
          isPending: false,
          title: "Aviso",
          message: options,
        });
      } else {
        setModalState({
          isOpen: true,
          type: "warning",
          isPending: false,
          title: options.title || "Aviso",
          message: options.message,
          confirmLabel: options.confirmLabel,
          onConfirm: options.onConfirm,
        });
      }
    },
    []
  );

  const showSuccess = useCallback(
    (
      options:
        | {
            title?: string;
            message: React.ReactNode;
            confirmLabel?: string;
            onConfirm?: () => void;
          }
        | string
    ) => {
      if (typeof options === "string") {
        setModalState({
          isOpen: true,
          type: "success",
          isPending: false,
          title: "Sucesso!",
          message: options,
        });
      } else {
        setModalState({
          isOpen: true,
          type: "success",
          isPending: false,
          title: options.title || "Sucesso!",
          message: options.message,
          confirmLabel: options.confirmLabel,
          onConfirm: options.onConfirm,
        });
      }
    },
    []
  );

  const feedbackModal = (
    <FeedbackModal
      isOpen={modalState.isOpen}
      type={modalState.type}
      title={modalState.title}
      message={modalState.message}
      confirmLabel={modalState.confirmLabel}
      cancelLabel={modalState.cancelLabel}
      confirmVariant={modalState.confirmVariant}
      onConfirm={modalState.onConfirm}
      onCancel={modalState.onCancel}
      onClose={closeModal}
      isPending={modalState.isPending}
    />
  );

  return {
    feedbackModal,
    showConfirm,
    showError,
    showWarning,
    showSuccess,
    showAlert: showWarning,
    closeModal,
  };
}
