import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "../UI";
import { fetchCities, type City } from "../Api/CitiesAPI";
import { useAppStore } from "../store";

export type CitySelectorDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect?: (city: City) => void;
  title?: string;
};

/**
 * A simple modal dialog that lists cities from the backend and lets the user select one.
 * - Fetches from GET /cities via `fetchCities()`
 * - Displays each city as a button (using its name)
 */
export default function CitySelectorDialog({
  open,
  onClose,
  onSelect,
  title = "Select your city",
}: CitySelectorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const setSelectedCity = useAppStore((state) => state.setSelectedCity);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCities();
        if (!cancelled) setCities(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to fetch cities");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus the first button when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-selector-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div className="relative z-10 w-full max-w-1/3 rounded-lg bg-white shadow-xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="city-selector-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            aria-label="Close"
            ref={closeButtonRef}
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          {loading && (
            <div className="flex items-center gap-3 text-gray-600">
              <Spinner />
              <span>Loading cities…</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {cities.map((city) => (
                <Button
                  key={city.id}
                  variant="primary"
                  onClick={() => {
                    setSelectedCity(city);
                    onSelect?.(city);
                  }}
                >
                  {city.name}
                </Button>
              ))}
            </div>
          )}

          {!loading && !error && cities.length === 0 && (
            <div className="text-sm text-gray-600">No cities available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
