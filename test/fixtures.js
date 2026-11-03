// Shared test fixtures: fake states (`base`), the HASS factory and one full configuration per card (`FULL`). Loaded by render.html and snapshot.html.
const S = (state, attrs = {}) => ({ state: String(state), attributes: attrs });
const U = (v, unit) => S(v, { unit_of_measurement: unit });
const base = {
  "sensor.grid": U(850, "W"), "sensor.solar": U(2400, "W"), "sensor.ev": U(1800, "W"), "sensor.pac": U(600, "W"),
  "sensor.bat_soc": U(62, "%"), "sensor.bat_p": U(-1200, "W"), "sensor.kwh": U(2.1, "kWh"), "sensor.eur": U(1.2, "€"),
  "sensor.price": U(0.18, "€"), "sensor.temp": U(20.5, "°C"), "sensor.hum": U(55, "%"), "sensor.out": U(11, "°C"),
  "sensor.solar_left": U(4.2, "kWh"), "sensor.fossil": U(12, "%"),
  "weather.home": S("sunny", { temperature: 12 }),
  "climate.room": S("auto", { hvac_action: "heating", preset_modes: ["comfort", "eco", "away", "none"], preset_mode: "eco", temperature: 20, min_temp: 7, max_temp: 30 }),
  "select.room_preset": S("eco", { options: ["auto", "comfort", "eco", "away", "none"] }),
  "input_number.target": U(20, "°C"), "input_boolean.auto": S("on"), "binary_sensor.window": S("off"), "binary_sensor.door": S("off"),
  "binary_sensor.leak": S("off"), "binary_sensor.net": S("on"), "binary_sensor.charging": S("off"), "binary_sensor.connected": S("on"),
  "input_select.mode": S("Auto", { options: ["Auto", "Eco", "Boost"] }), "number.current": U(10, "A"),
  "light.lamp": S("on", { brightness: 128 }), "switch.plug": S("on"), "cover.shutter": S("closed", { current_position: 0 }),
  "script.go": S("off"), "alarm_control_panel.home": S("disarmed"), "camera.front": S("idle"), "person.alice": S("home"),
  "sensor.car_soc": U(55, "%"), "sensor.car_range": U(180, "km"), "sensor.car_target": U(80, "%"),
  "lock.car": S("locked"), "vacuum.robot": S("docked"), "sensor.robot_bat": U(80, "%"), "button.sc1": S("unknown"), "scene.dim": S("scening"), "media_player.tv": S("off"),
  "input_select.ns_mode": S("Jour"), "sensor.fridge": U(4.2, "°C"), "sensor.freezer": U(-19, "°C"), "number.cur": U(8, "A"), "sensor.kwh_imp": U(1, "kWh"), "sensor.kwh_sol": U(2, "kWh"), "sensor.kwh_exp": U(0.5, "kWh"),
  "sensor.dev_bat": S(18, { unit_of_measurement: "%", device_class: "battery", friendly_name: "Sensor A battery" }),
};
// As in HA, every state carries its entity_id.
const withIds = (states) => Object.fromEntries(Object.entries(states).map(([id, st]) => [id, { entity_id: id, last_changed: new Date().toISOString(), ...st }]));
const HASS = (states, language) => ({ states: withIds(states), locale: { language }, language, callService: () => Promise.resolve() });

// One full configuration per card (the identifiers above are fictitious).
const FULL = {
  "sf-assistant-card": { name: "Assistant", state: "assist_satellite.kitchen", request: "sensor.as_req", action: "sensor.as_act", result: "sensor.as_res", reply: "sensor.as_rep", actions: [{ name: "Stop", icon: "mdi:stop", service: "script.stop", confirm: "Stop?" }] },
  "sf-health-card": { title: "Health", checks: [{ name: "Internet", entity: "binary_sensor.net", ok: ["on"], severity: "critical", group: "Network" }, { name: "UPS", entity: "sensor.ups", min: 30 }] },
  "sf-timeline-card": { title: "Log", hours: 24, entities: ["binary_sensor.door", { entity: "alarm_control_panel.home", name: "Alarm", states: ["triggered"], min_gap: 5 }] },
  "sf-trend-card": { title: "Trend", window: "today", ranges: ["today", 24], series: [{ entity: "sensor.temp_a", name: "A", factor: 1 }, { entity: "sensor.temp_b", name: "B", color: "#ffb300", axis: "right", attribute: "watts" }] },
  "sf-alert-card": { leaks: ["binary_sensor.leak"], doors: ["binary_sensor.door"], alarm: "alarm_control_panel.home", hide_sim: true },
  "sf-hangar-card": { cars: [{ name: "Car", soc: "sensor.car_soc", range: "sensor.car_range", target: "sensor.car_target", charging: "binary_sensor.charging" }],
    charger: { connected: "binary_sensor.connected", charging: "binary_sensor.charging", power: "sensor.ev", current: "number.current" }, mode: "input_select.mode",
    flows: { solar: "sensor.solar", home: "sensor.pac", surplus: "sensor.grid" } },
  "sf-radar-card": { people: [{ name: "Alice", person: "person.alice", color: "#00e5ff" }], rooms: [{ label: "Living", entity: "binary_sensor.door" }] },
  "sf-machines-card": { title: "Equipment", tiles: [{ label: "A", entity: "sensor.temp", kind: "value", warn: 30, spark: 24 }, { label: "B", entity: "switch.plug", kind: "toggle" }, { label: "C", entity: "binary_sensor.net", kind: "binary" }, { label: "D", entity: "weather.home", kind: "text" }] },
  "sf-bridge-card": { weather: "weather.home", outdoor: "sensor.out", price: "sensor.price", hc_price: "sensor.price", mode: "input_select.mode", solar_left: "sensor.solar_left",
    internet: "binary_sensor.net", leaks: ["binary_sensor.leak"], doors: ["binary_sensor.door"], people: [{ name: "Alice", entity: "person.alice" }] },
  "sf-reactor-card": { solar: "sensor.solar", grid: "sensor.grid", fossil: "sensor.fossil", price: "sensor.price", battery_soc: "sensor.bat_soc", battery_power: "sensor.bat_p",
    devices: [{ name: "EV", entity: "sensor.ev", icon: "mdi:car" }, { name: "Heat pump", entity: "sensor.pac", icon: "mdi:heat-pump" }] },
  "sf-climate-card": { mode: "input_select.mode", rooms: [{ name: "Living", climate: "climate.room", temp: "sensor.temp", hum: "sensor.hum", target: "input_number.target", regul: "input_boolean.auto", window: "binary_sensor.window" }] },
  "sf-console-card": { title: "Controls", groups: [{ title: "Home", items: [{ kind: "dimmer", entity: "light.lamp", label: "Lamp" }, { kind: "toggle", entity: "switch.plug", label: "Plug" },
    { kind: "cover", entity: "cover.shutter", label: "Shutter" }, { kind: "select", entity: "input_select.mode", label: "Mode" }, { kind: "sensor", entity: "sensor.temp", label: "Temp" },
    { kind: "action", label: "Go", service: "script.turn_on", data: { entity_id: "script.go" } }] }] },
  "sf-camera-card": { cameras: [{ entity: "camera.front", name: "Front" }] },
  "sf-setpoints-card": { columns: [{ label: "Day" }], rows: [{ name: "Living", entities: ["input_number.target"] }] },
  "sf-ledger-card": { total_cost: "sensor.eur", solar_fraction: "sensor.fossil", avg_price: "sensor.price", devices: [{ name: "EV", total: "sensor.kwh", edf: "sensor.kwh", solar: "sensor.kwh", cost: "sensor.eur" }] },
  "sf-ns-card": { weather: "weather.home", outdoor: "sensor.out", mode_entity: "input_select.ns_mode", cover: "cover.shutter", scene_dim: "scene.dim", lights_off: ["light.lamp"],
    rooms: [{ name: "Living room", icon: "mdi:sofa", entity: "sensor.temp", min: 15 }, { name: "Bedroom", icon: "mdi:bed", entity: "sensor.temp" }],
    fridge: [{ name: "Fridge", icon: "mdi:fridge", entity: "sensor.fridge", max: 6 }, { name: "Freezer", icon: "mdi:snowflake", entity: "sensor.freezer", max: -15 }],
    cars: [{ name: "Car A", color: "#00e5ff", soc: "sensor.car_soc", range: "sensor.car_range", lock: "lock.car", charging: "binary_sensor.charging", low: 20 }, { name: "Car B", color: "#ff3bd4", soc: "sensor.bat_soc" }],
    leaks: [{ name: "Kitchen", entity: "binary_sensor.leak" }],
    tiles: [{ name: "Lamp", icon: "mdi:lamp", color: "#ffb300", entity: "light.lamp" }, { name: "Plug", icon: "mdi:power-plug", color: "#2bff88", entity: "switch.plug" }, { name: "Shutters", icon: "mdi:window-shutter", color: "#00e5ff", entity: "cover.shutter" },
      { name: "Dim", icon: "mdi:weather-night", color: "#b388ff", entity: "scene.dim" }, { name: "TV", icon: "mdi:television", color: "#ff7043", entity: "media_player.tv" }],
    shortcuts: [{ name: "Kitchen", icon: "mdi:silverware", entity: "button.sc1" }, { name: "Hall", icon: "mdi:door", entity: "button.sc1" }],
    vacuum: { entity: "vacuum.robot", battery: "sensor.robot_bat", name: "Robot" },
    energy: { solar: "sensor.solar", home: "sensor.pac", grid: "sensor.grid", ev: "sensor.ev", ev_connected: "binary_sensor.connected", price: "sensor.price", hc_below: 0.15, ev_current: "number.cur",
      ev_solar: "sensor.kwh", ev_grid: "sensor.kwh", devices: [{ name: "Heat pump", entity: "sensor.pac", icon: "mdi:heat-pump" }],
      day: { import: "sensor.kwh_imp", export: "sensor.kwh_exp", solar: "sensor.kwh_sol", hp: 0.2, hc: 0.1, hc_hours: [[0, 6]] } } },
  "sf-cells-card": {},
  "sf-radiators-card": { radiators: [{ name: "Room", climate: "climate.room", preset: "select.room_preset", kwh: "sensor.kwh" }], setpoint: false },
  "sf-battery-card": { soc: "sensor.bat_soc", power: "sensor.bat_p", capacity_kwh: 10, charged_today: "sensor.kwh", discharged_today: "sensor.kwh", temperature: "sensor.temp", health: "sensor.hum", cycles: "sensor.kwh", mode: "input_select.mode" },
  "sf-launcher-card": { tiles: [{ name: "Climate", summary: "room", card: { type: "custom:sf-climate-card", rooms: [{ name: "L", climate: "climate.room", temp: "sensor.temp", target: "input_number.target" }] } },
    { name: "Battery", summary: "battery", card: { type: "custom:sf-battery-card", soc: "sensor.bat_soc", power: "sensor.bat_p" } }] },
};
// Same thing without any solar-production or battery entity: nothing "solar" must appear.
const NOSOLAR = {
  "sf-bridge-card": { weather: "weather.home", outdoor: "sensor.out", price: "sensor.price" },
  "sf-reactor-card": { grid: "sensor.grid", devices: [{ name: "EV", entity: "sensor.ev" }] },
  "sf-ledger-card": { total_cost: "sensor.eur", devices: [{ name: "EV", total: "sensor.kwh", cost: "sensor.eur" }] },
  "sf-hangar-card": { cars: [], charger: { power: "sensor.ev" }, flows: { home: "sensor.pac" } },
  "sf-launcher-card": { tiles: [{ name: "Energy", summary: "energy", card: { type: "custom:sf-reactor-card", grid: "sensor.grid" } }] },
};

const failures = [];
const fail = (m) => failures.push(m);
