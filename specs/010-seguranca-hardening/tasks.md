# Tasks 010: Hardening de Segurança

- [ ] T010.1 — Teste + implementação: `checkRateLimit` (tabela própria, janela deslizante)
- [ ] T010.2 — Aplicar rate limiting: login (5/15min), reserva (10/min), scanner (30/min), e-mail (throttle por evento), upload de menor (5/hora)
- [ ] T010.3 — Auditoria: todas as Server Actions validam entrada com Zod (checklist manual + lint custom se possível)
- [ ] T010.4 — Executar checklist completo de `docs/DATABASE_SCHEMA.md` seção 10 em cada tabela; corrigir gaps encontrados
- [ ] T010.5 — Confirmar `audit_logs` cobrindo: aprovação de menor, concessão excepcional de crédito, criação de Estaca, promoção de membro existente, leitura de documento de menor
- [ ] T010.6 — Teste de penetração manual: token JWT da Estaca A chamando API Supabase direto para ler dado da Estaca B → documentar resultado
- [ ] T010.7 — `npm audit` sem vulnerabilidades altas
- [ ] T010.8 — Re-executar `SETUP.md` do zero em ambiente limpo (sanity check de auto-hospedagem)
- [ ] T010.9 — `npm run test:rls` verde para 100% das tabelas antes de considerar o hardening concluído

**Definition of Done:** checklist de `docs/SECURITY.md` seção 9 100% verde; relatório de teste de penetração manual anexado.
## Fase 01 — Governança e baseline (21/10/2026)

- [x] R01.1 — Emenda v4.0.0: autoridade de promoção e menor privilégio.
- [x] R01.2 — Alinhar decisões, specs, 15 plans e documentos operacionais.
- [x] R01.3 — Retirar aceite de piloto real e métricas sem evidência.
- [x] R01.4 — Inventário versionado de entradas, objetos SQL e fronteiras de acesso.
- [x] R01.5 — Runner protegido, testes negativos e CI mínimo descartável.
- [x] R01.6 — Baseline, registro dos 24 achados e reabertura dos aceites afetados.

Evidências: `docs/BASELINE-FASE-01.md`. T010.1–9 reabertos: há implementação e testes parciais, mas não evidência suficiente para o aceite integral. Os seis vetores do pentest permanecem válidos no seu escopo limitado; não substituem toda a matriz. npm audit completo ainda registra 35 high/7 moderate em desenvolvimento. Fase 01 não encerra o hardening.
