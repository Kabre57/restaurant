import { OrderService } from "@/services/order.service";
import { notFound } from "next/navigation";
import { ConfirmationClient } from "./ConfirmationClient";

export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ client_secret?: string; mock_payment?: string }>;
};

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { id } = resolvedParams;
  const clientSecret = resolvedSearchParams.client_secret || "";
  const isMock = resolvedSearchParams.mock_payment === "true";

  const order = await OrderService.getEcommerceOrderDetails(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <ConfirmationClient
        order={JSON.parse(JSON.stringify(order))}
        clientSecret={clientSecret}
        isMockFromQuery={isMock}
      />
    </div>
  );
}
