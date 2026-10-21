import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseFinancialReportRepository } from "@/infrastructure/supabase/supabase-financial-report-repository";
import { generateWardFinancialReport } from "@/use-cases/reports/generate-ward-financial-report";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wardId = searchParams.get("wardId");
  const caravanId = searchParams.get("caravanId") || undefined;
  const format = (searchParams.get("format") || "csv") as "csv" | "pdf";

  if (!wardId) {
    return NextResponse.json({ error: "wardId obrigatório." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const role = userData.user.app_metadata?.role;
  const userWardId = userData.user.app_metadata?.ward_id;

  // Admin Ala só acessa a própria Ala; Admin Estaca acessa qualquer Ala de sua Estaca
  if (role === "admin_ala" && userWardId !== wardId) {
    return NextResponse.json(
      { error: "Acesso negado: você não pode exportar relatórios de outra Ala." },
      { status: 403 }
    );
  }

  if (role !== "admin_ala" && role !== "admin_estaca") {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  try {
    const repository = new SupabaseFinancialReportRepository(supabase);
    const buffer = await generateWardFinancialReport(
      { wardId, caravanId, format },
      { repository }
    );

    const filename = `relatorio-ala-${wardId.substring(0, 8)}.${format}`;
    const contentType = format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao gerar relatório.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
