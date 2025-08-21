import { useEffect, useState } from "react";
import CitySelectorDialog from "../components/CitySelectorDialog";
import Header from "../components/header";
import { useAppStore } from "../store";
import LandingMovieBanner from "../layout/landingMovieBanner";

export default function LandingPage() {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const [open, setOpen] = useState(!selectedCity);

  useEffect(() => {
    setOpen(!selectedCity);
  }, [selectedCity]);

  return (
    <div>
      <Header enableCitySelect />

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