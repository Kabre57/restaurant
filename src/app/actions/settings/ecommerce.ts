"use server";

import { prisma } from "@/lib/db";
import { assertSameStore, requireAuth } from "@/lib/auth-guard";
import {
  ecommerceSettingsSelect,
  isIsoDate,
  normalizeEcommerceSettings,
  type EcommerceSettings,
} from "@/lib/ecommerce-settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MANAGE_ECOMMERCE_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "RESTAURATEUR", "MANAGER", "STORE_MANAGER"]);

const ecommerceSettingsSchema = z
  .object({
    ecommerceEnabled: z.boolean(),
    deliveryEnabled: z.boolean(),
    clickAndCollectEnabled: z.boolean(),
    deliveryFee: z.coerce.number().finite().min(0).max(10_000_000),
    preparationDelayMinutes: z.coerce.number().int().min(0).max(24 * 60),
    closedDates: z.array(z.string().refine(isIsoDate, "Format attendu YYYY-MM-DD")).max(366),
  })
  .refine((data) => !data.ecommerceEnabled || data.deliveryEnabled || data.clickAndCollectEnabled, {
    message: "Activez au moins un mode de commande avant d'ouvrir la boutique.",
    path: ["clickAndCollectEnabled"],
  });

export type EcommerceSettingsInput = z.input<typeof ecommerceSettingsSchema>;

type EcommerceSettingsResult =
  | { success: true; settings: EcommerceSettings }
  | { success: false; error: string };

async function assertCanManageStore(storeId: string) {
  const auth = await requireAuth();

  if (!MANAGE_ECOMMERCE_ROLES.has(auth.role)) {
    throw new Error("Accès non autorisé");
  }

  if (auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
    assertSameStore(storeId, auth.storeId, "Paramètres e-commerce");
  }
}

export async function getEcommerceSettings(storeId: string): Promise<EcommerceSettingsResult> {
  try {
    await assertCanManageStore(storeId);

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: ecommerceSettingsSelect,
    });

    if (!store) {
      return { success: false, error: "Restaurant introuvable." };
    }

    return { success: true, settings: normalizeEcommerceSettings(store) };
  } catch (error) {
    console.error("Failed to fetch ecommerce settings:", error);
    return { success: false, error: "Impossible de récupérer les paramètres e-commerce." };
  }
}

export async function updateEcommerceSettings(
  storeId: string,
  data: EcommerceSettingsInput
): Promise<EcommerceSettingsResult> {
  try {
    await assertCanManageStore(storeId);

    const validation = ecommerceSettingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message ?? "Paramètres invalides." };
    }

    const parsed = validation.data;
    const uniqueClosedDates = [...new Set(parsed.closedDates)].sort();

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        ecommerceEnabled: parsed.ecommerceEnabled,
        deliveryEnabled: parsed.deliveryEnabled,
        clickAndCollectEnabled: parsed.clickAndCollectEnabled,
        deliveryFee: parsed.deliveryEnabled ? parsed.deliveryFee : 0,
        preparationDelayMinutes: parsed.preparationDelayMinutes,
        closedDates: uniqueClosedDates,
      },
      select: ecommerceSettingsSelect,
    });

    try {
      revalidatePath("/menu");
      revalidatePath("/checkout");
      revalidatePath("/restaurateur/config/ecommerce");
      revalidatePath("/backoffice/settings/ecommerce");
    } catch {
      // Les tests Vitest et scripts CLI n'ont pas toujours le contexte Next.js de revalidation.
    }

    return { success: true, settings: normalizeEcommerceSettings(store) };
  } catch (error) {
    console.error("Failed to update ecommerce settings:", error);
    return { success: false, error: "Erreur lors de la mise à jour des paramètres e-commerce." };
  }
}
