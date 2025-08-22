import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CitySelectorDialog from "../components/CitySelectorDialog";
import Header from "../components/header";
import { useAppStore } from "../store";
import LandingMovieBanner from "../layout/landingMovieBanner";

export default function LandingPage() {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const [open, setOpen] = useState(!selectedCity);
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setOpen(!selectedCity);
  }, [selectedCity]);

  // Show toast if passed via navigation state (e.g., after booking)
  useEffect(() => {
    const s: any = location.state as any;
    if (s && s.toast) {
      setToast(s.toast);
      // Clear the navigation state to avoid duplicate toasts
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Auto-hide toast based on its own state
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div>
      <Header enableCitySelect />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 z-20 min-w-[220px] max-w-xs px-4 py-3 rounded shadow-lg border text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.message}
          <button
            type="button"
            aria-label="Close notification"
            className="absolute top-1 right-1 h-7 w-7 inline-flex items-center justify-center rounded hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20"
            onClick={() => setToast(null)}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      )}

      <CitySelectorDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={() => {
          setOpen(false);
        }}
        title="Select your city"
      />

      {selectedCity && (
        <div className="p-4">
          <h2 className="text-xl font-semibold">
            {selectedCity.name}
          </h2>
          <p className="text-gray-600">
            {selectedCity.state && `${selectedCity.state}, `}
            {selectedCity.country}
          </p>
        </div>
      )}

      {/* Recommended Movies Banner */}
      <div className="flex justify-center">
        <LandingMovieBanner />
      </div>
    </div>
  );
}