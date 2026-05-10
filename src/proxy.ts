import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export const config = {
  matcher: [
    // Protéger la racine (POS)
    "/",
    // Protéger le KDS
    "/kds",
    // Protéger le back-office admin
    "/admin/:path*",
  ],
};
