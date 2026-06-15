import { CheckoutInput } from "@/shared/contracts/checkout";
import { CreateEcommerceOrderUseCase } from "@/modules/orders/application/use-cases/create-ecommerce-order.use-case";
import { GetEcommerceOrderDetailsUseCase } from "@/modules/orders/application/use-cases/get-ecommerce-order-details.use-case";

export class OrderService {
  /**
   * Crée une commande e-commerce après validation de la disponibilité des ingrédients
   */
  static async createEcommerceOrder(input: CheckoutInput) {
    return CreateEcommerceOrderUseCase.execute(input);
  }

  /**
   * Récupère une commande e-commerce avec tous les détails de paiement et de livraison
   */
  static async getEcommerceOrderDetails(id: string) {
    return GetEcommerceOrderDetailsUseCase.execute(id);
  }
}
