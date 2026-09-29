import { getStakesList } from "../actions";
import { StakeForm } from "./stake-form";

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
          <section className="sgct-card overflow-hidden">
            <div className="border-b border-[#e0e2e2] px-5 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-[#212225]">
                Estacas Cadastradas ({stakes.length})
              </h2>
            </div>

            {stakes.length === 0 ? (
              <div className="p-8 text-center text-base text-[#53575b]">
                Nenhuma Estaca cadastrada ainda. Utilize o formulário ao lado para cadastrar a primeira.
              </div>
            ) : (
              <>
              <div className="divide-y divide-[#e0e2e2] md:hidden">
                {stakes.map((stake) => (
                  <article key={stake.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-bold text-[#212225]">{stake.name}</h3><p className="mt-1 font-mono text-sm text-[#53575b]">/{stake.slug}</p></div>
                      <span className={`sgct-chip ${stake.is_active ? "border-success-200 bg-success-50 text-success-700" : "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]"}`}>{stake.is_active ? "Ativa" : "Inativa"}</span>
                    </div>
                    <a href={`/${stake.slug}`} target="_blank" rel="noreferrer" className="sgct-button-secondary mt-4 w-full">Abrir página pública</a>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-[#e0e2e2] text-sm">
                  <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Nome</th>
                      <th className="px-6 py-3 text-left font-medium">Slug</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Link Público</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e2e2] bg-white">
                    {stakes.map((stake) => (
                      <tr key={stake.id} className="hover:bg-brand-50/40">
                        <td className="px-6 py-4 font-semibold text-[#212225]">
                          {stake.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#53575b]">
                          {stake.slug}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`sgct-chip ${
                              stake.is_active
                                ? "border-success-200 bg-success-50 text-success-700"
                                : "border-[#d0d3d3] bg-[#eff0f0] text-[#3a3d40]"
                            }`}
                          >
                            {stake.is_active ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <a href={`/${stake.slug}`} target="_blank" rel="noreferrer">
                            <span className="sgct-link">Abrir página</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
