# Tasks 016: Formulário de Reserva em Etapas, Documento Alternativo e Poltronas Preferenciais

- [x] **T016.1** Criar migration adicionando `document_type`, `document_number`, `document_issuer` (opcionais) em `profiles` e `family_group_size` (int opcional >= 1) em `reservations`, e aplicar no Supabase local (`supabase migration up`).
- [x] **T016.2** Atualizar tipos e schemas de domínio (`src/domain/types/tenant.ts`, `src/domain/types/reservation.ts`, `src/domain/schemas/auth.ts`, `src/domain/schemas/reservation.ts`).
- [x] **T016.3** Atualizar use-cases + testes TDD (`create-reservation`, `update-own-profile`, `sign-up-member`, `sign-up-minor`, `sign-up-guest`, `supabase/functions/provision-user`, `cadastro/actions.ts`, `conta/actions.ts`).
- [x] **T016.4** Atualizar `SeatMap`, `ReservationForm` (4 etapas + links de orientação + regra preferencial 01–04 + `familyGroupSize`), `CadastroClient` e `ContaPage`.
- [x] **T016.5** Executar `typecheck`, `lint`, `test:unit` e `build`.
