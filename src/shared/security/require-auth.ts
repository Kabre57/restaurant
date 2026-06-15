import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UnauthorizedError } from "@/shared/errors";
import { Role } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  storeId: string;
  role: Role;
  email: string;
};

/**
 * Validates that the current request has an active session.
 * Throws UnauthorizedError if authentication is missing or invalid.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new UnauthorizedError("Authentification requise pour effectuer cette action.");
  }

  const { id, role, storeId, email } = session.user;

  // SUPER_ADMIN and ADMIN are allowed without a storeId mapping
  if (!storeId && role !== "SUPER_ADMIN" && role !== "ADMIN") {
    throw new UnauthorizedError("Aucun établissement associé à votre profil utilisateur.");
  }

  return {
    id,
    storeId: storeId || "",
    role: role as Role,
    email: email || "",
  };
}
export default requireAuth;
