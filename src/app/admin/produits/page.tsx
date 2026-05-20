import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCategories, getProductsForAdmin } from "@/app/actions/admin"
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

  const [products, categories] = await Promise.all([
    getProductsForAdmin(),
    getCategories()
  ])

  return <ProductsAdminClient products={products} categories={categories} />
}
