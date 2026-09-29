import Link from "next/link";
import { getStakesList } from "../actions";
import { AdminForm } from "./admin-form";

export const dynamic = "force-dynamic";

/**
 * Tela de cadastro de Admin Estaca — Super Admin (T000.18).
 */
export default async function AdminsPage() {
  const stakes = await getStakesList();

  return (
    <div className="space-y-6">
      <div>
        <p className="sgct-eyebrow">Acesso inicial</p>
        <h1 className="sgct-title mt-3">Administradores de Estaca</h1>
        <p className="sgct-subtitle">
          Cadastre o primeiro Admin de Estaca para cada Estaca recém-criada.
        </p>
      </div>

      {stakes.length === 0 ? (
        <div className="sgct-alert-warning">
          Nenhuma Estaca cadastrada ainda.{" "}
          <Link
            href="/estacas"
            className="font-semibold underline"
          >
            Cadastre uma Estaca primeiro
          </Link>{" "}
          antes de criar o primeiro Administrador.
        </div>
      ) : (
        <AdminForm stakes={stakes} />
      )}
    </div>
  );
}

