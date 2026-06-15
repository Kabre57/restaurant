import { DeliveryOrderStatus } from "@prisma/client";

export class NotificationService {
  /**
   * Sends a notification to the customer via SMS, WhatsApp, or Email
   */
  static async sendNotification({
    phone,
    email,
    message,
    channel = "SMS",
  }: {
    phone: string;
    email?: string | null;
    message: string;
    channel?: "SMS" | "WHATSAPP" | "EMAIL";
  }): Promise<void> {
    // Log simulation as requested
    console.log(`[NOTIFICATION SIMULATED] Channel: ${channel}`);
    console.log(`To Phone: ${phone}${email ? ` | To Email: ${email}` : ""}`);
    console.log(`Message: "${message}"`);
  }

  /**
   * Notifies the customer about a status change of their delivery order
   */
  static async notifyStatusChange(
    status: DeliveryOrderStatus,
    customerName: string,
    phone: string,
    email: string | null,
    orderId: string,
    livreurName?: string
  ): Promise<void> {
    let message = "";

    switch (status) {
      case "PENDING":
        message = `Bonjour ${customerName}, votre commande #${orderId} a bien été enregistrée pour livraison. Nous recherchons un livreur.`;
        break;
      case "ASSIGNED":
        message = `Bonne nouvelle ${customerName} ! Le livreur ${
          livreurName || "partenaire"
        } a été assigné à votre commande #${orderId}. Préparation en cours.`;
        break;
      case "PICKED_UP":
        message = `Bonjour ${customerName}, votre commande #${orderId} a été récupérée par le livreur et est en cours d'acheminement.`;
        break;
      case "IN_PROGRESS":
        message = `Bonjour ${customerName}, votre livreur est en route et se rapproche de votre adresse de livraison.`;
        break;
      case "DELIVERED":
        message = `Votre commande #${orderId} a été livrée ! Merci de votre confiance et bon appétit.`;
        break;
      case "CANCELLED":
        message = `Désolé ${customerName}, la livraison de votre commande #${orderId} a été annulée. Veuillez contacter notre support.`;
        break;
    }

    if (message) {
      await this.sendNotification({ phone, email, message, channel: "SMS" });
      if (email) {
        await this.sendNotification({ phone, email, message, channel: "EMAIL" });
      }
    }
  }
}
