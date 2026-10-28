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
    <div className="platform-page">
      <div className="platform-page-header">
        <p className="sgct-eyebrow">Administração da plataforma</p>
        <h1 className="sgct-title mt-2 sm:mt-3">Estacas</h1>
        <p className="sgct-subtitle">
          Cadastre Estacas e acompanhe seus espaços na plataforma.
        </p>
      </div>

      <div className="platform-stake-grid">
        <div className="w-full min-w-0">
          <StakeForm />
        </div>

        <div className="w-full min-w-0">
          <StakeList stakes={stakes} />
        </div>
      </div>
    </div>
  );
}
