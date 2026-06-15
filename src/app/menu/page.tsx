import { prisma } from "@/lib/db";
import { normalizeEcommerceSettings } from "@/lib/ecommerce-settings";
import { MenuClient } from "./MenuClient";

export const revalidate = 0;

export default async function MenuPage() {
  // Récupère la liste des établissements actifs
  const dbStores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      ecommerceEnabled: true,
      deliveryEnabled: true,
      clickAndCollectEnabled: true,
      deliveryFee: true,
      preparationDelayMinutes: true,
      closedDates: true,
    },
    orderBy: { name: "asc" },
  });

  const stores = dbStores.map((store) => ({
    id: store.id,
    name: store.name,
    address: store.address,
    ecommerceSettings: normalizeEcommerceSettings(store),
  }));

  // Récupère les catégories par établissement pour éviter les filtres croisés.
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      storeId: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      <MenuClient initialStores={stores} initialCategories={categories} />
    </div>
  );
}
