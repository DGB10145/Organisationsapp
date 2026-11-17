/* FokusPlan – Tagesplaner. Reines HTML/JS, offline-fähig, ohne Abhängigkeiten. */
(function () {
  "use strict";
  var D = window.FP_DATA, CATS = D.CATS;
  var KEY = "fokusplan-v1";

  /* ---------- Helfer ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addYmd(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function today() { return ymd(new Date()); }
  function wd(s) { return (parse(s).getDay() + 6) % 7; }
  function mondayOf(s) { return addYmd(s, -wd(s)); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function toMin(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : null; }
  function fromMin(n) { n = Math.max(0, Math.min(1439, Math.round(n))); return pad(Math.floor(n / 60)) + ":" + pad(n % 60); }
  function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function uid(p) { return (p || "t") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  var WD = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  var WDS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  function fmtDate(s, o) { return parse(s).toLocaleDateString("de-DE", o || { weekday: "long", day: "numeric", month: "long" }); }
  function relDay(s) {
    if (!s) return "Ohne Datum";
    var d = diffDays(today(), s);
    if (d === 0) return "Heute"; if (d === 1) return "Morgen"; if (d === 2) return "Übermorgen"; if (d === -1) return "Gestern";
    return fmtDate(s, { weekday: "short", day: "numeric", month: "short" });
  }
  function isoWeek(s) {
    var d = parse(s), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / 864e5 + 1) / 7) };
  }
  function readLS(k) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function fmtDur(m) { if (!m) return ""; if (m < 60) return m + " Min."; var h = Math.floor(m / 60), r = m % 60; return h + " Std." + (r ? " " + r + " Min." : ""); }
  function cat(c) { return CATS[c] || CATS.personal; }
  function pickOfDay(arr, salt) { return arr[hash(today() + (salt || "")) % arr.length]; }

  /* ---------- Zustand ---------- */
  function DEF() {
    return {
      v: 1, onboard: false, firstDay: today(),
      profile: { name: "", weight: null, height: 179, age: null, sex: "m", activity: 1.7, surplus: 400, ppk: 2.0, goalWeight: null },
      routines: [], tasks: {}, skipped: {}, food: {}, weight: {}, shop: {},
      lang: { turkish: { srs: {}, min: {}, cards: {} }, ewe: { min: {} } },
      checkin: {}, exams: [], xp: 0, recentFoods: [], notified: {},
      settings: {
        theme: "auto", notify: false, useTraining: true, dayStart: "06:00", dayEnd: "21:30", trainSig: "",
        links: { training: "https://dgb10145.github.io/Training-app-/", ewe: "https://dgb10145.github.io/Ewe-Lernapp/", bio: "" }
      }
    };
  }
  var S = (function () {
    var d = DEF(), s = readLS(KEY);
    if (!s || typeof s !== "object") return d;
    Object.keys(d).forEach(function (k) { if (s[k] == null) s[k] = d[k]; });
    s.profile = Object.assign(d.profile, s.profile);
    s.settings = Object.assign(d.settings, s.settings);
    s.settings.links = Object.assign(d.settings.links, s.settings.links || {});
    s.lang = Object.assign(d.lang, s.lang);
    s.lang.turkish = Object.assign({ srs: {}, min: {}, cards: {} }, s.lang.turkish);
    s.lang.ewe = Object.assign({ min: {} }, s.lang.ewe);
    return s;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Speichern fehlgeschlagen – Speicher voll?"); } }

  if (!S.routines.length) S.routines = D.ROUTINES.map(function (r, i) { var x = clone(r); x.id = "r" + i; return x; });

  /* ---------- Trainingsapp & Ewe-App (gleicher Speicher, wenn beide unter derselben Adresse laufen) ---------- */
  var LSC = {};
  function readLSc(k) { var c = LSC[k], n = Date.now(); if (c && n - c.t < 1500) return c.v; var v = readLS(k); LSC[k] = { t: n, v: v }; return v; }
  function trainingCfg() { var c = readLSc("trainingsapp-config-v1"); return c && Array.isArray(c.days) ? c : null; }
  function trainingSessions(d) {
    var c = trainingCfg();
    if (c && c.days[d]) return (c.days[d].sessions || []).map(function (s) { return { time: s.time, end: s.end, title: s.title }; });
    return D.TRAINING_FALLBACK[d] || [];
  }
  function trainingStatus(date, si) {
    var c = trainingCfg(), data = readLSc("trainingsapp-data-v1");
    if (!c || !data || !data.checks) return null;
    var day = c.days[wd(date)], se = day && day.sessions && day.sessions[si];
    if (!se) return null;
    var start = parse(c.meta && c.meta.startDate) ? c.meta.startDate : mondayOf(date);
    var raw = Math.round((parse(mondayOf(date)) - parse(mondayOf(start))) / 6048e5) + 1, week = Math.max(1, raw);
    var s = 1, phases = c.phases || [], ph = Math.max(0, phases.length - 1);
    for (var i = 0; i < phases.length; i++) { var w = +phases[i].weeks > 0 ? Math.floor(+phases[i].weeks) : null; var end = w ? s + w - 1 : Infinity; if (week <= end) { ph = i; break; } s = end + 1; }
    var odd = week % 2 === 1, iw = isoWeek(mondayOf(date)), wk = iw.year + "-W" + pad(iw.week);
    var items = (se.items || []).filter(function (it) {
      if (Array.isArray(it.phases) && it.phases.length && it.phases.indexOf(ph + 1) < 0) return false;
      if (it.parity === "odd" && !odd) return false; if (it.parity === "even" && odd) return false; return true;
    });
    if (!items.length) return null;
    var done = items.filter(function (it) { return data.checks[wk + "|" + it.id]; }).length;
    return { done: done, total: items.length };
  }
  function eweApp() {
    var s = readLSc("ewe.state.v1");
    if (!s) return null;
    var t = today();
    return { streak: s.streak && (s.streak.last === t || s.streak.last === addYmd(t, -1)) ? s.streak.count : 0, last: s.streak && s.streak.last, todayCount: s.day && s.day.date === t ? s.day.count : 0, goal: (s.settings && s.settings.goal) || 20 };
  }
  function trainingEvent() {
    var c = trainingCfg(); if (!c || !c.meta || !c.meta.eventDate) return null;
    return { label: c.meta.eventLabel || "Turnier", date: c.meta.eventDate };
  }

  /* ---------- Aufgaben ---------- */
  function tasksOn(date) {
    var out = [];
    for (var id in S.tasks) if (S.tasks[id].date === date) out.push(S.tasks[id]);
    return out.sort(sortTasks);
  }
  function sortTasks(a, b) {
    var ta = toMin(a.time), tb = toMin(b.time);
    if (ta == null && tb == null) return prioN(b) - prioN(a) || (a.created || 0) - (b.created || 0);
    if (ta == null) return -1; if (tb == null) return 1;
    return ta - tb || (a.kind === "fixed" ? -1 : 1);
  }
  function prioN(t) { return t.prio === "high" ? 2 : t.prio === "low" ? 0 : 1; }
  function newTask(o) {
    var t = Object.assign({ id: uid(), title: "", cat: "personal", prio: "medium", date: today(), time: null, dur: 30, kind: "task", done: false, postponed: 0, notes: "", sub: [], created: Date.now(), src: "manual" }, o);
    S.tasks[t.id] = t; return t;
  }
  function fromRoutine(r, date, rk) {
    var dur = r.end ? Math.max(5, toMin(r.end) - toMin(r.time)) : (r.dur || 30);
    return newTask({ title: r.title, cat: r.cat, kind: r.kind || "task", date: date, time: r.time || null, dur: dur, notes: r.note || "", rk: rk, rid: r.id, src: "routine", lang: r.lang, meal: r.meal, review: r.review, sleep: r.sleep, prio: r.cat === "uni" ? "medium" : (r.lang || r.cat === "biology" ? "high" : "medium") });
  }
  function rkIndex() { var m = {}; for (var id in S.tasks) if (S.tasks[id].rk) m[S.tasks[id].rk] = 1; return m; }

  function ensureDay(date, idx) {
    if (date < S.firstDay || diffDays(today(), date) > 60) return;
    idx = idx || rkIndex();
    var d = wd(date), flex = [];
    S.routines.forEach(function (r) {
      if (r.off || !r.days || r.days.indexOf(d) < 0) return;
      var rk = r.id + "|" + date;
      if (idx[rk] || S.skipped[rk] || (r.from && date < r.from)) return;
      var t = fromRoutine(r, date, rk); idx[rk] = 1;
      if (r.flex && !r.time) { t.prefer = r.prefer; flex.push(t); }
    });
    if (S.settings.useTraining) trainingSessions(d).forEach(function (se, si) {
      var rk = "tr|" + date + "|" + si;
      if (idx[rk] || S.skipped[rk]) return;
      idx[rk] = 1;
      newTask({ title: se.title || "Training", cat: "training", date: date, time: se.time || null, dur: se.end && se.time ? Math.max(10, toMin(se.end) - toMin(se.time)) : 60, rk: rk, src: "training", tsi: si, prio: "high" });
    });
    flex.sort(function (a, b) { return (b.dur || 0) - (a.dur || 0); }).forEach(function (t) { placeFlex(t, t.prefer); });
  }
  function busy(date, exceptId) {
    return tasksOn(date).filter(function (x) { return x.id !== exceptId && x.time; })
      .map(function (x) { var s = toMin(x.time); return [s, s + (x.dur || 15)]; });
  }
  function findSlot(date, dur, fromM, exceptId) {
    var b = busy(date, exceptId), end = toMin(S.settings.dayEnd);
    var start = Math.max(toMin(S.settings.dayStart), fromM || 0);
    if (date === today()) start = Math.max(start, nowMin() + 5);
    for (var m = Math.ceil(start / 5) * 5; m + dur <= end; m += 5) {
      var ok = b.every(function (iv) { return m + dur <= iv[0] || m >= iv[1]; });
      if (ok) return m;
    }
    return null;
  }
  function placeFlex(t, prefer) {
    var m = findSlot(t.date, t.dur || 30, toMin(prefer), t.id);
    if (m == null && prefer) m = findSlot(t.date, t.dur || 30, 0, t.id);
    t.time = m == null ? null : fromMin(m);
    return t.time;
  }
  function autoPlan(date) {
    var open = tasksOn(date).filter(function (t) { return !t.done && t.kind !== "fixed" && !t.time; })
      .sort(function (a, b) { return prioN(b) - prioN(a); });
    var n = 0;
    open.forEach(function (t) { if (placeFlex(t)) { t.touched = true; n++; } });
    save();
    return { placed: n, left: open.length - n };
  }
  function replanMissed(date) {
    var nm = nowMin(), n = 0;
    tasksOn(date).filter(function (t) { return !t.done && t.kind !== "fixed" && !t.meal && t.src !== "training" && !t.sleep && t.time && toMin(t.time) + (t.dur || 15) < nm; })
      .forEach(function (t) { t.time = null; if (placeFlex(t)) n++; t.touched = true; });
    save(); return n;
  }

  function rollover() {
    var t = today(), n = 0;
    for (var id in S.tasks) {
      var x = S.tasks[id];
      if (!x.rk && !x.done && x.date && x.date < t && x.kind !== "fixed") { x.date = t; x.postponed = (x.postponed || 0) + 1; x.time = null; n++; }
    }
    // Aufräumen: alte Routine-Einträge nach 120 Tagen löschen
    var cut = addYmd(t, -120);
    for (var k in S.tasks) if (S.tasks[k].rk && S.tasks[k].date && S.tasks[k].date < cut) delete S.tasks[k];
    return n;
  }
  function regenRoutine(rid) {
    var t = today();
    for (var id in S.tasks) {
      var x = S.tasks[id];
      if (x.rid === rid && x.date >= t && !x.done && !x.touched) delete S.tasks[id];
    }
    Object.keys(S.skipped).forEach(function (k) { if (k.indexOf(rid + "|") === 0 && k.split("|")[1] >= t) delete S.skipped[k]; });
  }
  function checkTrainingSig() {
    var sig = JSON.stringify([0, 1, 2, 3, 4, 5, 6].map(trainingSessions)) + S.settings.useTraining;
    if (sig === S.settings.trainSig) return;
    var t = today();
    for (var id in S.tasks) { var x = S.tasks[id]; if (x.src === "training" && x.date >= t && !x.done && !x.touched) delete S.tasks[id]; }
    S.settings.trainSig = sig;
  }

  function points(t) { return t.kind === "fixed" ? 0 : t.meal ? 5 : 10 + (t.prio === "high" ? 5 : 0); }
  function level() {
    var xp = S.xp || 0, l = Math.floor(Math.sqrt(xp / 40)) + 1;
    return { lvl: l, xp: xp, next: l * l * 40, prev: (l - 1) * (l - 1) * 40 };
  }
  function isDone(t) {
    if (t.done) return true;
    if (t.src === "training") { var st = trainingStatus(t.date, t.tsi); if (st && st.done >= st.total) return true; }
    return false;
  }
  function toggle(id) {
    var t = S.tasks[id]; if (!t || t.kind === "fixed") return;
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
    S.xp = Math.max(0, (S.xp || 0) + (t.done ? points(t) : -points(t)));
    if (t.lang && !t.timerLogged) { var m = S.lang[t.lang].min; m[t.date] = Math.max(0, (m[t.date] || 0) + (t.done ? t.dur : -t.dur)); }
    save(); render();
    if (t.done) {
      var open = tasksOn(t.date).filter(function (x) { return x.kind !== "fixed" && !isDone(x); }).length;
      if (open === 0) toast("Alles erledigt für " + relDay(t.date).toLowerCase() + "! 🎉 +" + points(t) + " XP");
      else toast("Erledigt ✓  +" + points(t) + " XP", "Rückgängig", function () { toggle(id); });
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }
  function moveTask(id, date, time) {
    var t = S.tasks[id]; if (!t) return;
    if (date !== undefined) {
      if (t.date && date && date > t.date) t.postponed = (t.postponed || 0) + 1;
      t.date = date;
    }
    if (time !== undefined) t.time = time;
    t.touched = true; save();
  }
  function postpone(id, days) {
    var t = S.tasks[id]; if (!t) return;
    var base = t.date && t.date >= today() ? t.date : today();
    var nd = addYmd(base, days || 1);
    ensureDay(nd);
    moveTask(id, nd, undefined);
    if (t.time) { var m = findSlot(nd, t.dur || 30, toMin(t.time), t.id); if (m != null) t.time = fromMin(m); }
    save(); render();
    toast("Verschoben auf " + relDay(nd), "Rückgängig", function () { t.date = base; t.postponed = Math.max(0, t.postponed - 1); save(); render(); });
  }
  function deleteTask(id) {
    var t = S.tasks[id]; if (!t) return;
    var copy = clone(t);
    if (t.rk) S.skipped[t.rk] = 1;
    delete S.tasks[id]; save(); render();
    toast("Gelöscht", "Rückgängig", function () { S.tasks[copy.id] = copy; if (copy.rk) delete S.skipped[copy.rk]; save(); render(); });
  }

  /* ---------- Schnelleingabe ---------- */
  var CAT_WORDS = [
    ["turkish", /(^|\s)#?(türkisch|tuerkisch|turkish|tr)(\s|$)/i],
    ["ewe", /(^|\s)#?ewe(\s|$)/i],
    ["biology", /(^|\s)#?(bio|biologie|biology)(\s|$)/i],
    ["training", /(^|\s)#?(training|gym|laufen|sprint|workout|basketball|fußball|fussball)(\s|$)/i],
    ["nutrition", /(^|\s)#?(essen|einkaufen|einkauf|kochen|shake|meal ?prep|ernährung)(\s|$)/i],
    ["uni", /(^|\s)#?(uni|vorlesung|klausur|mathe|seminar|praktikum|protokoll)(\s|$)/i],
    ["orga", /(^|\s)#?(orga|termin|anrufen|mail|email|bank|amt|formular)(\s|$)/i],
    ["personal", /(^|\s)#(privat|personal)(\s|$)/i]
  ];
  function parseQuick(text) {
    var r = {}, s = " " + text + " ", t = today();
    function cut(re) { s = s.replace(re, " "); }
    var m;
    if ((m = /(^|\s)übermorgen(\s|$)/i.exec(s))) { r.date = addYmd(t, 2); cut(m[0]); }
    else if ((m = /(^|\s)morgen(\s|$)/i.exec(s))) { r.date = addYmd(t, 1); cut(m[0]); }
    else if ((m = /(^|\s)heute(\s|$)/i.exec(s))) { r.date = t; cut(m[0]); }
    else if ((m = /(^|\s)nächste woche(\s|$)/i.exec(s))) { r.date = addYmd(mondayOf(t), 7); cut(m[0]); }
    else if ((m = /(^|\s)(am\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)(\s|$)/i.exec(s))) {
      var target = WD.map(function (x) { return x.toLowerCase(); }).indexOf(m[3].toLowerCase());
      var delta = (target - wd(t) + 7) % 7; r.date = addYmd(t, delta); cut(m[0]);
    } else if ((m = /(^|\s)(am\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(\s|$)/i.exec(s))) {
      var y = m[5] ? (m[5].length === 2 ? 2000 + +m[5] : +m[5]) : new Date().getFullYear();
      var dd = ymd(new Date(y, +m[4] - 1, +m[3])); if (!m[5] && dd < t) dd = ymd(new Date(y + 1, +m[4] - 1, +m[3]));
      r.date = dd; cut(m[0]);
    }
    if ((m = /(^|\s)(um\s+)?(\d{1,2})[:.](\d{2})(\s*uhr)?(\s|$)/i.exec(s)) && +m[3] < 24 && +m[4] < 60) { r.time = pad(+m[3]) + ":" + m[4]; cut(m[0]); }
    else if ((m = /(^|\s)(um\s+)?(\d{1,2})\s*uhr(\s|$)/i.exec(s)) && +m[3] < 24) { r.time = pad(+m[3]) + ":00"; cut(m[0]); }
    if ((m = /(^|\s)(\d{1,3})\s*(min|minuten|m)\.?(\s|$)/i.exec(s))) { r.dur = +m[2]; cut(m[0]); }
    else if ((m = /(^|\s)(\d+)(?:[.,](\d))?\s*(h|std|stunden?)\.?(\s|$)/i.exec(s))) { r.dur = Math.round((+m[2] + (m[3] ? +m[3] / 10 : 0)) * 60); cut(m[0]); }
    if ((m = /(^|\s)(!!|!hoch|wichtig|dringend)(\s|$)/i.exec(s))) { r.prio = "high"; cut(m[0]); }
    else if ((m = /(^|\s)(!niedrig|!low)(\s|$)/i.exec(s))) { r.prio = "low"; cut(m[0]); }
    else if ((m = /(^|\s)!(\s|$)/.exec(s))) { r.prio = "high"; cut(m[0]); }
    var hashMatch = false;
    var hm = /(^|\s)#(\S+)/.exec(s);
    if (hm) for (var i = 0; i < CAT_WORDS.length; i++) {
      if (CAT_WORDS[i][1].test(" " + hm[2] + " ")) { r.cat = CAT_WORDS[i][0]; cut(hm[0]); hashMatch = true; break; }
    }
    for (i = 0; i < CAT_WORDS.length && !hashMatch; i++) {
      if (CAT_WORDS[i][1].exec(s)) { r.cat = CAT_WORDS[i][0]; break; }
    }
    r.title = s.replace(/\s+/g, " ").trim();
    return r;
  }

  /* ---------- Ernährung ---------- */
  function targets() {
    var p = S.profile; if (!p.weight || !p.age || !p.height) return null;
    var bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "f" ? -161 : 5);
    var tdee = bmr * (+p.activity || 1.6);
    var kcal = Math.round((tdee + (+p.surplus || 0)) / 50) * 50;
    var protein = Math.round(p.weight * (+p.ppk || 2));
    var fat = Math.round(kcal * 0.25 / 9);
    var carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: kcal, protein: protein, fat: fat, carbs: carbs };
  }
  function foodDay(date) { var l = S.food[date] || []; return { kcal: sum(l.map(function (e) { return e.k; })), p: sum(l.map(function (e) { return e.p; })), list: l }; }
  function addFood(date, name, k, p, q) {
    q = q || 1;
    (S.food[date] = S.food[date] || []).push({ n: name + (q !== 1 ? " ×" + String(q).replace(".", ",") : ""), k: Math.round(k * q), p: Math.round(p * q), at: Date.now() });
    S.recentFoods = [name].concat(S.recentFoods.filter(function (x) { return x !== name; })).slice(0, 8);
    save();
  }
  function weightSeries(days) {
    var t = today(), out = [];
    for (var i = days; i >= 0; i--) { var d = addYmd(t, -i); if (S.weight[d]) out.push({ d: d, w: S.weight[d] }); }
    return out;
  }
  function weightTrend() {
    var s = weightSeries(28); if (s.length < 3) return null;
    var t = today();
    function avg(from, to) { var v = s.filter(function (x) { var dd = diffDays(x.d, t); return dd >= from && dd < to; }).map(function (x) { return x.w; }); return v.length ? sum(v) / v.length : null; }
    var a = avg(0, 7), b = avg(7, 14), c = avg(14, 21);
    if (a == null || (b == null && c == null)) return null;
    var perWeek = b != null ? a - b : (a - c) / 2;
    var twoWeeks = c != null ? (a - c) / 2 : perWeek;
    return { perWeek: perWeek, twoWeeks: twoWeeks, avg: a };
  }
  function nutritionAdvice() {
    var tr = weightTrend(); if (!tr) return null;
    if (tr.twoWeeks < 0.1) return { kind: "up", text: "Dein Gewicht steht seit etwa 2 Wochen (" + fmtKg(tr.twoWeeks, true) + "/Woche). Zeit für +150 kcal am Tag, z. B. ein Glas Vollmilch extra.", delta: 150 };
    if (tr.perWeek > 0.6) return { kind: "down", text: "Du nimmst gerade " + fmtKg(tr.perWeek, true) + " pro Woche zu. Das ist etwas schnell, ein Teil davon ist Fett. Probier −100 kcal.", delta: -100 };
    return { kind: "ok", text: "Perfekt im Plan: " + fmtKg(tr.perWeek, true) + " pro Woche. Genau so weitermachen." };
  }
  function fmtKg(v, sign) { return (sign && v > 0 ? "+" : "") + v.toFixed(2).replace(".", ",") + " kg"; }

  /* ---------- Gewohnheiten ---------- */
  var HABITS = [
    { id: "training", name: "🏋️ Training", fn: function (d) { var l = tasksOn(d).filter(function (t) { return t.src === "training"; }); if (!l.length) return null; if (l.every(isDone)) return true; return d < today() ? false : null; } },
    { id: "turkish", label: "Türkisch", name: "🇹🇷 Türkisch", fn: function (d) { var tk = S.lang.turkish; if ((tk.min[d] || 0) > 0 || (tk.cards[d] || 0) >= 10 || tasksOn(d).some(function (t) { return t.lang === "turkish" && t.done; })) return true; return d < today() ? false : null; } },
    { id: "ewe", label: "Ewe", name: "🌍 Ewe", fn: function (d) { var e = eweApp(); if ((S.lang.ewe.min[d] || 0) > 0 || tasksOn(d).some(function (t) { return t.lang === "ewe" && t.done; }) || (e && e.last === d)) return true; return d < today() ? false : null; } },
    { id: "biology", name: "🧬 Bio lernen", fn: function (d) { var l = tasksOn(d).filter(function (t) { return t.cat === "biology"; }); if (!l.length) return null; if (l.some(function (t) { return t.done; })) return true; return d < today() ? false : null; } },
    { id: "protein", name: "🥩 Proteinziel", fn: function (d) { var tg = targets(); if (!tg) return null; var f = foodDay(d); if (f.p >= tg.protein) return true; return d < today() ? false : null; } },
    { id: "kcal", name: "🍽️ Kalorienziel", fn: function (d) { var tg = targets(); if (!tg) return null; var f = foodDay(d); if (f.kcal >= tg.kcal * 0.95) return true; return d < today() ? false : null; } },
    { id: "sleep", name: "😴 Pünktlich ins Bett", fn: function (d) { var l = tasksOn(d).filter(function (t) { return t.sleep; }); if (!l.length) return null; if (l.some(function (t) { return t.done; })) return true; return d < today() ? false : null; } }
  ];
  function habitVal(h, d) { if (d < S.firstDay) return undefined; return h.fn(d); }
  function streak(h) {
    var d = today(), n = 0, guard = 0;
    var v = habitVal(h, d); if (v === true) n++;
    d = addYmd(d, -1);
    while (guard++ < 120) {
      v = habitVal(h, d);
      if (v === undefined || v === false) break;
      if (v === true) n++;
      d = addYmd(d, -1);
    }
    return n;
  }

  /* ---------- Türkisch-Karteikarten (Leitner) ---------- */
  var BOX_DAYS = [0, 1, 3, 7, 16, 35, 90];
  function srsDue() {
    var t = today(), srs = S.lang.turkish.srs, due = [], fresh = [];
    D.TURKISH.forEach(function (w, i) { var c = srs[i]; if (!c) fresh.push(i); else if (c.due <= t) due.push(i); });
    var newToday = S.lang.turkish.newDay === t ? (S.lang.turkish.newCount || 0) : 0;
    return { due: due, fresh: fresh.slice(0, Math.max(0, 10 - newToday)), learned: Object.keys(srs).filter(function (k) { return srs[k].box >= 3; }).length, seen: Object.keys(srs).length };
  }
  function srsAnswer(i, ok) {
    var t = today(), tk = S.lang.turkish, c = tk.srs[i];
    if (!c) { if (tk.newDay !== t) { tk.newDay = t; tk.newCount = 0; } tk.newCount++; c = { box: 0 }; }
    c.box = ok ? Math.min(BOX_DAYS.length - 1, c.box + 1) : 1;
    c.due = addYmd(t, ok ? BOX_DAYS[c.box] : 0);
    if (!ok) c.due = t;
    tk.srs[i] = c; tk.cards[t] = (tk.cards[t] || 0) + 1;
    S.xp += ok ? 2 : 1; save();
  }
  function speak(text, lang) {
    try { if (!window.speechSynthesis) return toast("Sprachausgabe nicht verfügbar"); var u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- Ansicht ---------- */
  var V = { tab: "today", date: today(), weekOff: 0, goals: "nutrition", tfilter: "open", tcat: "", foodQ: 1 };
  var view = $("#view");

  function render() {
    var t = today();
    if (V.lastToday !== t) { if (V.lastToday && V.date === V.lastToday) V.date = t; V.lastToday = t; if (rollover()) save(); }
    ensureDay(V.date);
    if (V.date !== t) ensureDay(t);
    $$("#tabbar button").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === V.tab); });
    var L = level();
    $("#lvl").innerHTML = '<span class="badge">' + L.lvl + '</span>' + L.xp + " XP";
    $("#dateline").textContent = fmtDate(t, { weekday: "long", day: "numeric", month: "long" }) + " · KW " + isoWeek(t).week;
    var titles = { today: S.profile.name ? "Hallo " + S.profile.name : "FokusPlan", week: "Woche", tasks: "To-dos", goals: "Ziele", more: "Mehr" };
    $("#title").textContent = titles[V.tab];
    var html = { today: renderToday, week: renderWeek, tasks: renderTasks, goals: renderGoals, more: renderMore }[V.tab]();
    view.innerHTML = html;
    save();
  }

  function itemRow(t, opts) {
    opts = opts || {};
    var c = cat(t.cat), done = isDone(t), fixed = t.kind === "fixed";
    var nm = nowMin(), st = toMin(t.time), isNow = t.date === today() && st != null && nm >= st && nm < st + (t.dur || 15);
    var meta = [];
    meta.push('<span>' + c.icon + " " + esc(c.label) + "</span>");
    if (opts.showDate) meta.push('<span class="tag">' + esc(relDay(t.date)) + (t.time ? " " + t.time : "") + "</span>");
    if (t.prio === "high" && !fixed && t.src === "manual") meta.push('<span class="tag hi">wichtig</span>');
    if (t.postponed > 0) meta.push('<span class="tag pp">↻ ' + t.postponed + "× verschoben</span>");
    if (t.sub && t.sub.length) meta.push('<span class="tag">☑ ' + t.sub.filter(function (s) { return s.d; }).length + "/" + t.sub.length + "</span>");
    if (t.src === "training") { var ts = trainingStatus(t.date, t.tsi); if (ts) meta.push('<span class="tag ' + (ts.done >= ts.total ? "ok" : "") + '">Trainingsapp ' + ts.done + "/" + ts.total + "</span>"); }
    if (t.notes && !opts.compact) meta.push("<span>" + esc(t.notes.length > 60 ? t.notes.slice(0, 58) + "…" : t.notes) + "</span>");
    var timeCol = opts.showDate ? '<div class="t">' + (t.dur ? '<small>' + fmtDur(t.dur) + "</small>" : "") + "</div>"
      : '<div class="t">' + (t.time || "–") + (t.dur ? "<small>" + (fixed && t.time ? "bis " + fromMin(st + t.dur) : fmtDur(t.dur)) + "</small>" : "") + "</div>";
    return '<div class="item' + (done ? " done" : "") + (fixed ? " fixed" : "") + (isNow ? " now" : "") + '" data-id="' + t.id + '" data-drop="item">' +
      '<div class="catdot" style="background:' + c.color + '"></div>' + timeCol +
      (fixed ? '<span class="chk fixedmark">📍</span>' : '<button class="chk' + (done ? " on" : "") + '" data-act="toggle" aria-label="Erledigt">✓</button>') +
      '<div class="body" data-act="open"><div class="ttl">' + esc(t.title) + '</div><div class="meta">' + meta.join("") + "</div></div>" +
      '<div class="actions">' +
      (!fixed && !done && t.dur >= 10 && !t.meal && t.cat !== "rest" && !t.review && !opts.showDate ? '<button data-act="timer" aria-label="Timer starten">▶</button>' : "") +
      (!fixed && !done ? '<button data-act="tomorrow" aria-label="Auf morgen">⏭</button>' : "") +
      (!fixed ? '<button class="drag" data-drag="h" aria-label="Verschieben">⠿</button>' : "") +
      "</div></div>";
  }

  /* ----- Heute ----- */
  function renderToday() {
    var d = V.date, t = today(), isToday = d === t, list = tasksOn(d);
    var h = '<div class="daynav"><button class="iconbtn" data-act="day" data-n="-1" aria-label="Vorheriger Tag">‹</button>' +
      '<div class="title">' + esc(relDay(d)) + (isToday || Math.abs(diffDays(t, d)) <= 2 ? '<div class="sub">' + fmtDate(d) + "</div>" : "") + "</div>" +
      (!isToday ? '<button class="chipbtn" data-act="day" data-n="0">Heute</button>' : "") +
      '<button class="iconbtn" data-act="day" data-n="1" aria-label="Nächster Tag">›</button></div>';
    if (isToday) h += renderCoach(list);
    h += renderFocus(d);
    h += renderStats(d, list);
    h += renderTimeline(d, list);
    return h;
  }

  function renderCoach(list) {
    var msgs = [], nm = nowMin(), t = today(), tg = targets(), ci = S.checkin[t] || {};
    var hr = new Date().getHours();
    if (!S.profile.weight || !S.profile.age) msgs.push(["⚙️", "Trag dein Gewicht und Alter ein, dann berechne ich dein Kalorien- und Proteinziel für den Masseaufbau.", "Profil ausfüllen", "profile"]);
    if (hr < 12 && !ci.morning) msgs.push(["🌅", "Guten Morgen! 1 Minute Check-in: Wie hast du geschlafen und was sind heute deine 3 wichtigsten Dinge?", "Check-in starten", "checkin"]);
    var open = list.filter(function (x) { return x.kind !== "fixed" && !isDone(x); });
    var next = open.filter(function (x) { return x.time && toMin(x.time) + (x.dur || 15) > nm; })[0];
    if (next) {
      var dm = toMin(next.time) - nm;
      msgs.push(["⏭️", dm <= 0 ? "Jetzt dran: <b>" + esc(next.title) + "</b>" : "Als Nächstes um " + next.time + ": <b>" + esc(next.title) + "</b> (in " + fmtDur(dm) + ")", next.dur && next.kind !== "fixed" ? "Timer starten" : null, "timer:" + next.id]);
    }
    var missed = open.filter(function (x) { return x.time && !x.meal && x.src !== "training" && !x.sleep && toMin(x.time) + (x.dur || 15) < nm; });
    if (missed.length) msgs.push(["🔁", missed.length + (missed.length === 1 ? " Punkt von vorhin ist" : " Punkte von vorhin sind") + " noch offen. Soll ich sie in die nächsten freien Lücken legen?", "Neu einplanen", "replan"]);
    if (tg && hr >= 10 && hr < 22) {
      var f = foodDay(t), frac = Math.min(1, Math.max(0, (nm - 360) / (1290 - 360))), exp = tg.kcal * frac;
      if (f.kcal < exp * 0.7) msgs.push(["🍗", "Du liegst ca. " + Math.round(exp - f.kcal) + " kcal hinter deinem Plan (" + f.kcal + " / " + tg.kcal + "). Ein Masse-Shake bringt 900 kcal und 50 g Protein.", "Shake eintragen", "shake"]);
      else if (f.p < tg.protein * frac * 0.7) msgs.push(["🥩", "Protein: " + f.p + " von " + tg.protein + " g. Nächste Mahlzeit eiweißreich: Quark, Eier oder Hähnchen.", "Essen eintragen", "food"]);
    }
    if (hr >= 17) {
      ["turkish", "ewe"].forEach(function (lg) {
        var hb = HABITS.filter(function (x) { return x.id === lg; })[0];
        if (habitVal(hb, t) !== true) {
          var s = streak(hb);
          var tk = list.filter(function (x) { return x.lang === lg && !x.done; })[0];
          msgs.push([lg === "turkish" ? "🇹🇷" : "🌍", (s > 0 ? "Deine " + hb.label + "-Serie (" + s + " Tage) läuft heute ab. " : hb.label + " fehlt heute noch. ") + "10 Minuten reichen.", tk ? "Timer starten" : "Jetzt lernen", tk ? "timer:" + tk.id : "lang:" + lg]);
        }
      });
    }
    var stuck = Object.keys(S.tasks).map(function (k) { return S.tasks[k]; }).filter(function (x) { return !x.done && x.postponed >= 3 && x.date === t; })[0];
    if (stuck) msgs.push(["🧩", "„" + esc(stuck.title) + "“ schiebst du schon " + stuck.postponed + "× vor dir her. Mach heute nur die ersten 5 Minuten oder teil die Aufgabe in kleine Schritte.", "In Schritte teilen", "split:" + stuck.id]);
    var soon = S.exams.filter(function (e) { var dd = diffDays(t, e.date); return dd >= 0 && dd <= 14; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    if (soon) msgs.push(["📝", "Noch <b>" + diffDays(t, soon.date) + " Tage</b> bis „" + esc(soon.title) + "“. Heute ein Lernblock bringt mehr als morgen zwei.", null, null]);
    var lastW = Object.keys(S.weight).sort().pop();
    if (S.profile.weight && (!lastW || diffDays(lastW, t) >= 7) && hr < 11) msgs.push(["⚖️", "Seit " + (lastW ? diffDays(lastW, t) + " Tagen" : "Beginn") + " nicht gewogen. Morgens nüchtern wiegen und eintragen.", "Gewicht eintragen", "weight"]);
    if (hr >= 20 && !ci.evening) msgs.push(["🌙", "Abend-Check: Was lief gut, was schiebst du auf morgen? Dann ab ins Bett, das Training um 5:45 wartet.", "Abend-Check", "evening"]);
    var ev = trainingEvent();
    if (ev && diffDays(t, ev.date) >= 0 && diffDays(t, ev.date) <= 120 && msgs.length < 4) msgs.push(["🏆", "Noch " + diffDays(t, ev.date) + " Tage bis " + esc(ev.label) + ".", null, null]);
    if (!msgs.length) msgs.push(["💪", "Du bist im Plan. Weiter so!", null, null]);
    var h = '<div class="card coach"><h2>Dein Coach</h2>';
    msgs.slice(0, 4).forEach(function (m) {
      h += '<div class="msg"><span class="ic">' + m[0] + "</span><div>" + m[1] + (m[2] ? '<br><button data-act="coach" data-do="' + esc(m[3]) + '">' + esc(m[2]) + "</button>" : "") + "</div></div>";
    });
    h += '<div class="quote">„' + esc(pickOfDay(D.QUOTES, "q")) + "“</div></div>";
    return h;
  }

  function renderFocus(d) {
    var ci = S.checkin[d]; if (!ci || !ci.top3 || !ci.top3.length) return "";
    var items = ci.top3.map(function (id) { return S.tasks[id]; }).filter(Boolean);
    if (!items.length) return "";
    var h = '<div class="card focus3"><h2>🎯 Top 3 heute</h2><div class="list">';
    items.forEach(function (t) {
      h += '<div class="li" data-id="' + t.id + '"><button class="chk' + (t.done ? " on" : "") + '" data-act="toggle">✓</button><div class="grow" data-act="open" style="' + (t.done ? "text-decoration:line-through;color:var(--muted)" : "") + '">' + esc(t.title) + "</div></div>";
    });
    return h + "</div></div>";
  }

  function ring(pct, color) {
    var r = 32, c = 2 * Math.PI * r;
    return '<div class="ring"><svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="var(--card2)" stroke-width="8"/>' +
      '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="' + (color || "var(--good)") + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - pct)) + '"/></svg><div class="val">' + Math.round(pct * 100) + "%</div></div>";
  }
  function bar(label, val, max, unit, color) {
    var pct = max ? Math.min(1, val / max) : 0;
    return '<div class="bar"><span>' + label + '</span><div class="track"><div class="fill" style="width:' + (pct * 100) + "%;background:" + (color || "var(--accent)") + '"></div></div><b>' + val + (max ? " / " + max : "") + (unit ? " " + unit : "") + "</b></div>";
  }
  function renderStats(d, list) {
    var tasks = list.filter(function (x) { return x.kind !== "fixed"; }), done = tasks.filter(isDone).length;
    var tg = targets(), f = foodDay(d);
    var tkMin = (S.lang.turkish.min[d] || 0), eMin = (S.lang.ewe.min[d] || 0);
    var h = '<div class="card"><div class="stats">' + ring(tasks.length ? done / tasks.length : 0) + '<div class="bars">' +
      bar("Aufgaben", done, tasks.length, "", "var(--good)");
    if (tg) h += bar("Kalorien", f.kcal, tg.kcal, "", CATS.nutrition.color) + bar("Protein", f.p, tg.protein, "g", "#C0562B");
    else h += '<div class="sub">Kalorien- und Proteinziel: Profil unter <b>Ziele → Ernährung</b> ausfüllen.</div>';
    h += bar("Sprachen", tkMin + eMin, 35, "Min.", CATS.turkish.color);
    h += '</div></div><div class="row wrap-r" style="margin-top:10px">' +
      '<button class="btn small sec" data-act="coach" data-do="food">+ Essen</button>' +
      '<button class="btn small sec" data-act="coach" data-do="shake">+ Shake</button>' +
      '<button class="btn small sec" data-act="coach" data-do="checkin">🌅 Check-in</button>' +
      '<button class="btn small sec" data-act="coach" data-do="evening">🌙 Abend</button></div></div>';
    return h;
  }

  function renderTimeline(d, list) {
    var untimed = list.filter(function (x) { return !x.time; }), timed = list.filter(function (x) { return x.time; });
    var h = '<div class="card"><h2>Tagesplan <span class="row"><button class="btn small sec" data-act="autoplan">⚡ Auto-Planen</button></span></h2>';
    h += '<div class="section-h">Ohne Uhrzeit</div><div data-drop="untimed" style="min-height:34px;border-radius:12px">';
    h += untimed.length ? untimed.map(function (t) { return itemRow(t); }).join("") : '<div class="empty" style="padding:8px">Hierher ziehen, um die Uhrzeit zu entfernen.</div>';
    h += "</div>";
    h += '<div class="section-h">Zeitplan</div><div class="tl">';
    var cursor = toMin(S.settings.dayStart), endDay = toMin(S.settings.dayEnd), nm = d === today() ? nowMin() : -1, nowDrawn = nm < 0;
    function gapHtml(a, b) {
      if (b - a < 30) return "";
      return '<div class="gap" data-drop="gap" data-time="' + fromMin(a) + '"><span style="text-align:right;font-weight:700">' + fromMin(a) + '</span><span>Frei bis ' + fromMin(b) + " · " + fmtDur(b - a) + ' <button data-act="addat" data-time="' + fromMin(a) + '" data-max="' + (b - a) + '">+ hier planen</button></span></div>';
    }
    timed.forEach(function (t) {
      var s = toMin(t.time), e = s + (t.dur || 15);
      if (!nowDrawn && nm < s) { h += gapHtml(cursor, Math.max(cursor, nm)); h += '<div class="nowline" title="Jetzt"></div>'; nowDrawn = true; cursor = Math.max(cursor, nm); }
      if (s > cursor && cursor >= toMin(S.settings.dayStart)) h += gapHtml(cursor, Math.min(s, endDay));
      h += itemRow(t);
      cursor = Math.max(cursor, e);
    });
    if (!nowDrawn && nm <= endDay + 60) { h += gapHtml(cursor, Math.max(cursor, Math.min(nm, endDay))); h += '<div class="nowline"></div>'; cursor = Math.max(cursor, nm); }
    if (cursor < endDay) h += gapHtml(cursor, endDay);
    if (!timed.length) h += '<div class="empty">Noch nichts geplant.</div>';
    h += "</div></div>";
    return h;
  }

  /* ----- Woche ----- */
  function renderWeek() {
    var mon = addYmd(mondayOf(today()), V.weekOff * 7), idx = rkIndex();
    for (var i = 0; i < 7; i++) ensureDay(addYmd(mon, i), idx);
    var iw = isoWeek(mon);
    var h = '<div class="daynav"><button class="iconbtn" data-act="week" data-n="-1">‹</button><div class="title">KW ' + iw.week +
      '<div class="sub">' + fmtDate(mon, { day: "numeric", month: "short" }) + " – " + fmtDate(addYmd(mon, 6), { day: "numeric", month: "short" }) + "</div></div>" +
      (V.weekOff ? '<button class="chipbtn" data-act="week" data-n="0">Diese Woche</button>' : "") +
      '<button class="iconbtn" data-act="week" data-n="1">›</button></div>';
    h += '<p class="sub" style="margin:-4px 4px 10px">Halte eine Aufgabe gedrückt und zieh sie auf einen anderen Tag. Tippen öffnet sie.</p>';
    var showRoutine = !!V.weekAll;
    h += '<div class="chips"><button class="chipbtn' + (!showRoutine ? " on" : "") + '" data-act="weekall" data-v="0">Nur To-dos & Lernen</button><button class="chipbtn' + (showRoutine ? " on" : "") + '" data-act="weekall" data-v="1">Alles inkl. Essen & Termine</button></div>';
    h += '<div class="week">';
    var inbox = Object.keys(S.tasks).map(function (k) { return S.tasks[k]; }).filter(function (t) { return !t.date && !t.done; });
    h += '<div class="wday inbox" data-drop="inbox"><div class="wh"><b>📥 Eingang (ohne Datum)</b><span class="sub">' + inbox.length + '</span></div><div class="wchips">' +
      (inbox.length ? inbox.map(chip).join("") : '<span class="sub">Leer. Aufgaben ohne Datum landen hier.</span>') + "</div></div>";
    for (i = 0; i < 7; i++) {
      var d = addYmd(mon, i), l = tasksOn(d);
      var vis = l.filter(function (t) { return showRoutine || (!t.meal && t.kind !== "fixed" && t.cat !== "rest" && !t.review); });
      var tasks = l.filter(function (t) { return t.kind !== "fixed"; }), done = tasks.filter(isDone).length;
      var planned = sum(l.filter(function (t) { return t.kind !== "fixed" && !t.meal && t.cat !== "rest"; }).map(function (t) { return t.dur || 0; }));
      h += '<div class="wday' + (d === today() ? " today" : "") + '" data-drop="day" data-date="' + d + '"><div class="wh"><b data-act="gotoday" data-date="' + d + '" style="cursor:pointer">' + WD[i] + ' <span class="sub">' + fmtDate(d, { day: "numeric", month: "numeric" }) + '</span></b><span class="sub">' + done + "/" + tasks.length + " · " + fmtDur(planned) + '</span></div>' +
        '<div class="load"><i style="width:' + (tasks.length ? done / tasks.length * 100 : 0) + '%"></i></div><div class="wchips">' + (vis.length ? vis.map(chip).join("") : '<span class="sub">Frei</span>') + "</div></div>";
    }
    return h + "</div>";
  }
  function chip(t) {
    var c = cat(t.cat), fixed = t.kind === "fixed";
    return '<span class="wchip' + (isDone(t) ? " done" : "") + (fixed ? " fixed" : "") + '" data-id="' + t.id + '" data-act="open"' + (fixed ? "" : ' data-drag="lp"') + ' style="border-left:3px solid ' + c.color + '"><span>' + (t.time ? "<b>" + t.time + "</b> " : "") + c.icon + " " + esc(t.title) + "</span></span>";
  }

  /* ----- To-dos ----- */
  function renderTasks() {
    var all = Object.keys(S.tasks).map(function (k) { return S.tasks[k]; }).filter(function (t) { return t.src !== "routine" && t.src !== "training"; });
    var f = V.tfilter, t = today();
    var h = '<div class="seg">' + [["open", "Offen"], ["inbox", "Eingang"], ["stuck", "Verschoben"], ["done", "Erledigt"]].map(function (x) {
      return '<button class="' + (f === x[0] ? "on" : "") + '" data-act="tfilter" data-v="' + x[0] + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    h += '<div class="chips"><button class="chipbtn' + (!V.tcat ? " on" : "") + '" data-act="tcat" data-v="">Alle</button>' + Object.keys(CATS).map(function (k) {
      return '<button class="chipbtn' + (V.tcat === k ? " on" : "") + '" data-act="tcat" data-v="' + k + '">' + CATS[k].icon + " " + CATS[k].label + "</button>";
    }).join("") + "</div>";
    var l = all.filter(function (x) {
      if (V.tcat && x.cat !== V.tcat) return false;
      if (f === "open") return !x.done;
      if (f === "inbox") return !x.done && !x.date;
      if (f === "stuck") return !x.done && x.postponed > 0;
      return x.done;
    });
    if (f === "done") l.sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    else if (f === "stuck") l.sort(function (a, b) { return b.postponed - a.postponed; });
    else l.sort(function (a, b) { return (a.date || "9999") < (b.date || "9999") ? -1 : (a.date || "9999") > (b.date || "9999") ? 1 : prioN(b) - prioN(a) || sortTasks(a, b); });
    var groups = {}, order = [];
    l.forEach(function (x) {
      var g;
      if (f === "done") g = "Erledigt"; else if (f === "stuck") g = "Oft verschoben";
      else if (!x.date) g = "Ohne Datum"; else { var dd = diffDays(t, x.date); g = dd <= 0 ? "Heute" : dd === 1 ? "Morgen" : dd < 7 ? "Diese Woche" : "Später"; }
      if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(x);
    });
    h += '<div class="card"><form data-form="quick" class="row"><input class="in" name="q" placeholder="z. B. morgen 18 Uhr Protokoll schreiben 45min !" autocomplete="off"><button class="btn">+</button></form><p class="sub" style="margin:6px 2px 0">Versteht: heute, morgen, Wochentage, 18 Uhr, 45min, ! für wichtig, #bio #uni #türkisch …</p></div>';
    if (!l.length) h += '<div class="card empty">' + (f === "done" ? "Noch nichts erledigt." : "Keine Aufgaben. Mit + oben eine hinzufügen.") + "</div>";
    order.forEach(function (g) {
      h += '<div class="section-h">' + g + " · " + groups[g].length + '</div><div class="card" style="padding:6px 8px">' + groups[g].slice(0, 80).map(function (x) { return itemRow(x, { showDate: true }); }).join("") + "</div>";
    });
    if (f === "stuck" && l.length) h += '<div class="tip">Tipp: Eine Aufgabe, die du 3× verschiebst, ist meistens zu groß oder unklar. Tipp sie an und wähle <b>In Schritte teilen</b> oder plane nur die ersten 10 Minuten.</div>';
    return h;
  }

  /* ----- Ziele ----- */
  function renderGoals() {
    var g = V.goals;
    var h = '<div class="seg">' + [["nutrition", "🍗 Essen"], ["lang", "🗣️ Sprachen"], ["habits", "🔥 Serien"], ["exams", "📝 Prüfung"]].map(function (x) {
      return '<button class="' + (g === x[0] ? "on" : "") + '" data-act="goals" data-v="' + x[0] + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    return h + ({ nutrition: renderNutrition, lang: renderLang, habits: renderHabits, exams: renderExams })[g]();
  }

  function renderNutrition() {
    var tg = targets(), d = V.date, f = foodDay(d), p = S.profile;
    var h = "";
    if (!tg) {
      h += '<div class="card"><h2>🍗 Masseaufbau einrichten</h2><p class="sub">Mit Gewicht, Größe und Alter berechne ich deinen Grundumsatz, deinen Bedarf bei deinem Trainingsumfang und ein Ziel mit Überschuss für den Muskelaufbau.</p><button class="btn" data-act="coach" data-do="profile">Profil ausfüllen</button></div>';
    } else {
      h += '<div class="card"><h2>' + esc(relDay(d)) + ' <span class="sub">Ziel ' + tg.kcal + " kcal</span></h2>" +
        '<div class="grid2"><div><div class="sub">Kalorien</div><div class="big">' + f.kcal + '</div><div class="sub">noch ' + Math.max(0, tg.kcal - f.kcal) + ' kcal</div></div>' +
        '<div><div class="sub">Protein</div><div class="big">' + f.p + ' g</div><div class="sub">Ziel ' + tg.protein + " g · noch " + Math.max(0, tg.protein - f.p) + " g</div></div></div>" +
        '<div class="bars" style="margin-top:12px">' + bar("Kalorien", f.kcal, tg.kcal, "", CATS.nutrition.color) + bar("Protein", f.p, tg.protein, "g", "#C0562B") + "</div>" +
        '<div class="row wrap-r" style="margin-top:12px"><button class="btn" data-act="coach" data-do="food">+ Essen eintragen</button><button class="btn sec" data-act="coach" data-do="shake">+ Masse-Shake</button></div>';
      if (f.list.length) {
        h += '<div class="list" style="margin-top:10px">' + f.list.map(function (e, i) {
          return '<div class="li"><div class="grow">' + esc(e.n) + '</div><span class="sub">' + e.k + " kcal · " + e.p + ' g</span><button class="x" data-act="delfood" data-i="' + i + '" aria-label="Löschen">×</button></div>';
        }).join("") + "</div>";
      }
      h += "</div>";
    }
    // Gewicht
    var ws = weightSeries(90), adv = nutritionAdvice();
    h += '<div class="card"><h2>⚖️ Gewicht</h2><form data-form="weight" class="row"><input class="in" name="w" type="text" inputmode="decimal" placeholder="' + (p.weight ? String(p.weight).replace(".", ",") : "kg") + '" style="max-width:130px"><span class="sub">kg, morgens nüchtern</span><button class="btn small" style="margin-left:auto">Eintragen</button></form>';
    h += ws.length >= 2 ? weightChart(ws) : '<p class="sub">Ab zwei Einträgen siehst du hier deinen Verlauf. Ziel: +0,25 bis +0,5 kg pro Woche.</p>';
    if (adv) h += '<div class="tip" style="border-left-color:' + (adv.kind === "ok" ? "var(--good)" : "var(--warn)") + '">' + esc(adv.text) + (adv.delta ? ' <button class="btn small" data-act="surplus" data-v="' + adv.delta + '" style="margin-top:6px">Ziel um ' + (adv.delta > 0 ? "+" : "") + adv.delta + " kcal anpassen</button>" : "") + "</div>";
    if (p.goalWeight && p.weight) h += '<p class="sub" style="margin-top:8px">Zielgewicht ' + String(p.goalWeight).replace(".", ",") + " kg · noch " + fmtKg(p.goalWeight - p.weight) + " · bei 0,35 kg/Woche etwa " + Math.max(0, Math.ceil((p.goalWeight - p.weight) / 0.35)) + " Wochen</p>";
    h += "</div>";
    if (tg) {
      h += '<div class="card"><h2>📐 Deine Zahlen <button class="btn small sec" data-act="coach" data-do="profile">Ändern</button></h2>' +
        '<div class="list"><div class="li"><div class="grow">Grundumsatz</div><b>' + tg.bmr + ' kcal</b></div>' +
        '<div class="li"><div class="grow">Bedarf mit Training (×' + String(p.activity).replace(".", ",") + ')</div><b>' + tg.tdee + ' kcal</b></div>' +
        '<div class="li"><div class="grow">Überschuss für Masse</div><b>+' + p.surplus + ' kcal</b></div>' +
        '<div class="li"><div class="grow">Tagesziel</div><b>' + tg.kcal + ' kcal</b></div>' +
        '<div class="li"><div class="grow">Protein (' + String(p.ppk).replace(".", ",") + ' g/kg)</div><b>' + tg.protein + ' g</b></div>' +
        '<div class="li"><div class="grow">Kohlenhydrate / Fett (ca.)</div><b>' + tg.carbs + " g / " + tg.fat + " g</b></div></div>" +
        '<p class="sub" style="margin-top:8px">So verteilt: 6 Mahlzeiten à ca. ' + Math.round(tg.kcal / 6 / 10) * 10 + " kcal und " + Math.round(tg.protein / 6) + " g Protein. Die Mahlzeiten stehen schon in deinem Tagesplan.</p></div>";
    }
    h += '<div class="card"><h2>🥤 Shake-Rezepte</h2><div class="list">' + D.SHAKES.map(function (s) { return '<div class="li"><div class="grow"><b>' + esc(s.name) + '</b><div class="sub">' + esc(s.items) + "</div></div></div>"; }).join("") + "</div></div>";
    var shop = ["Haferflocken (1 kg)", "Vollmilch (6 l)", "Erdnussbutter", "Bananen", "Eier (20 Stück)", "Reis (2 kg)", "Nudeln", "Hähnchenbrust (1 kg)", "Rinderhack", "Magerquark (4 ×)", "Skyr", "Nüsse / Mandeln", "Olivenöl", "Vollkornbrot", "Käse", "Thunfisch (Dosen)", "Kartoffeln", "Tiefkühl-Gemüse", "Tiefkühl-Beeren", "Honig"];
    h += '<div class="card"><h2>🛒 Masse-Einkaufsliste <button class="btn small sec" data-act="shopreset">Zurücksetzen</button></h2><div class="list">' + shop.map(function (x) {
      return '<div class="li"><button class="chk' + (S.shop[x] ? " on" : "") + '" data-act="shop" data-v="' + esc(x) + '">✓</button><div class="grow" style="' + (S.shop[x] ? "text-decoration:line-through;color:var(--muted)" : "") + '">' + esc(x) + "</div></div>";
    }).join("") + "</div></div>";
    h += '<div class="card"><h2>💡 Tipp des Tages</h2><div>' + esc(pickOfDay(D.MASS_TIPS, "m")) + '</div><details style="margin-top:8px"><summary class="sub">Alle Tipps</summary><ul>' + D.MASS_TIPS.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>" +
      '<p class="sub" style="margin-top:10px">Die Werte sind allgemeine Richtwerte und ersetzen keine ärztliche oder ernährungswissenschaftliche Beratung.</p></div>';
    return h;
  }
  function weightChart(ws) {
    var W = 320, H = 130, P = 26;
    var vals = ws.map(function (x) { return x.w; }); if (S.profile.goalWeight) vals.push(S.profile.goalWeight);
    var mn = Math.min.apply(null, vals) - 0.5, mx = Math.max.apply(null, vals) + 0.5;
    var d0 = ws[0].d, span = Math.max(1, diffDays(d0, ws[ws.length - 1].d));
    function X(d) { return P + (W - P - 8) * diffDays(d0, d) / span; }
    function Y(w) { return 8 + (H - 26) * (1 - (w - mn) / (mx - mn)); }
    var pts = ws.map(function (x) { return X(x.d).toFixed(1) + "," + Y(x.w).toFixed(1); }).join(" ");
    var avg = ws.map(function (x, i) { var win = ws.slice(Math.max(0, i - 6), i + 1); return X(x.d).toFixed(1) + "," + Y(sum(win.map(function (y) { return y.w; })) / win.length).toFixed(1); }).join(" ");
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Gewichtsverlauf">';
    [mn + 0.5, (mn + mx) / 2, mx - 0.5].forEach(function (v) { s += '<line x1="' + P + '" x2="' + (W - 8) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text x="0" y="' + (Y(v) + 3) + '">' + v.toFixed(1).replace(".", ",") + "</text>"; });
    if (S.profile.goalWeight) s += '<line x1="' + P + '" x2="' + (W - 8) + '" y1="' + Y(S.profile.goalWeight) + '" y2="' + Y(S.profile.goalWeight) + '" stroke="var(--good)" stroke-dasharray="4 4"/>';
    s += '<polyline points="' + pts + '" fill="none" stroke="var(--muted)" stroke-width="1.5"/>';
    s += '<polyline points="' + avg + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>';
    ws.forEach(function (x) { s += '<circle cx="' + X(x.d) + '" cy="' + Y(x.w) + '" r="2.5" fill="var(--accent)"/>'; });
    s += '<text x="' + P + '" y="' + (H - 4) + '">' + fmtDate(d0, { day: "numeric", month: "short" }) + '</text><text x="' + (W - 60) + '" y="' + (H - 4) + '">' + fmtDate(ws[ws.length - 1].d, { day: "numeric", month: "short" }) + "</text></svg>";
    return s + '<p class="sub">Blau: 7-Tage-Schnitt' + (S.profile.goalWeight ? " · Grün gestrichelt: Zielgewicht" : "") + "</p>";
  }

  function renderLang() {
    var t = today(), sd = srsDue(), tw = pickOfDay(D.TURKISH, "tw"), tip = pickOfDay(D.TURKISH_TIPS, "tt");
    var hT = HABITS[1], hE = HABITS[2], e = eweApp();
    var mon = mondayOf(t);
    function weekMin(lg) { var s = 0; for (var i = 0; i < 7; i++) s += S.lang[lg].min[addYmd(mon, i)] || 0; return s; }
    var h = '<div class="card"><h2>🇹🇷 Türkisch <span class="streak">🔥 ' + streak(hT) + "</span></h2>" +
      '<div class="sub">Wort des Tages</div><div class="row"><div class="phrase">' + esc(tw[0]) + '</div><button class="iconbtn" data-act="speak" data-t="' + esc(tw[0]) + '" data-l="tr-TR" aria-label="Anhören">🔊</button></div><div>' + esc(tw[1]) + "</div>" +
      '<div class="grid3" style="margin-top:12px"><div><b>' + weekMin("turkish") + '</b><div class="sub">Min. diese Woche</div></div><div><b>' + sd.seen + "/" + D.TURKISH.length + '</b><div class="sub">Wörter gesehen</div></div><div><b>' + sd.learned + '</b><div class="sub">sicher gelernt</div></div></div>' +
      '<div class="row wrap-r" style="margin-top:12px"><button class="btn" data-act="flash">Karteikarten (' + (sd.due.length + sd.fresh.length) + ")</button>" +
      '<button class="btn sec" data-act="langtimer" data-v="turkish">▶ 20-Min.-Timer</button></div>' +
      '<div class="tip" style="border-left-color:' + CATS.turkish.color + '">' + esc(tip) + "</div></div>";
    var ep = pickOfDay(window.EWE_PHRASES_FLAT || [["Akpé!", "Danke!", ""]], "ewe");
    h += '<div class="card"><h2>🌍 Ewe <span class="streak">🔥 ' + Math.max(streak(hE), e ? e.streak : 0) + "</span></h2>" +
      '<div class="sub">Satz des Tages · ' + esc(ep[2] || "") + '</div><div class="phrase">' + esc(ep[0]) + "</div><div>" + esc(ep[1]) + "</div>" +
      '<div class="grid3" style="margin-top:12px"><div><b>' + weekMin("ewe") + '</b><div class="sub">Min. diese Woche</div></div>' +
      (e ? '<div><b>' + e.todayCount + "/" + e.goal + '</b><div class="sub">Karten heute (Ewe-App)</div></div><div><b>' + e.streak + '</b><div class="sub">Serie in der Ewe-App</div></div>' : '<div style="grid-column:span 2" class="sub">Läuft die Ewe-App unter derselben Adresse (github.io), sehe ich hier auch deinen Fortschritt von dort.</div>') + "</div>" +
      '<div class="row wrap-r" style="margin-top:12px">' + (S.settings.links.ewe ? '<a class="btn" href="' + esc(S.settings.links.ewe) + '" target="_blank" rel="noopener" style="text-decoration:none">Ewe-App öffnen</a>' : "") +
      '<button class="btn sec" data-act="langtimer" data-v="ewe">▶ 15-Min.-Timer</button></div></div>';
    // Wochenbalken
    h += '<div class="card"><h2>📊 Minuten diese Woche</h2>';
    for (var i = 0; i < 7; i++) {
      var d = addYmd(mon, i), a = S.lang.turkish.min[d] || 0, b = S.lang.ewe.min[d] || 0;
      h += '<div class="bar" style="grid-template-columns:30px 1fr 64px"><span>' + WDS[i] + '</span><div class="track" style="display:flex"><div class="fill" style="width:' + Math.min(100, a / 60 * 100) + "%;background:" + CATS.turkish.color + ';border-radius:0"></div><div class="fill" style="width:' + Math.min(100, b / 60 * 100) + "%;background:" + CATS.ewe.color + ';border-radius:0"></div></div><b>' + a + " + " + b + "</b></div>";
    }
    h += '<p class="sub" style="margin-top:8px">Rot = Türkisch, Grün = Ewe. Ziel: 20 + 15 Minuten am Tag. Die Blöcke legt FokusPlan automatisch in freie Lücken.</p>' +
      '<p class="sub">Ideen: Türkisch-Audio auf dem Weg zur Uni, Karteikarten nach dem Mittagessen, Ewe vor dem Abendessen.</p></div>';
    return h;
  }

  function renderHabits() {
    var t = today(), h = '<div class="card"><h2>🔥 Deine Serien <span class="sub">letzte 4 Wochen</span></h2>';
    HABITS.forEach(function (hb) {
      var cells = "";
      for (var i = 27; i >= 0; i--) {
        var d = addYmd(t, -i), v = habitVal(hb, d);
        cells += '<i class="' + (v === true ? "y" : v === false ? "n" : "") + (i === 0 ? " t" : "") + '" title="' + d + '"></i>';
      }
      h += '<div class="habit"><span class="hn">' + hb.name + '</span><span class="streak">' + streak(hb) + ' 🔥</span><div class="heat">' + cells + "</div></div>";
    });
    h += '<p class="sub" style="margin-top:8px">Grün = geschafft, Rot = ausgelassen, Grau = nicht geplant. Regel: Nie zweimal hintereinander auslassen.</p></div>';
    return h;
  }

  function renderExams() {
    var t = today();
    var h = '<div class="card"><h2>📝 Prüfungen & Termine</h2>';
    var ex = S.exams.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var ev = trainingEvent();
    if (!ex.length && !ev) h += '<p class="sub">Trag deine Klausuren ein. FokusPlan erstellt dir auf Wunsch einen Lernplan rückwärts bis zum Termin.</p>';
    if (ev) h += '<div class="exam"><div class="cd"><b>' + Math.max(0, diffDays(t, ev.date)) + '</b><span>Tage</span></div><div class="grow"><b>🏆 ' + esc(ev.label) + '</b><div class="sub">' + fmtDate(ev.date) + " · aus der Trainingsapp</div></div></div>";
    ex.forEach(function (e) {
      var dd = diffDays(t, e.date), plan = Object.keys(S.tasks).map(function (k) { return S.tasks[k]; }).filter(function (x) { return x.exam === e.id; });
      h += '<div class="exam"><div class="cd"><b>' + (dd < 0 ? "✓" : dd) + '</b><span>' + (dd < 0 ? "vorbei" : "Tage") + '</span></div><div style="flex:1"><b>' + cat(e.cat).icon + " " + esc(e.title) + '</b><div class="sub">' + fmtDate(e.date) +
        (plan.length ? " · Lernplan " + plan.filter(function (x) { return x.done; }).length + "/" + plan.length : "") + '</div></div><button class="iconbtn" data-act="delexam" data-id="' + e.id + '" aria-label="Löschen">🗑</button></div>';
    });
    h += "</div>";
    h += '<div class="card"><h2>➕ Neue Prüfung</h2><form data-form="exam">' +
      '<label class="f">Titel<input class="in" name="title" required placeholder="z. B. Bio-Klausur Genetik"></label>' +
      '<div class="grid2"><label class="f">Datum<input class="in" name="date" type="date" required></label><label class="f">Bereich<select class="in" name="cat">' +
      ["biology", "uni", "turkish", "ewe", "training", "personal"].map(function (k) { return '<option value="' + k + '">' + CATS[k].icon + " " + CATS[k].label + "</option>"; }).join("") + "</select></label></div>" +
      '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="plan" checked> Lernplan rückwärts erstellen (8 Blöcke à 45 Min.)</label>' +
      '<button class="btn block">Speichern</button></form></div>';
    return h;
  }

  /* ----- Mehr ----- */
  function renderMore() {
    var h = renderReview();
    var e = eweApp(), tc = trainingCfg();
    h += '<div class="card"><h2>🔗 Deine Apps</h2><div class="menu">' +
      appLink("🏋️ Trainingsapp", S.settings.links.training, tc ? "verbunden – Einheiten und Haken werden übernommen" : "noch keine Daten auf diesem Gerät gefunden") +
      appLink("🌍 Ewe-Lernapp", S.settings.links.ewe, e ? "verbunden – Serie " + e.streak + " Tage" : "noch keine Daten auf diesem Gerät gefunden") +
      appLink("🧬 Bio-Lernapp", S.settings.links.bio, S.settings.links.bio ? "" : "Adresse unter Einstellungen eintragen") +
      '</div><p class="sub" style="margin-top:8px">Die Verbindung klappt automatisch, wenn alle Apps über GitHub Pages unter derselben Adresse laufen (dgb10145.github.io/…). Dann teilen sie sich den Speicher.</p></div>';
    h += '<div class="card"><h2>⚙️ Einstellungen</h2><div class="menu">' +
      '<button data-act="coach" data-do="profile">👤 Profil & Ernährungsziele</button>' +
      '<button data-act="routines">🔁 Routinen & feste Termine</button>' +
      '<button data-act="settings">🕒 Tageszeiten, Apps, Darstellung</button>' +
      '<button data-act="notify">🔔 Erinnerungen ' + (S.settings.notify ? "(an)" : "(aus)") + "</button>" +
      '<button data-act="ics">📅 Woche in den Handy-Kalender exportieren</button>' +
      '<button data-act="backup">💾 Backup herunterladen</button>' +
      '<button data-act="import">📂 Backup importieren</button>' +
      '<button data-act="reset" style="color:var(--bad)">⚠️ Alles zurücksetzen</button></div></div>';
    h += '<p class="sub" style="text-align:center">FokusPlan · Daten bleiben nur auf diesem Gerät · ' + Object.keys(S.tasks).length + " Einträge</p>";
    return h;
  }
  function appLink(name, url, sub) {
    return url ? '<a class="menulink" href="' + esc(url) + '" target="_blank" rel="noopener"><span>' + name + '<div class="sub">' + esc(sub) + "</div></span><span style=\"margin-left:auto\">↗</span></a>"
      : '<button type="button" data-act="settings"><span>' + name + '<div class="sub">' + esc(sub) + "</div></span></button>";
  }

  function reviewData(mon) {
    var r = { cats: {}, done: 0, total: 0, days: [], post: [], lang: { turkish: 0, ewe: 0 }, protein: 0, kcal: 0, foodDays: 0 };
    var tg = targets();
    for (var i = 0; i < 7; i++) {
      var d = addYmd(mon, i); if (d > today()) break;
      var l = tasksOn(d).filter(function (t) { return t.kind !== "fixed"; }), dn = l.filter(isDone).length;
      r.days.push({ d: d, done: dn, total: l.length });
      r.done += dn; r.total += l.length;
      l.forEach(function (t) { var c = r.cats[t.cat] = r.cats[t.cat] || { d: 0, t: 0 }; c.t++; if (isDone(t)) c.d++; });
      r.lang.turkish += S.lang.turkish.min[d] || 0; r.lang.ewe += S.lang.ewe.min[d] || 0;
      var f = foodDay(d); if (f.list.length) { r.foodDays++; r.kcal += f.kcal; if (tg && f.p >= tg.protein) r.protein++; }
    }
    r.post = Object.keys(S.tasks).map(function (k) { return S.tasks[k]; }).filter(function (t) { return !t.done && t.postponed >= 2; }).sort(function (a, b) { return b.postponed - a.postponed; }).slice(0, 3);
    return r;
  }
  function renderReview() {
    var mon = addYmd(mondayOf(today()), (V.revOff || 0) * 7), r = reviewData(mon), tg = targets();
    var h = '<div class="card"><h2>📊 Wochenrückblick <span class="row"><button class="iconbtn" data-act="rev" data-n="-1">‹</button>' + (V.revOff ? '<button class="iconbtn" data-act="rev" data-n="1">›</button>' : "") + "</span></h2>" +
      '<div class="sub" style="margin-bottom:8px">KW ' + isoWeek(mon).week + " · " + fmtDate(mon, { day: "numeric", month: "short" }) + " – " + fmtDate(addYmd(mon, 6), { day: "numeric", month: "short" }) + "</div>";
    if (!r.total) return h + '<p class="sub">Für diese Woche gibt es noch keine Daten.</p></div>';
    h += '<div class="stats">' + ring(r.done / r.total) + '<div class="bars">';
    Object.keys(r.cats).sort(function (a, b) { return r.cats[b].t - r.cats[a].t; }).forEach(function (k) { var c = r.cats[k]; h += bar(CATS[k] ? CATS[k].icon + " " + CATS[k].label : k, c.d, c.t, "", cat(k).color); });
    h += "</div></div>";
    var best = r.days.slice().sort(function (a, b) { return (b.total ? b.done / b.total : 0) - (a.total ? a.done / a.total : 0); })[0];
    var sugg = [];
    var tr = r.cats.training, bio = r.cats.biology;
    if (tr && tr.d / tr.t < 0.7) sugg.push("Training lief nur zu " + Math.round(tr.d / tr.t * 100) + " %. Leg die Sportsachen abends raus und geh pünktlich ins Bett.");
    if (bio && bio.d / bio.t < 0.6) sugg.push("Bio kam zu kurz. Probier kürzere Blöcke (25 Min.) direkt nach der Uni.");
    if (r.lang.turkish < 100) sugg.push("Türkisch: " + r.lang.turkish + " Min. Ziel sind 140 Min. pro Woche. Kopple es an das Mittagessen.");
    if (r.lang.ewe < 70) sugg.push("Ewe: " + r.lang.ewe + " Min. Ziel sind 105 Min. pro Woche.");
    if (tg && r.foodDays && r.protein < r.foodDays * 0.7) sugg.push("Proteinziel nur an " + r.protein + " von " + r.foodDays + " Tagen erreicht. Ein Quark am Abend schließt die Lücke.");
    if (tg && r.foodDays < 4) sugg.push("Nur an " + r.foodDays + " Tagen Essen eingetragen. Ohne Zahlen weißt du nicht, ob du genug isst.");
    r.post.forEach(function (t) { sugg.push("„" + t.title + "“ wurde " + t.postponed + "× verschoben. Teilen, delegieren oder bewusst streichen?"); });
    h += '<div class="list" style="margin-top:10px">' +
      '<div class="li"><div class="grow">Erledigt</div><b>' + r.done + " von " + r.total + "</b></div>" +
      (best ? '<div class="li"><div class="grow">Bester Tag</div><b>' + WD[wd(best.d)] + " (" + best.done + "/" + best.total + ")</b></div>" : "") +
      '<div class="li"><div class="grow">Türkisch / Ewe</div><b>' + r.lang.turkish + " / " + r.lang.ewe + " Min.</b></div>" +
      (tg && r.foodDays ? '<div class="li"><div class="grow">Ø Kalorien (eingetragene Tage)</div><b>' + Math.round(r.kcal / r.foodDays) + " / " + tg.kcal + "</b></div>" : "") + "</div>";
    if (sugg.length) h += '<h3>Für nächste Woche</h3><ul style="margin:0;padding-left:18px">' + sugg.slice(0, 5).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>";
    else h += '<div class="tip" style="border-left-color:var(--good)">Starke Woche! Halte das Niveau, das ist der Weg nach oben.</div>';
    return h + "</div>";
  }

  /* ---------- Sheet ---------- */
  var sheetClose = null;
  function openSheet(html, mount, onClose) {
    $("#sheetBody").innerHTML = html;
    $("#backdrop").classList.remove("hidden"); $("#sheet").classList.remove("hidden");
    requestAnimationFrame(function () { $("#backdrop").classList.add("show"); $("#sheet").classList.add("show"); });
    $("#sheet").scrollTop = 0;
    sheetClose = onClose || null;
    if (mount) mount($("#sheetBody"));
  }
  function closeSheet() {
    $("#backdrop").classList.remove("show"); $("#sheet").classList.remove("show");
    var cb = sheetClose; sheetClose = null; if (cb) cb();
    setTimeout(function () { if (!$("#sheet").classList.contains("show")) { $("#backdrop").classList.add("hidden"); $("#sheet").classList.add("hidden"); $("#sheetBody").innerHTML = ""; } }, 260);
  }
  $("#backdrop").addEventListener("click", closeSheet);

  var toastT;
  function toast(msg, action, fn) {
    var el = $("#toast"); el.innerHTML = esc(msg) + (action ? "<button>" + esc(action) + "</button>" : "");
    if (action) el.querySelector("button").onclick = function () { el.classList.remove("show"); fn(); };
    el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("show"); }, action ? 4500 : 2400);
  }

  /* Aufgabe bearbeiten / neu */
  function catChips(sel) {
    return '<div class="chips" style="flex-wrap:wrap">' + Object.keys(CATS).map(function (k) { return '<button type="button" class="chipbtn' + (sel === k ? " on" : "") + '" data-cat="' + k + '">' + CATS[k].icon + " " + CATS[k].label + "</button>"; }).join("") + "</div>";
  }
  function taskForm(t, isNew) {
    var r = t.rid ? S.routines.filter(function (x) { return x.id === t.rid; })[0] : null;
    var h = "<h2>" + (isNew ? "Neue Aufgabe" : "Bearbeiten") + "</h2><form data-form=\"task\">" +
      '<label class="f">Was?<input class="in" name="title" value="' + esc(t.title) + '" placeholder="z. B. morgen 15 Uhr Bio Kapitel 4 45min" autocomplete="off" required></label>' +
      (isNew ? '<div class="parsed" id="parsed"></div>' : "") +
      '<div class="grid2"><label class="f">Tag<input class="in" name="date" type="date" value="' + (t.date || "") + '"></label>' +
      '<label class="f">Uhrzeit<input class="in" name="time" type="time" value="' + (t.time || "") + '"></label></div>' +
      '<div class="grid2"><label class="f">Dauer (Min.)<input class="in" name="dur" type="number" min="0" step="5" value="' + (t.dur || "") + '" inputmode="numeric"></label>' +
      '<label class="f">Priorität<select class="in" name="prio"><option value="high"' + (t.prio === "high" ? " selected" : "") + '>Hoch</option><option value="medium"' + (t.prio === "medium" ? " selected" : "") + '>Mittel</option><option value="low"' + (t.prio === "low" ? " selected" : "") + ">Niedrig</option></select></label></div>" +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Bereich</div>' + catChips(t.cat) + '<input type="hidden" name="cat" value="' + t.cat + '">' +
      '<label class="f" style="margin-top:8px">Notiz<textarea class="in" name="notes" placeholder="Details, Links, Seiten …">' + esc(t.notes || "") + "</textarea></label>" +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Teilschritte</div><div id="subs" class="list">' +
      (t.sub || []).map(function (s, i) { return subRow(s, i); }).join("") + '</div><div class="row" style="margin:6px 0 12px"><input class="in" id="subIn" placeholder="Schritt hinzufügen"><button type="button" class="btn small sec" data-subadd>+</button></div>';
    if (isNew) h += '<label class="f">Wiederholen<select class="in" name="repeat"><option value="">Nein, einmalig</option><option value="daily">Täglich</option><option value="wk">Mo–Fr</option><option value="weekly">Jede Woche an diesem Tag</option></select></label>';
    if (r) h += '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="applyAll"> Auch für alle kommenden Tage ändern (Routine „' + esc(r.title) + '“)</label>';
    h += '<button class="btn block">' + (isNew ? "Hinzufügen" : "Speichern") + "</button>";
    if (!isNew) h += '<div class="row" style="margin-top:10px"><button type="button" class="btn sec" style="flex:1" data-del>Löschen</button><button type="button" class="btn sec" style="flex:1" data-tomorrow>Auf morgen</button></div>';
    return h + "</form>";
  }
  function subRow(s, i) { return '<div class="li"><button type="button" class="chk' + (s.d ? " on" : "") + '" data-subt="' + i + '">✓</button><div class="grow">' + esc(s.t) + '</div><button type="button" class="x" data-subx="' + i + '">×</button></div>'; }

  function openTaskForm(t, isNew) {
    t = t || { title: "", cat: "personal", prio: "medium", date: V.tab === "today" ? V.date : today(), time: null, dur: 30, sub: [] };
    var draft = clone(t); draft.sub = draft.sub || [];
    openSheet(taskForm(draft, isNew), function (el) {
      var f = $("form", el), touched = {};
      ["date", "time", "dur", "prio"].forEach(function (k) { f[k].addEventListener("input", function () { touched[k] = 1; }); });
      $$("[data-cat]", el).forEach(function (b) { b.onclick = function () { $$("[data-cat]", el).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); f.cat.value = b.dataset.cat; touched.cat = 1; }; });
      if (isNew) {
        f.title.addEventListener("input", function () {
          var p = parseQuick(f.title.value), out = [];
          if (p.date && !touched.date) { f.date.value = p.date; out.push("📅 " + relDay(p.date)); }
          if (p.time && !touched.time) { f.time.value = p.time; out.push("🕒 " + p.time); }
          if (p.dur && !touched.dur) { f.dur.value = p.dur; out.push("⏱ " + p.dur + " Min."); }
          if (p.prio && !touched.prio) { f.prio.value = p.prio; out.push(p.prio === "high" ? "❗ wichtig" : "niedrig"); }
          if (p.cat && !touched.cat) { f.cat.value = p.cat; $$("[data-cat]", el).forEach(function (x) { x.classList.toggle("on", x.dataset.cat === p.cat); }); out.push(CATS[p.cat].icon + " " + CATS[p.cat].label); }
          $("#parsed", el).innerHTML = out.map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("");
        });
        setTimeout(function () { f.title.focus(); if (t.title) f.title.dispatchEvent(new Event("input")); }, 280);
      }
      function redrawSubs() { $("#subs", el).innerHTML = draft.sub.map(subRow).join(""); }
      function addSub() { var v = $("#subIn", el).value.trim(); if (!v) return; draft.sub.push({ t: v, d: false }); $("#subIn", el).value = ""; redrawSubs(); }
      $("[data-subadd]", el).onclick = addSub;
      $("#subIn", el).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addSub(); } });
      $("#subs", el).addEventListener("click", function (e) {
        var a = e.target.closest("[data-subt]"), x = e.target.closest("[data-subx]");
        if (a) { draft.sub[+a.dataset.subt].d = !draft.sub[+a.dataset.subt].d; redrawSubs(); }
        if (x) { draft.sub.splice(+x.dataset.subx, 1); redrawSubs(); }
      });
      if (!isNew) {
        $("[data-del]", el).onclick = function () { closeSheet(); deleteTask(t.id); };
        $("[data-tomorrow]", el).onclick = function () { closeSheet(); postpone(t.id, 1); };
      }
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var title = isNew ? parseQuick(f.title.value).title || f.title.value.trim() : f.title.value.trim();
        if (!title) return;
        var vals = { title: title, date: f.date.value || null, time: f.time.value || null, dur: +f.dur.value || 0, prio: f.prio.value, cat: f.cat.value, notes: f.notes.value.trim(), sub: draft.sub };
        if (isNew && f.repeat && f.repeat.value) {
          var base = vals.date || today(), days = f.repeat.value === "daily" ? [0, 1, 2, 3, 4, 5, 6] : f.repeat.value === "wk" ? [0, 1, 2, 3, 4] : [wd(base)];
          var r = { id: uid("r"), title: vals.title, cat: vals.cat, kind: "task", days: days, time: vals.time, dur: vals.dur || 30, note: vals.notes, flex: !vals.time, from: base };
          S.routines.push(r); closeSheet(); save(); render(); toast("Routine angelegt: " + days.map(function (x) { return WDS[x]; }).join(", ")); return;
        }
        if (isNew) {
          var nt = newTask(vals);
          if (nt.date) ensureDay(nt.date);
          toast(nt.date ? "Hinzugefügt für " + relDay(nt.date) + (nt.time ? " um " + nt.time : "") : "Im Eingang gespeichert");
        } else {
          var o = S.tasks[t.id]; if (!o) return closeSheet();
          if (vals.date && o.date && vals.date > o.date) o.postponed = (o.postponed || 0) + 1;
          var subsChanged = JSON.stringify(o.sub || []) !== JSON.stringify(vals.sub);
          Object.assign(o, vals); if (o.rk) o.touched = true;
          if (f.applyAll && f.applyAll.checked && o.rid) {
            var rr = S.routines.filter(function (x) { return x.id === o.rid; })[0];
            if (rr) { rr.title = vals.title; rr.cat = vals.cat; rr.time = vals.time; rr.end = null; rr.dur = vals.dur || rr.dur; rr.note = vals.notes; rr.flex = !vals.time; regenRoutine(rr.id); toast("Routine für alle kommenden Tage geändert"); }
          }
          if (o.sub.length && o.sub.every(function (s) { return s.d; }) && !o.done && subsChanged) { o.done = true; o.doneAt = Date.now(); S.xp += points(o); toast("Alle Teilschritte erledigt ✓"); }
        }
        save(); closeSheet(); render();
      });
    });
  }

  function openTaskMenu(id) {
    var t = S.tasks[id]; if (!t) return;
    if (t.kind === "fixed") {
      openSheet("<h2>" + esc(t.title) + '</h2><p class="sub">' + relDay(t.date) + " · " + t.time + " bis " + fromMin(toMin(t.time) + t.dur) + (t.notes ? "<br>" + esc(t.notes) : "") + '</p><div class="menu">' +
        '<button data-m="edit">✏️ Bearbeiten</button><button data-m="del">🗑 Heute ausfallen lassen</button><button data-m="routine">🔁 Feste Termine verwalten</button></div>', function (el) {
        el.onclick = function (e) { var b = e.target.closest("[data-m]"); if (!b) return; var m = b.dataset.m; closeSheet(); if (m === "edit") setTimeout(function () { openTaskForm(t, false); }, 280); if (m === "del") deleteTask(id); if (m === "routine") setTimeout(openRoutines, 280); };
      });
      return;
    }
    var done = isDone(t);
    openSheet("<h2>" + esc(t.title) + '</h2><p class="sub" style="margin-top:-6px">' + cat(t.cat).icon + " " + cat(t.cat).label + " · " + relDay(t.date) + (t.time ? " " + t.time : "") + (t.dur ? " · " + fmtDur(t.dur) : "") + "</p>" +
      (t.notes ? '<p style="white-space:pre-wrap">' + esc(t.notes) + "</p>" : "") +
      '<div class="menu">' +
      '<button data-m="toggle">' + (done ? "↩️ Wieder öffnen" : "✅ Erledigt") + "</button>" +
      (!done && t.dur ? '<button data-m="timer">▶️ Fokus-Timer (' + fmtDur(t.dur) + ")</button>" : "") +
      '<button data-m="edit">✏️ Bearbeiten</button>' +
      '<div class="grid3"><button data-m="p1">⏭ Morgen</button><button data-m="p2">Übermorgen</button><button data-m="p7">+1 Woche</button></div>' +
      '<div class="grid3"><button data-m="later">+30 Min.</button><button data-m="slot">Nächste Lücke</button><button data-m="notime">Ohne Zeit</button></div>' +
      '<button data-m="inbox">📥 In den Eingang (ohne Datum)</button>' +
      '<button data-m="split">🧩 In Schritte teilen</button>' +
      (t.src === "training" && S.settings.links.training ? '<button data-m="openTraining">🏋️ In der Trainingsapp öffnen</button>' : "") +
      (t.lang === "ewe" && S.settings.links.ewe ? '<button data-m="openEwe">🌍 Ewe-App öffnen</button>' : "") +
      (t.lang === "turkish" ? '<button data-m="flash">🃏 Türkisch-Karteikarten</button>' : "") +
      '<button data-m="del" style="color:var(--bad)">🗑 Löschen' + (t.rk ? " (nur an diesem Tag)" : "") + "</button></div>", function (el) {
      el.onclick = function (e) {
        var b = e.target.closest("[data-m]"); if (!b) return; var m = b.dataset.m;
        closeSheet();
        if (m === "toggle") toggle(id);
        else if (m === "timer") setTimeout(function () { openTimer(t); }, 280);
        else if (m === "edit") setTimeout(function () { openTaskForm(t, false); }, 280);
        else if (m === "p1") postpone(id, 1); else if (m === "p2") postpone(id, 2); else if (m === "p7") postpone(id, 7);
        else if (m === "later") { var nt = (toMin(t.time) != null ? toMin(t.time) : nowMin()) + 30; moveTask(id, undefined, fromMin(Math.ceil(nt / 5) * 5)); render(); }
        else if (m === "slot") { if (!t.date) t.date = today(); var s = findSlot(t.date, t.dur || 30, t.date === today() ? nowMin() : 0, t.id); if (s != null) { moveTask(id, undefined, fromMin(s)); toast("Eingeplant um " + fromMin(s)); } else toast("Keine freie Lücke mehr an diesem Tag"); render(); }
        else if (m === "notime") { moveTask(id, undefined, null); render(); }
        else if (m === "inbox") { moveTask(id, null, null); render(); toast("Im Eingang"); }
        else if (m === "split") setTimeout(function () { openSplit(t); }, 280);
        else if (m === "openTraining") window.open(S.settings.links.training, "_blank");
        else if (m === "openEwe") window.open(S.settings.links.ewe, "_blank");
        else if (m === "flash") setTimeout(openFlash, 280);
        else if (m === "del") deleteTask(id);
      };
    });
  }

  function openSplit(t) {
    openSheet('<h2>🧩 In Schritte teilen</h2><p class="sub">Schreib einen Schritt pro Zeile. Jeder Schritt sollte in 10 bis 25 Minuten machbar sein.</p><form data-form="split">' +
      '<textarea class="in" name="steps" style="min-height:140px" placeholder="Material zusammensuchen&#10;Gliederung schreiben&#10;Einleitung schreiben"></textarea>' +
      '<label class="f" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="radio" name="mode" value="sub" checked> Als Teilschritte in dieser Aufgabe</label>' +
      '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="mode" value="days"> Als eigene Aufgaben, ein Schritt pro Tag ab heute</label>' +
      '<button class="btn block">Übernehmen</button></form>', function (el) {
      $("form", el).onsubmit = function (e) {
        e.preventDefault();
        var steps = this.steps.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean); if (!steps.length) return;
        if (this.mode.value === "sub") { t.sub = (t.sub || []).concat(steps.map(function (s) { return { t: s, d: false }; })); }
        else {
          steps.forEach(function (s, i) { var d = addYmd(today(), i); ensureDay(d); var n = newTask({ title: t.title + ": " + s, cat: t.cat, prio: t.prio, date: d, dur: 20 }); placeFlex(n); });
          if (S.tasks[t.id]) delete S.tasks[t.id];
        }
        save(); closeSheet(); render(); toast(steps.length + " Schritte angelegt");
      };
    });
  }

  /* Timer */
  var TM = null;
  function openTimer(t, langOnly) {
    var total = (t ? t.dur : (langOnly === "ewe" ? 15 : 20)) * 60, title = t ? t.title : (langOnly === "ewe" ? "Ewe" : "Türkisch");
    var lang = t ? t.lang : langOnly;
    TM = { end: null, left: total, total: total, run: false, id: null, task: t ? t.id : null, lang: lang, wl: null };
    openSheet('<h2>⏱ ' + esc(title) + '</h2><div class="timer" id="tmv">' + mmss(total) + '</div><div class="bars" style="margin-bottom:14px"><div class="bar" style="grid-template-columns:1fr"><div class="track"><div class="fill" id="tmb" style="width:0"></div></div></div></div>' +
      '<div class="grid3"><button class="btn" id="tmGo">Start</button><button class="btn sec" id="tmPlus">+5 Min.</button><button class="btn sec" id="tmDone">Fertig</button></div>' +
      (lang === "ewe" && S.settings.links.ewe ? '<a class="btn sec block" style="margin-top:10px;display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="' + esc(S.settings.links.ewe) + '">🌍 Ewe-App öffnen (Timer läuft weiter)</a>' : "") +
      '<p class="sub" style="margin-top:12px">Handy weglegen, nur diese eine Sache. Der Timer läuft weiter, auch wenn du kurz die App wechselst.</p>', function (el) {
      function tick() {
        if (TM.run) TM.left = Math.max(0, Math.round((TM.end - Date.now()) / 1000));
        var v = $("#tmv"); if (!v) return;
        v.textContent = mmss(TM.left); $("#tmb").style.width = ((1 - TM.left / TM.total) * 100) + "%";
        if (TM.run && TM.left <= 0) { finish(true); }
      }
      function finish(auto) {
        clearInterval(TM.id); TM.run = false; TM.finished = true;
        var mins = Math.round((TM.total - TM.left) / 60);
        if (TM.lang && mins > 0) { S.lang[TM.lang].min[today()] = (S.lang[TM.lang].min[today()] || 0) + mins; }
        var task = TM.task && S.tasks[TM.task];
        if (task && !task.done) { task.done = true; task.doneAt = Date.now(); task.timerLogged = true; S.xp += points(task); }
        else if (!task && TM.lang) { var lt = tasksOn(today()).filter(function (x) { return x.lang === TM.lang && !x.done; })[0]; if (lt) { lt.done = true; lt.doneAt = Date.now(); lt.timerLogged = true; S.xp += points(lt); } }
        save();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        beep();
        if (TM.wl) try { TM.wl.release(); } catch (e) {}
        closeSheet(); render(); toast(auto ? "Zeit um! Stark durchgezogen 💪" : "Gespeichert: " + mins + " Min.");
      }
      $("#tmGo").onclick = function () {
        if (TM.run) { TM.run = false; TM.left = Math.max(0, Math.round((TM.end - Date.now()) / 1000)); this.textContent = "Weiter"; clearInterval(TM.id); return; }
        TM.run = true; TM.end = Date.now() + TM.left * 1000; this.textContent = "Pause"; TM.id = setInterval(tick, 500);
        if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (w) { TM.wl = w; }).catch(function () {});
      };
      $("#tmPlus").onclick = function () { TM.total += 300; TM.left += 300; if (TM.run) TM.end += 300000; tick(); };
      $("#tmDone").onclick = function () { if (TM.run) TM.left = Math.max(0, Math.round((TM.end - Date.now()) / 1000)); finish(false); };
    }, function () {
      if (!TM || TM.finished) return;
      clearInterval(TM.id);
      if (TM.run) TM.left = Math.max(0, Math.round((TM.end - Date.now()) / 1000));
      var mins = Math.round((TM.total - TM.left) / 60);
      if (TM.lang && mins > 0) { S.lang[TM.lang].min[today()] = (S.lang[TM.lang].min[today()] || 0) + mins; save(); render(); toast(mins + " Min. gespeichert"); }
      TM = null;
    });
  }
  function mmss(s) { return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
  function beep() { try { var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start(); o.stop(c.currentTime + 0.4); } catch (e) {} }

  /* Karteikarten */
  function openFlash() {
    var sd = srsDue(), queue = sd.due.concat(sd.fresh);
    if (!queue.length) { openSheet('<h2>🃏 Türkisch</h2><div class="empty">Für heute alles wiederholt! 🎉<br>Morgen kommen neue Karten.</div><button class="btn block" data-x>Trotzdem 10 zufällige üben</button>', function (el) { $("[data-x]", el).onclick = function () { closeSheet(); setTimeout(function () { openFlashQueue(D.TURKISH.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; }).slice(0, 10)); }, 280); }; }); return; }
    openFlashQueue(queue);
  }
  function openFlashQueue(queue) {
    var pos = 0, right = 0, reverse = false, shown = false;
    openSheet('<h2>🃏 Türkisch <span class="sub" id="fcPos"></span></h2><div class="seg"><button class="on" data-dir="0">Türkisch → Deutsch</button><button data-dir="1">Deutsch → Türkisch</button></div><div class="flash" id="fc"></div>' +
      '<div class="grid2" style="margin-top:12px"><button class="btn sec" id="fcNo">✗ Noch nicht</button><button class="btn" id="fcYes">✓ Gewusst</button></div><p class="sub" style="margin-top:10px">Karte antippen zum Umdrehen. Gewusste Karten kommen in 1, 3, 7, 16 … Tagen wieder.</p>', function (el) {
      function draw() {
        if (pos >= queue.length) { $("#fc").innerHTML = '<div><div class="front">🎉 ' + right + "/" + queue.length + '</div><div class="back">Runde geschafft!</div></div>'; $("#fcPos").textContent = ""; $("#fcYes").textContent = "Fertig"; $("#fcNo").classList.add("hidden"); render(); return; }
        var w = D.TURKISH[queue[pos]], front = reverse ? w[1] : w[0], back = reverse ? w[0] : w[1];
        $("#fcPos").textContent = (pos + 1) + " / " + queue.length;
        $("#fc").innerHTML = '<div><div class="sub">' + esc(w[2]) + '</div><div class="front">' + esc(front) + "</div>" + (shown ? '<div class="back">' + esc(back) + '</div><button class="iconbtn" style="margin:8px auto 0" data-say="' + esc(w[0]) + '">🔊</button>' : '<div class="sub" style="margin-top:8px">antippen</div>') + "</div>";
      }
      $("#fc").onclick = function (e) { var s = e.target.closest("[data-say]"); if (s) { speak(s.dataset.say, "tr-TR"); return; } shown = !shown; if (shown && !reverse) speak(D.TURKISH[queue[pos]][0], "tr-TR"); draw(); };
      function ans(ok) { if (pos >= queue.length) { closeSheet(); return; } srsAnswer(queue[pos], ok); if (ok) right++; else queue.push(queue[pos]); pos++; shown = false; draw(); }
      $("#fcYes").onclick = function () { ans(true); };
      $("#fcNo").onclick = function () { ans(false); };
      $$("[data-dir]", el).forEach(function (b) { b.onclick = function () { reverse = b.dataset.dir === "1"; $$("[data-dir]", el).forEach(function (x) { x.classList.toggle("on", x === b); }); shown = false; draw(); }; });
      draw();
    }, function () { render(); });
  }

  /* Essen eintragen */
  function openFood() {
    var date = V.tab === "today" || V.tab === "goals" ? V.date : today();
    function grid(q) {
      q = (q || "").toLowerCase();
      var list = D.FOODS.slice().sort(function (a, b) { var ia = S.recentFoods.indexOf(a[0]), ib = S.recentFoods.indexOf(b[0]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
      return list.filter(function (f) { return !q || f[0].toLowerCase().indexOf(q) >= 0; }).map(function (f) {
        return '<button type="button" class="food" data-f="' + esc(f[0]) + '"><b>' + esc(f[0]) + "</b><span>" + esc(f[1]) + " · " + f[2] + " kcal · " + f[3] + " g P</span></button>";
      }).join("");
    }
    openSheet('<h2>🍽️ Essen eintragen <span class="sub">' + relDay(date) + '</span></h2><div class="seg" id="fq">' + [0.5, 1, 1.5, 2, 3].map(function (q) { return '<button type="button" data-q="' + q + '" class="' + (q === 1 ? "on" : "") + '">×' + String(q).replace(".", ",") + "</button>"; }).join("") + "</div>" +
      '<input class="in" id="fs" placeholder="Suchen …" style="margin-bottom:8px"><div class="foodgrid" id="fg">' + grid() + "</div>" +
      '<h3>Eigener Eintrag</h3><form data-form="food" class="grid3"><input class="in" name="n" placeholder="Name" style="grid-column:1/-1"><input class="in" name="k" type="number" inputmode="numeric" placeholder="kcal"><input class="in" name="p" type="number" inputmode="numeric" placeholder="Protein g"><button class="btn">+</button></form>' +
      '<div id="fsum" class="sub" style="margin-top:10px"></div>', function (el) {
      var q = 1;
      function upd() { var f = foodDay(date), tg = targets(); $("#fsum", el).innerHTML = "Heute: <b>" + f.kcal + "</b>" + (tg ? " / " + tg.kcal : "") + " kcal · <b>" + f.p + "</b>" + (tg ? " / " + tg.protein : "") + " g Protein"; }
      upd();
      $("#fq", el).onclick = function (e) { var b = e.target.closest("[data-q]"); if (!b) return; q = +b.dataset.q; $$("#fq button", el).forEach(function (x) { x.classList.toggle("on", x === b); }); };
      $("#fs", el).oninput = function () { $("#fg", el).innerHTML = grid(this.value); };
      $("#fg", el).onclick = function (e) {
        var b = e.target.closest("[data-f]"); if (!b) return;
        var f = D.FOODS.filter(function (x) { return x[0] === b.dataset.f; })[0];
        addFood(date, f[0], f[2], f[3], q); upd(); toast("+" + Math.round(f[2] * q) + " kcal · " + Math.round(f[3] * q) + " g Protein");
        markMeal(date);
      };
      $("form", el).onsubmit = function (e) { e.preventDefault(); var k = +this.k.value || 0, p = +this.p.value || 0; if (!k && !p) return; addFood(date, this.n.value.trim() || "Eigener Eintrag", k, p, 1); this.reset(); upd(); toast("Eingetragen"); markMeal(date); };
    }, function () { render(); });
  }
  function markMeal(date) {
    if (date !== today()) return;
    var nm = nowMin(), m = tasksOn(date).filter(function (t) { return t.meal && !t.done && t.time && Math.abs(toMin(t.time) - nm) <= 90; })[0];
    if (m) { m.done = true; m.doneAt = Date.now(); S.xp += points(m); save(); }
  }

  /* Profil */
  function openProfile() {
    var p = S.profile;
    openSheet('<h2>👤 Profil & Ziele</h2><form data-form="profile">' +
      '<label class="f">Vorname (für die Begrüßung)<input class="in" name="name" value="' + esc(p.name) + '" autocomplete="given-name"></label>' +
      '<div class="grid3"><label class="f">Gewicht kg<input class="in" name="weight" type="text" inputmode="decimal" value="' + (p.weight || "") + '" required></label>' +
      '<label class="f">Größe cm<input class="in" name="height" type="number" inputmode="numeric" value="' + (p.height || "") + '" required></label>' +
      '<label class="f">Alter<input class="in" name="age" type="number" inputmode="numeric" value="' + (p.age || "") + '" required></label></div>' +
      '<div class="grid2"><label class="f">Geschlecht (für die Formel)<select class="in" name="sex"><option value="m"' + (p.sex === "m" ? " selected" : "") + '>männlich</option><option value="f"' + (p.sex === "f" ? " selected" : "") + '>weiblich</option></select></label>' +
      '<label class="f">Zielgewicht kg<input class="in" name="goalWeight" type="text" inputmode="decimal" value="' + (p.goalWeight || "") + '"></label></div>' +
      '<label class="f">Aktivität<select class="in" name="activity">' + [[1.55, "Mäßig (3–4 Einheiten/Woche)"], [1.7, "Hoch (fast täglich, z. T. 2× am Tag)"], [1.85, "Sehr hoch (2× täglich + Spiele)"]].map(function (a) { return '<option value="' + a[0] + '"' + (+p.activity === a[0] ? " selected" : "") + ">" + a[1] + "</option>"; }).join("") + "</select></label>" +
      '<div class="grid2"><label class="f">Überschuss kcal/Tag<input class="in" name="surplus" type="number" step="50" inputmode="numeric" value="' + p.surplus + '"></label>' +
      '<label class="f">Protein g pro kg<input class="in" name="ppk" type="text" inputmode="decimal" value="' + p.ppk + '"></label></div>' +
      '<p class="sub">Empfehlung für Masseaufbau: +300 bis +500 kcal, 1,6 bis 2,2 g Protein pro kg. Bei deinem Trainingsumfang (bis zu 2 Einheiten am Tag) passt „Hoch“.</p>' +
      '<button class="btn block">Speichern</button></form>', function (el) {
      $("form", el).onsubmit = function (e) {
        e.preventDefault(); var f = this;
        p.name = f.name.value.trim(); p.weight = +String(f.weight.value).replace(",", ".") || null; p.height = +f.height.value || null; p.age = +f.age.value || null; p.sex = f.sex.value;
        p.goalWeight = +String(f.goalWeight.value).replace(",", ".") || null; p.activity = +f.activity.value; p.surplus = +f.surplus.value || 0; p.ppk = +String(f.ppk.value).replace(",", ".") || 2;
        if (p.weight && !S.weight[today()]) S.weight[today()] = p.weight;
        S.onboard = true; save(); closeSheet(); render();
        var tg = targets(); if (tg) toast("Dein Ziel: " + tg.kcal + " kcal · " + tg.protein + " g Protein");
      };
    });
  }

  /* Check-ins */
  function openCheckin() {
    var t = today(), ci = S.checkin[t] = S.checkin[t] || {};
    var open = tasksOn(t).filter(function (x) { return !x.done && x.kind !== "fixed" && !x.meal && x.cat !== "rest" && !x.review; }).sort(function (a, b) { return prioN(b) - prioN(a); });
    var pre = (ci.top3 || []).map(function (id) { return S.tasks[id] && S.tasks[id].title; }).filter(Boolean);
    while (pre.length < 3 && open[pre.length]) pre.push(open[pre.length].title);
    openSheet('<h2>🌅 Morgen-Check-in</h2><form data-form="ci">' +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Wie fühlst du dich?</div><div class="mood" id="mood">' + ["😫", "😕", "😐", "🙂", "💪"].map(function (m, i) { return '<button type="button" data-v="' + (i + 1) + '" class="' + (ci.energy === i + 1 ? "on" : "") + '">' + m + "</button>"; }).join("") + "</div>" +
      '<label class="f" style="margin-top:10px">Schlaf (Stunden)<input class="in" name="sleep" type="text" inputmode="decimal" value="' + (ci.sleep || "") + '"></label>' +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Deine 3 wichtigsten Dinge heute</div>' +
      [0, 1, 2].map(function (i) { return '<input class="in" name="t' + i + '" list="openl" value="' + esc(pre[i] || "") + '" placeholder="' + (i + 1) + '." style="margin-bottom:6px">'; }).join("") +
      '<datalist id="openl">' + open.map(function (x) { return '<option value="' + esc(x.title) + '">'; }).join("") + "</datalist>" +
      '<div id="ciHint" class="tip hidden"></div><button class="btn block" style="margin-top:10px">Los geht\'s</button></form>', function (el) {
      var energy = ci.energy || 0;
      $("#mood", el).onclick = function (e) {
        var b = e.target.closest("[data-v]"); if (!b) return; energy = +b.dataset.v; $$("#mood button", el).forEach(function (x) { x.classList.toggle("on", x === b); });
        var hint = $("#ciHint", el); hint.classList.toggle("hidden", energy > 2);
        hint.textContent = "Wenig Energie? Mach heute die Pflicht (Essen, Schlaf, Top 3) und kürze das Training um ein Drittel. In der Trainingsapp zeigt dir die Ampel, wie viel geht.";
      };
      $("form", el).onsubmit = function (e) {
        e.preventDefault(); var f = this, ids = [];
        [f.t0.value, f.t1.value, f.t2.value].map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) {
          var ex = tasksOn(t).filter(function (x) { return x.title === s; })[0];
          if (!ex) { ex = newTask({ title: s, prio: "high", date: t, dur: 30, cat: parseQuick(s).cat || "personal" }); placeFlex(ex); }
          ex.prio = "high"; ids.push(ex.id);
        });
        ci.top3 = ids; ci.energy = energy; ci.sleep = +String(f.sleep.value).replace(",", ".") || null; ci.morning = true;
        S.xp += 5; save(); closeSheet(); render(); toast("Guter Start! +5 XP");
      };
    });
  }
  function openEvening() {
    var t = today(), ci = S.checkin[t] = S.checkin[t] || {}, list = tasksOn(t);
    var open = list.filter(function (x) { return !isDone(x) && x.kind !== "fixed" && !x.rk; });
    var tasks = list.filter(function (x) { return x.kind !== "fixed"; }), done = tasks.filter(isDone).length;
    var tg = targets(), f = foodDay(t), tm = addYmd(t, 1); ensureDay(tm);
    var first = tasksOn(tm).filter(function (x) { return x.time; })[0];
    openSheet('<h2>🌙 Abend-Check</h2><p>Heute erledigt: <b>' + done + " von " + tasks.length + "</b>" + (tg ? " · " + f.kcal + " / " + tg.kcal + " kcal · " + f.p + " / " + tg.protein + " g Protein" : "") + "</p>" +
      (tg && f.kcal < tg.kcal * 0.9 ? '<div class="tip">Dir fehlen noch ' + (tg.kcal - f.kcal) + ' kcal. Ein Shake oder Quark vor dem Schlafen schließt die Lücke.</div>' : "") +
      '<form data-form="ev" style="margin-top:10px"><label class="f">Was lief heute gut?<textarea class="in" name="good">' + esc(ci.good || "") + "</textarea></label>" +
      '<label class="f">Was machst du morgen besser?<textarea class="in" name="better">' + esc(ci.better || "") + "</textarea></label>" +
      (open.length ? '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Noch offen (' + open.length + ')</div><div class="list" style="margin-bottom:8px">' + open.map(function (x) { return '<div class="li">• ' + esc(x.title) + "</div>"; }).join("") + '</div><label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="move" checked> Alles Offene auf morgen verschieben</label>' : "") +
      (first ? '<p class="sub">Morgen geht es um <b>' + first.time + "</b> los: " + esc(first.title) + ". Wecker gestellt?</p>" : "") +
      '<button class="btn block">Tag abschließen</button></form>', function (el) {
      $("form", el).onsubmit = function (e) {
        e.preventDefault(); ci.good = this.good.value.trim(); ci.better = this.better.value.trim(); ci.evening = true;
        if (this.move && this.move.checked) open.forEach(function (x) { x.date = tm; x.time = null; x.postponed = (x.postponed || 0) + 1; placeFlex(x); });
        var rv = list.filter(function (x) { return x.review && !x.done; })[0]; if (rv) { rv.done = true; rv.doneAt = Date.now(); S.xp += points(rv); }
        S.xp += 5; save(); closeSheet(); render(); toast("Gute Nacht! 😴 Schlaf = Wachstum.");
      };
    });
  }

  /* Routinen */
  function openRoutines() {
    var groups = {};
    S.routines.forEach(function (r) { (groups[r.cat] = groups[r.cat] || []).push(r); });
    var h = '<h2>🔁 Routinen & feste Termine</h2><p class="sub">Daraus baut FokusPlan jeden Tag deinen Plan. Ohne Uhrzeit = flexibel, FokusPlan sucht eine Lücke. Trainingseinheiten kommen direkt aus der Trainingsapp.</p>' +
      '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="useTr"' + (S.settings.useTraining ? " checked" : "") + "> Trainingseinheiten aus der Trainingsapp einplanen</label>" +
      '<button class="btn block" data-new style="margin-bottom:10px">+ Neue Routine</button>';
    Object.keys(CATS).forEach(function (k) {
      if (!groups[k]) return;
      h += '<div class="section-h">' + CATS[k].icon + " " + CATS[k].label + '</div><div class="menu">' + groups[k].map(function (r) {
        return '<button data-r="' + r.id + '" style="' + (r.off ? "opacity:.5" : "") + '"><span style="flex:1">' + esc(r.title) + '<div class="sub">' + (r.days.length === 7 ? "täglich" : r.days.map(function (x) { return WDS[x]; }).join(" ")) + " · " + (r.time ? r.time + (r.end ? "–" + r.end : "") : "flexibel") + (r.off ? " · pausiert" : "") + "</div></span></button>";
      }).join("") + "</div>";
    });
    openSheet(h, function (el) {
      $("#useTr", el).onchange = function () { S.settings.useTraining = this.checked; checkTrainingSig(); save(); render(); };
      $("[data-new]", el).onclick = function () { closeSheet(); setTimeout(function () { openRoutineForm(null); }, 280); };
      el.addEventListener("click", function (e) { var b = e.target.closest("[data-r]"); if (!b) return; var r = S.routines.filter(function (x) { return x.id === b.dataset.r; })[0]; closeSheet(); setTimeout(function () { openRoutineForm(r); }, 280); });
    });
  }
  function openRoutineForm(r) {
    var isNew = !r; r = r ? clone(r) : { id: uid("r"), title: "", cat: "personal", kind: "task", days: [0, 1, 2, 3, 4], time: "", dur: 30, flex: true };
    openSheet("<h2>" + (isNew ? "Neue Routine" : "Routine bearbeiten") + '</h2><form data-form="routine">' +
      '<label class="f">Titel<input class="in" name="title" value="' + esc(r.title) + '" required></label>' +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Tage</div><div class="daypick" id="dp">' + WDS.map(function (x, i) { return '<button type="button" data-d="' + i + '" class="' + (r.days.indexOf(i) >= 0 ? "on" : "") + '">' + x + "</button>"; }).join("") + "</div>" +
      '<div class="grid3" style="margin-top:10px"><label class="f">Beginn<input class="in" name="time" type="time" value="' + (r.time || "") + '"></label><label class="f">Ende<input class="in" name="end" type="time" value="' + (r.end || "") + '"></label><label class="f">Dauer Min.<input class="in" name="dur" type="number" step="5" value="' + (r.dur || "") + '"></label></div>' +
      '<label class="f">Wenn flexibel: am liebsten ab<input class="in" name="prefer" type="time" value="' + (r.prefer || "") + '"></label>' +
      '<label class="f">Art<select class="in" name="kind"><option value="task"' + (r.kind !== "fixed" ? " selected" : "") + '>Aufgabe zum Abhaken</option><option value="fixed"' + (r.kind === "fixed" ? " selected" : "") + ">Fester Termin (Uni, Arbeit …)</option></select></label>" +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:var(--ink2)">Bereich</div>' + catChips(r.cat) + '<input type="hidden" name="cat" value="' + r.cat + '">' +
      '<label class="f" style="margin-top:8px">Notiz<input class="in" name="note" value="' + esc(r.note || "") + '"></label>' +
      '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="off"' + (r.off ? " checked" : "") + "> Pausieren (z. B. in den Semesterferien)</label>" +
      '<button class="btn block">Speichern</button>' + (!isNew ? '<button type="button" class="btn danger block" style="margin-top:8px" data-del>Routine löschen</button>' : "") + "</form>", function (el) {
      var f = $("form", el), days = r.days.slice();
      $("#dp", el).onclick = function (e) { var b = e.target.closest("[data-d]"); if (!b) return; var d = +b.dataset.d, i = days.indexOf(d); if (i >= 0) days.splice(i, 1); else days.push(d); b.classList.toggle("on"); };
      $$("[data-cat]", el).forEach(function (b) { b.onclick = function () { $$("[data-cat]", el).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); f.cat.value = b.dataset.cat; }; });
      if (!isNew) $("[data-del]", el).onclick = function () { if (!confirm("Routine „" + r.title + "“ löschen? Vergangene Einträge bleiben.")) return; S.routines = S.routines.filter(function (x) { return x.id !== r.id; }); regenRoutine(r.id); save(); closeSheet(); render(); toast("Routine gelöscht"); };
      f.onsubmit = function (e) {
        e.preventDefault();
        if (!days.length) return toast("Mindestens einen Tag wählen");
        Object.assign(r, { title: f.title.value.trim(), days: days.sort(), time: f.time.value || null, end: f.end.value || null, dur: +f.dur.value || (f.end.value && f.time.value ? toMin(f.end.value) - toMin(f.time.value) : 30), prefer: f.prefer.value || null, kind: f.kind.value, cat: f.cat.value, note: f.note.value.trim(), off: f.off.checked });
        r.flex = !r.time; if (r.kind === "fixed" && !r.time) return toast("Feste Termine brauchen eine Uhrzeit");
        if (isNew) { r.from = today(); S.routines.push(r); } else { S.routines = S.routines.map(function (x) { return x.id === r.id ? r : x; }); regenRoutine(r.id); }
        save(); closeSheet(); render(); toast("Routine gespeichert");
      };
    });
  }

  function openSettings() {
    var s = S.settings;
    openSheet('<h2>🕒 Einstellungen</h2><form data-form="settings">' +
      '<div class="grid2"><label class="f">Tag beginnt (Planung)<input class="in" name="dayStart" type="time" value="' + s.dayStart + '"></label><label class="f">Planung endet<input class="in" name="dayEnd" type="time" value="' + s.dayEnd + '"></label></div>' +
      '<p class="sub" style="margin-top:-4px">In diesem Zeitraum sucht FokusPlan freie Lücken für flexible Blöcke.</p>' +
      '<label class="f">Trainingsapp-Adresse<input class="in" name="training" type="url" value="' + esc(s.links.training) + '"></label>' +
      '<label class="f">Ewe-App-Adresse<input class="in" name="ewe" type="url" value="' + esc(s.links.ewe) + '"></label>' +
      '<label class="f">Bio-Lernapp-Adresse<input class="in" name="bio" type="url" value="' + esc(s.links.bio) + '" placeholder="https://…"></label>' +
      '<label class="f">Darstellung<select class="in" name="theme"><option value="auto"' + (s.theme === "auto" ? " selected" : "") + '>Automatisch</option><option value="light"' + (s.theme === "light" ? " selected" : "") + '>Hell</option><option value="dark"' + (s.theme === "dark" ? " selected" : "") + ">Dunkel</option></select></label>" +
      '<button class="btn block">Speichern</button></form>', function (el) {
      $("form", el).onsubmit = function (e) {
        e.preventDefault(); var f = this;
        s.dayStart = f.dayStart.value || "06:00"; s.dayEnd = f.dayEnd.value || "21:30";
        s.links.training = f.training.value.trim(); s.links.ewe = f.ewe.value.trim(); s.links.bio = f.bio.value.trim(); s.theme = f.theme.value;
        applyTheme(); save(); closeSheet(); render(); toast("Gespeichert");
      };
    });
  }
  function applyTheme() { if (S.settings.theme === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", S.settings.theme); }

  /* Erinnerungen */
  function toggleNotify() {
    if (S.settings.notify) { S.settings.notify = false; save(); render(); return toast("Erinnerungen aus"); }
    if (!("Notification" in window)) return toast("Dieses Gerät unterstützt keine Mitteilungen. Nutze den Kalender-Export.");
    Notification.requestPermission().then(function (p) {
      S.settings.notify = p === "granted"; save(); render();
      toast(p === "granted" ? "Erinnerungen an: 5 Minuten vor jedem Block, solange die App offen ist." : "Mitteilungen nicht erlaubt. Tipp: Kalender-Export nutzen.");
    });
  }
  function notifyTick() {
    if (!S.settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    var t = today(), nm = nowMin();
    tasksOn(t).forEach(function (x) {
      if (isDone(x) || !x.time || x.kind === "fixed" && x.cat !== "uni") return;
      var dm = toMin(x.time) - nm, k = x.id + "|" + x.time;
      if (dm <= 5 && dm >= 0 && !S.notified[k]) {
        S.notified[k] = 1; save();
        var body = x.time + " · " + cat(x.cat).label + (x.dur ? " · " + fmtDur(x.dur) : "");
        if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(cat(x.cat).icon + " " + x.title, { body: body, tag: k, icon: "icons/icon-192.png" }); }).catch(function () { try { new Notification(x.title, { body: body }); } catch (e) {} });
        else try { new Notification(x.title, { body: body }); } catch (e) {}
      }
    });
  }

  /* Export */
  function download(name, text, type) {
    var b = new Blob([text], { type: type }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportIcs() {
    var t = today(), idx = rkIndex(), lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FokusPlan//DE", "CALSCALE:GREGORIAN", "X-WR-CALNAME:FokusPlan"];
    function dt(d, m) { return d.replace(/-/g, "") + "T" + fromMin(m).replace(":", "") + "00"; }
    function icsEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/[,;]/g, function (c) { return "\\" + c; }).replace(/\n/g, "\\n"); }
    var n = 0;
    for (var i = 0; i < 7; i++) {
      var d = addYmd(t, i); ensureDay(d, idx);
      tasksOn(d).forEach(function (x) {
        if (!x.time || isDone(x) || x.meal) return;
        var s = toMin(x.time); n++;
        lines.push("BEGIN:VEVENT", "UID:" + x.id + "@fokusplan", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART:" + dt(d, s), "DTEND:" + dt(d, s + (x.dur || 15)),
          "SUMMARY:" + icsEsc(cat(x.cat).icon + " " + x.title), "DESCRIPTION:" + icsEsc(x.notes || ""), "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(x.title), "TRIGGER:-PT5M", "END:VALARM", "END:VEVENT");
      });
    }
    lines.push("END:VCALENDAR");
    download("fokusplan-" + t + ".ics", lines.join("\r\n"), "text/calendar");
    save(); toast(n + " Termine exportiert (ohne Mahlzeiten)");
  }
  function importBackup() {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json,.json";
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try { var d = JSON.parse(r.result); if (!d || !d.tasks || !d.routines) throw 0; if (!confirm("Backup importieren? Deine aktuellen Daten werden ersetzt.")) return; localStorage.setItem(KEY, JSON.stringify(d)); location.reload(); }
        catch (e) { toast("Das ist kein gültiges FokusPlan-Backup"); }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  /* Prüfungsplan */
  function addExam(title, date, c, plan) {
    var e = { id: uid("e"), title: title, date: date, cat: c }; S.exams.push(e);
    newTask({ title: "📝 " + title, cat: c, kind: "task", date: date, time: null, dur: 0, prio: "high", exam: e.id, src: "manual" });
    var n = 0;
    if (plan) {
      [21, 14, 10, 7, 5, 3, 2, 1].forEach(function (back, i) {
        var d = addYmd(date, -back); if (d < today()) return;
        ensureDay(d);
        var t = newTask({ title: title + ": " + (back <= 2 ? "Probeklausur / Schwächen" : i < 3 ? "Stoff erarbeiten (Block " + (i + 1) + ")" : "Wiederholen (Block " + (i - 2) + ")"), cat: c, date: d, dur: 45, prio: "high", exam: e.id });
        placeFlex(t, "14:00"); n++;
      });
    }
    save(); return n;
  }

  /* ---------- Drag & Drop ---------- */
  var DR = null;
  function dropTargetAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest("[data-drop]"); }
  document.addEventListener("pointerdown", function (e) {
    var h = e.target.closest("[data-drag]"); if (!h || e.button > 0) return;
    var src = h.closest("[data-id]"); if (!src) return;
    DR = { id: src.dataset.id, src: src, x0: e.clientX, y0: e.clientY, started: false, lp: h.dataset.drag === "lp", t0: Date.now(), hot: null };
    if (DR.lp) DR.timer = setTimeout(function () { if (DR && !DR.started) startDrag(DR.x0, DR.y0); }, 280);
  });
  function startDrag(x, y) {
    var t = S.tasks[DR.id]; if (!t) { DR = null; return; }
    DR.started = true; DR.src.classList.add("dragging");
    var g = document.createElement("div"); g.className = "ghost"; g.textContent = cat(t.cat).icon + " " + t.title; document.body.appendChild(g); DR.ghost = g;
    moveGhost(x, y); if (navigator.vibrate) navigator.vibrate(10);
  }
  function moveGhost(x, y) {
    DR.ghost.style.left = (x - 30) + "px"; DR.ghost.style.top = (y - 24) + "px";
    var tg = dropTargetAt(x, y);
    if (DR.hot && DR.hot !== tg) DR.hot.classList.remove("drop-hot");
    if (tg && tg !== DR.src) tg.classList.add("drop-hot");
    DR.hot = tg;
    if (y < 70) window.scrollBy(0, -12); else if (y > window.innerHeight - 110) window.scrollBy(0, 12);
  }
  document.addEventListener("pointermove", function (e) {
    if (!DR) return;
    var dist = Math.abs(e.clientX - DR.x0) + Math.abs(e.clientY - DR.y0);
    if (!DR.started) {
      if (DR.lp) { if (dist > 10) { clearTimeout(DR.timer); DR = null; } return; }
      if (dist > 6) startDrag(e.clientX, e.clientY); else return;
    }
    e.preventDefault(); moveGhost(e.clientX, e.clientY);
  }, { passive: false });
  document.addEventListener("touchmove", function (e) { if (DR && DR.started) e.preventDefault(); }, { passive: false });
  function endDrag(e, cancel) {
    if (!DR) return;
    clearTimeout(DR.timer);
    var d = DR; DR = null;
    if (!d.started) return;
    d.ghost.remove(); d.src.classList.remove("dragging"); if (d.hot) d.hot.classList.remove("drop-hot");
    V.suppressClick = Date.now();
    if (cancel) return;
    var tg = dropTargetAt(e.clientX, e.clientY); if (!tg || tg === d.src) return;
    var t = S.tasks[d.id], kind = tg.dataset.drop;
    if (kind === "day") { var od = t.date; moveTask(d.id, tg.dataset.date, t.time); if (t.time && busy(t.date, t.id).some(function (iv) { var s = toMin(t.time); return s < iv[1] && s + (t.dur || 15) > iv[0]; })) { placeFlex(t, t.time); } toast("→ " + relDay(tg.dataset.date) + (t.time ? " " + t.time : ""), "Rückgängig", function () { t.date = od; save(); render(); }); }
    else if (kind === "inbox") { moveTask(d.id, null, null); toast("Im Eingang"); }
    else if (kind === "untimed") { moveTask(d.id, undefined, null); }
    else if (kind === "gap") { moveTask(d.id, V.date, tg.dataset.time); toast("Neu um " + tg.dataset.time); }
    else if (kind === "item") {
      var o = S.tasks[tg.dataset.id]; if (!o) return;
      if (o.kind === "fixed" || !o.time) { moveTask(d.id, o.date, o.time ? fromMin(toMin(o.time) + o.dur) : null); }
      else if (!t.time) { moveTask(d.id, o.date, o.time); o.time = fromMin(toMin(o.time) + (t.dur || 15)); o.touched = true; }
      else { var a = t.time; moveTask(d.id, o.date, o.time); o.time = a; o.touched = true; }
      toast("Verschoben");
    }
    save(); render();
  }
  document.addEventListener("pointerup", function (e) { endDrag(e, false); });
  document.addEventListener("pointercancel", function (e) { endDrag(e, true); });
  document.addEventListener("contextmenu", function (e) { if (e.target.closest("[data-drag]")) e.preventDefault(); });

  /* ---------- Ereignisse ---------- */
  document.addEventListener("click", function (e) {
    if (V.suppressClick && Date.now() - V.suppressClick < 400) { e.preventDefault(); e.stopPropagation(); return; }
    var tab = e.target.closest("[data-tab]");
    if (tab) { V.tab = tab.dataset.tab; if (V.tab === "today" && tab.classList.contains("on")) V.date = today(); render(); window.scrollTo(0, 0); return; }
    if (e.target.closest("#sheet")) return;
    var a = e.target.closest("[data-act]"); if (!a) return;
    var act = a.dataset.act, row = a.closest("[data-id]"), id = row && row.dataset.id;
    switch (act) {
      case "toggle": toggle(id); break;
      case "open": if (id) openTaskMenu(id); break;
      case "tomorrow": postpone(id, 1); break;
      case "timer": openTimer(S.tasks[id]); break;
      case "day": V.date = a.dataset.n === "0" ? today() : addYmd(V.date, +a.dataset.n); render(); break;
      case "week": V.weekOff = a.dataset.n === "0" ? 0 : V.weekOff + +a.dataset.n; render(); break;
      case "weekall": V.weekAll = a.dataset.v === "1"; render(); break;
      case "gotoday": V.date = a.dataset.date; V.tab = "today"; render(); window.scrollTo(0, 0); break;
      case "rev": V.revOff = Math.min(0, (V.revOff || 0) + +a.dataset.n); render(); break;
      case "tfilter": V.tfilter = a.dataset.v; render(); break;
      case "tcat": V.tcat = a.dataset.v; render(); break;
      case "goals": V.goals = a.dataset.v; render(); break;
      case "autoplan": { var r = autoPlan(V.date); render(); toast(r.placed ? r.placed + " Aufgaben in freie Lücken gelegt" + (r.left ? ", " + r.left + " passen nicht mehr" : "") : (r.left ? "Keine freie Lücke mehr frei" : "Alles hat schon eine Uhrzeit")); break; }
      case "addat": openTaskForm({ title: "", cat: "personal", prio: "medium", date: V.date, time: a.dataset.time, dur: Math.min(45, +a.dataset.max), sub: [] }, true); break;
      case "coach": coachDo(a.dataset.do); break;
      case "delfood": { var l = S.food[V.date] || []; l.splice(+a.dataset.i, 1); save(); render(); break; }
      case "surplus": S.profile.surplus = Math.max(0, (+S.profile.surplus || 0) + +a.dataset.v); save(); render(); toast("Neues Ziel: " + targets().kcal + " kcal"); break;
      case "shop": S.shop[a.dataset.v] = !S.shop[a.dataset.v]; save(); render(); break;
      case "shopreset": S.shop = {}; save(); render(); break;
      case "speak": speak(a.dataset.t, a.dataset.l); break;
      case "flash": openFlash(); break;
      case "langtimer": { var lt = tasksOn(today()).filter(function (x) { return x.lang === a.dataset.v && !x.done; })[0]; openTimer(lt || null, a.dataset.v); break; }
      case "delexam": if (confirm("Prüfung löschen? Offene Lernblöcke werden mit gelöscht.")) { var eid = a.dataset.id; S.exams = S.exams.filter(function (x) { return x.id !== eid; }); Object.keys(S.tasks).forEach(function (k) { if (S.tasks[k].exam === eid && !S.tasks[k].done) delete S.tasks[k]; }); save(); render(); } break;
      case "routines": openRoutines(); break;
      case "settings": openSettings(); break;
      case "notify": toggleNotify(); break;
      case "ics": exportIcs(); break;
      case "backup": download("fokusplan-backup-" + today() + ".json", JSON.stringify(S), "application/json"); break;
      case "import": importBackup(); break;
      case "reset": if (confirm("Wirklich alles löschen? Aufgaben, Routinen, Essen und Gewicht gehen verloren. Vorher ein Backup machen!")) { localStorage.removeItem(KEY); location.reload(); } break;
    }
  });
  function coachDo(x) {
    var p = (x || "").split(":");
    if (p[0] === "profile") openProfile();
    else if (p[0] === "checkin") openCheckin();
    else if (p[0] === "evening") openEvening();
    else if (p[0] === "food") openFood();
    else if (p[0] === "shake") { addFood(V.tab === "goals" ? V.date : today(), "Masse-Shake", 900, 50, 1); markMeal(today()); render(); toast("Masse-Shake eingetragen: +900 kcal, +50 g Protein"); }
    else if (p[0] === "replan") { var n = replanMissed(today()); render(); toast(n ? n + " Punkte neu eingeplant" : "Keine freie Lücke mehr, verschieb sie auf morgen"); }
    else if (p[0] === "timer") { if (S.tasks[p[1]]) openTimer(S.tasks[p[1]]); }
    else if (p[0] === "split") { if (S.tasks[p[1]]) openSplit(S.tasks[p[1]]); }
    else if (p[0] === "lang") { if (p[1] === "turkish") openFlash(); else if (S.settings.links.ewe) window.open(S.settings.links.ewe, "_blank"); else openTimer(null, "ewe"); }
    else if (p[0] === "weight") { V.tab = "goals"; V.goals = "nutrition"; render(); setTimeout(function () { var i = $("[data-form=weight] input"); if (i) i.focus(); }, 50); }
  }
  document.addEventListener("submit", function (e) {
    var f = e.target, k = f.dataset.form;
    if (!k || f.closest("#sheet")) return;
    e.preventDefault();
    if (k === "quick") {
      var v = f.q.value.trim(); if (!v) return;
      var p = parseQuick(v), t = newTask({ title: p.title || v, date: p.date || today(), time: p.time || null, dur: p.dur || 30, prio: p.prio || "medium", cat: p.cat || "personal" });
      ensureDay(t.date); save(); render(); toast("Hinzugefügt: " + relDay(t.date) + (t.time ? " " + t.time : ""));
    } else if (k === "weight") {
      var w = +String(f.w.value).replace(",", "."); if (!w || w < 30 || w > 250) return toast("Bitte Gewicht in kg eingeben");
      S.weight[today()] = w; S.profile.weight = w;
      var wt = tasksOn(today()).filter(function (x) { return !x.done && /gewicht|wiegen/i.test(x.title); })[0]; if (wt) { wt.done = true; wt.doneAt = Date.now(); S.xp += points(wt); }
      save(); render(); toast("Gewicht gespeichert: " + String(w).replace(".", ",") + " kg");
    } else if (k === "exam") {
      if (!f.date.value) return;
      var n = addExam(f.title.value.trim(), f.date.value, f.cat.value, f.plan.checked); render();
      toast(n ? "Prüfung + " + n + " Lernblöcke eingeplant" : "Prüfung gespeichert");
    }
  });
  $("#fab").addEventListener("click", function () { openTaskForm(null, true); });
  $("#lvl").addEventListener("click", function () {
    var L = level();
    openSheet('<h2>🏆 Level ' + L.lvl + '</h2><p>' + L.xp + " XP · noch " + (L.next - L.xp) + " XP bis Level " + (L.lvl + 1) + '</p><div class="bars">' + bar("Fortschritt", L.xp - L.prev, L.next - L.prev, "XP", "var(--accent)") + '</div>' +
      '<h3>So sammelst du XP</h3><ul><li>Aufgabe erledigt: 10 XP (wichtig: 15)</li><li>Mahlzeit abgehakt: 5 XP</li><li>Check-in morgens / abends: je 5 XP</li><li>Karteikarte: 1 bis 2 XP</li></ul>' +
      '<h3>Serien</h3>' + HABITS.map(function (h) { return '<div class="spread" style="padding:4px 0"><span>' + h.name + '</span><b>' + streak(h) + " 🔥</b></div>"; }).join(""));
  });

  /* ---------- Start ---------- */
  applyTheme();
  checkTrainingSig();
  if (!S.onboard && !Object.keys(S.tasks).length) {
    D.STARTER_TASKS.forEach(function (x) { newTask({ title: x.title, cat: x.cat, prio: x.prio, date: x.today ? today() : null, dur: x.dur, src: "manual" }); });
  }
  rollover();
  V.lastToday = today();
  render();
  if (!S.onboard) setTimeout(function () {
    openSheet('<h2>👋 Willkommen bei FokusPlan</h2><p>Ich habe deinen Tag schon vorbereitet:</p><ul>' +
      "<li>🎓 Uni und Praktikum als feste Termine</li><li>🏋️ Trainingseinheiten aus deiner Trainingsapp (5:45 und nachmittags)</li>" +
      "<li>🍗 6 Mahlzeiten für den Masseaufbau</li><li>🇹🇷 Türkisch 20 Min. und 🌍 Ewe 15 Min. in freien Lücken</li><li>🧬 Bio-Lernblöcke</li><li>😴 Schlafenszeit, damit du um 5:45 fit bist</li></ul>" +
      "<p>Alles lässt sich verschieben (⏭, ⠿ ziehen), bearbeiten oder löschen. Mit <b>+</b> fügst du eigene Aufgaben hinzu.</p>" +
      '<p class="sub">Für dein Kalorien- und Proteinziel brauche ich noch Gewicht und Alter.</p><button class="btn block" data-go>Profil ausfüllen</button><button class="btn sec block" style="margin-top:8px" data-skip>Später</button>', function (el) {
      $("[data-go]", el).onclick = function () { closeSheet(); setTimeout(openProfile, 280); };
      $("[data-skip]", el).onclick = function () { S.onboard = true; save(); closeSheet(); };
    });
  }, 400);
  setInterval(function () { if (!$("#sheet").classList.contains("show") && !DR) render(); notifyTick(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !$("#sheet").classList.contains("show")) { checkTrainingSig(); render(); } });
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
  window.FP = { S: S, parseQuick: parseQuick, render: render };
})();
