import { useState } from "react";
import CitySelectorDialog from "../components/CitySelectorDialog";
import Header from "../components/header";
import { useAppStore } from "../store";
import LandingMovieBanner from "../layout/landingMovieBanner";

export default function LandingPage() {
  const [open, setOpen] = useState(true);
  const selectedCity = useAppStore((state) => state.selectedCity);

  return (
    <div>
      <Header />

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
            Selected City: {selectedCity.name}
          </h2>
          <p className="text-gray-600">
            {selectedCity.state && `${selectedCity.state}, `}
            {selectedCity.country}
          </p>
        </div>
      )}

      {/* Recommended Movies Banner */}
      <LandingMovieBanner />
    </div>
  );
}