import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/access";

export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.role === "EMPLEADO" ? "/mi" : "/panel");
}
