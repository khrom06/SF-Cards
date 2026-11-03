function sfClean(v) {
  if (Array.isArray(v)) return v.map(sfClean);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      if (x === "" || x === null || x === undefined) continue;
      const c = sfClean(x);
      if (x && typeof x === "object" && (Array.isArray(c) ? c.length === 0 : Object.keys(c).length === 0)) continue;   // no "charger: {}" nor empty lists in the emitted YAML
      o[k] = c;
    }
    return o;
  }
  return v;
}

/* ===================================================== AUTO-FILL (editor) */
/* You pick a device (car, charger, battery): the editor finds its entities from their type (device_class, unit, name) and
 * fills the fields that are still empty. Best effort: re-read and correct if needed, nothing is ever overwritten. Requires the entity
 * inventory of HA (`hass.entities`). */
function sfGuess(hass, deviceId, kind) {
  const ents = hass && hass.entities ? Object.values(hass.entities) : [];
  const L = ents.filter((e) => e.device_id === deviceId && !e.hidden && hass.states[e.entity_id]).map((e) => ({ id: e.entity_id, st: hass.states[e.entity_id] }));
  const dom = (x) => x.id.split(".")[0], dc = (x) => x.st.attributes.device_class, unit = (x) => String(x.st.attributes.unit_of_measurement || "").toLowerCase();
  // A field is only filled when the choice is safe: an entity that matches a preference, or the only candidate. Several candidates without a
  // preference = ambiguous = left empty (better a field to fill by hand than a wrong sensor).
  const pick = (pred, ...prefs) => { const c = L.filter(pred); for (const re of prefs) { const m = c.find((x) => re.test(x.id)); if (m) return m.id; } return c.length === 1 ? c[0].id : undefined; };
  const dev = hass && hass.devices && hass.devices[deviceId], out = { name: dev && (dev.name_by_user || dev.name) };
  const net = /wifi|network|signal|rssi|ssid|online|connectivity|ping|uptime/;
  if (kind === "car") {
    out.soc = pick((x) => dom(x) === "sensor" && dc(x) === "battery" && unit(x) === "%" && !/12v|12_v|aux|key|fob|remote/.test(x.id), /soc|state_of_charge|battery_level|battery_percentage|hv|traction/);
    out.range = pick((x) => dom(x) === "sensor" && (dc(x) === "distance" || ["km", "mi"].includes(unit(x))) && !/odometer|mileage|driven|trip|service|since/.test(x.id), /range|autonomy|remaining/);
    out.target = pick((x) => ["sensor", "number"].includes(dom(x)) && unit(x) === "%" && /target|limit|max_charge/.test(x.id));
    out.charging = pick((x) => (dom(x) === "binary_sensor" && ["battery_charging", "plug"].includes(dc(x))) || (dom(x) === "sensor" && /charging_state|charge_state|charging_status/.test(x.id)), /charging/);
  } else if (kind === "charger") {
    out.connected = pick((x) => !net.test(x.id) && ((dom(x) === "binary_sensor" && dc(x) === "plug") || (["sensor", "binary_sensor"].includes(dom(x)) && /(^|_)(plug|plugged|cable|vehicle_connected|car_connected)(_|$)/.test(x.id))), /plug|cable/);
    out.charging = pick((x) => !net.test(x.id) && ((dom(x) === "binary_sensor" && dc(x) === "battery_charging") || (["sensor", "binary_sensor"].includes(dom(x)) && /charging$/.test(x.id)) || (dom(x) === "sensor" && /(status|state)$/.test(x.id))), /charging/, /status|state/);
    out.power = pick((x) => dom(x) === "sensor" && dc(x) === "power" && !/solar|pv|grid|house|home/.test(x.id), /charg|session|evse|wallbox/);
    out.current = pick((x) => dom(x) === "number" && unit(x) === "a", /charg|limit|current/) || pick((x) => dom(x) === "sensor" && dc(x) === "current", /charg/);
    // Switch: only "charge / charging"; never pause, lock, schedule… (inverted meaning or a different action).
    out.switch = pick((x) => dom(x) === "switch" && /(^|_)(charging|charge)(_|$)/.test(x.id) && !/pause|paus|hold|lock|schedule|limit|smart/.test(x.id), /charging/);
  } else if (kind === "battery") {
    out.soc = pick((x) => dom(x) === "sensor" && dc(x) === "battery" && unit(x) === "%", /soc|state_of_charge|level/);
    // A battery's power is the battery's, not the solar's or the grid's; its sign is not guessed (to check: `invert`).
    out.power = pick((x) => dom(x) === "sensor" && dc(x) === "power" && !/solar|pv|grid|house|home|load/.test(x.id), /batt|storage|bat_/);
    out.charged_today = pick((x) => dom(x) === "sensor" && dc(x) === "energy" && /charg/.test(x.id) && !/discharg/.test(x.id) && /today|daily|day/.test(x.id));
    out.discharged_today = pick((x) => dom(x) === "sensor" && dc(x) === "energy" && /discharg/.test(x.id) && /today|daily|day/.test(x.id));
    out.temperature = pick((x) => dom(x) === "sensor" && dc(x) === "temperature");
    out.health = pick((x) => dom(x) === "sensor" && /health|soh/.test(x.id));
    out.cycles = pick((x) => dom(x) === "sensor" && /cycle/.test(x.id));
  }
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}
function sfAutofill(hass, data, deviceId, kind) {
  const g = sfGuess(hass, deviceId, kind);
  for (const [k, v] of Object.entries(g)) if (data[k] === undefined || data[k] === "") data[k] = v;
  return Object.keys(g).length;
}
const sfDev = (kind) => ({ name: "_device", sfFill: kind, selector: { device: {} } });

