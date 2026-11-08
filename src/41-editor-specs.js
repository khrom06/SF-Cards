const SF_KINDS = [["toggle", "Interrupteur / lumière"], ["dimmer", "Lampe avec variation"], ["action", "Bouton d'action (service)"],
  ["sensor", "Valeur à afficher"], ["cover", "Volets"], ["vacuum", "Aspirateur"], ["stepper", "Réglage + / −"], ["select", "Choix dans une liste"]];

function sfConsoleItem(it) {
  const k = it.kind || "toggle";
  const dom = { toggle: ["light", "switch", "fan", "input_boolean", "automation"], dimmer: "light", cover: "cover", vacuum: "vacuum",
    stepper: ["input_number", "number"], select: ["input_select", "select"] }[k];
  const s = [sfS("kind", SF_KINDS), sfT("label")];
  if (k === "action") s.push(sfG(sfI("icon"), sfT("color")), sfT("sub"), sfT("service"), sfT("confirm"), sfO("data"));
  else {
    s.push(sfE("entity", dom));
    if (["toggle", "sensor", "stepper"].includes(k)) s.push(sfI("icon"));
    if (k === "toggle" || k === "dimmer") s.push(sfT("color"));
    if (k === "sensor" || k === "stepper") s.push(sfG(sfT("unit"), sfN("digits", 0, 4)));
    if (k === "vacuum") s.push(sfE("battery", "sensor"), sfO("shortcuts"));
  }
  return s;
}

const SF_TILE_KINDS = [["value", "Valeur (avec seuils)"], ["percent", "Pourcentage"], ["binary", "Oui / non"], ["text", "Texte"],
  ["duration", "Durée"], ["timestamp", "Date / heure"], ["toggle", "Bouton marche / arrêt"]];
function sfMachineTile(t) {
  const k = t.kind || "value";
  const s = [sfT("label"), sfE("entity"), sfS("kind", SF_TILE_KINDS)];
  if (k === "value") s.push(sfG(sfT("unit"), sfN("digits", 0, 4)), sfG(sfN("warn"), sfN("crit")), sfG(sfN("low"), sfN("max")), sfB("invert"), sfN("spark", 0, 168));
  if (k === "percent") s.push(sfG(sfN("warn", 0, 100), sfN("crit", 0, 100)), sfN("spark", 0, 168));
  if (k === "binary") s.push(sfT("ok_state"), sfT("bad_text"));
  if (k === "text") s.push(sfO("map"), sfO("ok_values"));
  if (k === "duration") s.push(sfG(sfN("warn"), sfN("max")));
  if (k === "toggle") s.push(sfT("color"), sfE("timer", "timer"), sfEs("stop"));
  return s;
}

const SF_CARD_NAMES = {};   // filled in below: tag -> title
const sfCardTag = (c) => { const t = c && typeof c.type === "string" ? c.type.replace(/^custom:/, "") : "", n = SF_ALIAS_REV[t] || t; return SF_CARD_NAMES[n] ? n : ""; };

const SF_SPECS = {
  "sf-alert-card": {
    title: "Alerte",
    stub: { leaks: [], doors: [] },
    labels: { alarm: "Alarme", ring: "Sonnette", snapshot: "Caméra (photo à la sonnette)", leaks: "Capteurs de fuite d'eau",
      doors: "Ouvrants (information)", power: "Tension d'entrée de l'onduleur", power_below: "Alerte sous (volts)", hide_sim: "Masquer le bouton « simuler une sonnette »" },
    fields: () => [sfEs("leaks", "binary_sensor"), sfEs("doors", "binary_sensor"), sfE("power", "sensor"), sfN("power_below", 0, 400),
      sfE("alarm", "alarm_control_panel"), sfE("ring", "binary_sensor"), sfE("snapshot", "camera"), sfB("hide_sim")],
  },
  "sf-climate-card": {
    title: "Climat",
    stub: { rooms: [], extras: [] },
    labels: { mode: "Mode maison (liste de choix)", switch_script: "Script marche / arrêt d'une pièce", min: "Température minimale du cadran", max: "Température maximale du cadran",
      climate: "Thermostat", temp: "Capteur de température", hum: "Capteur d'humidité", target: "Consigne (input_number)",
      regul: "Régulation automatique (interrupteur)", window: "Fenêtre (capteur d'ouverture)" },
    fields: () => [sfE("mode", "input_select"), sfE("switch_script", "script"), sfG(sfN("min", 5, 35), sfN("max", 5, 35))],
    lists: [
      { key: "rooms", title: "Pièces", add: "Ajouter une pièce", item: "Pièce", itemTitle: (r) => r.name, new: () => ({ icon: "mdi:home" }),
        schema: () => [sfG(sfT("name"), sfI("icon")), sfE("climate", "climate"), sfG(sfE("temp", "sensor"), sfE("hum", "sensor")),
          sfE("target", "input_number"), sfG(sfE("regul", "input_boolean"), sfE("window", "binary_sensor"))] },
      { key: "extras", title: "Boutons sous les pièces", add: "Ajouter un bouton", item: "Bouton", itemTitle: (x) => x.label, new: () => ({}),
        schema: () => [sfG(sfT("label"), sfI("icon")), sfE("entity"), sfE("timer", "timer"), sfEs("stop")] },
    ],
  },
  "sf-console-card": {
    title: "Commandes",
    stub: { groups: [] },
    labels: { span: "Largeur (en colonnes)", service: "Service (ex. scene.turn_on)", confirm: "Demander confirmation (texte)", data: "Données du service (YAML)",
      battery: "Capteur de batterie", shortcuts: "Raccourcis (YAML)", kind: "Type d'élément" },
    fields: () => [sfT("title"), sfT("subtitle")],
    lists: [
      { key: "groups", title: "Groupes", add: "Ajouter un groupe", item: "Groupe", itemTitle: (g) => g.title, new: () => ({ title: "", items: [] }),
        schema: () => [sfG(sfT("title"), sfI("icon")), sfN("span", 1, 4)],
        lists: [{ key: "items", title: "Éléments du groupe", add: "Ajouter un élément", item: "Élément", itemTitle: (x) => x.label, new: () => ({ kind: "toggle" }), schema: sfConsoleItem }] },
    ],
  },
  "sf-machines-card": {
    title: "Équipements",
    stub: { tiles: [] },
    labels: { spark: "Mini-courbe sur N heures (0 = aucune)", ok_state: "État considéré normal", bad_text: "Texte si anormal", low: "Seuil bas (orange)", invert: "Alerte quand la valeur est BASSE", map: "Traduction des états (YAML)", ok_values: "États normaux (YAML)", stop: "Entités coupées pour arrêter" },
    fields: () => [sfT("title")],
    lists: [{ key: "tiles", title: "Tuiles", add: "Ajouter une tuile", item: "Tuile", itemTitle: (t) => t.label, new: () => ({ kind: "value" }), schema: sfMachineTile }],
  },
  "sf-trend-card": {
    title: "Tendance",
    stub: { series: [] },
    labels: { factor: "Multiplicateur des valeurs (ex. 1000 pour passer des kW aux W)", hours: "Plage affichée au départ (heures)", window: "Fenêtre", attribute: "Attribut daté à tracer en pointillés (ex. watts d'une prévision solaire)", layout: "Disposition", height: "Hauteur du graphique (px)", axis: "Axe" },
    fields: () => [sfT("title"), sfG(sfN("hours", 1, 720), sfN("height", 80, 400, 10)), sfS("window", [["rolling", "Glissante (nombre d'heures ci-dessus)"], ["today", "Aujourd'hui (de minuit à minuit, pour afficher une prévision)"]]),
      sfS("layout", [["auto", "Automatique (superposées si même unité)"], ["combined", "Courbes superposées"], ["separate", "Une courbe par ligne"]])],
    lists: [{ key: "series", title: "Séries", add: "Ajouter une série", item: "Série", itemTitle: (x) => x.name || x.entity, new: () => ({}),
      schema: () => [sfE("entity", ["sensor", "input_number", "number", "counter"]), sfG(sfT("name"), sfT("color")), sfG(sfT("unit"), sfN("digits", 0, 4)), sfN("factor", -1000000, 1000000, 0.001), sfT("attribute"), sfS("axis", [["left", "Axe de gauche"], ["right", "Axe de droite (échelle propre)"]])] }],
  },
  "sf-timeline-card": {
    title: "Journal",
    stub: { entities: [] },
    labels: { states: "États affichés (tous si vide)", min_gap: "Intervalle minimal entre deux événements (minutes)", hours: "Fenêtre affichée (heures)", limit: "Nombre d'événements affichés", group: "Fusionner les répétitions consécutives", hide_unavailable: "Masquer les états indisponibles" },
    norm: (c) => { if (Array.isArray(c.entities)) c.entities = c.entities.map((e) => (typeof e === "string" ? { entity: e } : e)).filter((e) => e && typeof e === "object"); },
    fields: () => [sfT("title"), sfG(sfN("hours", 1, 720), sfN("limit", 1, 200)), sfG(sfB("group"), sfB("hide_unavailable"))],
    lists: [{ key: "entities", title: "Entités suivies", add: "Ajouter une entité", item: "Entité", itemTitle: (x) => x.name || x.entity, new: () => ({}),
      schema: () => [sfE("entity"), sfG(sfT("name"), sfI("icon")), sfT("color"), { name: "states", selector: { text: { multiple: true } } }, sfN("min_gap", 0, 1440)] }],
  },
  "sf-health-card": {
    title: "Santé",
    stub: { checks: [] },
    labels: { show_ok: "Lister aussi les contrôles normaux", ok: "États normaux (tout autre état = anomalie)", bad: "États anormaux", min: "Valeur minimale (en dessous = anomalie)",
      max: "Valeur maximale (au-dessus = anomalie)", stale: "Anomalie sans mise à jour depuis (minutes)", severity: "Gravité", group: "Groupe (réunit les anomalies d'un même sous-système)" },
    fields: () => [sfT("title"), sfB("show_ok")],
    lists: [{ key: "checks", title: "Contrôles", add: "Ajouter un contrôle", item: "Contrôle", itemTitle: (x) => x.name || x.entity, new: () => ({}),
      schema: () => [sfE("entity"), sfG(sfT("name"), sfT("group")), { name: "ok", selector: { text: { multiple: true } } }, { name: "bad", selector: { text: { multiple: true } } },
        sfG(sfN("min", -100000, 100000, 0.1), sfN("max", -100000, 100000, 0.1)), sfN("stale", 0, 100000), sfS("severity", [["warning", "Attention (orange)"], ["critical", "Critique (rouge)"]])] }],
  },
  "sf-host-card": {
    title: "Hôte (ordinateur / serveur)",
    stub: {},
    labels: { online: "Entité « en ligne » (facultatif)", cpu: "Processeur (%)", cpu_temp: "Température du processeur", gpu: "Carte graphique (%)", gpu_temp: "Température de la carte graphique",
      gpu_power: "Puissance de la carte graphique (W)", gpu_vram: "Mémoire vidéo (%)", ram: "Mémoire (%)", ram_used: "Mémoire utilisée (Go)", swap: "Swap (%)", disk: "Disque (%)",
      disk_free: "Espace disque libre", net_rx: "Réseau reçu", net_tx: "Réseau émis", wifi: "Signal Wi-Fi (dBm)", containers: "Conteneurs actifs", load: "Charge système",
      uptime: "Durée de fonctionnement (heures)", power: "Consommation totale (W)", energy_total: "Compteur d'énergie (kWh)", power_estimate: "Valeurs estimées (affiche « ≈ »)", warn: "Orange à partir de (%)", crit: "Rouge à partir de (%)", temp_warn: "Orange à partir de (°C)", temp_crit: "Rouge à partir de (°C)" },
    fields: () => [sfT("title"), sfE("online"), sfG(sfE("cpu", "sensor"), sfE("cpu_temp", "sensor")), sfG(sfE("gpu", "sensor"), sfE("gpu_temp", "sensor")), sfG(sfE("gpu_power", "sensor"), sfE("gpu_vram", "sensor")),
      sfG(sfE("ram", "sensor"), sfE("ram_used", "sensor")), sfG(sfE("swap", "sensor"), sfE("disk", "sensor")), sfE("disk_free", "sensor"), sfG(sfE("net_rx", "sensor"), sfE("net_tx", "sensor")),
      sfG(sfE("wifi", "sensor"), sfE("containers", "sensor")), sfG(sfE("load", "sensor"), sfE("uptime", "sensor")), sfG(sfE("power", "sensor"), sfE("energy_total", "sensor")), sfB("power_estimate"), sfG(sfN("warn", 0, 100), sfN("crit", 0, 100)), sfG(sfN("temp_warn", 0, 150), sfN("temp_crit", 0, 150))],
  },
  "sf-assistant-card": {
    title: "Assistant",
    stub: {},
    labels: { state: "Phase (entité dont l'état décrit l'activité)", phases: "Correspondance état → phase (YAML : idle, listening, thinking, acting, speaking, error)", request: "Dernière demande", action: "Action en cours",
      result: "Dernier résultat", reply: "Dernière réponse", service: "Service (domaine.service)", confirm: "Demander confirmation (texte)", data: "Données du service (YAML)" },
    fields: () => [sfT("name"), sfE("state"), sfE("request"), sfE("action"), sfE("result"), sfE("reply"), sfO("phases")],
    lists: [{ key: "actions", title: "Boutons d'action", add: "Ajouter un bouton", item: "Bouton", itemTitle: (x) => x.name || x.service, new: () => ({}),
      schema: () => [sfG(sfT("name"), sfI("icon")), sfT("service"), sfT("confirm"), sfO("data")] }],
  },
  "sf-cells-card": {
    title: "Batteries",
    stub: {},
    labels: { warn: "Orange à partir de (%)", crit: "Rouge à partir de (%)", limit: "Nombre de capteurs affichés", include_pattern: "Ne garder que les entités dont l'identifiant contient (regex)",
      exclude_pattern: "Ignorer les entités dont l'identifiant contient (regex)", exclude: "Entités ignorées" },
    fields: () => [sfG(sfN("warn", 0, 100), sfN("crit", 0, 100)), sfN("limit", 1, 100), sfT("include_pattern"), sfT("exclude_pattern"), sfEs("exclude", "sensor")],
  },
  "sf-battery-card": {
    title: "Batterie",
    stub: {},
    labels: { soc: "Niveau de charge (%)", power: "Puissance (W, positif = décharge)", invert: "Inverser le sens (positif = charge)", capacity_kwh: "Capacité (kWh, pour estimer l'autonomie)",
      charged_today: "Énergie chargée aujourd'hui (kWh)", discharged_today: "Énergie déchargée aujourd'hui (kWh)", mode: "Mode de fonctionnement (liste de choix)",
      temperature: "Température", health: "État de santé (%)", cycles: "Nombre de cycles" },
    fields: () => [sfT("title"), sfDev("battery"), sfE("soc", "sensor"), sfE("power", "sensor"), sfB("invert"), sfN("capacity_kwh", 0, 200, 0.1), sfG(sfE("charged_today", "sensor"), sfE("discharged_today", "sensor")),
      sfE("mode"), sfG(sfE("temperature", "sensor"), sfE("health", "sensor")), sfE("cycles", "sensor")],
    lists: [{ key: "batteries", title: "Batteries (plusieurs possibles)", add: "Ajouter une batterie", item: "Batterie", itemTitle: (b) => b.name, new: () => ({}),
      schema: () => [sfDev("battery"), sfT("name"), sfE("soc", "sensor"), sfE("power", "sensor"), sfN("capacity_kwh", 0, 200, 0.1)] }],
  },
  "sf-radiators-card": {
    title: "Radiateurs",
    stub: { radiators: [] },
    labels: { accent: "Couleur d'accentuation (ex. #e07a4f)", step: "Pas de la consigne (°)", max_kwh: "Consommation pleine barre (kWh)", climate: "Radiateur (entité climate)",
      kwh: "Consommation du jour (kWh)", connection: "Capteur de connexion (facultatif)", setpoint: "Afficher le réglage de consigne ± (désactiver pour un fil pilote)",
      preset_labels: "Noms des préréglages (YAML, ex. away: Hors-gel)", preset: "Liste de préréglages (select, facultatif)", presets: "Préréglages affichés (YAML, dans l'ordre)" },
    fields: () => [sfT("title"), sfT("accent"), sfB("setpoint"), sfG(sfN("step", 0.1, 2, 0.1), sfN("max_kwh", 1, 50)), sfO("preset_labels")],
    lists: [{ key: "radiators", title: "Radiateurs", add: "Ajouter un radiateur", item: "Radiateur", itemTitle: (r) => r.name, new: () => ({ icon: "mdi:radiator" }),
      schema: () => [sfG(sfT("name"), sfI("icon")), sfE("climate", "climate"), sfE("kwh", "sensor"), sfE("connection"), sfE("preset", "select"), sfO("presets")] }],
  },
  "sf-launcher-card": {
    title: "Panneaux",
    stub: { columns: 2, tiles: [] },
    labels: { mode_entity: "Entité de mode (met en avant les tuiles du moment)", modes: "Modes où la tuile est mise en avant", summary: "Résumé affiché sur la tuile", users: "Réservé à ces utilisateurs (liste d'identifiants, YAML)", card: "Carte ouverte dans le panneau (YAML)", sub: "Texte libre sous le titre" },
    fields: () => [sfN("columns", 1, 4), sfE("mode_entity", ["input_select", "select", "sensor"])],
    lists: [{ key: "tiles", title: "Tuiles", add: "Ajouter une tuile", item: "Tuile", itemTitle: (t) => t.name, new: () => ({ icon: "mdi:open-in-new", summary: "texte" }),
      embed: "card",
      schema: (t) => [sfG(sfT("name"), sfI("icon")), sfG(sfT("color"), sfT("hash")), { name: "modes", selector: { text: { multiple: true } } },
        sfS("summary", [["texte", "Texte libre"], ["climate", "Climat (températures)"], ["room", "Une pièce"], ["vehicles", "Véhicules"], ["commands", "Commandes"], ["cameras", "Caméras"], ["energy", "Énergie"], ["battery", "Batterie", ["health", "Santé"]], ["machines", "Équipements"]]),
        sfT("sub"), sfO("users"), ...(sfCardTag(t.card) ? [] : [sfO("card")])] }],
  },
  "sf-hangar-card": {
    title: "Véhicules",
    stub: { cars: [], charger: {} },
    labels: { mode: "Mode de charge (liste de choix)", distance_unit: "Unité de distance", warn_mode: "Mode à surveiller (nom exact)", warn_text: "Message d'avertissement", soc: "Batterie (%)", range: "Autonomie (km)", target: "Charge cible (%)", charging: "En charge (capteur)",
      connected: "Câble branché (capteur)", controls: "Afficher les commandes de la borne (démarrer / arrêter, intensité ±)", switch: "Interrupteur démarrer / arrêter la charge", switch_invert: "L'interrupteur est actif quand la charge est en PAUSE (inverser)", current_min: "Intensité minimale (A)", current_max: "Intensité maximale (A)", current_step: "Pas de l'intensité (A)", connected_states: "États comptés « branché » (YAML, ex. connected, plugged_in)", charging_states: "États comptés « en charge » (YAML, ex. charging)", power: "Puissance (W)", current: "Intensité (A)", decision: "Décision du pilote de charge", solar: "Production solaire", home: "Consommation maison", surplus: "Surplus" },
    fields: () => [sfE("mode", ["input_select", "select"]), sfS("distance_unit", [["auto", "Automatique (selon le capteur)"], ["km", "Kilomètres"], ["mi", "Miles"]]), sfT("warn_mode"), sfT("warn_text")],
    objects: [
      { key: "charger", title: "Borne de recharge", schema: () => [sfDev("charger"), sfE("connected"), sfE("charging"), sfO("connected_states"), sfO("charging_states"), sfE("power", "sensor"), sfE("current"), sfE("decision", "sensor"), sfB("controls"), sfE("switch", ["switch", "input_boolean"]), sfB("switch_invert"), sfN("current_step", 0.1, 16, 0.1), sfG(sfN("current_min", 0, 100, 0.1), sfN("current_max", 0, 100, 0.1))] },
      { key: "flows", title: "Flux d'énergie (facultatif)", schema: () => [sfE("solar", "sensor"), sfE("home", "sensor"), sfE("surplus", "sensor")] },
    ],
    lists: [{ key: "chargers", title: "Bornes de recharge (plusieurs possibles — remplace la borne ci-dessus)", add: "Ajouter une borne", item: "Borne", itemTitle: (b) => b.name, new: () => ({}), max: 4,
      schema: () => [sfDev("charger"), sfT("name"), sfE("connected"), sfE("charging"), sfO("connected_states"), sfO("charging_states"), sfE("power", "sensor"), sfE("current"), sfE("decision", "sensor"), sfE("mode", ["input_select", "select"]), sfB("controls"), sfE("switch", ["switch", "input_boolean"]), sfB("switch_invert"), sfN("current_step", 0.1, 16, 0.1), sfG(sfN("current_min", 0, 100, 0.1), sfN("current_max", 0, 100, 0.1))] },
      { key: "cars", title: "Voitures (3 maximum)", add: "Ajouter une voiture", item: "Voiture", itemTitle: (c) => c.name, new: () => ({}), max: 3,
      schema: () => [sfDev("car"), sfG(sfT("name"), sfT("color")), sfE("soc", "sensor"), sfE("range", "sensor"), sfE("target", "sensor"), sfE("charging")] }],
  },
  "sf-bridge-card": {
    title: "Bandeau d'accueil",
    stub: {},
    labels: { weather: "Météo", outdoor: "Température extérieure", price: "Prix du kWh en cours", hc_price: "Prix heures creuses", mode: "Mode maison", solar_left: "Production solaire restante",
      power_in: "Tension d'entrée onduleur", internet: "Connexion internet", leaks: "Capteurs de fuite", doors: "Ouvrants", home_states: "États comptés « à la maison » (YAML, ex. home et le nom de votre zone)", hc_windows: "Plages d'heures creuses", start: "Début (hh:mm)", end: "Fin (hh:mm)" },
    fields: () => [sfO("home_states"), sfE("weather", "weather"), sfE("outdoor", "sensor"), sfE("price", "sensor"), sfE("hc_price", "input_number"),
      sfE("mode", "input_select"), sfE("solar_left", "sensor"), sfE("power_in", "sensor"), sfE("internet", "binary_sensor"), sfEs("leaks", "binary_sensor"), sfEs("doors", "binary_sensor")],
    lists: [{ key: "hc_windows", title: "Heures creuses : une plage par période (2 ou 3 par jour possibles)", add: "Ajouter une plage", item: "Plage", itemTitle: (w) => w.start && w.end ? `${w.start} → ${w.end}` : "", new: () => ({ start: "22:00", end: "06:00" }),
      schema: () => [sfG(sfT("start"), sfT("end"))] },
      { key: "people", title: "Personnes (ligne de présence, facultatif)", add: "Ajouter une personne", item: "Personne", itemTitle: (x) => x.name, new: () => ({}),
      schema: () => [sfG(sfT("name"), sfT("color")), sfE("entity", "person")] }],
  },
  "sf-reactor-card": {
    title: "Énergie",
    stub: { devices: [], hide_idle: true },
    labels: { solar: "Production solaire", grid: "Réseau (positif = soutirage)", fossil: "Part d'énergie fossile du réseau", price: "Prix du kWh",
      soc: "Niveau de charge (%)", power: "Puissance (W, positif = décharge)", capacity_kwh: "Capacité (kWh, pour estimer l'autonomie)",
      hide_idle: "Masquer les appareils à l'arrêt", battery_power: "Batterie : puissance (W, positif = décharge)", battery_soc: "Batterie : niveau (%)", battery_invert: "Batterie : inverser le sens", idle_w: "Considéré à l'arrêt sous (watts)", max_devices: "Nombre maximum d'appareils affichés" },
    lists: [{ key: "batteries", title: "Batteries (plusieurs possibles)", add: "Ajouter une batterie", item: "Batterie", itemTitle: (b) => b.name, new: () => ({}),
      schema: () => [sfDev("battery"), sfT("name"), sfE("soc", "sensor"), sfE("power", "sensor"), sfN("capacity_kwh", 0, 200, 0.1)] }],
    fields: () => [sfE("solar", "sensor"), sfE("grid", "sensor"), sfE("battery_power", "sensor"), sfE("battery_soc", "sensor"), sfB("battery_invert"), sfE("fossil", "sensor"), sfE("price", "sensor"), sfB("hide_idle"), sfN("idle_w", 0, 500), sfN("max_devices", 1, 12)],
    lists: [{ key: "devices", title: "Appareils", add: "Ajouter un appareil", item: "Appareil", itemTitle: (d) => d.name, new: () => ({ icon: "mdi:flash" }),
      schema: () => [sfG(sfT("name"), sfI("icon")), sfE("entity", "sensor"), sfT("color")] }],
  },
  "sf-setpoints-card": {
    title: "Consignes",
    stub: { columns: [], rows: [] },
    labels: { columns: "Colonnes", entities: "Consignes (dans l'ordre des colonnes)" },
    fields: () => [sfT("title"), sfT("subtitle")],
    lists: [
      { key: "columns", title: "Colonnes (ex. Jour, Nuit)", add: "Ajouter une colonne", item: "Colonne", itemTitle: (c) => c.label, new: () => ({}),
        schema: () => [sfT("label"), sfT("color")] },
      { key: "rows", title: "Pièces", add: "Ajouter une pièce", item: "Pièce", itemTitle: (r) => r.name, new: () => ({ icon: "mdi:home", entities: [] }),
        schema: () => [sfG(sfT("name"), sfI("icon")), sfEs("entities", "input_number")] },
    ],
  },
  "sf-ledger-card": {
    title: "Bilan",
    stub: { devices: [] },
    labels: { period: "Période (liste de choix)", total_cost: "Coût total", solar_fraction: "Part solaire", avg_price: "Prix moyen du kWh",
      total: "Consommation totale", edf: "Part réseau", solar: "Part solaire", cost: "Coût" },
    fields: () => [sfE("period", "input_select"), sfE("total_cost", "sensor"), sfE("solar_fraction", "sensor"), sfE("avg_price", "sensor")],
    lists: [{ key: "devices", title: "Appareils", add: "Ajouter un appareil", item: "Appareil", itemTitle: (d) => d.name, new: () => ({ icon: "mdi:flash" }),
      schema: () => [sfG(sfT("name"), sfI("icon")), sfE("total", "sensor"), sfG(sfE("edf", "sensor"), sfE("solar", "sensor")), sfE("cost", "sensor")] }],
  },
  "sf-radar-card": {
    title: "Radar de présence",
    stub: { people: [], rooms: [] },
    labels: { person: "Personne (suivi du téléphone)", face: "Dernière caméra où la personne a été reconnue", label: "Libellé" },
    lists: [
      { key: "people", title: "Personnes", add: "Ajouter une personne", item: "Personne", itemTitle: (x) => x.name, new: () => ({}),
        schema: () => [sfG(sfT("name"), sfT("color")), sfE("person", "person"), sfE("face", "sensor")] },
      { key: "rooms", title: "Pièces (capteurs de présence)", add: "Ajouter une pièce", item: "Pièce", itemTitle: (x) => x.label, new: () => ({}),
        schema: () => [sfT("label"), sfE("entity", "binary_sensor")] },
    ],
  },
  "sf-ns-card": {
    title: "Écran plein format",
    stub: { rooms: [], tiles: [] },
    labels: { mode_entity: "Mode (Matin / Jour / Soir / Nuit, liste de choix)", hide_header: "Masquer la barre de Home Assistant (mode kiosque)", scene_dim: "Scène d'ambiance (bouton « Tamisé »)",
      lights_off: "Lumières à éteindre (boutons « Éteindre » et « Bonne nuit »)", cover: "Volets (bouton « Volets » et « Bonne nuit »)", min: "Alerte si plus froid que (°)", max: "Alerte si plus chaud que (°)",
      lock: "Verrou (entité lock)", low: "Alerte sous (%)", soc: "Batterie (%)", range: "Autonomie (km)", charging: "En charge (capteur)",
      solar: "Production solaire", home: "Consommation de la maison", grid: "Réseau (positif = soutirage)", ev: "Puissance de la borne", ev_connected: "Câble branché (capteur)", decision: "Décision du pilote de charge (texte)",
      price: "Prix du kWh en cours", ev_day: "Énergie de la borne aujourd'hui (kWh)", ev_current: "Intensité de la borne (A)", ev_solar: "Part solaire de la charge (kW)", ev_grid: "Part réseau de la charge (kW)",
      hc_below: "Heures creuses si le prix est sous", devices: "Appareils suivis (YAML : entity, icon)", day: "Bilan du jour (YAML : import, export, solar, hp, hc, hc_hours)", currency: "Devise affichée (ex. €, $, £)", battery: "Capteur de batterie" },
    fields: () => [sfE("mode_entity", "input_select"), sfE("weather", "weather"), sfE("outdoor", "sensor"), sfEs("lights_off", "light"), sfE("cover", "cover"), sfE("scene_dim"), sfB("hide_header")],
    objects: [
      { key: "energy", title: "Énergie", schema: () => [sfE("solar", "sensor"), sfE("home", "sensor"), sfE("grid", "sensor"), sfE("ev", "sensor"), sfE("ev_connected"), sfE("decision", "sensor"), sfE("price", "sensor"),
        sfT("currency"), sfN("hc_below", 0, 10, 0.001), sfE("ev_day", "sensor"), sfE("ev_current"), sfG(sfE("ev_solar", "sensor"), sfE("ev_grid", "sensor")), sfO("devices"), sfO("day")] },
      { key: "vacuum", title: "Aspirateur", schema: () => [sfE("entity", "vacuum"), sfT("name"), sfE("battery", "sensor")] },
    ],
    lists: [
      { key: "rooms", title: "Pièces", add: "Ajouter une pièce", item: "Pièce", itemTitle: (r) => r.name, new: () => ({ icon: "mdi:home" }), schema: () => [sfG(sfT("name"), sfI("icon")), sfE("entity", "sensor"), sfN("min", -50, 50, 0.5)] },
      { key: "fridge", title: "Réfrigérateurs et congélateurs", add: "Ajouter un appareil", item: "Appareil", itemTitle: (r) => r.name, new: () => ({ icon: "mdi:fridge-outline" }), schema: () => [sfG(sfT("name"), sfI("icon")), sfE("entity", "sensor"), sfN("max", -50, 50, 0.5)] },
      { key: "cars", title: "Voitures (3 maximum)", add: "Ajouter une voiture", item: "Voiture", itemTitle: (c) => c.name, new: () => ({}), max: 3,
        schema: () => [sfG(sfT("name"), sfT("color")), sfE("soc", "sensor"), sfE("range", "sensor"), sfE("lock", "lock"), sfE("charging"), sfN("low", 0, 100)] },
      { key: "leaks", title: "Capteurs de fuite", add: "Ajouter un capteur", item: "Capteur", itemTitle: (l) => l.name, new: () => ({}), schema: () => [sfT("name"), sfE("entity", "binary_sensor")] },
      { key: "tiles", title: "Tuiles", add: "Ajouter une tuile", item: "Tuile", itemTitle: (t) => t.name, new: () => ({ icon: "mdi:lightbulb-outline", color: "var(--sf-amber)" }), max: 6,
        schema: () => [sfG(sfT("name"), sfI("icon")), sfT("color"), sfE("entity")] },
      { key: "shortcuts", title: "Raccourcis (boutons du matin et fenêtre aspirateur)", add: "Ajouter un raccourci", item: "Raccourci", itemTitle: (x) => x.name, new: () => ({ icon: "mdi:flash" }), schema: () => [sfG(sfT("name"), sfI("icon")), sfE("entity")] },
    ],
  },
  "sf-camera-card": {
    title: "Caméras",
    stub: { cameras: [] },
    labels: { refresh: "Rafraîchissement (secondes)", motion: "Capteur de mouvement", persons: "Nombre de personnes", review: "Statut de revue Frigate" },
    fields: () => [sfN("refresh", 1, 60)],
    lists: [{ key: "cameras", title: "Caméras", add: "Ajouter une caméra", item: "Caméra", itemTitle: (c) => c.name, new: () => ({}),
      schema: () => [sfE("entity", "camera"), sfT("name"), sfE("motion", "binary_sensor"), sfE("persons", "sensor"), sfE("review", "sensor")] }],
  },
};

// Removes emptied values (empty string, null, undefined) to keep the YAML clean.
