import { OrderRepository } from "../../repositories/order.repository";
import { NotFoundError } from "@/shared/errors";

export class GetEcommerceOrderDetailsUseCase {
  static async execute(id: string) {
    const order = await OrderRepository.findOrderDetails(id);
    if (!order) {
      throw new NotFoundError("Commande introuvable");
    }
    return order;
  }
}
