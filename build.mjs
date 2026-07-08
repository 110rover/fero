#!/usr/bin/env node
/* ============================================================
   FERO build — zet content.md om naar data.js
   Gebruik:  node build.mjs
   content.md is de bron die je mag aanpassen. data.js wordt
   automatisch gegenereerd — NIET met de hand bewerken.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(DIR, "content.md"), "utf8");
const lines = md.split(/\r?\n/);

const MONTHS = { januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12 };
const pad = (n) => String(n).padStart(2, "0");

// Locatie-lookup voor Maps-pins en coördinaten
const LOC = {
  "Ojala Hotel": { map: "Ojala Hotel, Antigua Guatemala" },
  "La Aurora International Airport": { map: "La Aurora International Airport, Guatemala" },
  "Acatenango camp (cabañas)": { map: "La Soledad, Acatenango trailhead, Guatemala" },
  "La Soledad, Acatenango": { map: "La Soledad, Acatenango, Guatemala" },
  "Villa Lisa": { coords: [14.647911, -91.143875] },
  "Villa's dock": { map: "Villa Lisa, Lake Atitlan, Guatemala" },
  "Zephyr Lodge": { map: "Zephyr Lodge, Lanquin, Guatemala" },
  "Ecolodge El Sombrero": { map: "El Sombrero Ecolodge, Yaxha, Guatemala" },
  "El Sombrero": { map: "El Sombrero Ecolodge, Yaxha, Guatemala" },
  "San Pedro Belize Express Water Taxi": { map: "San Pedro Belize Express Water Taxi, Belize City" },
  "San Pedro Belize Express": { map: "San Pedro Belize Express, Caye Caulker" },
  "Caye Caulker": { map: "Caye Caulker, Belize" },
  "Ferry Station": { map: "Belize City Water Taxi Terminal" },
  "Iguana Reef Inn": { map: "Iguana Reef Inn, Caye Caulker, Belize" },
  "Onbewoond eiland (tent)": { map: "Caye Caulker, Belize" },
  "Tent op het eiland": { map: "Caye Caulker, Belize" },
};
const locFor = (name) => LOC[name] || { map: name };

// Vaste blokken (worden (nog) niet uit content.md geparsed)
const STOP_BLURB = {
  "Antigua": "Kleurrijke koloniale straatjes, vulkanen aan de horizon, markten, cafés & rooftops.",
  "Acatenango": "Volcán Fuego in eruptie, boven de wolken op 3.976 m, sterren & lava bij nacht.",
  "Atitlán": "Een van de mooiste meren ter wereld, kleurrijke dorpjes, tranquilo, zon & uitzicht.",
  "Semuc Champey": "Turquoise natuurzwembaden, watervallen & grotten, diep in de groene jungle.",
  "Yaxhá": "Maya-tempels in de jungle, uitzicht over het oerwoud, brulapen & wildlife.",
  "Onbewoond eiland": "Adiós Guatemala, hola Belize! Caribische zee & koraalrif, Robinson Crusoe-stijl. Bewust heel basic.",
  "Caye Caulker": "Go Slow eilandleven, turquoise water & verse kreeft, reggae, palmen & golfcarts.",
};
const SPOTS = {
  Antigua: [
    { name: "Nachtleven", desc: "Bars open tot ±01:00, dus begin op tijd. Met geluk zie je Volcán Fuego lava spuwen." },
    { name: "Uber i.p.v. taxi", desc: "Goedkoper en veiliger; je betaalt de juiste prijs en kunt je rit delen/tracken." },
    { name: "Veiligheid", desc: "Gebruik de locker in je hostel en loop 's nachts niet alleen." },
  ],
  Atitlán: [
    { name: "Panajachel", desc: "De 'hoofd'-haven van het meer: souvenirs, streetfood, restaurants en een prachtige zonsondergang." },
    { name: "San Pedro", desc: "Backpacker/feestdorp. Sublime voor een goede maaltijd (fish tacos!), Sababa voor koffie & brunch met uitzicht." },
    { name: "San Marcos", desc: "Hippie/spiritueel dorp: yoga, massages, gezonde lunch. Springplek vanaf ±6 m (Q15)." },
    { name: "San Juan", desc: "Traditioneel dorp: weven & schilderen, ideaal voor souvenirs. Kaasmaker El Artesano + viewpoint." },
    { name: "Santiago", desc: "Cultureel dorp met grote markt. Bezoek de lokale heilige Maximón (tuktuk brengt je er)." },
    { name: "Santa Cruz", desc: "Beste uitzicht op de vulkanen. Free Cerveza voor happy hour aan het eind van de dag." },
  ],
  "Semuc Champey": [
    { name: "Tubing", desc: "Drijven in een band met een biertje in je hand over de rivier — een echte klassieker." },
    { name: "Lodge chillen", desc: "Weinig te doen in het dorp; mensen blijven vaak bij de lodge of in het natuurpark." },
  ],
  Yaxhá: [
    { name: "Flores", desc: "Pittoresk eilandje op een meer; basis voor Tikal & Yaxhá. Kayak rond het eiland, Jorge's Ropeswing (Q10 entree, bier + nacho's, schommelen in het water)." },
    { name: "Maya-tempels", desc: "Yaxhá: tempels in de jungle met uitzicht over het oerwoud, brulapen en wildlife." },
  ],
  "Caye Caulker": [
    { name: "Lazy Lizard @ The Split", desc: "Dé plek overdag; 's avonds de Sports Bar." },
    { name: "Blue Hole duiken", desc: "Let op je duiktijd vóór je retourvlucht. Beste duikscholen: Frenchie's Diving & Belize Diving Services." },
    { name: "Fietsen", desc: "Veel hotels hebben strandfietsen. Voor 5 BZD per boot naar de wildere noordkant." },
  ],
};
const ACATENANGO = {
  title: "Acatenango — Lava Trails",
  note: "Dit is een algemene gids van Lava Trails. Eén ding wijkt af voor Fero: we gaan ná de vulkaan NIET terug naar Antigua, maar door naar Atitlán (dag 4).",
  summit: { basecamp: 3550, acatenango: 3975, fuego: 3768, soledad: 2424 },
  included: ["Alle hiking-gear", "Alle maaltijden, snacks & water", "Pick-up vanuit Antigua (daarna door naar Atitlán)", "Tweetalige (ENG/SP) gids", "Entreekosten vulkaan (Q100)"],
  provided: ["Jas & trui", "Muts, handschoenen & buff/sjaal", "Headlamp", "Regenponcho"],
  bring: ["Schoenen met grip", "Dry-fit sportkleding", "Broek of legging", "Backpack (te huur)"],
  rent: ["50 L backpack (Q60)", "Trekking poles (Q50)", "Waterproof broek (Q40)", "Sleeping bag liner (Q20)", "Porter één kant (Q250)"],
  food: ["3 maaltijden (ontbijt, lunch, diner) — vegan & vega mogelijk", "4 L water", "Thee of warme chocolademelk", "Glas wijn", "Biertje bij terugkomst"],
  fuego: "Optionele sunset-hike op dag 1 naar Fuego Ridge (Q200, EXCLUSIEF). Vertrek ±16:30, ±1u30 heen. Terug bij basecamp ±19:00.",
  schedule: [
    { day: "Dag 1", items: [["08:30", "Pick-up vanuit Antigua"], ["08:30–09:00", "Rit naar de Supply Center"], ["09:00–10:00", "Briefing & gear uitzoeken"], ["10:00–15:00", "Start van de hike! Pauzes & lunch"], ["15:00–16:00", "Aankomst basecamp & rust"], ["16:00–20:00", "Optionele Volcán de Fuego hike (Q200)"], ["20:00", "Diner, marshmallows & chill"]] },
    { day: "Dag 2", items: [["03:45–04:00", "Wake-up call"], ["04:00–06:00", "Hike naar Acatenango summit"], ["06:00–06:45", "Zonsopkomst & 360°-uitzicht"], ["06:45–07:15", "Terug naar basecamp"], ["07:15–08:15", "Ontbijt & klaarmaken voor afdaling"], ["08:15–11:00", "Afdalen naar Supply Center"], ["11:00–11:30", "Gear inleveren & biertje"], ["11:30–13:00", "Snack & rit naar Atitlán"]] },
  ],
  faq: [["Lockers bij supply center?", "Ja, al raden we aan je spullen in Antigua te laten."], ["Hiking boots nodig?", "Aangeraden, maar hardloopschoenen met goede grip volstaan."], ["Schoenen huren?", "Nee, schoenen zijn niet te huur."], ["Porter voor je tas?", "Ja, Q250 één kant (100% gaat naar de porter)."]],
};

// ---------- Parse helpers ----------
function section(name) {
  const start = lines.findIndex((l) => l.trim() === "## " + name || l.trim().startsWith("## " + name + " "));
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { if (/^## /.test(lines[i])) { end = i; break; } }
  return lines.slice(start + 1, end);
}
const bold = (s, key) => { const m = s.match(new RegExp("\\*\\*" + key + ":\\*\\*\\s*(.+)")); return m ? m[1].trim() : null; };

// ---------- Meta ----------
const metaLines = section("Meta");
const tagline = (metaLines.find((l) => /Tagline:/.test(l)) || "").replace(/.*Tagline:\*\*\s*/, "").trim();
const mapsList = (metaLines.find((l) => /Favorietenkaart/.test(l)) || "").match(/https?:\S+/)?.[0] || "";

// ---------- Namen ----------
const namesIdx = lines.findIndex((l) => l.trim() === "## De 18 Feromonen");
const names = lines[namesIdx + 1].split("·").map((s) => s.trim()).filter(Boolean);

// ---------- Stops ----------
const stopRows = section("De 7 stops").filter((l) => /^\|/.test(l) && !/^\|\s*#/.test(l) && !/^\|\s*-+/.test(l) && !/^\|\s*:?-/.test(l));
const stops = stopRows.map((row) => {
  const c = row.split("|").map((x) => x.trim()).filter((x, i, a) => i > 0 && i < a.length - 1 || (i > 0 && x !== ""));
  const cells = row.split("|").slice(1, -1).map((x) => x.trim());
  const name = cells[1];
  const acc = cells[5];
  const l = locFor(acc);
  const s = { n: parseInt(cells[0], 10), name, country: cells[2], dates: cells[3].replace(/-/g, "–"), nights: parseInt(cells[4], 10), acc, blurb: STOP_BLURB[name] || "" };
  if (l.coords) s.accCoords = l.coords; else s.accMap = l.map;
  if (SPOTS[name]) s.spotsKey = name;
  if (name === "Acatenango") s.guide = "acatenango";
  return s;
});
const stopByName = {}; stops.forEach((s) => { stopByName[s.name] = s.n; });
stopByName["Naar huis"] = stops.length;

// ---------- Kamerindeling ----------
const rooms = section("Kamerindeling").filter((l) => /^- /.test(l)).map((l) => {
  const m = l.replace(/^- /, "").split(/:\s(.+)/);
  return { acc: m[0].trim(), layout: (m[1] || "").trim() };
});

// ---------- Dagen ----------
function parseLeg(body, isTransport) {
  const parts = body.split("·").map((s) => s.trim());
  const leg = {};
  leg.dep = parts[0];
  if (isTransport) { const fromto = parts[1].split("→").map((s) => s.trim()); leg.from = fromto[0]; leg.to = fromto[1]; }
  else leg.name = parts[1];
  for (let i = 2; i < parts.length; i++) {
    const t = parts[i];
    if (/^duur:/.test(t)) { leg.dur = t.replace(/^duur:\s*/, ""); if (!/^[\d.,]+\s*uur$/.test(leg.dur)) leg.multiday = true; }
    else if (/^ophalen:/.test(t)) { leg.pickup = t.replace(/^ophalen:\s*/, ""); }
    else if (/^meenemen:/.test(t)) { const b = t.replace(/^meenemen:\s*/, ""); if (/^\(.*\)$/.test(b)) leg.note = b.replace(/^\(|\)$/g, ""); else leg.bring = b.split(";").map((x) => x.trim()).filter(Boolean); }
  }
  if (leg.pickup) { const l = locFor(leg.pickup); leg.map = l.coords || l.map; }
  return leg;
}
function meals(s) {
  const p = s.split("/").map((x) => x.trim());
  const on = (x) => x && x !== "–" && x !== "-";
  return { b: on(p[0]), l: on(p[1]), d: on(p[2]) };
}

const days = [];
for (let i = 0; i < lines.length; i++) {
  const h = lines[i].match(/^### Dag (\d+) — (.+?) — (.+?) — (.+)$/);
  if (!h) continue;
  const d = parseInt(h[1], 10);
  const wdDate = h[2].trim().split(/\s+/); // [Weekday, DD, month]
  const wd = wdDate[0];
  const dayNum = parseInt(wdDate[1], 10);
  const mon = MONTHS[wdDate[2].toLowerCase()];
  const date = "2026-" + pad(mon) + "-" + pad(dayNum);
  const loc = h[3].trim();
  const title = h[4].trim();
  const day = { d, date, wd, loc, stop: stopByName[loc] || 1, title, meals: { b: false, l: false, d: false } };

  for (let j = i + 1; j < lines.length && !/^### /.test(lines[j]) && !/^## /.test(lines[j]); j++) {
    const ln = lines[j];
    const intro = bold(ln, "Intro"); if (intro) { day.intro = intro; continue; }
    if (/^- \*\*Transport:\*\*/.test(ln)) { (day.transport ||= []).push(parseLeg(ln.replace(/^- \*\*Transport:\*\*\s*/, ""), true)); continue; }
    if (/^- \*\*Activiteit:\*\*/.test(ln)) { (day.activity ||= []).push(parseLeg(ln.replace(/^- \*\*Activiteit:\*\*\s*/, ""), false)); continue; }
    if (/^- \*\*Aankomst:\*\*/.test(ln)) { const p = ln.replace(/^- \*\*Aankomst:\*\*\s*/, "").split("·").map((s) => s.trim()); const arr = { code: p[0], eta: p[1], who: [] }; for (let k = 2; k < p.length; k++) { if (/^vervoer:/.test(p[k])) arr.transport = p[k].replace(/^vervoer:\s*/, "").trim(); else arr.who = p[k].split(";").map((x) => x.trim()).filter(Boolean); } (day.arrivals ||= []).push(arr); continue; }
    const an = bold(ln, "Aankomst-note"); if (an) { day.arrivalNote = an; continue; }
    const verblijf = bold(ln, "Verblijf"); if (verblijf) { const l = locFor(verblijf); day.acc = { name: verblijf }; if (l.coords) day.acc.coords = l.coords; else day.acc.map = l.map; continue; }
    const m = bold(ln, "Maaltijden"); if (m) { day.meals = meals(m); continue; }
    const fl = bold(ln, "Vlucht naar huis"); if (fl) { const p = fl.split("·").map((s) => s.trim()); day.flight = { code: p[0], dep: p[1] }; continue; }
    const g = bold(ln, "Acatenango-gids"); if (g) { day.guide = "acatenango"; continue; }
  }
  if (!("acc" in day)) day.acc = null;
  days.push(day);
}
// stop.days afleiden
stops.forEach((s) => { s.days = days.filter((d) => d.stop === s.n).map((d) => d.d); });

// ---------- Praktisch ----------
const practical = {};
const PKEY = { "Geld & fooien": "geld", "Sí, hablo español": "spaans", "Gezondheid & water": "gezondheid" };
{
  const sec = section("Praktisch (tijdens de reis)");
  let cur = null;
  for (const ln of sec) {
    const hb = ln.match(/^\*\*(.+?)\*\*$/);
    if (hb) { const key = PKEY[hb[1]]; if (key) { cur = { title: hb[1], items: [] }; practical[key] = cur; } else cur = null; continue; }
    if (cur && /^- /.test(ln)) cur.items.push(ln.replace(/^- /, "").trim());
  }
}

// ---------- Contacten ----------
const contacts = section("Noodcontacten").filter((l) => /^- /.test(l)).map((l) => {
  const m = l.match(/^- \*\*(.+?)\*\*\s*\((.+?)\)\s*·\s*(.+)$/);
  return m ? { name: m[1], role: m[2], tel: m[3].trim() } : null;
}).filter(Boolean);

// ---------- Paklijst (afvinkbaar) ----------
const packing = [];
{
  let cur = null;
  for (const ln of section("Paklijst")) {
    const hb = ln.match(/^\*\*(.+?)\*\*$/);
    if (hb) { cur = { title: hb[1].trim(), items: [] }; packing.push(cur); continue; }
    if (cur && /^- /.test(ln)) cur.items.push(ln.replace(/^- /, "").trim());
  }
}

// ---------- Agenda-herinneringen ----------
const reminders = section("Agenda-herinneringen").map((l) => {
  const m = l.match(/^- \*\*(.+?):\*\*\s*(\d{4}-\d{2}-\d{2})\s*·\s*(\d{1,2}:\d{2})\s*·\s*(.+)$/);
  return m ? { name: m[1].trim(), date: m[2], time: m[3], title: m[4].trim() } : null;
}).filter(Boolean);

// ---------- Vertrek laatste dag (transfer-groepen) ----------
const departure = section("Vertrek laatste dag").filter((l) => /^- /.test(l)).map((l) => {
  const title = (l.match(/\*\*(.+?):\*\*/) || [])[1] || "";
  const rest = l.replace(/^- \*\*.+?:\*\*\s*/, "");
  const parts = rest.split("·").map((s) => s.trim()).filter(Boolean);
  const item = { title }, meta = [];
  parts.forEach((p) => {
    if (/^wie:/i.test(p)) item.who = p.replace(/^wie:\s*/i, "").split(";").map((x) => x.trim()).filter(Boolean);
    else meta.push(p);
  });
  if (meta.length) item.meta = meta.join(" · ");
  return item;
}).filter((d) => d.title);

// ---------- Assemble ----------
const TRIP = {
  meta: { club: "Fero", subtitle: "Los Feromonen · en route", title: "Guatemala & Belize", tagline, start: days[0].date, end: days[days.length - 1].date, countries: 2, stopsCount: stops.length, daysCount: days.length, note: "Tijden zijn een indicatie en kunnen wijzigen. Leidend is altijd de WhatsApp-groep.", mapsList },
  names,
  retourFlight: (days.find((d) => d.flight) || {}).flight || { code: "AA534", dep: "11:40" },
  stops, days, rooms, spots: SPOTS, practical, contacts, acatenango: ACATENANGO, packing, reminders, departure,
};

const header = "/* AUTO-GEGENEREERD uit content.md door build.mjs — NIET met de hand bewerken.\n   Bewerk content.md en run: node build.mjs */\n";
writeFileSync(join(DIR, "data.js"), header + "window.TRIP = " + JSON.stringify(TRIP, null, 2) + ";\n");
console.log("✓ data.js gegenereerd:", days.length, "dagen,", stops.length, "stops,", names.length, "namen,", contacts.length, "contacten,", rooms.length, "kamers,", packing.reduce((a, g) => a + g.items.length, 0), "paklijst-items,", reminders.length, "herinneringen.");
