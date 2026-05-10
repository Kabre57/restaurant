import { getCategories, getProducts } from "@/app/actions/products";
import POSClient from "@/components/pos/POSClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  // Récupérer la session
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Récupérer les catégories et produits
  const categories = await getCategories();
  const products = await getProducts();

  return (
    <POSClient 
      categories={categories} 
      products={products} 
      storeId={session.user.storeId} 
      cashierId={session.user.id} 
    />
  );
}
