import { getActiveOrders } from "@/app/actions/orders";
import { getStoreDetails } from "@/app/actions/stores";
import KDSClient from "@/components/kds/KDSClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function KDSPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const [initialOrders, store] = await Promise.all([
    getActiveOrders(session.user.storeId),
    getStoreDetails(session.user.storeId)
  ]);

  return <KDSClient initialOrders={initialOrders as any} storeName={store?.name || "Cuisine Centrale"} />;
}
