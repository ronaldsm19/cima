"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", formData);
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return "Correo o contraseña incorrectos. Revisá los datos e intentá de nuevo.";
    }
    throw error; // NEXT_REDIRECT on success travels through here
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
