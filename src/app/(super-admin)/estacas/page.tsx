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
        <h2 className="text-xl font-bold text-gray-900">Estacas da Plataforma</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre novas Estacas regionais para habilitar o isolamento multi-tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <StakeForm />
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Estacas Cadastradas ({stakes.length})
              </h3>
            </div>

            {stakes.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Nenhuma Estaca cadastrada ainda. Utilize o formulário ao lado para cadastrar a primeira.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Nome</th>
                      <th className="px-6 py-3 text-left font-medium">Slug</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Link Público</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stakes.map((stake) => (
                      <tr key={stake.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {stake.name}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                          {stake.slug}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              stake.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {stake.is_active ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-blue-600 hover:underline">
                          <a href={`/${stake.slug}`} target="_blank" rel="noreferrer">
                            /{stake.slug}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
