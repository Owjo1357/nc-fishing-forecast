import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOCATIONS } from "./config/locations.js";
import { buildDays } from "./lib/appLogic.js";
import { loadForecast } from "./lib/dataFetch.js";

import Header from "./components/Header.jsx";
import DayTabs from "./components/DayTabs.jsx";
import OutlookCard from "./components/OutlookCard.jsx";
import MetricRow from "./components/MetricRow.jsx";
import MorningBreakdown from "./components/MorningBreakdown.jsx";
import SpeciesCard from "./components/SpeciesCard.jsx";
import SpotsCard from "./components/SpotsCard.jsx";
import Footer from "./components/Footer.jsx";
import { DataNotice, ErrorState, LoadingSkeleton } from "./components/states.jsx";

export default function App() {
  const location = LOCATIONS[0];

  const [state, setState] = useState({ status: "loading", raw: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const touchStartY = useRef(null);

  const fetchData = useCallback(
    async (force) => {
      if (force) setRefreshing(true);
      try {
        const { data } = await loadForecast({ location, force });
        setState({ status: "ready", raw: data, error: null });
      } catch (e) {
        setState((prev) =>
          prev.raw
            ? { ...prev, error: e.message } // keep showing stale data, flag the error
            : { status: "error", raw: null, error: e.message }
        );
      } finally {
        if (force) setRefreshing(false);
      }
    },
    [location]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Re-check when the tab regains focus and the cache is stale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  // Lightweight pull-to-refresh: a downward drag from the very top.
  useEffect(() => {
    const onStart = (e) => {
      touchStartY.current = window.scrollY === 0 ? e.touches[0].clientY : null;
    };
    const onEnd = (e) => {
      if (touchStartY.current === null) return;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      if (dy > 90 && !refreshing) fetchData(true);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [fetchData, refreshing]);

  const built = useMemo(() => {
    if (!state.raw) return null;
    try {
      return buildDays(state.raw, location);
    } catch (e) {
      console.error(e);
      return { error: e.message };
    }
  }, [state.raw, location]);

  const effectiveSelected = selected === null && built && !built.error ? built.defaultIndex : selected;

  return (
    <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: 720 }}>
      <Header
        location={location}
        allLocations={LOCATIONS}
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
      />

      {state.status === "loading" && <LoadingSkeleton />}

      {state.status === "error" && (
        <ErrorState
          message="Couldn't load the forecast."
          detail={state.error}
          onRetry={() => {
            setState({ status: "loading", raw: null, error: null });
            fetchData(false);
          }}
        />
      )}

      {state.status === "ready" && built && (
        <>
          {state.error && (
            <DataNotice text={`Live refresh failed (${state.error}). Showing the last data that loaded.`} />
          )}
          {state.raw.dataNotice && <DataNotice text={state.raw.dataNotice} />}

          {built.error ? (
            <ErrorState
              message="Something went wrong scoring today's forecast."
              detail={built.error}
              onRetry={() => fetchData(true)}
            />
          ) : built.days.length === 0 ? (
            <ErrorState message="No forecast or tide data is available for this location yet." onRetry={() => fetchData(true)} />
          ) : (
            <>
              <DayTabs days={built.days} selected={effectiveSelected} onSelect={setSelected} />
              {built.days[effectiveSelected] && (
                <>
                  <OutlookCard day={built.days[effectiveSelected]} />
                  <MetricRow day={built.days[effectiveSelected]} />
                  <MorningBreakdown day={built.days[effectiveSelected]} />
                  <SpeciesCard species={built.days[effectiveSelected].species} />
                  <SpotsCard spots={built.days[effectiveSelected].spots} />
                </>
              )}
            </>
          )}
        </>
      )}

      <Footer
        location={location}
        fetchedAt={state.raw ? state.raw.fetchedAt : null}
        weatherConnected={!!(state.raw && state.raw.weather)}
        marineConnected={!!(state.raw && state.raw.marine)}
      />
    </div>
  );
}
