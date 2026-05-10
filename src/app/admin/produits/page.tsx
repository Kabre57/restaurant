import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getProductsForAdmin } from "@/app/actions/admin"
import ProductsAdminClient from "@/components/admin/ProductsAdminClient"

export const metadata = {
  title: "Gestion des Produits — POS Franchise",
  description: "Back-office de gestion du catalogue produits : prix, disponibilité et stock.",
}

export default async function AdminProduitsPage() {
  // Protection : seuls les utilisateurs connectés peuvent accéder
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/login")
  }

  const products = await getProductsForAdmin()

  return <ProductsAdminClient products={products as any} />
}
