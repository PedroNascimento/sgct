import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseFinancialReportRepository } from "@/infrastructure/supabase/supabase-financial-report-repository";
import { generateStakeFinancialReport } from "@/use-cases/reports/generate-stake-financial-report";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stakeId = searchParams.get("stakeId");
  const caravanId = searchParams.get("caravanId") || undefined;
  const format = (searchParams.get("format") || "csv") as "csv" | "pdf";

  if (!stakeId) {
    return NextResponse.json({ error: "stakeId obrigatório." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const role = userData.user.app_metadata?.role;
  const userStakeId = userData.user.app_metadata?.stake_id;

  // Admin Estaca só acessa a própria Estaca
  if (role !== "admin_estaca" || userStakeId !== stakeId) {
    return NextResponse.json(
      { error: "Acesso negado: apenas o administrador da Estaca pode exportar relatórios consolidados." },
      { status: 403 }
    );
  }

  try {
    const repository = new SupabaseFinancialReportRepository(supabase);
    const buffer = await generateStakeFinancialReport(
      { stakeId, caravanId, format },
      { repository }
    );

    const filename = `relatorio-consolidado-estaca-${stakeId.substring(0, 8)}.${format}`;
    const contentType = format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao gerar relatório consolidado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
