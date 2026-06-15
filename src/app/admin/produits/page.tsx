import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getCategories, getProductsForAdmin } from "@/app/actions/analytics/admin"
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

  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value || undefined

  const [products, categories] = await Promise.all([
    getProductsForAdmin(activeStoreId),
    getCategories(activeStoreId)
  ])

  return <ProductsAdminClient products={products} categories={categories} activeStoreId={activeStoreId} />
}
