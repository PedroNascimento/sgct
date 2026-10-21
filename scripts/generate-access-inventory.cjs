const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}
const relative = (file) => path.relative(root, file).split(path.sep).join("/");
const tests = files(path.join(root, "src")).filter((file) => /\.test\.tsx?$/.test(file)).map((file) => ({ file: relative(file), source: fs.readFileSync(file, "utf8") }));
const roles = {
  signInAction: "Público; validação e antiabuso", signOutAction: "Própria sessão", superAdminSignOutAction: "Própria sessão",
  createStakeAction: "Super Admin", searchMemberByEmailForPromotion: "Super Admin; lookup mínimo dirigido", promoteToStakeAdminAction: "Super Admin; member existente na Estaca alvo", getStakesList: "Super Admin", getAdminsList: "Super Admin; somente contexto mínimo de administração", toggleAdminStatusAction: "Restrito à autoridade aprovada; revisar A01/A16", updateAdminRoleAction: "Super Admin; transições aprovadas, sem UPDATE genérico", toggleStakeStatusAction: "Gestão de Estaca; revisar escopo formal antes de ampliar",
  searchMemberForWardAdminPromotion: "Admin Estaca; lookup na própria Estaca", promoteToWardAdminAction: "Admin Estaca; member/Ala da própria Estaca", createCaravanAction: "Admin Estaca; própria Estaca", updateCaravanStatusAction: "Admin Estaca; própria Estaca", editCaravanAction: "Admin Estaca; própria Estaca", confirmWardPaymentAction: "Admin Ala/Estaca conforme spec 004; sem autoaprovação", validateWeeklyTransfersAction: "Admin Estaca; própria Estaca", confirmSingleTransferAction: "Admin Estaca; própria Estaca", rejectTransferAction: "Admin Estaca; própria Estaca", getEstacaMembersList: "Admin Estaca; própria Estaca, dados mínimos", demoteWardAdminAction: "Admin Estaca; Admin Ala da própria Estaca", promoteWardMemberAction: "Admin Estaca; somente promoção a Admin Ala", toggleWardMemberStatusAction: "Admin Estaca; própria Estaca, revisar sessões", createWardAction: "Admin Estaca; própria Estaca", updateWardAction: "Admin Estaca; própria Estaca", toggleWardStatusAction: "Admin Estaca; própria Estaca", deleteWardAction: "Admin Estaca; própria Estaca e integridade de vínculos", getWardsWithStats: "Admin Estaca; própria Estaca", registerSeatSwapAction: "Admin Estaca ou líder designado conforme spec 005", approveSeatSwapAction: "Admin Estaca ou líder designado conforme spec 005", evaluateMinorFormAction: "Admin Ala/Estaca do documento; auditoria obrigatória", getMinorDocumentViewUrlAction: "Admin Ala/Estaca do documento; leitura auditada", approveAidAction: "Admin Ala/Estaca conforme spec 012", rejectAidAction: "Admin Ala/Estaca conforme spec 012", confirmGuestTransferAction: "Admin Estaca anfitrião; nunca Admin Ala",
  registerMemberAction: "Público; autocadastro na Estaca do slug", registerMinorAction: "Público; 12–17 anos e consentimento", registerGuestAction: "Público; autocadastro guest na anfitriã", submitLgpdRequest: "Público; solicitação limitada e antiabuso", createReservationAction: "Titular ativo; própria Estaca", createGuestReservationAction: "Guest ativo; Estaca anfitriã", addManifestEntryAction: "Titular da reserva", uploadMinorApprovalFormAction: "Titular da reserva; Storage/registro consistentes", updateOwnProfileAction: "Próprio perfil; sem campos de segurança", requestCheckInTokenAction: "Titular confirmado e elegível",
  validateCheckInAction: "Líder/ator autorizado para a caravana", syncOfflineCheckInsAction: "Líder/ator autorizado para a caravana", loadCaravanCheckInTokensAction: "Líder/ator autorizado para a caravana", markNoShowsAction: "Ator autorizado; embarque encerrado", grantExceptionalCreditAction: "Admin Ala conforme spec 007; auditado", getPassengerManifestAction: "Líder/ator autorizado para a caravana", exportPassengerManifestCsvAction: "Líder/ator autorizado para a caravana",
};
const rows = [];
const pages = [];
for (const file of files(path.join(root, "src/app")).sort()) {
  if (path.basename(file) === "page.tsx") pages.push(relative(file));
  if (!["actions.ts", "auth-actions.ts", "route.ts"].includes(path.basename(file))) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  for (const node of source.statements) {
    if (!ts.isFunctionDeclaration(node) || !node.name || !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const name = node.name.text;
    const rel = relative(file);
    const actor = rel.includes("/api/cron/") ? "Job autenticado por CRON_SECRET" : rel.includes("/api/reports/stake/") ? "Admin Estaca; própria Estaca" : rel.includes("/api/reports/ward/") ? "Admin Ala/Estaca conforme escopo da spec 009" : roles[name];
    if (!actor) throw new Error(`Fronteira sem classificação: ${rel}#${name}`);
    const refs = tests.filter((test) => new RegExp("\\b" + name + "\\b").test(test.source)).map((test) => test.file);
    rows.push(`| ${rel} :: ${name} | ${actor} | ${refs.length ? refs.map((ref) => "\u0060" + ref + "\u0060").join("<br>") : "Sem referência nominal localizada; adicionar teste direto"} |`);
  }
}
const sql = new Map();
const privileges = [];
const rls = [];
function sqlActor(key) {
  if (/process_waitlist_atomic_promotion/.test(key)) return "Transação autorizada; anon proibido (C01)";
  if (/get_public_|get_seat_occupancy|v_seat_occupancy/.test(key)) return "Projeção pública mínima; sem campos sensíveis";
  if (/minor_approval_forms|storage.objects/.test(key)) return "Titular envia; Admin Ala/Estaca autorizados leem com auditoria";
  if (/guest_transfer/.test(key)) return "Somente Admin Estaca anfitrião; nunca Admin Ala";
  if (/profiles/.test(key) && !/function|trigger/.test(key)) return "Próprio perfil/admin no escopo; lookup mínimo II.f";
  if (/audit_logs/.test(key)) return "Serviço grava; consulta administrativa no escopo";
  if (/rate_limit/.test(key)) return "Limiter interno; validar identidade/atomicidade (A14)";
  if (/notification/.test(key)) return "Worker interno; métricas Admin Estaca do tenant";
  if (/function|trigger/.test(key)) return /update_reservations_batch/.test(key) ? "Admin Estaca; transições autorizadas" : "Helper/trigger/hook interno; não RPC genérica";
  if (/stakes/.test(key)) return "Público: dados publicados; escrita Super Admin";
  if (/wards|caravans|boarding_points/.test(key)) return "Logística pública mínima; escrita Admin Estaca";
  if (/checkins/.test(key)) return "Liderança autorizada da caravana";
  if (/aid_requests/.test(key)) return "Admin Ala/Estaca conforme spec 012; nunca público";
  return "Titular/Admin Ala própria Ala/Admin Estaca; operação conforme spec; guest só anfitriã";
}
function sqlTestRefs(key) {
  const name = (key.split(" on ")[1] || key.split(" ")[1]).split(".").pop();
  const refs = tests.filter((item) => new RegExp("\\b" + name + "\\b").test(item.source)).map((item) => item.file);
  return refs.length ? refs.map((ref) => "\u0060" + ref + "\u0060").join("<br>") : "Sem referência nominal; regressão direta pendente";
}
for (const file of files(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/^\s*(?:grant\s|revoke\s|alter default privileges\s)[\s\S]*?;/gim)) {
    privileges.push("| " + relative(file) + ":" + source.slice(0, match.index).split("\n").length + " | \u0060" + match[0].trim().replace(/\s+/g, " ") + "\u0060 |");
  }
  source.split("\n").forEach((line, index) => {
    if (/^\s*alter table .*row level security/i.test(line)) rls.push("| " + relative(file) + ":" + (index + 1) + " | \u0060" + line.trim() + "\u0060 |");
  });
  const pattern = /^create\s+(?:or\s+replace\s+)?(function|policy|table|view|trigger)\s+(?:if\s+not\s+exists\s+)?([\w.]+)(?:\s+on\s+([\w.]+))?/gim;
  for (const match of source.matchAll(pattern)) {
    const key = match[1].toLowerCase() + " " + match[2] + (match[3] ? " on " + match[3] : "");
    sql.set(key, `${relative(file)}:${source.slice(0, match.index).split("\n").length}`);
  }
}
const jobs = files(path.join(root, "src/app/api/cron")).filter((f) => path.basename(f) === "route.ts").map(relative).sort();
const content = `# Inventário de fronteiras — baseline da Fase 01\n\nGerado por \u0060npm run inventory:access\u0060; para verificar deriva: \u0060npm run inventory:check\u0060. Esta lista estática é uma baseline de fontes, não certificação de autorização. Cada referência nominal de teste precisa de revisão de cenários/asserções; presença do nome não comprova cobertura. Novas funções exportadas nos arquivos de fronteira exigem classificação explícita.\n\n## Server Actions e métodos HTTP (${rows.length})\n\n| Fonte / export | Ator e escopo normativos (v4.0.0) | Referências nominais em testes, não aceite |\n|---|---|---|\n${rows.join("\n")}\n\n## Páginas e rotas de UI (${pages.length})\n\n${pages.map((p) => "- \u0060" + p + "\u0060").join("\n")}\n\nMiddleware: \u0060src/middleware.ts\u0060. Páginas/Server Actions precisam autorização própria; nomes de route groups não protegem APIs. Calendário público: nome/Ala permitidos; demais dados restritos (II.g).\n\n## Objetos SQL declarados (${sql.size})\n\nA última declaração textual é listada abaixo. DROP, permissões efetivas, sobrecargas e alterações posteriores precisam confirmação por introspecção; este índice não representa automaticamente o estado final instalado. Os testes RLS por tabela estão em \u0060src/__tests__/rls\u0060; C01/C02 e A02 da auditoria exigem casos adicionais por operação.\n\n| Objeto | Última declaração localizada | Ator normativo (não grant efetivo) | Referências nominais de teste |\n|---|---|---|---|\n${[...sql].sort(([a], [b]) => a.localeCompare(b)).map(([key, ref]) => "| " + key + " | " + ref + " | " + sqlActor(key) + " | " + sqlTestRefs(key) + " |").join("\n")}\n\n## Grants e revogações declarados\n\nÍndice textual das migrations; defaults PostgreSQL e herança não são avaliados aqui. Confirmar privilégios efetivos/owner/BYPASSRLS na Fase 02.\n\n| Fonte | Declaração |\n|---|---|\n${privileges.join("\n")}\n\n## Habilitação RLS declarada\n\n| Fonte | Declaração |\n|---|---|\n${rls.join("\n")}\n\n## Edge Function, Storage, jobs e configurações\n\n- \u0060supabase/functions/provision-user/index.ts\u0060: autocadastro público; operações legadas create_ward_admin/create_bootstrap_admin permanecem no código e devem ser removidas na Fase 03. JWT administrativo é verificado no handler; verify_jwt=false não equivale a autorização. Falta teste ponta a ponta do endpoint real.\n- \u0060storage.objects\u0060 / bucket \u0060minor-forms\u0060: envio pelo titular e leitura autorizada/auditada; policies atuais e lacunas em A03/A12/A13. Teste: \u0060minor-forms-isolation.test.ts\u0060; cobrir falhas intermediárias e leitura sem log nas fases seguintes.\n- \u0060src/infrastructure/storage/checkin-offline-db.ts\u0060: IndexedDB; lacunas de partição, expiração e descarte de pendências (A08).\n- Grants amplos/defaults na fundação e RPC de promoção SECURITY DEFINER: C01; execução anônima deve ser negada na Fase 02.\n- Perfis, pagamentos, filas, logs e métricas: matriz detalhada e lacunas em \u0060docs/AUDITORIA-2026-10-21.md\u0060 e \u0060docs/REVISAO-CONSTITUCIONAL-4.0.0.md\u0060.\n- Jobs HTTP (${jobs.length} handlers; não confundir com quantidade agendada):\n${jobs.map((j) => "  - \u0060" + j + "\u0060").join("\n")}\n- Jobs esperados: validação semanal, expiração de reservas/créditos, quórum, fila de e-mail, retenção e inativação; no-show depende do encerramento autorizado com caravan_id. Verificar execução real e contexto temporal na Fase 07, não apenas cron.job.\n- Configurações: \u0060.env.example\u0060 e \u0060supabase/config.toml\u0060. Nenhum segredo é incluído neste inventário. CI usa Supabase efêmero no loopback do runner.\n`;
const output = path.join(root, "docs/INVENTARIO-ACESSOS.md");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(output) || fs.readFileSync(output, "utf8").replace(/\r\n/g, "\n") !== content) {
    console.error("Inventário desatualizado: execute npm run inventory:access e revise o diff.");
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(output, content);
  console.log(`Inventário gerado: ${rows.length} exports, ${pages.length} páginas, ${sql.size} objetos SQL.`);
}
