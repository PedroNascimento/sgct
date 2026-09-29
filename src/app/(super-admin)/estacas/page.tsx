import { getStakesList } from "../actions";
import { StakeForm } from "./stake-form";
import { StakeList } from "./stake-list";

export const dynamic = "force-dynamic";

/**
 * Tela de gestão de Estacas — Super Admin (T000.18).
 */
export default async function EstacasPage() {
  const stakes = await getStakesList();

  return (
    <div className="space-y-8">
      <div>
        <p className="sgct-eyebrow">Administração da plataforma</p>
        <h1 className="sgct-title mt-3">Estacas</h1>
        <p className="sgct-subtitle">
          Cadastre novas Estacas regionais para habilitar o isolamento multi-tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StakeForm />
        </div>

        <div className="lg:col-span-3">
          <StakeList stakes={stakes} />
        </div>
      </div>
    </div>
  );
}
