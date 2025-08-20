import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/header";
import { getShow, type Show } from "../Api/ShowAPI";
import { getScreen, type Screen } from "../Api/ScreensAPI";

export default function SeatsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const showId = useMemo(() => {
    const v = params.get("show_id");
    return v ? Number(v) : undefined;
  }, [params]);

  const [show, setShow] = useState<Show | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!showId) {
      setError("Missing show_id");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await getShow(showId);
        if (!active) return;
        setShow(s);
        const scr = await getScreen(s.screen_id);
        if (!active) return;
        setScreen(scr);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load seats");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [showId]);

  // Render seats using rows/columns from layout_config when available; fallback to square
  const grid = useMemo(() => {
    if (!screen) return { rows: 0, cols: 0, total: 0 };
    const total = Math.max(0, Number(screen.total_seats) || 0);

    const cfg: any = screen.layout_config ?? {};
    // Try to resolve rows/columns from common keys
    const rowsFromCfg: number | undefined =
      typeof cfg.rows === "number" ? cfg.rows :
      typeof cfg.rows_count === "number" ? cfg.rows_count :
      typeof cfg.num_rows === "number" ? cfg.num_rows : undefined;
    const colsFromCfg: number | undefined =
      typeof cfg.columns === "number" ? cfg.columns :
      typeof cfg.cols === "number" ? cfg.cols :
      typeof cfg.columns_count === "number" ? cfg.columns_count :
      typeof cfg.num_columns === "number" ? cfg.num_columns : undefined;

    let rows = rowsFromCfg ?? 0;
    let cols = colsFromCfg ?? 0;

    if (!rows || !cols) {
      // Fallback: near-square
      const size = Math.ceil(Math.sqrt(total));
      rows = size;
      cols = size;
    }

    return { rows, cols, total };
  }, [screen]);

  return (
    <div>
      <Header />
      <div className="px-4 md:px-6 lg:px-10 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button className="text-rose-600 hover:underline" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <span>/</span>
          <span>Choose Seats</span>
        </div>

        <h1 className="text-2xl font-semibold mt-3">Select your seats</h1>
        {show && screen && (
          <p className="text-gray-600 mt-1">
            Screen: <span className="font-medium">{screen.name}</span>
            {screen.screen_type ? ` · ${screen.screen_type}` : ""} · Capacity: {screen.total_seats}
          </p>
        )}

        <div className="mt-4">
          {loading && <div className="text-gray-600">Loading seats…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && screen && (
            <div className="border rounded-md p-4 bg-white">
              <div className="text-center text-xs text-gray-500 mb-3">SCREEN</div>
              {grid.rows > 0 && grid.cols > 0 ? (
                <div
                  className="mx-auto"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${grid.cols}, 2rem)`,
                    gap: "0.25rem",
                    justifyContent: "center",
                  }}
                >
                  {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
                    const seatNum = i + 1;
                    const exists = seatNum <= grid.total;
                    return (
                      <button
                        key={i}
                        className={`w-8 h-8 text-xs rounded border ${
                          exists ? "bg-emerald-50 hover:bg-emerald-100" : "bg-gray-100 text-transparent cursor-default"
                        }`}
                        disabled={!exists}
                        title={exists ? `Seat ${seatNum}` : ""}
                      >
                        {exists ? seatNum : ""}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-600">No seats configured.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
