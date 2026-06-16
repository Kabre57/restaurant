"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Loader2, Utensils, Building, Globe, Check, AlertCircle, ToggleLeft, ToggleRight, Tag, ShoppingBag, RotateCcw, Wallet, WifiOff } from "lucide-react";
import { registerStore } from "../actions/store/register";

export default function RegisterPage() {
  const router = useRouter();

  // Multi-step state: 1 (Form), 2 (Features), 3 (PIN), 4 (Configuring / Redirecting)
  const [step, setStep] = useState(1);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Côte d'Ivoire");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Wizard States
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Feature Toggles (Step 2)
  const [features, setFeatures] = useState({
    periods: true,
    clockIn: true,
    openTickets: true,
    kitchenPrinters: true,
    customerDisplay: true,
    diningOptions: true,
    lowStockAlerts: true,
  });

  // PIN Code (Step 3)
  const [pin, setPin] = useState<string[]>([]);

  // Toggle helper
  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Submit Step 1: Account Creation
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions générales.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await registerStore({
      email,
      password,
      companyName,
      country,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || "Une erreur est survenue.");
      return;
    }

    // Go to next step: Feature settings
    setStep(2);
  }

  // Submit Step 2: Features Settings
  function handleFeaturesSubmit() {
    setStep(3);
  }

  // Submit Step 3: PIN Code Setup
  async function handlePinConfirm() {
    if (pin.length < 4) {
      setError("Le code PIN doit comporter 4 chiffres.");
      return;
    }
    setLoading(true);
    setError("");
    setStep(4);

    // Auto sign-in
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok || result.error) {
      setLoading(false);
      setStep(1);
      setError("Inscription réussie, mais impossible de se connecter automatiquement. Veuillez utiliser la page de connexion.");
      return;
    }

    // Redirect to restaurateur dashboard stats
    router.push("/restaurateur/stats");
    router.refresh();
  }

  // PIN Keyboard Input
  const handlePinKey = (num: string) => {
    if (pin.length < 4) {
      setPin([...pin, num]);
    }
  };

  const handlePinDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F5F7] font-sans text-[#171717]">
      
      {/* Colonne de Gauche : Fonctionnalités & Branding (md+) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] xl:w-[42%] relative bg-black flex-col justify-between p-12 overflow-y-auto">
        <img
          src="/restaurant-interior.jpg"
          alt="Restaurant Interior"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/80 via-black/90 to-black z-0 pointer-events-none" />

        {/* Logo & Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 overflow-hidden rounded-[12px] border border-white/10 bg-black/90 p-1 flex items-center justify-center shadow-lg shadow-black/20">
            <Image src="/logo.jpg" alt="Progiteck" width={40} height={40} className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-black text-white tracking-wider">Gourmet POS</span>
        </div>

        {/* Features Content */}
        <div className="relative z-10 my-auto py-8 space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#FF6D00] tracking-widest uppercase bg-[#FF6D00]/10 px-3 py-1.5 rounded-full">
              Loyverse POS Ecosystem
            </span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight tracking-tight pt-1">
              Outils pour gérer chaque aspect de votre entreprise
            </h2>
          </div>

          <div className="grid gap-6">
            {/* Item 1 */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6D00] shrink-0 transition-colors group-hover:bg-[#FF6D00]/10">
                <Utensils size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Point de vente (PDV)</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Accélérez le traitement des commandes dans votre restaurant grâce à un écran de vente personnalisable et à des modificateurs d'articles.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6D00] shrink-0 transition-colors group-hover:bg-[#FF6D00]/10">
                <Tag size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Remises & Promotions</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Appliquez facilement des remises et lancez des promotions efficaces pour fidéliser vos clients.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6D00] shrink-0 transition-colors group-hover:bg-[#FF6D00]/10">
                <ShoppingBag size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Gestion des commandes</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Créez, enregistrez et modifiez les commandes, en laissant les clients payer quand cela leur convient.
                </p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6D00] shrink-0 transition-colors group-hover:bg-[#FF6D00]/10">
                <RotateCcw size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Remboursements</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Offrez des remboursements complets ou partiels pour s'adapter précisément aux demandes de vos clients.
                </p>
              </div>
            </div>

            {/* Item 5 */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6D00] shrink-0 transition-colors group-hover:bg-[#FF6D00]/10">
                <Wallet size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Suivi de trésorerie</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Suivez les mouvements de trésorerie, y compris les ventes, remboursements, dépôts/retraits et les écarts de caisse.
                </p>
              </div>
            </div>

            {/* Item 6 */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6D00] shrink-0 transition-colors group-hover:bg-[#FF6D00]/10">
                <WifiOff size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Ventes hors ligne (Offline Mode)</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Enregistrez les ventes hors ligne et les données se synchroniseront automatiquement au retour de la connexion Internet.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-4 text-left">
          <p className="text-[10px] text-[#6B7280]">
            &copy; {new Date().getFullYear()} Gourmet POS. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Colonne de Droite : Enregistrement multi-étapes */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[#F5F5F7] overflow-y-auto">
        <div className="w-full max-w-[480px] bg-white rounded-[24px] shadow-xl border border-gray-100 p-8 md:p-10 transition-all duration-300">
          
          {/* Step 1: Formulaire d'Inscription */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#171717] tracking-tight mb-2 text-center md:text-left">
                Créez gratuitement votre compte
              </h1>
              <p className="text-[#6B7280] font-medium text-sm mb-6 text-center md:text-left">
                Rejoignez Gourmet POS et commencez à piloter votre établissement.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold px-4 py-3 rounded-[12px] mb-6 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#171717] ml-1 block">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="resto@gourmet.ci"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-[#EFF3F8] rounded-[14px] outline-none text-sm font-medium text-[#171717] border border-[#EFF3F8] focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#171717] ml-1 block">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <Lock size={18} />
                    </span>
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 caractères"
                      required
                      className="w-full pl-11 pr-12 py-3.5 bg-[#EFF3F8] rounded-[14px] outline-none text-sm font-medium text-[#171717] border border-[#EFF3F8] focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/10 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#171717]"
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Nom de la société */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#171717] ml-1 block">
                    Nom de la société
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <Building size={18} />
                    </span>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ex: Chez Awa Cocody"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-[#EFF3F8] rounded-[14px] outline-none text-sm font-medium text-[#171717] border border-[#EFF3F8] focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Pays */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#171717] ml-1 block">
                    Pays
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <Globe size={18} />
                    </span>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-[#EFF3F8] rounded-[14px] outline-none text-sm font-medium text-[#171717] border border-[#EFF3F8] focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/10 focus:bg-white appearance-none transition-all cursor-pointer"
                    >
                      <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                      <option value="Sénégal">Sénégal</option>
                      <option value="Cameroun">Cameroun</option>
                      <option value="Mali">Mali</option>
                      <option value="Burkina Faso">Burkina Faso</option>
                    </select>
                  </div>
                </div>

                {/* Conditions Générales */}
                <label className="flex items-start gap-3 text-xs text-[#6B7280] font-medium pt-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[#EFF3F8] text-[#FF6D00] focus:ring-[#FF6D00]/20 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    J'ai lu et j'accepte les conditions générales d'utilisation et la politique de confidentialité de Loyverse / Gourmet POS.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#FF6D00] hover:bg-[#E66200] disabled:opacity-60 text-white font-extrabold rounded-[18px] shadow-lg shadow-[#FF6D00]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 text-sm"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "S'inscrire"}
                </button>

                {/* Login Redirect */}
                <p className="text-center text-xs font-bold text-[#6B7280] pt-4">
                  Vous avez déjà un compte ?{" "}
                  <a
                    href="/login"
                    className="text-[#FF6D00] hover:text-[#E66200] hover:underline transition-colors"
                  >
                    Se connecter à notre login
                  </a>
                </p>
              </form>
            </div>
          )}

          {/* Step 2: Paramètres de Fonctionnalités (Pop-up Style) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#171717] tracking-tight mb-2">
                  Paramètres de fonctionnalités
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Choisissez les fonctionnalités que vous souhaitez utiliser. Vous pouvez modifier ces paramètres plus tard dans le Back office.
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {/* 1 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Périodes de travail</p>
                    <p className="text-xs text-[#6B7280]">Suivre les espèces qui entrent et sortent de votre tiroir.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("periods")} className="text-[#FF6D00] pt-1">
                    {features.periods ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                {/* 2 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Pointage</p>
                    <p className="text-xs text-[#6B7280]">Suivre l'heure d'arrivée et de départ des employés.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("clockIn")} className="text-[#FF6D00] pt-1">
                    {features.clockIn ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                {/* 3 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Tickets ouverts</p>
                    <p className="text-xs text-[#6B7280]">Autoriser à enregistrer et modifier les commandes avant paiement.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("openTickets")} className="text-[#FF6D00] pt-1">
                    {features.openTickets ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                {/* 4 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Imprimantes cuisine</p>
                    <p className="text-xs text-[#6B7280]">Envoyez des commandes à l'imprimante cuisine ou à son affichage.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("kitchenPrinters")} className="text-[#FF6D00] pt-1">
                    {features.kitchenPrinters ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                {/* 5 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Affichages client</p>
                    <p className="text-xs text-[#6B7280]">Afficher les informations de commande clients au moment de l'achat.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("customerDisplay")} className="text-[#FF6D00] pt-1">
                    {features.customerDisplay ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                {/* 6 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Options de restauration</p>
                    <p className="text-xs text-[#6B7280]">Marquer les commandes comme dîner, à emporter ou livraison.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("diningOptions")} className="text-[#FF6D00] pt-1">
                    {features.diningOptions ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                {/* 7 */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-[#EFF3F8]/50 hover:bg-[#EFF3F8] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#171717]">Notification de stock faibles</p>
                    <p className="text-xs text-[#6B7280]">Recevoir des mails quotidiens sur les articles faibles ou en rupture.</p>
                  </div>
                  <button type="button" onClick={() => toggleFeature("lowStockAlerts")} className="text-[#FF6D00] pt-1">
                    {features.lowStockAlerts ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleFeaturesSubmit}
                  className="px-6 py-2.5 text-xs font-extrabold text-white bg-[#FF6D00] hover:bg-[#E66200] rounded-[10px] shadow-md shadow-[#FF6D00]/10 uppercase transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Définir un Code PIN */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#EFF3F8] text-[#FF6D00] rounded-full flex items-center justify-center mb-4">
                  <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-[#171717] tracking-tight mb-2">
                  DÉFINIR UN CODE PIN
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed max-w-[340px]">
                  La fonction de pointeuse nécessite une authentification par code PIN. Définissez votre propre code PIN pour accéder à l'application Loyverse PDV.
                </p>
              </div>

              {/* PIN Code Dots Indicator */}
              <div className="flex justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 border-gray-300 transition-all ${
                      pin[idx] ? "bg-[#FF6D00] border-[#FF6D00] scale-110" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinKey(num)}
                    className="w-16 h-16 rounded-full bg-[#EFF3F8] hover:bg-[#E2E8F0] active:scale-95 text-lg font-bold text-[#171717] transition-all flex items-center justify-center mx-auto"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin([])}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center"
                >
                  Effacer
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKey("0")}
                  className="w-16 h-16 rounded-full bg-[#EFF3F8] hover:bg-[#E2E8F0] active:scale-95 text-lg font-bold text-[#171717] transition-all flex items-center justify-center mx-auto"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center"
                >
                  Retour
                </button>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setPin([]);
                    setStep(2);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handlePinConfirm}
                  disabled={pin.length < 4}
                  className="px-6 py-2.5 text-xs font-extrabold text-white bg-[#FF6D00] hover:bg-[#E66200] disabled:bg-gray-200 disabled:text-gray-400 rounded-[10px] shadow-md uppercase transition-all"
                >
                  Confirmer
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Finalisation & Redirecting */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <Loader2 className="animate-spin text-[#FF6D00]" size={48} />
              <div className="text-center space-y-1.5">
                <p className="text-base font-bold text-[#171717]">Configuration de votre espace</p>
                <p className="text-xs text-[#6B7280]">Création de votre restaurant et connexion en cours...</p>
              </div>
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
