import type { Prisma } from "@prisma/client";

export type EcommerceSettings = {
  ecommerceEnabled: boolean;
  deliveryEnabled: boolean;
  clickAndCollectEnabled: boolean;
  deliveryFee: number;
  preparationDelayMinutes: number;
  closedDates: string[];
};

export type EcommerceDeliveryType = "DELIVERY" | "CLICK_AND_COLLECT";

export const ecommerceSettingsSelect = {
  ecommerceEnabled: true,
  deliveryEnabled: true,
  clickAndCollectEnabled: true,
  deliveryFee: true,
  preparationDelayMinutes: true,
  closedDates: true,
} satisfies Prisma.StoreSelect;

export type EcommerceSettingsRecord = {
  ecommerceEnabled: boolean;
  deliveryEnabled: boolean;
  clickAndCollectEnabled: boolean;
  deliveryFee: Prisma.Decimal | number | string | null;
  preparationDelayMinutes: number;
  closedDates: Prisma.JsonValue | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string) {
  return DATE_PATTERN.test(value);
}

export function normalizeClosedDates(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string" && isIsoDate(item)))].sort();
}

export function normalizeEcommerceSettings(record: EcommerceSettingsRecord): EcommerceSettings {
  const deliveryFee = record.deliveryFee === null ? 0 : Number(record.deliveryFee);

  return {
    ecommerceEnabled: record.ecommerceEnabled,
    deliveryEnabled: record.deliveryEnabled,
    clickAndCollectEnabled: record.clickAndCollectEnabled,
    deliveryFee: Number.isFinite(deliveryFee) ? deliveryFee : 0,
    preparationDelayMinutes: record.preparationDelayMinutes,
    closedDates: normalizeClosedDates(record.closedDates),
  };
}

export function getTodayIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isClosedForOnlineOrders(settings: EcommerceSettings, now = new Date()) {
  return settings.closedDates.includes(getTodayIsoDate(now));
}

export function getDefaultDeliveryType(settings: EcommerceSettings): EcommerceDeliveryType | null {
  if (settings.clickAndCollectEnabled) {
    return "CLICK_AND_COLLECT";
  }

  if (settings.deliveryEnabled) {
    return "DELIVERY";
  }

  return null;
}

export function assertEcommerceOrderAllowed(settings: EcommerceSettings, deliveryType: EcommerceDeliveryType) {
  if (!settings.ecommerceEnabled || isClosedForOnlineOrders(settings)) {
    throw new Error("Boutique fermée temporairement");
  }

  if (deliveryType === "DELIVERY" && !settings.deliveryEnabled) {
    throw new Error("La livraison à domicile n'est pas disponible pour ce restaurant");
  }

  if (deliveryType === "CLICK_AND_COLLECT" && !settings.clickAndCollectEnabled) {
    throw new Error("Le click & collect n'est pas disponible pour ce restaurant");
  }
}
