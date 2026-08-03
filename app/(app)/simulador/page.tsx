import { Simulador } from "@/components/simulador/Simulador";
import { requirePermission } from "@/lib/auth/access";
import { getParameterSetFor, toPlainParams } from "@/lib/db/params";
import { todayCR } from "@/lib/format/dates";

export default async function SimuladorPage() {
  await requirePermission("simulador.usar");
  const params = toPlainParams(await getParameterSetFor(todayCR()));
  return <Simulador params={params} />;
}
