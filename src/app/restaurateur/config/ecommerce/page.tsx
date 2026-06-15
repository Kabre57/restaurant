"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarDays, CheckCircle2, Clock, Loader2, Save, Store, Truck } from "lucide-react";
import {
  getEcommerceSettings,
  updateEcommerceSettings,
  type EcommerceSettingsInput,
} from "@/app/actions/settings/ecommerce";
import { useToast } from "@/components/ui/Toast";
import type { EcommerceSettings } from "@/lib/ecommerce-settings";

const DEFAULT_SETTINGS: EcommerceSettings = {
  ecommerceEnabled: false,
  deliveryEnabled: false,
  clickAndCollectEnabled: true,
  deliveryFee: 0,
  preparationDelayMinutes: 30,
  closedDates: [],
};

export default function EcommerceSettingsPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [settings, setSettings] = useState<EcommerceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateToAdd, setDateToAdd] = useState("");
  const [saved, setSaved] = useState(false);

  const storeId = session?.user?.storeId;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isClosedToday = settings.closedDates.includes(today);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadSettings() {
      if (!storeId) {
        return;
      }
      setLoading(true);
      const result = await getEcommerceSettings(storeId);

      if (isCancelled) {
        return;
      }

      if (result.success) {
        setSettings(result.settings);
      } else {
        toast(result.error, "error");
      }

      setLoading(false);
    }

    void loadSettings();

    return () => {
      isCancelled = true;
    };
  }, [storeId, toast]);

  function updateField<K extends keyof EcommerceSettings>(key: K, value: EcommerceSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleEcommerce(enabled: boolean) {
    setSaved(false);
    setSettings((current) => ({
      ...current,
      ecommerceEnabled: enabled,
      clickAndCollectEnabled: enabled && !current.deliveryEnabled ? true : current.clickAndCollectEnabled,
    }));
  }

  function addClosedDate() {
    if (!dateToAdd || settings.closedDates.includes(dateToAdd)) {
      return;
    }

    updateField("closedDates", [...settings.closedDates, dateToAdd].sort());
    setDateToAdd("");
  }

  function removeClosedDate(date: string) {
    updateField(
      "closedDates",
      settings.closedDates.filter((closedDate) => closedDate !== date)
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!storeId) {
      toast("Restaurant introuvable dans la session.", "error");
      return;
    }

    setSaving(true);
    setSaved(false);

    const payload: EcommerceSettingsInput = {
      ...settings,
      deliveryFee: settings.deliveryEnabled ? settings.deliveryFee : 0,
    };
    const result = await updateEcommerceSettings(storeId, payload);

    if (result.success) {
      setSettings(result.settings);
      setSaved(true);
      toast("Paramètres e-commerce enregistrés.", "success");
    } else {
      toast(result.error, "error");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#adb5bd]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#212529] sm:text-3xl">
            E-commerce & Web
          </h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#adb5bd]">
            Paramètres publics de commande en ligne
          </p>
        </div>
        {settings.ecommerceEnabled && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Boutique active
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-[#dee2e6] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">
                  Boutique en ligne
                </h2>
                <p className="mt-1 text-sm text-[#6c757d]">
                  {isClosedToday ? "Boutique fermée temporairement aujourd'hui." : "Ouverture publique du catalogue et du checkout."}
                </p>
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={settings.ecommerceEnabled}
                onChange={(event) => toggleEcommerce(event.target.checked)}
                className="h-5 w-5 rounded border-[#adb5bd] text-orange-600 focus:ring-orange-500"
              />
              <span className="text-xs font-black uppercase tracking-widest text-[#212529]">Activer</span>
            </label>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[#dee2e6] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Store className="h-5 w-5 text-orange-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Modes de commande</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3">
                <span className="text-sm font-bold text-[#212529]">Click & collect</span>
                <input
                  type="checkbox"
                  checked={settings.clickAndCollectEnabled}
                  disabled={!settings.ecommerceEnabled}
                  onChange={(event) => updateField("clickAndCollectEnabled", event.target.checked)}
                  className="h-5 w-5 rounded border-[#adb5bd] text-orange-600 focus:ring-orange-500 disabled:opacity-40"
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-[#212529]">
                  <Truck className="h-4 w-4 text-orange-600" />
                  Livraison à domicile
                </span>
                <input
                  type="checkbox"
                  checked={settings.deliveryEnabled}
                  disabled={!settings.ecommerceEnabled}
                  onChange={(event) => updateField("deliveryEnabled", event.target.checked)}
                  className="h-5 w-5 rounded border-[#adb5bd] text-orange-600 focus:ring-orange-500 disabled:opacity-40"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-[#dee2e6] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Préparation</h2>
            </div>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#adb5bd]">
                Délai minimal avant retrait/livraison
              </span>
              <input
                type="number"
                min={0}
                max={1440}
                value={settings.preparationDelayMinutes}
                onChange={(event) => updateField("preparationDelayMinutes", Number(event.target.value))}
                className="w-full rounded-lg border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </label>

            {settings.ecommerceEnabled && settings.deliveryEnabled && (
              <label className="mt-5 block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-[#adb5bd]">
                  Frais de livraison (FCFA)
                </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={settings.deliveryFee}
                  onChange={(event) => updateField("deliveryFee", Number(event.target.value))}
                  className="w-full rounded-lg border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </label>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#dee2e6] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-orange-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Fermetures exceptionnelles</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="date"
              value={dateToAdd}
              onChange={(event) => setDateToAdd(event.target.value)}
              className="h-11 rounded-lg border border-[#dee2e6] bg-[#f8f9fa] px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="button"
              onClick={addClosedDate}
              className="h-11 rounded-lg bg-[#212529] px-5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-[#343a40]"
            >
              Ajouter
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {settings.closedDates.length === 0 ? (
              <span className="text-sm font-semibold text-[#adb5bd]">Aucune fermeture planifiée.</span>
            ) : (
              settings.closedDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => removeClosedDate(date)}
                  className="rounded-lg border border-[#dee2e6] bg-[#f8f9fa] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#212529] hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  {date}
                </button>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-col gap-4 rounded-lg bg-[#212529] p-5 text-white shadow-xl shadow-[#212529]/20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">
            {saved ? "Configuration enregistrée" : "Modifications non enregistrées"}
          </p>
          <button
            disabled={saving}
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-3 rounded-lg bg-white px-6 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#f1f3f5] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
