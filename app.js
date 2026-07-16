/* ============================================================
   FERO companion-app, logica (v2)
   App = TIJDENS de reis. Geoptimaliseerd voor iPhone.
   ============================================================ */
(function () {
  "use strict";

  var GROUP_CODE = "fero2026";          // wijzigbaar
  var GATE_KEY = "fero_gate_ok";
  var APPEL_LABEL = "Compleet?";        // hernoemd van "Appèl"

  var T = window.TRIP;
  var view = document.getElementById("view");
  var app = document.getElementById("app");
  var gate = document.getElementById("gate");

  /* ---------- Helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function div(html) { var d = document.createElement("div"); d.innerHTML = html; return d; }
  function el(id) { return document.getElementById(id); }

  function mapsUrl(spec) {
    var q = Array.isArray(spec) ? spec[0] + "," + spec[1] : spec;
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function daysBetween(aISO, bISO) {
    return Math.round((new Date(bISO + "T00:00:00") - new Date(aISO + "T00:00:00")) / 86400000);
  }
  function currentDay() {
    var t = todayISO();
    for (var i = 0; i < T.days.length; i++) if (T.days[i].date === t) return T.days[i];
    return null;
  }
  function fmtDate(iso) {
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][parseInt(p[1], 10) - 1];
  }

  /* ---------- Tijd: eindtijd i.p.v. duur ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function parseHHMM(s) { var m = String(s || "").match(/(\d{1,2}):(\d{2})/); return m ? pad(m[1]) + ":" + m[2] : null; }
  function durHours(dur) {
    var m = String(dur || "").replace(",", ".").match(/([\d.]+)\s*uur/);
    return m ? parseFloat(m[1]) : null;
  }
  function endTime(dep, dur) {
    var hh = parseHHMM(dep), h = durHours(dur);
    if (!hh || h == null) return null;
    var parts = hh.split(":"); var mins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + Math.round(h * 60);
    mins = ((mins % 1440) + 1440) % 1440;
    return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60);
  }

  /* ---------- ICS (hele reis in agenda, met alarmen) ---------- */
  function icsTime(dateISO, hhmm) { return dateISO.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00"; }
  function icsEscape(s) { return String(s).replace(/[\\;,]/g, function (c) { return "\\" + c; }).replace(/\n/g, "\\n"); }
  function buildEvents(days) {
    var evs = [];
    days.forEach(function (day) {
      (day.transport || []).forEach(function (tr) { var hh = parseHHMM(tr.dep); if (hh) evs.push({ date: day.date, start: hh, end: endTime(tr.dep, tr.dur), title: "Vertrek: " + tr.from + " → " + tr.to, loc: tr.pickup || "" }); });
      (day.activity || []).forEach(function (ac) { var hh = parseHHMM(ac.dep); if (hh) evs.push({ date: day.date, start: hh, end: endTime(ac.dep, ac.dur), title: ac.name, loc: ac.pickup || "" }); });
    });
    (T.reminders || []).forEach(function (r) { var hh = parseHHMM(r.time); if (hh) evs.push({ date: r.date, start: hh, end: null, title: r.title, loc: "" }); });
    evs.sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
    return evs;
  }
  var TZID = "America/Guatemala"; // Guatemala én Belize = UTC-6, geen zomertijd
  // floating = true → geen tijdzone (volgt telefoon; mooi voor Apple). false → vaste UTC-6 (correct voor Google).
  function eventsToICS(evs, calName, floating) {
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fero//Lustrumreis//NL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + icsEscape(calName)];
    if (!floating) lines.push("BEGIN:VTIMEZONE", "TZID:" + TZID, "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:-0600", "TZOFFSETTO:-0600", "TZNAME:CST", "END:STANDARD", "END:VTIMEZONE");
    evs.forEach(function (e, i) {
      var endH = e.end || (function () { var p = e.start.split(":"); return pad((parseInt(p[0], 10) + 1) % 24) + ":" + p[1]; })();
      var early = parseInt(e.start.split(":")[0], 10) < 8;
      var dtS = floating ? "DTSTART:" + icsTime(e.date, e.start) : "DTSTART;TZID=" + TZID + ":" + icsTime(e.date, e.start);
      var dtE = floating ? "DTEND:" + icsTime(e.date, endH) : "DTEND;TZID=" + TZID + ":" + icsTime(e.date, endH);
      lines.push("BEGIN:VEVENT", "UID:fero-" + e.date.replace(/-/g, "") + "-" + i + "@fero", "DTSTAMP:20260611T000000Z",
        dtS, dtE, "SUMMARY:" + icsEscape(e.title));
      if (e.loc) lines.push("LOCATION:" + icsEscape(e.loc));
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape("Bijna weg: " + e.title), "TRIGGER:-PT30M", "END:VALARM");
      if (early) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape("Morgen vroeg: " + e.title), "TRIGGER:-PT12H", "END:VALARM");
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  function downloadAllToCalendar(floating) {
    var ics = eventsToICS(buildEvents(T.days), "Fero · Guatemala & Belize", floating);
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = floating ? "fero-apple-agenda.ics" : "fero-google-agenda.ics";
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 600);
  }
  function calCardHtml() {
    return '<div class="card"><b>Zet de hele reis in je agenda</b>' +
      '<div class="muted sm" style="margin:4px 0 10px">Alle tijden met een melding 30 min van tevoren. Kies je agenda:</div>' +
      '<div class="btn-row" style="margin-top:0"><button class="btn terra" id="cal-apple">📅 Apple Agenda</button><button class="btn dark" id="cal-google">📅 Google Agenda</button></div>' +
      '<div class="muted sm" style="margin-top:8px">Apple: tik en voeg toe. Google: importeer het bestand (handigst op een laptop).</div></div>';
  }

  /* ---------- Building blocks ---------- */
  function countryChip(country, today) {
    var cls = "chip" + (country === "BZ" ? " bz" : "") + (today ? " today" : "");
    return '<span class="' + cls + '">' + (today ? "Vandaag" : country === "BZ" ? "Belize" : "Guatemala") + "</span>";
  }
  function mealsHtml(m) {
    if (!m) return "";
    function dot(on, l) { return '<div class="meal' + (on ? " on" : "") + '">' + l + "</div>"; }
    return '<div class="meals" title="Ontbijt / Lunch / Diner">' + dot(m.b, "O") + dot(m.l, "L") + dot(m.d, "D") + "</div>";
  }
  function mapsBtn(spec, label) {
    if (!spec) return "";
    return '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + mapsUrl(spec) + '">📍 ' + (label || "Maps") + "</a>";
  }
  function bringHtml(bring) {
    if (!bring || !bring.length) return "";
    return '<div class="taglist">' + bring.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + "</div>";
  }
  function timeLabel(dep, dur, multiday) {
    var d = parseHHMM(dep) || esc(dep || "");
    if (multiday) return '<span class="t">' + d + '</span><span class="muted sm">' + esc(dur || "") + "</span>";
    var e = endTime(dep, dur);
    return '<span class="t">' + d + "</span>" + (e ? '<span class="muted sm">tot ' + e + "</span>" : "");
  }
  function legHtml(leg, isTransport) {
    var title = isTransport ? esc(leg.from) + " → " + esc(leg.to) : esc(leg.name);
    var sub = isTransport ? (leg.note ? esc(leg.note) : "") : (leg.pickup ? "Ophalen: " + esc(leg.pickup) : "");
    var h = '<div class="leg">';
    h += '<div class="leg-time">' + timeLabel(leg.dep, leg.dur, leg.multiday) + "</div>";
    h += '<div class="leg-body"><div class="leg-title">' + title + "</div>";
    if (sub) h += '<div class="muted sm">' + sub + "</div>";
    var mapSpec = leg.map || null;
    if (mapSpec) h += '<div class="btn-row">' + mapsBtn(mapSpec, "Open in Maps") + "</div>";
    h += bringHtml(leg.bring);
    h += "</div></div>";
    return h;
  }

  function dayCardHtml(day, isToday) {
    var stop = T.stops[day.stop - 1];
    var h = '<div class="card' + (day.festive ? " festive" : "") + '">';
    if (day.festive) h += '<div class="festive-banner">🎉 ' + esc(day.festive) + " 🎉</div>";
    h += '<div class="card-hd"><span class="daynum">Dag ' + day.d + " · " + (stop ? esc(stop.name) : "") + '</span>' + countryChip(stop ? stop.country : "GT", isToday) + "</div>";
    h += '<h2 class="section-title">' + esc(day.title) + "</h2>";
    h += '<p class="muted sm">' + esc(day.wd) + " " + fmtDate(day.date) + "</p>";
    if (day.intro) h += '<p style="margin-top:10px">' + esc(day.intro) + "</p>";
    (day.proposals || []).forEach(function (p) { h += '<div class="callout proposal"><b>Voorstel</b> ' + esc(p) + "</div>"; });
    (day.tips || []).forEach(function (t) { h += '<div class="callout tip"><b>Tip</b> ' + esc(t) + "</div>"; });

    if (day.arrivals && day.arrivals.length) {
      var hasTransport = day.arrivals.some(function (a) { return a.transport; });
      h += '<div class="block"><h3>Aankomst & transfer</h3>';
      if (hasTransport) {
        h += '<table class="ttable"><thead><tr><th>Vlucht</th><th>Aankomst</th><th>Vervoer</th><th>Wie</th></tr></thead><tbody>';
        day.arrivals.forEach(function (a) {
          h += "<tr><td>" + esc(a.code) + "</td><td>" + esc(a.eta) + '</td><td>' + esc(a.transport || ", ") + "</td><td>" + esc(a.who.join(", ")) + "</td></tr>";
        });
        h += "</tbody></table>";
      } else {
        day.arrivals.forEach(function (a) {
          h += '<div class="leg"><div class="leg-time"><span class="t">' + esc(a.eta) + '</span><span class="muted sm">' + esc(a.code) + '</span></div>' +
            '<div class="leg-body"><div class="leg-title" style="font-weight:400">' + esc(a.who.join(", ")) + "</div></div></div>";
        });
      }
      if (day.arrivalNote) h += '<p class="muted sm" style="margin-top:8px">' + esc(day.arrivalNote) + "</p>";
      h += "</div>";
    }

    if (day.transport && day.transport.length) {
      h += '<div class="block"><h3>Transport</h3>';
      day.transport.forEach(function (tr) { h += legHtml(tr, true); });
      h += "</div>";
    }
    if (day.activity && day.activity.length) {
      h += '<div class="block"><h3>Activiteit' + (day.activity.length > 1 ? "en" : "") + "</h3>";
      day.activity.forEach(function (ac) { h += legHtml(ac, false); });
      h += "</div>";
    }
    if (day.flight) h += '<div class="block"><h3>Vlucht naar huis</h3><div class="leg"><div class="leg-time"><span class="t">' + esc(day.flight.dep) + '</span></div><div class="leg-body"><div class="leg-title">' + esc(day.flight.code) + "</div></div></div></div>";

    h += '<div class="block"><h3>Verblijf & maaltijden</h3>';
    h += '<div class="acc-line">';
    h += '<div><b>' + (day.acc ? esc(day.acc.name) : "Geen overnachting") + "</b></div>" + mealsHtml(day.meals);
    h += "</div>";
    if (day.acc && (day.acc.coords || day.acc.map)) h += '<div class="btn-row">' + mapsBtn(day.acc.coords || day.acc.map, "Verblijf in Maps") + "</div>";
    h += "</div>";

    if (day.guide === "acatenango") h += '<div class="btn-row"><button class="btn dark" data-guide="acatenango">⛰ Acatenango-gids</button></div>';
    h += "</div>";
    return h;
  }

  /* ---------- Views ---------- */
  var views = {};

  views.vandaag = function () {
    var cur = currentDay();
    var startDiff = daysBetween(todayISO(), T.meta.start);
    var calCard = calCardHtml();

    if (cur) {
      return div('<p class="eyebrow">Vandaag · ' + esc(cur.wd) + " " + fmtDate(cur.date) + "</p>" + dayCardHtml(cur, true) + calCard);
    }
    if (startDiff > 0) {
      var first = T.days[0];
      return div(
        '<div class="count"><div class="big">' + startDiff + '</div><div class="lbl">nachtjes tot vertrek</div><div class="tag">' + esc(T.meta.tagline) + "</div></div>" +
        '<div class="card"><div class="card-hd"><span class="daynum">Eerste dag</span>' + countryChip("GT", false) + "</div>" +
        '<h2 class="section-title">' + esc(first.title) + '</h2><p class="muted sm">' + esc(first.wd) + " " + fmtDate(first.date) + " · " + esc(first.loc) + "</p>" +
        '<p style="margin-top:8px">' + esc(first.intro) + "</p></div>" + calCard
      );
    }
    return div('<div class="count"><div class="big">¡</div><div class="lbl">de reis zit erop</div><div class="tag">Tranquilo, tot de volgende keer</div></div>');
  };

  views.plekken = function () {
    var h = '<p class="eyebrow">Waar & wanneer</p><h2 class="section-title">Plekken</h2>';
    h += '<p class="muted sm">De 7 stops, jullie hotels en onze tips per plek.</p>';
    h += '<div class="btn-row" style="margin:12px 0 6px">' + '<a class="btn terra" target="_blank" rel="noopener" href="' + esc(T.meta.mapsList) + '">📍 Onze favorieten-kaart</a></div>';
    h += '<p class="muted sm">Onze gepinde restaurants, cafés & hidden gems. Open de kaart en zie wat dichtbij is.</p>';

    T.stops.forEach(function (s) {
      h += '<div class="card stop-card">';
      h += '<div class="card-hd"><span class="daynum">Stop ' + s.n + "</span>" + countryChip(s.country, false) + "</div>";
      h += '<h2 class="section-title">' + esc(s.name) + "</h2>";
      h += '<p class="muted sm">' + esc(s.dates) + " · " + s.nights + (s.nights === 1 ? " nacht" : " nachten") + "</p>";
      h += '<p style="margin-top:8px">' + esc(s.blurb) + "</p>";
      h += '<div class="acc-line" style="margin-top:10px"><div><span class="muted sm">Verblijf</span><br><b>' + esc(s.acc) + "</b></div></div>";
      h += '<div class="btn-row">';
      if (s.accCoords || s.accMap) h += mapsBtn(s.accCoords || s.accMap, "Verblijf in Maps");
      if (s.guide) h += '<button class="btn dark sm" data-guide="' + esc(s.guide) + '">⛰ Acatenango-gids</button>';
      h += "</div>";

      var tips = s.spotsKey && T.spots[s.spotsKey];
      if (tips && tips.length) {
        h += '<details class="acc" style="margin-top:12px"><summary>Tips voor ' + esc(s.name) + " (" + tips.length + ")</summary><div class=\"acc-body\">";
        tips.forEach(function (tp) { h += '<div class="kv"><b>' + esc(tp.name) + "</b><span class=\"muted sm\">" + esc(tp.desc) + "</span></div>"; });
        h += "</div></details>";
      } else if (!s.guide) {
        h += '<p class="muted sm" style="margin-top:10px">Weinig te plannen hier, vooral genieten.</p>';
      }
      h += "</div>";
    });
    return div(h);
  };

  views.route = function () {
    var cur = currentDay();
    var h = '<p class="eyebrow">Dag voor dag</p><h2 class="section-title">Route</h2><p class="muted sm">' + T.meta.daysCount + " dagen · " + T.meta.stopsCount + " stops · " + T.meta.countries + " landen</p>";
    h += '<div class="note-banner">' + esc(T.meta.note) + "</div><div style=\"margin-top:8px\">";
    T.days.forEach(function (day, idx) {
      var stop = T.stops[day.stop - 1];
      var isToday = cur && cur.d === day.d;
      var last = idx === T.days.length - 1;
      h += '<div class="stop' + (stop && stop.country === "BZ" ? " bz" : "") + '">' +
        '<div class="stop-col"><div class="dot"></div>' + (last ? "" : '<div class="line"></div>') + "</div>" +
        '<div class="stop-body"><div class="card-hd"><span class="daynum">Dag ' + day.d + " · " + fmtDate(day.date) + "</span>" +
        (isToday ? '<span class="chip today">Vandaag</span>' : countryChip(stop ? stop.country : "GT", false)) + "</div>" +
        '<h3 style="font-size:19px">' + esc(day.title) + "</h3>" +
        '<p class="muted sm">' + esc(day.loc) + (day.acc ? " · " + esc(day.acc.name) : "") + "</p>" +
        '<button class="btn ghost sm" style="margin-top:8px" data-open-day="' + day.d + '">Bekijk dag →</button></div></div>';
    });
    h += "</div>";
    return div(h);
  };

  /* Présent (aanwezigheidscheck) */
  function appelState() { try { return JSON.parse(localStorage.getItem("fero_appel") || "{}"); } catch (e) { return {}; } }
  function appelSave(s) { try { localStorage.setItem("fero_appel", JSON.stringify(s)); } catch (e) {} }
  views.appel = function () {
    var node = div('<p class="eyebrow">Iedereen mee?</p>' +
      '<div class="appel-head"><h2 class="section-title">' + APPEL_LABEL + '</h2><div class="counter"><span id="appel-count">0</span>/' + T.names.length + "</div></div>" +
      '<p class="muted sm">Tik iedereen aan die er is. Vergeet niemand! Reset voor de volgende stop.</p>' +
      '<div class="btn-row" style="margin:10px 0 16px"><button class="btn dark" id="appel-reset">↺ Reset</button></div>' +
      '<div class="namegrid" id="namegrid"></div>');
    var grid = node.querySelector("#namegrid");
    function refresh() {
      var st = appelState(), n = 0; grid.innerHTML = "";
      T.names.forEach(function (name) {
        var on = !!st[name]; if (on) n++;
        var row = document.createElement("div");
        row.className = "name" + (on ? " on" : "");
        row.innerHTML = '<div class="box">' + (on ? "✓" : "") + '</div><div class="label">' + esc(name) + "</div>";
        row.addEventListener("click", function () { var c = appelState(); c[name] = !c[name]; appelSave(c); refresh(); });
        grid.appendChild(row);
      });
      node.querySelector("#appel-count").textContent = n;
    }
    node.querySelector("#appel-reset").addEventListener("click", function () { appelSave({}); refresh(); });
    setTimeout(refresh, 0);
    return node;
  };

  /* Paklijst (afvinkbaar, bewaard op deze telefoon) */
  function packState() { try { return JSON.parse(localStorage.getItem("fero_paklijst") || "{}"); } catch (e) { return {}; } }
  function packSave(s) { try { localStorage.setItem("fero_paklijst", JSON.stringify(s)); } catch (e) {} }
  function packTotal() { return (T.packing || []).reduce(function (a, g) { return a + g.items.length; }, 0); }

  /* Boodschappen (afvinkbaar per team, bewaard op deze telefoon) */
  function shopState() { try { return JSON.parse(localStorage.getItem("fero_boodschappen") || "{}"); } catch (e) { return {}; } }
  function shopSave(s) { try { localStorage.setItem("fero_boodschappen", JSON.stringify(s)); } catch (e) {} }
  function shopTotal() {
    return ((T.shopping && T.shopping.teams) || []).reduce(function (a, t) {
      return a + t.groups.reduce(function (b, g) { return b + g.items.length; }, 0);
    }, 0);
  }

  views.info = function () {
    var h = '<p class="eyebrow">Goed om te weten</p><h2 class="section-title">Info</h2>';
    h += calCardHtml();

    if (T.departure && T.departure.length) {
      h += '<details class="acc" open><summary>🚤 Vertrek laatste dag (4 aug)</summary><div class="acc-body">';
      h += '<p class="muted sm" style="margin-top:0">De groep splitst op de laatste dag. Iedereen houdt haar eigen ticket in haar eigen mail.</p>';
      T.departure.forEach(function (d) {
        h += '<div class="kv"><b>' + esc(d.title) + "</b>";
        if (d.meta) h += '<span class="muted sm">' + esc(d.meta) + "</span>";
        if (d.who && d.who.length) h += '<span class="muted sm">Wie: ' + esc(d.who.join(", ")) + "</span>";
        h += "</div>";
      });
      h += "</div></details>";
    }

    if (T.packing && T.packing.length) {
      h += '<details class="acc" id="pack-acc"><summary>🎒 Paklijst <span class="muted sm" id="pack-count"></span></summary>' +
        '<div class="acc-body"><p class="muted sm" style="margin-top:0">Vink af wat je hebt ingepakt, blijft bewaard op je telefoon.</p>' +
        '<div class="btn-row" style="margin:0 0 12px"><button class="btn dark sm" id="pack-reset">↺ Reset</button></div>' +
        '<div id="packlist"></div></div></details>';
    }

    if (T.shopping && T.shopping.teams && T.shopping.teams.length) {
      h += '<details class="acc" id="shop-acc"><summary>🛒 Boodschappen dag 4 <span class="muted sm" id="shop-count"></span></summary><div class="acc-body">';
      if (T.shopping.intro) h += '<p class="muted sm" style="margin-top:0">' + esc(T.shopping.intro) + "</p>";
      h += '<div class="btn-row" style="margin:0 0 12px"><button class="btn dark sm" id="shop-reset">↺ Reset</button></div>';
      h += '<div id="shoplist"></div></div></details>';
    }

    Object.keys(T.practical).forEach(function (key) {
      var p = T.practical[key];
      h += '<details class="acc"><summary>' + esc(p.title) + '</summary><div class="acc-body"><ul class="bullets">';
      p.items.forEach(function (it) { h += "<li>" + esc(it) + "</li>"; });
      h += "</ul></div></details>";
    });
    h += '<details class="acc"><summary>🛏 Kamerindeling per accommodatie</summary><div class="acc-body">';
    T.rooms.forEach(function (r) { h += '<div class="kv"><b>' + esc(r.acc) + "</b><span class=\"muted sm\">" + esc(r.layout) + "</span></div>"; });
    h += "</div></details>";
    h += '<details class="acc" open><summary>📞 Noodcontacten</summary><div class="acc-body">';
    T.contacts.forEach(function (c) {
      h += '<div class="kv"><b>' + esc(c.name) + '</b><span class="muted sm">' + esc(c.role) + "</span>" +
        '<a class="acc-tel" href="tel:' + esc(c.tel.replace(/\s/g, "")) + '">' + esc(c.tel) + "</a></div>";
    });
    h += "</div></details>";
    var node = div(h);

    var packlist = node.querySelector("#packlist");
    if (packlist) {
      var countEl = node.querySelector("#pack-count");
      function refreshPack() {
        var st = packState(), done = 0, total = packTotal();
        packlist.innerHTML = "";
        T.packing.forEach(function (g) {
          var cat = document.createElement("div");
          cat.className = "pack-cat";
          cat.textContent = g.title;
          packlist.appendChild(cat);
          var grid = document.createElement("div");
          grid.className = "namegrid";
          g.items.forEach(function (item) {
            var key = g.title + "|" + item;
            var on = !!st[key]; if (on) done++;
            var row = document.createElement("div");
            row.className = "name" + (on ? " on" : "");
            row.innerHTML = '<div class="box">' + (on ? "✓" : "") + '</div><div class="label">' + esc(item) + "</div>";
            row.addEventListener("click", function () { var c = packState(); c[key] = !c[key]; packSave(c); refreshPack(); });
            grid.appendChild(row);
          });
          packlist.appendChild(grid);
        });
        if (countEl) countEl.textContent = done + "/" + total;
      }
      node.querySelector("#pack-reset").addEventListener("click", function () { packSave({}); refreshPack(); });
      setTimeout(refreshPack, 0);
    }

    var shoplist = node.querySelector("#shoplist");
    if (shoplist) {
      var shopCountEl = node.querySelector("#shop-count");
      var shopRows = [];

      function paintShop() {
        var st = shopState(), done = 0;
        shopRows.forEach(function (r) {
          var on = !!st[r.key];
          r.row.classList.toggle("on", on);
          r.box.textContent = on ? "✓" : "";
          if (on) done++;
        });
        T.shopping.teams.forEach(function (team, i) {
          var mine = shopRows.filter(function (r) { return r.team === i; });
          var d = mine.filter(function (r) { return !!st[r.key]; }).length;
          if (team.countEl) team.countEl.textContent = d + "/" + mine.length;
        });
        if (shopCountEl) shopCountEl.textContent = done + "/" + shopTotal();
      }

      T.shopping.teams.forEach(function (team, ti) {
        var wrap = document.createElement("details");
        wrap.className = "acc team-acc";
        var sum = document.createElement("summary");
        sum.innerHTML = '<span class="team-name">' + esc(team.title) + "</span>" +
          (team.task ? '<span class="team-task">' + esc(team.task) + "</span>" : "") +
          '<span class="muted sm team-n"></span>';
        team.countEl = sum.querySelector(".team-n");
        wrap.appendChild(sum);
        var body = document.createElement("div");
        body.className = "acc-body";
        if (team.who && team.who.length) {
          var who = document.createElement("p");
          who.className = "muted sm";
          who.style.margin = "0 0 6px";
          who.textContent = "Wie: " + team.who.join(", ");
          body.appendChild(who);
        }
        if (team.note) {
          var note = document.createElement("p");
          note.className = "muted sm";
          note.style.margin = "0 0 12px";
          note.textContent = team.note;
          body.appendChild(note);
        }
        team.groups.forEach(function (g) {
          if (g.title) {
            var cat = document.createElement("div");
            cat.className = "pack-cat";
            cat.textContent = g.title;
            body.appendChild(cat);
          }
          var grid = document.createElement("div");
          grid.className = "namegrid";
          g.items.forEach(function (item) {
            var key = team.title + "|" + g.title + "|" + item;
            var row = document.createElement("div");
            row.className = "name";
            row.innerHTML = '<div class="box"></div><div class="label">' + esc(item) + "</div>";
            row.addEventListener("click", function () { var c = shopState(); c[key] = !c[key]; shopSave(c); paintShop(); });
            shopRows.push({ key: key, row: row, box: row.querySelector(".box"), team: ti });
            grid.appendChild(row);
          });
          body.appendChild(grid);
        });
        wrap.appendChild(body);
        shoplist.appendChild(wrap);
      });

      node.querySelector("#shop-reset").addEventListener("click", function () { shopSave({}); paintShop(); });
      setTimeout(paintShop, 0);
    }
    return node;
  };

  /* ---------- Overlays ---------- */
  function acatenangoHtml() {
    var a = T.acatenango;
    var h = '<button class="btn ghost sm" id="back-btn" style="margin-bottom:12px">← Terug</button>';
    h += '<p class="eyebrow">Lava Trails</p><h2 class="section-title">Acatenango-gids</h2>';
    if (a.note) h += '<div class="note-banner">' + esc(a.note) + "</div>";
    h += '<div class="card"><h3 style="font-family:var(--serif);font-size:18px">Hoogtes</h3><ul class="bullets"><li>Acatenango summit, ' + a.summit.acatenango + " m</li><li>Volcán de Fuego, " + a.summit.fuego + " m</li><li>Basecamp, " + a.summit.basecamp + " m</li><li>La Soledad (start), " + a.summit.soledad + " m</li></ul></div>";
    a.schedule.forEach(function (s) {
      h += '<details class="acc" open><summary>' + esc(s.day) + '</summary><div class="acc-body">';
      s.items.forEach(function (it) { h += '<div class="leg"><div class="leg-time"><span class="t">' + esc(it[0]) + '</span></div><div class="leg-body"><div class="leg-title" style="font-weight:400">' + esc(it[1]) + "</div></div></div>"; });
      h += "</div></details>";
    });
    function list(title, arr) { return '<details class="acc"><summary>' + esc(title) + '</summary><div class="acc-body"><ul class="bullets">' + arr.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div></details>"; }
    h += list("Inbegrepen", a.included) + list("Krijg je van de operator", a.provided) + list("Zelf meenemen", a.bring) + list("Te huur", a.rent) + list("Eten & drinken", a.food);
    h += '<div class="card"><h3 style="font-family:var(--serif);font-size:18px">Optionele Fuego-hike</h3><p>' + esc(a.fuego) + "</p></div>";
    h += '<details class="acc"><summary>Veelgestelde vragen</summary><div class="acc-body">' + a.faq.map(function (q) { return '<div class="kv"><b>' + esc(q[0]) + "</b><span class=\"muted sm\">" + esc(q[1]) + "</span></div>"; }).join("") + "</div></details>";
    return h;
  }
  function dayNavHtml(d) {
    var prev = d > 1 ? d - 1 : null, next = d < T.days.length ? d + 1 : null;
    var h = '<div class="daynav">';
    h += prev ? '<button class="daynav-arrow" data-open-day="' + prev + '" aria-label="Vorige dag">‹</button>' : '<span class="daynav-arrow off">‹</span>';
    h += '<div class="daystrip" id="daystrip">';
    T.days.forEach(function (day) {
      h += '<button class="daychip' + (day.d === d ? " active" : "") + '" data-open-day="' + day.d + '"><span class="dc-n">Dag ' + day.d + '</span><span class="dc-d">' + fmtDate(day.date) + "</span></button>";
    });
    h += "</div>";
    h += next ? '<button class="daynav-arrow" data-open-day="' + next + '" aria-label="Volgende dag">›</button>' : '<span class="daynav-arrow off">›</span>';
    h += "</div>";
    return h;
  }
  function openDay(d) {
    var day = T.days.find(function (x) { return x.d === d; });
    if (!day) return;
    view.innerHTML = "";
    var node = div('<button class="btn ghost sm" id="back-btn" style="margin-bottom:10px">← Route</button>' + dayNavHtml(d) + dayCardHtml(day, currentDay() && currentDay().d === day.d));
    node.classList.add("fade-in"); view.appendChild(node);
    var strip = node.querySelector("#daystrip"), act = node.querySelector(".daychip.active");
    if (strip && act) strip.scrollLeft = act.offsetLeft - strip.clientWidth / 2 + act.clientWidth / 2;
    window.scrollTo(0, 0);
  }

  /* ---------- Render + nav ---------- */
  var lastTab = "vandaag";
  function render(tab) {
    lastTab = tab;
    view.innerHTML = "";
    var node = (views[tab] || views.vandaag)();
    node.classList.add("fade-in");
    view.appendChild(node);
    var ap = node.querySelector("#cal-apple"); if (ap) ap.addEventListener("click", function () { downloadAllToCalendar(true); });
    var go = node.querySelector("#cal-google"); if (go) go.addEventListener("click", function () { downloadAllToCalendar(false); });
    window.scrollTo(0, 0);
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("is-active", b.dataset.tab === tab); });
  }

  view.addEventListener("click", function (e) {
    var t = e.target.closest("[data-open-day],[data-guide],#back-btn");
    if (!t) return;
    if (t.id === "back-btn") { render(lastTab === "route" ? "route" : lastTab); return; }
    if (t.dataset.openDay) { openDay(parseInt(t.dataset.openDay, 10)); return; }
    if (t.dataset.guide === "acatenango") { view.innerHTML = ""; var n = div(acatenangoHtml()); n.classList.add("fade-in"); view.appendChild(n); window.scrollTo(0, 0); }
  });

  document.getElementById("tabbar").addEventListener("click", function (e) {
    var b = e.target.closest(".tab"); if (b) render(b.dataset.tab);
  });

  /* ---------- Gate ---------- */
  function startApp() { gate.hidden = true; app.hidden = false; el("topbar-sub").textContent = T.meta.title; render("vandaag"); }
  function initGate() {
    if (sessionStorage.getItem(GATE_KEY) === "1") { startApp(); return; }
    gate.hidden = false; app.hidden = true;
    el("gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (el("gate-input").value.trim().toLowerCase() === GROUP_CODE.toLowerCase()) { sessionStorage.setItem(GATE_KEY, "1"); startApp(); }
      else { el("gate-error").hidden = false; }
    });
  }

  if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("service-worker.js").catch(function () {}); });

  // tab-label dynamisch (rename)
  var appelTab = document.querySelector('.tab[data-tab="appel"] .tlabel');
  if (appelTab) appelTab.textContent = APPEL_LABEL;

  initGate();
})();
