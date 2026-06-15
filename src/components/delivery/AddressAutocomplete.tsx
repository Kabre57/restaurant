"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSelectCoordinates?: (coords: { lat: number; lng: number }) => void;
  lightTheme?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Saisir une adresse de livraison...",
  onSelectCoordinates,
  lightTheme = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions (mocked if Google Places is not loaded/configured)
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    // Simulate Google Places Autocomplete or fetch from search endpoint
    // To ensure it works beautifully in dev/test, we provide mock suggestions
    setTimeout(() => {
      const mockAddresses = [
        `${query}, Boulevard Latrille, Abidjan`,
        `${query}, Rue des Jardins, Cocody, Abidjan`,
        `${query}, Zone 4, Marcory, Abidjan`,
        `${query}, Boulevard de Marseille, Biétry, Abidjan`,
        `${query}, Plateau, Abidjan`,
      ];
      setSuggestions(mockAddresses);
      setLoading(false);
    }, 300);
  };

  const handleSelect = (address: string) => {
    onChange(address);
    setIsOpen(false);
    if (onSelectCoordinates) {
      // Mock coordinates resolution
      const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const lat = 5.3096 + (hash % 100) / 1000;
      const lng = -4.0127 + (hash % 50) / 1000;
      onSelectCoordinates({ lat, lng });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${lightTheme ? "text-[#adb5bd]" : "text-slate-500"}`} />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full rounded-xl pl-10 pr-10 py-3 text-xs transition-all outline-none ${
            lightTheme
              ? "bg-white border border-[#e9ecef] text-[#212529] placeholder:text-[#adb5bd] focus:border-[#212529] focus:ring-1 focus:ring-[#212529]"
              : "bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder:text-slate-650"
          }`}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
        ) : (
          <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${lightTheme ? "text-[#adb5bd]" : "text-slate-600"}`} />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className={`absolute z-[120] left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto border backdrop-blur-md ${
          lightTheme
            ? "bg-white border-[#e9ecef]"
            : "bg-slate-900 border-slate-800"
        }`}>
          {suggestions.map((address, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(address)}
              className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2.5 transition-colors border-b last:border-b-0 ${
                lightTheme
                  ? "text-[#495057] hover:bg-[#f8f9fa] hover:text-[#212529] border-[#e9ecef]"
                  : "text-slate-300 hover:bg-indigo-600/10 hover:text-white border-slate-850"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
