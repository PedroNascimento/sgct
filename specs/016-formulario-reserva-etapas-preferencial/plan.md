# Plan 016: Formulário de Reserva em Etapas, Documento Alternativo e Poltronas Preferenciais

**Spec de referência:** `specs/016-formulario-reserva-etapas-preferencial/spec.md`
**Constitution:** v4.0.0

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | Regras de poltronas preferenciais em `domain/`, validação e persistência em `use-cases/`, UI em `components/reservation/` e `app/`. |
| II | ✅ | Colunas opcionais em `profiles` e `reservations` respeitam integralmente `stake_id`/`ward_id` e RLS existente. |
| III | ✅ | Nenhuma transição de status alterada; criação de reserva segue via Server Action + use-case. |
| IV | ✅ | Testes unitários (TDD) para regra de poltronas preferenciais (01–04), `familyGroupSize` e atualização de perfil. |
| V | ✅ | Validação Zod estrita em cadastro, perfil e reserva. |
| VII/VIII/IX | ✅ | Regras confirmadas explicitamente pelo responsável (D35); código agnóstico de tenant. |
