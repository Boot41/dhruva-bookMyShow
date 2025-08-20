import { useState } from "react";
import CitySelectorDialog from "../components/CitySelectorDialog";
import Header from "../components/header";

export default function LandingPage() {
  const [open, setOpen] = useState(true);
  const [cityName, setCityName] = useState<string | null>(null);

  return (
    <div>
      <Header />

      <CitySelectorDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(city) => {
          setCityName(city.name);
          setOpen(false);
        }}
        title="Select your city"
      />
    </div>
  );
}