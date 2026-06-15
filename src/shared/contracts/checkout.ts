import { z } from "zod";

const requestedFulfillmentAtSchema = z.preprocess((value) => {
  if (value === null || value === "") {
    return undefined;
  }

  return value;
}, z.coerce.date().optional());

export const cartItemSchema = z.object({
  productId: z.string({
    message: "Le produit est requis",
  }),
  quantity: z.number().min(1, "La quantité doit être supérieure ou égale à 1"),
  price: z.number().min(0, "Le prix ne peut pas être négatif").optional(),
  notes: z.string().optional().nullable(),
});

export const checkoutSchema = z
  .object({
    storeId: z.string({
      message: "L'établissement est requis",
    }),
    customerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    customerPhone: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 caractères"),
    customerEmail: z.string().email("Adresse email invalide").optional().nullable(),
    deliveryType: z.enum(["DELIVERY", "CLICK_AND_COLLECT"], {
      message: "Le mode de retrait est requis",
    }),
    deliveryAddress: z.string().optional().nullable(),
    customerNotes: z.string().optional().nullable(),
    requestedFulfillmentAt: requestedFulfillmentAtSchema,
    paymentMethod: z.enum(["CARD", "ORANGE_MONEY", "MTN_MONEY"], {
      message: "Le mode de paiement est requis",
    }),
    items: z.array(cartItemSchema).min(1, "Le panier ne peut pas être vide"),
  })
  .refine(
    (data) => {
      if (data.deliveryType === "DELIVERY") {
        return !!data.deliveryAddress && data.deliveryAddress.trim().length > 0;
      }
      return true;
    },
    {
      message: "L'adresse de livraison est obligatoire pour une livraison à domicile",
      path: ["deliveryAddress"],
    }
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
