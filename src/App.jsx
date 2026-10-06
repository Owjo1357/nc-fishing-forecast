import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { LOCATIONS, findLocation } from "./config/locations.js";
import { buildDays } from "./lib/appLogic.js";
import { loadForecast } from "./lib/dataFetch.js";

import Header from "./components/Header.jsx";
import DayTabs from "./components/DayTabs.jsx";
import AlertBanner from "./components/AlertBanner.jsx";
import OutlookCard from "./components/OutlookCard.jsx";
import MetricRow from "./components/MetricRow.jsx";
import MorningBreakdown from "./components/MorningBreakdown.jsx";
import SpeciesCard from "./components/SpeciesCard.jsx";
import SpotsCard from "./components/SpotsCard.jsx";
import Footer from "./components/Footer.jsx";
import { DataNotice, ErrorState, LoadingSkeleton } from "./components/states.jsx";

const LAST_LOCATION_KEY = "nc-fishing-forecast:location";

// Each location lives at its own path (/cape-lookout) so it can be
// bookmarked. The bare root opens whichever location was used last.
function locationFromUrl() {
  const fromPath = findLocation(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  if (fromPath) return fromPath;
  try {
    const remembered = findLocation(localStorage.getItem(LAST_LOCATION_KEY));
    if (remembered) return remembered;
  } catch {
    /* storage unavailable -- fall through to the default */
  }
  return LOCATIONS[0];
}

function rememberLocation(id) {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, id);
  } catch {
    /* non-fatal */
  }
}

// A browser reload (Ctrl+R, pull-down on a phone) should mean "get me
// fresh numbers", not "show me the hour-old cache".
function pageWasReloaded() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    return !!nav && nav.type === "reload";
  } catch {
    return false;
  }
}

export default function App() {
  const [location, setLocation] = useState(locationFromUrl);

  const [state, setState] = useState({ status: "loading", raw: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  // The selected day is tracked by date, not array position, so it stays
  // on the same day when a refresh drops yesterday off the front.
  const [selectedDate, setSelectedDate] = useState(null);
  const touchStartY = useRef(null);
  const forceFirstLoad = useRef(pageWasReloaded());

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
    document.title = `${location.name} · NC Fishing Forecast`;
    const force = forceFirstLoad.current;
    forceFirstLoad.current = false;
    fetchData(force);
  }, [fetchData, location]);

  const changeLocation = useCallback((id) => {
    const next = findLocation(id);
    if (!next) return;
    window.history.pushState(null, "", `/${next.id}`);
    setState({ status: "loading", raw: null, error: null });
    setLocation(next);
  }, []);

  // Give every history entry an explicit path (the bare root becomes
  // /masonboro-inlet, say) so Back/Forward always know which location
  // they mean, and the address bar is always shareable.
  useEffect(() => {
    if (window.location.pathname !== `/${location.id}`) {
      window.history.replaceState(null, "", `/${location.id}${window.location.search}`);
    }
    rememberLocation(location.id);
  }, [location]);

  const locationId = location.id;
  useEffect(() => {
    const onPop = () => {
      const next = locationFromUrl();
      if (next.id === locationId) return;
      setState({ status: "loading", raw: null, error: null });
      setLocation(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [locationId]);

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

  const days = built && built.days ? built.days : [];
  const pickedIndex = selectedDate === null ? -1 : days.findIndex((d) => d.dateStr === selectedDate);
  const effectiveSelected = pickedIndex >= 0 ? pickedIndex : built && !built.error ? built.defaultIndex : null;
  const todayIndex = days.findIndex((d) => d.dayIndexFromToday === 0);
  const selectDay = (i) => setSelectedDate(days[i] ? days[i].dateStr : null);

  return (
    <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: 720 }}>
      <Analytics />
      <Header
        location={location}
        allLocations={LOCATIONS}
        onChangeLocation={changeLocation}
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
              <DayTabs
                days={built.days}
                selected={effectiveSelected}
                onSelect={selectDay}
                todayIndex={todayIndex}
              />
              {built.days[effectiveSelected] && (
                <>
                  <AlertBanner
                    alerts={built.days[effectiveSelected].alerts}
                    dateStr={built.days[effectiveSelected].dateStr}
                    location={location}
                  />
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
        tidesConnected={!!(state.raw && state.raw.tides)}
        alertsConnected={!!(state.raw && Array.isArray(state.raw.alerts))}
      />
    </div>
  );
}
