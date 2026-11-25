/* ================================================================ STUB CONFIGS */
/*
 * When a card is added from Home Assistant's card picker, Home Assistant calls getStubConfig(hass, …) and opens the editor on the result.
 * Instead of an empty card, each SF card then arrives filled with the user's own entities, found the same way as the automatic dashboard
 * (areas, device classes, the Energy dashboard settings): the card shows the house at once, and the editor shows what was picked.
 * Everything here is only a suggestion written into the config; no service is ever called. Lists are kept short (the card picker may draw
 * a live preview of several cards at once). Without hass (tests, very old frontends) or when nothing fits, the plain stub of the editor
 * spec is used, exactly as before.
 */
const SF_STUB_MAX = 6;
async function sfStubFor(tag, hass) {
  if (!hass || !hass.states || typeof hass.states !== "object") return null;
  const { states, G, LC, areas, name } = sfHomeScan({}, hass), first = (list, n = SF_STUB_MAX) => list.slice(0, n);
  const ids = (dom) => Object.keys(states).filter((id) => id.startsWith(dom + ".") && SF_EID.test(id)).sort();
  switch (sfCanon(tag)) {
    case "sf-bridge-card": {
      const o = {};
      if (G.weather) o.weather = G.weather;
      if (G.people.length) o.people = first(G.people, 4).map((p) => ({ name: name(p), entity: p }));
      if (G.leaks.length) o.leaks = first(G.leaks, 10);
      return o;
    }
    case "sf-climate-card": {
      const rooms = first(areas.filter((a) => a.climate)).map((a) => ({ name: a.name, climate: a.climate, ...(a.temp ? { temp: a.temp } : {}), ...(a.hum ? { hum: a.hum } : {}) }));
      return rooms.length ? { rooms, extras: [] } : null;
    }
    case "sf-console-card": {   // the lights of the first rooms that have some, one group per room
      const groups = []; let n = 0;
      for (const a of areas) {
        const list = (LC.light[a.id] || []).slice(0, Math.max(0, SF_STUB_MAX - n));
        if (!list.length) continue;
        n += list.length;
        groups.push({ title: a.name, icon: "mdi:lightbulb-group", items: list.map((i) => ({ kind: i.dim ? "dimmer" : "toggle", entity: i.id, label: name(i.id) })) });
        if (n >= SF_STUB_MAX) break;
      }
      return groups.length ? { groups } : null;
    }
    case "sf-room-card": return areas.length ? { area: areas[0].id } : null;
    case "sf-weather-card": return G.weather ? { weather: G.weather } : null;
    case "sf-media-card": return G.media.length ? { entities: first(G.media, 4) } : null;
    case "sf-agenda-card": {
      const timers = first(ids("timer"), 4), o = {};
      if (G.calendars.length) o.calendars = first(G.calendars, 4);
      if (timers.length) o.timers = timers;
      return o;
    }
    case "sf-air-card": {
      const rooms = first(areas.filter((a) => a.temp && a.hum), 4).map((a) => ({ name: a.name, temperature: a.temp, humidity: a.hum }));
      return G.weather && rooms.length ? { weather: G.weather, rooms } : null;
    }
    case "sf-alert-card": {
      const o = { leaks: first(G.leaks, 10), doors: first(G.openings, 10) };
      if (G.alarm) o.alarm = G.alarm;
      return o;
    }
    case "sf-camera-card": return G.cameras.length ? { cameras: first(G.cameras, 4).map((x) => ({ entity: x, name: name(x) })) } : null;
    case "sf-timeline-card": {
      const entities = first([...(G.alarm ? [G.alarm] : []), ...G.locks, ...G.openings], 10);
      return entities.length ? { hours: 24, entities } : null;
    }
    case "sf-trend-card": {
      const series = first(areas.filter((a) => a.temp), 3).map((a) => ({ entity: a.temp, name: a.name }));
      return series.length ? { series } : null;
    }
    case "sf-radiators-card": {   // heaters driven by presets: a climate entity that offers at least two presets and cannot cool
      const radiators = first(ids("climate").filter((id) => {
        const at = (states[id] && states[id].attributes) || {}, modes = Array.isArray(at.hvac_modes) ? at.hvac_modes : [];
        return Array.isArray(at.preset_modes) && at.preset_modes.length >= 2 && !modes.some((m) => m === "cool" || m === "heat_cool");
      })).map((id) => ({ name: name(id), climate: id }));
      return radiators.length ? { radiators } : null;
    }
    case "sf-assistant-card": { const sat = ids("assist_satellite")[0]; return sat ? { name: name(sat), state: sat } : null; }
    case "sf-report-card": {
      const rep = await sfHomeEnergyReport(hass, states, name);
      return rep && (rep.grid || rep.solar) ? rep : null;
    }
    default: return null;
  }
}
