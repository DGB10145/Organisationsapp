/*
 * FokusPlan – Standarddaten.
 * Alles hier ist nur der Ausgangswert. In der App lässt sich jede Routine,
 * jede Aufgabe und jedes Ziel ändern, verschieben oder löschen.
 */
window.FP_DATA = (function () {
  "use strict";

  /* Kategorien: Farbe, Symbol, Name */
  var CATS = {
    uni:       { label: "Uni",        icon: "🎓", color: "#5B6B8C" },
    biology:   { label: "Bio",        icon: "🧬", color: "#1E9E6A" },
    training:  { label: "Training",   icon: "🏋️", color: "#E0522D" },
    nutrition: { label: "Essen",      icon: "🍗", color: "#D9931C" },
    turkish:   { label: "Türkisch",   icon: "🇹🇷", color: "#D62839" },
    ewe:       { label: "Ewe",        icon: "🌍", color: "#2E8B57" },
    orga:      { label: "Orga",       icon: "✅", color: "#3D6FE0" },
    personal:  { label: "Privat",     icon: "🙂", color: "#8A4BC4" },
    rest:      { label: "Erholung",   icon: "😴", color: "#6E7A8A" }
  };

  /*
   * Routinen = wiederkehrende Blöcke. days: 0 = Montag … 6 = Sonntag.
   * time leer + flex: true  → FokusPlan sucht automatisch eine freie Lücke.
   * kind "fixed" = Termin (Uni, Praktikum), "task" = abhakbar.
   */
  var ROUTINES = [
    // Feste Termine (aus der Trainingsapp übernommen)
    { title: "Uni",               cat: "uni", kind: "fixed", days: [0], time: "08:00", end: "12:45" },
    { title: "Praktikum",         cat: "uni", kind: "fixed", days: [0], time: "16:30", end: "19:30" },
    { title: "Vorlesung",         cat: "uni", kind: "fixed", days: [1], time: "09:00", end: "09:45" },
    { title: "Mathe",             cat: "uni", kind: "fixed", days: [2], time: "08:00", end: "09:30" },
    { title: "Praktikum",         cat: "uni", kind: "fixed", days: [2], time: "13:15", end: "16:15" },
    { title: "Vorlesung",         cat: "uni", kind: "fixed", days: [3], time: "10:00", end: "11:30" },
    { title: "Mathe-Übung",       cat: "uni", kind: "fixed", days: [4], time: "12:00", end: "13:30", note: "Oder 13:45, je nach Gruppe" },

    // Aufstehen & Schlaf (Training um 5:45 → 8 h Schlaf heißt: um 21:45 im Bett)
    { title: "Aufstehen, Wasser + Banane", cat: "rest", kind: "task", days: [0,1,2,3,4], time: "05:20", dur: 10, note: "Kleiner Snack vor dem Frühtraining" },
    { title: "Aufstehen", cat: "rest", kind: "task", days: [5], time: "06:00", dur: 10 },
    { title: "Aufstehen", cat: "rest", kind: "task", days: [6], time: "06:45", dur: 10 },

    // Mahlzeiten – 5 bis 6 Mahlzeiten für den Masseaufbau
    { title: "Frühstück (groß)",        cat: "nutrition", kind: "task", days: [0,1,2,3,4], time: "06:40", dur: 20, meal: true, note: "z. B. 100 g Haferflocken, 400 ml Vollmilch, Banane, 2 EL Erdnussbutter ≈ 900 kcal" },
    { title: "Frühstück (groß)",        cat: "nutrition", kind: "task", days: [5], time: "07:40", dur: 20, meal: true },
    { title: "Frühstück (groß)",        cat: "nutrition", kind: "task", days: [6], time: "08:00", dur: 30, meal: true },
    { title: "Snack: Nüsse + Quark",    cat: "nutrition", kind: "task", days: [0,1,2,3,4,5,6], time: "10:00", dur: 10, meal: true },
    { title: "Mittagessen",             cat: "nutrition", kind: "task", days: [0,1,3,5,6], time: "13:00", dur: 30, meal: true },
    { title: "Mittagessen",             cat: "nutrition", kind: "task", days: [2], time: "12:30", dur: 30, meal: true, note: "Vor dem Praktikum" },
    { title: "Mittagessen",             cat: "nutrition", kind: "task", days: [4], time: "13:40", dur: 30, meal: true },
    { title: "Snack vor dem Training",  cat: "nutrition", kind: "task", days: [1,3,4], time: "14:45", dur: 10, meal: true, note: "Brot mit Käse oder Banane + Joghurt" },
    { title: "Snack vor dem Training",  cat: "nutrition", kind: "task", days: [5], time: "14:15", dur: 10, meal: true },
    { title: "Snack nach dem Praktikum",cat: "nutrition", kind: "task", days: [2], time: "16:20", dur: 15, meal: true, note: "Erst essen, dann Plyometrie" },
    { title: "Abendessen",              cat: "nutrition", kind: "task", days: [0], time: "19:45", dur: 30, meal: true },
    { title: "Abendessen",              cat: "nutrition", kind: "task", days: [1,2,3,4,5,6], time: "18:30", dur: 30, meal: true },
    { title: "Shake / Quark vor dem Schlafen", cat: "nutrition", kind: "task", days: [0,1,2,3,4,5,6], time: "21:00", dur: 10, meal: true, note: "500 ml Milch + 250 g Quark oder Masse-Shake" },

    // Sprachen – flexibel, FokusPlan sucht die Lücke
    { title: "Türkisch (20 Min.)", cat: "turkish", kind: "task", days: [0,1,2,3,4,5,6], flex: true, prefer: "13:30", dur: 20, lang: "turkish" },
    { title: "Ewe (15 Min.)",      cat: "ewe",     kind: "task", days: [0,1,2,3,4,5,6], flex: true, prefer: "20:00", dur: 15, lang: "ewe" },

    // Bio-Lernen
    { title: "Bio lernen (45 Min.)",       cat: "biology", kind: "task", days: [0,1,2,3,4], flex: true, prefer: "14:00", dur: 45 },
    { title: "Bio wiederholen (30 Min.)",  cat: "biology", kind: "task", days: [5], flex: true, prefer: "10:30", dur: 30 },

    // Organisation
    { title: "Abend-Check & Plan für morgen", cat: "orga", kind: "task", days: [0,1,2,3,4,5,6], time: "21:15", dur: 10, review: true },
    { title: "Wochenplanung + Wiegen",       cat: "orga", kind: "task", days: [6], time: "18:00", dur: 20, note: "Wochenrückblick ansehen, Gewicht eintragen, Einkauf planen" },
    { title: "Einkaufen (Masse-Einkauf)",    cat: "nutrition", kind: "task", days: [5], time: "11:30", dur: 45 },
    { title: "Meal Prep (Reis, Hähnchen, Eier)", cat: "nutrition", kind: "task", days: [6], time: "16:00", dur: 60 },
    { title: "Schlafen gehen", cat: "rest", kind: "task", sleep: true, days: [0,1,2,3,4,6], time: "21:45", dur: 5, note: "Schlaf = Wachstum. 8 Stunden vor dem Frühtraining." },
    { title: "Schlafen gehen", cat: "rest", kind: "task", sleep: true, days: [5], time: "22:30", dur: 5 }
  ];

  /* Trainingseinheiten, falls die Trainingsapp auf diesem Gerät noch nichts gespeichert hat */
  var TRAINING_FALLBACK = [
    [ { time: "05:45", end: "06:30", title: "Kraft Unterkörper A + Isometrik" } ],
    [ { time: "05:45", end: "06:30", title: "Sehnen-Isometrik + Hüftmobilität" }, { time: "15:30", end: "17:00", title: "Speed, Agility & Fußballtechnik" } ],
    [ { time: "05:45", end: "06:30", title: "Kraft Oberkörper + Rumpf" }, { time: "17:00", end: "18:15", title: "Plyometrie & Landungen" } ],
    [ { time: "05:45", end: "06:30", title: "Zone-2-Lauf + Mobility" }, { time: "15:30", end: "17:00", title: "Kraft Unterkörper B + Abbremsen" } ],
    [ { time: "05:45", end: "06:25", title: "Leises Handling + Iso-Aktivierung" }, { time: "16:30", end: "18:00", title: "Repeated Sprints, Spielformen & Wurf" } ],
    [ { time: "06:30", end: "07:30", title: "Ausdauer" }, { time: "15:00", end: "17:00", title: "Skill & Spiel" } ],
    [ { time: "07:00", end: "07:30", title: "Locker bleiben" } ]
  ];

  /* Start-To-dos – frei änderbar */
  var STARTER_TASKS = [
    { title: "Gewicht morgens nüchtern messen und eintragen", cat: "nutrition", prio: "high", today: true, dur: 5 },
    { title: "Prüfungstermine (Bio, Mathe) unter Ziele eintragen", cat: "orga", prio: "high", today: true, dur: 10 },
    { title: "Masse-Einkaufsliste durchgehen", cat: "nutrition", prio: "medium", today: true, dur: 10 },
    { title: "Türkisch: 10 Wörter aus „Grundlagen“ lernen", cat: "turkish", prio: "medium", dur: 15 },
    { title: "Verein für Spielpraxis suchen (Basketball / Fußball)", cat: "training", prio: "medium", dur: 30 },
    { title: "Trainings-, Ewe- und Planer-App auf GitHub Pages veröffentlichen", cat: "orga", prio: "low", dur: 20 },
    { title: "Turnier-Datum in der Trainingsapp eintragen", cat: "training", prio: "low", dur: 5 }
  ];

  /* Lebensmittel für Schnell-Eintrag: [Name, Portion, kcal, Protein g] */
  var FOODS = [
    ["Haferflocken", "100 g", 370, 13],
    ["Vollmilch", "500 ml", 320, 17],
    ["Erdnussbutter", "2 EL (30 g)", 180, 8],
    ["Banane", "1 Stück", 105, 1],
    ["Eier", "3 Stück", 230, 19],
    ["Reis (gekocht)", "250 g", 325, 7],
    ["Nudeln (roh)", "125 g", 450, 16],
    ["Kartoffeln", "400 g", 300, 8],
    ["Hähnchenbrust", "200 g", 330, 46],
    ["Rinderhack", "150 g", 375, 28],
    ["Lachs", "150 g", 310, 30],
    ["Thunfisch (Dose)", "130 g", 150, 33],
    ["Magerquark", "250 g", 170, 30],
    ["Skyr", "250 g", 160, 27],
    ["Griech. Joghurt 10 %", "200 g", 240, 8],
    ["Käse", "2 Scheiben (50 g)", 180, 12],
    ["Vollkornbrot", "2 Scheiben", 220, 8],
    ["Nüsse / Mandeln", "50 g", 310, 10],
    ["Olivenöl", "1 EL", 120, 0],
    ["Avocado", "1 Stück", 240, 3],
    ["Datteln", "50 g", 140, 1],
    ["Linsen (gekocht)", "200 g", 230, 18],
    ["Whey-Protein", "30 g", 120, 24],
    ["Masse-Shake", "1 Rezept", 900, 50],
    ["Döner", "1 Stück", 700, 35],
    ["Jollof-Reis mit Hähnchen", "1 Teller", 700, 35],
    ["Fufu + Light Soup mit Fleisch", "1 Teller", 750, 35],
    ["Pizza", "1 ganze", 850, 35]
  ];

  var SHAKES = [
    { name: "Masse-Shake (≈ 900 kcal, 50 g Protein)", items: "500 ml Vollmilch · 60 g Haferflocken · 1 Banane · 2 EL Erdnussbutter · 30 g Whey oder 150 g Quark" },
    { name: "Schoko-Nacht-Shake (≈ 600 kcal, 45 g)", items: "400 ml Vollmilch · 250 g Magerquark · 1 EL Kakao · 1 EL Honig · Handvoll Nüsse" },
    { name: "Frucht-Shake (≈ 650 kcal, 35 g)", items: "300 ml Milch · 200 g griech. Joghurt · Beeren (TK) · 50 g Haferflocken · 1 EL Honig" }
  ];

  var MASS_TIPS = [
    "Kalorien trinken ist leichter als essen: Ein Shake bringt 600 bis 900 kcal ohne Völlegefühl.",
    "Bei jeder Mahlzeit eine Eiweißquelle: Eier, Quark, Fleisch, Fisch, Linsen.",
    "Öl, Nüsse und Erdnussbutter sind die einfachsten Kalorien-Booster. 1 EL Öl im Reis = +120 kcal.",
    "Nicht hungrig? Lieber 6 kleinere Mahlzeiten als 3 große.",
    "Schlaf ist die halbe Miete: Muskeln wachsen nachts. Ziel 8 Stunden.",
    "Wiege dich 2 bis 3 Mal pro Woche morgens nüchtern. Der Wochenschnitt zählt, nicht der einzelne Tag.",
    "Ziel: 0,25 bis 0,5 kg pro Woche. Mehr ist meistens Fett, weniger heißt: mehr essen.",
    "Vor dem Frühtraining reicht eine Banane. Das große Frühstück kommt direkt danach.",
    "Meal Prep am Sonntag spart unter der Woche Zeit. Reis, Hähnchen und Eier halten 3 bis 4 Tage im Kühlschrank.",
    "An Kraft-Tagen etwas mehr Kohlenhydrate (Reis, Nudeln, Kartoffeln) rund ums Training."
  ];

  /* Türkisch-Grundwortschatz: [türkisch, deutsch, Thema] */
  var TURKISH = [
    ["Merhaba", "Hallo", "Grundlagen"], ["Selam", "Hi", "Grundlagen"], ["Günaydın", "Guten Morgen", "Grundlagen"],
    ["İyi akşamlar", "Guten Abend", "Grundlagen"], ["İyi geceler", "Gute Nacht", "Grundlagen"], ["Hoşça kal", "Tschüss (sagt der Gehende)", "Grundlagen"],
    ["Güle güle", "Tschüss (sagt der Bleibende)", "Grundlagen"], ["Teşekkür ederim", "Danke", "Grundlagen"], ["Sağ ol", "Danke (locker)", "Grundlagen"],
    ["Lütfen", "Bitte", "Grundlagen"], ["Evet", "Ja", "Grundlagen"], ["Hayır", "Nein", "Grundlagen"],
    ["Tamam", "Okay", "Grundlagen"], ["Özür dilerim", "Entschuldigung", "Grundlagen"], ["Pardon", "Verzeihung", "Grundlagen"],
    ["Nasılsın?", "Wie geht es dir?", "Kennenlernen"], ["İyiyim, sen?", "Mir geht's gut, und dir?", "Kennenlernen"], ["Adın ne?", "Wie heißt du?", "Kennenlernen"],
    ["Benim adım …", "Mein Name ist …", "Kennenlernen"], ["Nerelisin?", "Woher kommst du?", "Kennenlernen"], ["Almanyalıyım.", "Ich bin aus Deutschland.", "Kennenlernen"],
    ["Memnun oldum.", "Freut mich.", "Kennenlernen"], ["Kaç yaşındasın?", "Wie alt bist du?", "Kennenlernen"], ["Öğrenciyim.", "Ich bin Student/in.", "Kennenlernen"],
    ["Türkçe öğreniyorum.", "Ich lerne Türkisch.", "Kennenlernen"], ["Anlamıyorum.", "Ich verstehe nicht.", "Kennenlernen"], ["Yavaş konuşur musun?", "Kannst du langsam sprechen?", "Kennenlernen"],
    ["bir", "eins", "Zahlen"], ["iki", "zwei", "Zahlen"], ["üç", "drei", "Zahlen"], ["dört", "vier", "Zahlen"], ["beş", "fünf", "Zahlen"],
    ["altı", "sechs", "Zahlen"], ["yedi", "sieben", "Zahlen"], ["sekiz", "acht", "Zahlen"], ["dokuz", "neun", "Zahlen"], ["on", "zehn", "Zahlen"],
    ["yirmi", "zwanzig", "Zahlen"], ["elli", "fünfzig", "Zahlen"], ["yüz", "hundert", "Zahlen"], ["bin", "tausend", "Zahlen"],
    ["ben", "ich", "Pronomen"], ["sen", "du", "Pronomen"], ["o", "er / sie / es", "Pronomen"], ["biz", "wir", "Pronomen"], ["siz", "ihr / Sie", "Pronomen"], ["onlar", "sie (Plural)", "Pronomen"],
    ["anne", "Mutter", "Familie"], ["baba", "Vater", "Familie"], ["kardeş", "Geschwister", "Familie"], ["abla", "ältere Schwester", "Familie"], ["abi", "älterer Bruder", "Familie"],
    ["arkadaş", "Freund/in", "Familie"], ["aile", "Familie", "Familie"],
    ["su", "Wasser", "Essen"], ["ekmek", "Brot", "Essen"], ["et", "Fleisch", "Essen"], ["tavuk", "Hähnchen", "Essen"], ["yumurta", "Ei", "Essen"],
    ["süt", "Milch", "Essen"], ["peynir", "Käse", "Essen"], ["pilav", "Reis (gekocht)", "Essen"], ["çay", "Tee", "Essen"], ["kahve", "Kaffee", "Essen"],
    ["meyve", "Obst", "Essen"], ["sebze", "Gemüse", "Essen"], ["Afiyet olsun!", "Guten Appetit!", "Essen"], ["Açım.", "Ich habe Hunger.", "Essen"], ["Çok lezzetli!", "Sehr lecker!", "Essen"],
    ["Hesap, lütfen.", "Die Rechnung, bitte.", "Essen"],
    ["gitmek", "gehen", "Verben"], ["gelmek", "kommen", "Verben"], ["yemek", "essen", "Verben"], ["içmek", "trinken", "Verben"], ["uyumak", "schlafen", "Verben"],
    ["okumak", "lesen / studieren", "Verben"], ["yazmak", "schreiben", "Verben"], ["konuşmak", "sprechen", "Verben"], ["öğrenmek", "lernen", "Verben"], ["çalışmak", "arbeiten / lernen", "Verben"],
    ["koşmak", "rennen", "Verben"], ["oynamak", "spielen", "Verben"], ["istemek", "wollen", "Verben"], ["sevmek", "lieben / mögen", "Verben"], ["bilmek", "wissen", "Verben"],
    ["yapmak", "machen", "Verben"], ["görmek", "sehen", "Verben"], ["almak", "nehmen / kaufen", "Verben"],
    ["bugün", "heute", "Zeit"], ["yarın", "morgen", "Zeit"], ["dün", "gestern", "Zeit"], ["şimdi", "jetzt", "Zeit"], ["sonra", "später", "Zeit"],
    ["sabah", "Morgen", "Zeit"], ["akşam", "Abend", "Zeit"], ["hafta", "Woche", "Zeit"], ["gün", "Tag", "Zeit"], ["saat", "Uhr / Stunde", "Zeit"],
    ["Pazartesi", "Montag", "Zeit"], ["Salı", "Dienstag", "Zeit"], ["Çarşamba", "Mittwoch", "Zeit"], ["Perşembe", "Donnerstag", "Zeit"],
    ["Cuma", "Freitag", "Zeit"], ["Cumartesi", "Samstag", "Zeit"], ["Pazar", "Sonntag", "Zeit"],
    ["futbol", "Fußball", "Sport"], ["basketbol", "Basketball", "Sport"], ["antrenman", "Training", "Sport"], ["maç", "Spiel / Match", "Sport"],
    ["takım", "Mannschaft", "Sport"], ["top", "Ball", "Sport"], ["güçlü", "stark", "Sport"], ["hızlı", "schnell", "Sport"], ["yorgun", "müde", "Sport"],
    ["Hadi!", "Los! / Komm schon!", "Sport"], ["Gol!", "Tor!", "Sport"],
    ["büyük", "groß", "Adjektive"], ["küçük", "klein", "Adjektive"], ["iyi", "gut", "Adjektive"], ["kötü", "schlecht", "Adjektive"], ["güzel", "schön", "Adjektive"],
    ["yeni", "neu", "Adjektive"], ["eski", "alt (Dinge)", "Adjektive"], ["sıcak", "heiß / warm", "Adjektive"], ["soğuk", "kalt", "Adjektive"], ["kolay", "einfach", "Adjektive"], ["zor", "schwer", "Adjektive"],
    ["Ne?", "Was?", "Fragen"], ["Kim?", "Wer?", "Fragen"], ["Nerede?", "Wo?", "Fragen"], ["Ne zaman?", "Wann?", "Fragen"], ["Neden?", "Warum?", "Fragen"],
    ["Nasıl?", "Wie?", "Fragen"], ["Kaç?", "Wie viele?", "Fragen"], ["Ne kadar?", "Wie viel (kostet es)?", "Fragen"],
    ["ev", "Haus / Zuhause", "Alltag"], ["okul", "Schule", "Alltag"], ["üniversite", "Universität", "Alltag"], ["kitap", "Buch", "Alltag"], ["telefon", "Telefon", "Alltag"],
    ["araba", "Auto", "Alltag"], ["para", "Geld", "Alltag"], ["iş", "Arbeit", "Alltag"], ["market", "Supermarkt", "Alltag"], ["sokak", "Straße", "Alltag"],
    ["Var mı?", "Gibt es …?", "Alltag"], ["Yok.", "Gibt es nicht.", "Alltag"], ["İstiyorum.", "Ich möchte.", "Alltag"], ["Bilmiyorum.", "Ich weiß nicht.", "Alltag"]
  ];

  var TURKISH_TIPS = [
    "Vokalharmonie: Endungen passen sich dem letzten Vokal an – ev-ler (Häuser), okul-lar (Schulen).",
    "Türkisch ist agglutinierend: Endungen werden angehängt. ev = Haus, evim = mein Haus, evimde = in meinem Haus.",
    "Das Verb steht am Satzende: Ben futbol oynuyorum. = Ich spiele Fußball.",
    "ı (ohne Punkt) klingt wie ein kurzes, dumpfes „ü“ ohne gerundete Lippen. i (mit Punkt) ist ein normales i.",
    "ç = tsch, ş = sch, c = dsch, ğ verlängert den Vokal davor.",
    "Verlaufsform: Stamm + -iyor + Person. gel-iyor-um = ich komme gerade.",
    "Verneinung mit -me/-ma: gelmiyorum = ich komme nicht.",
    "Fragepartikel mi/mı/mu/mü steht getrennt: Geliyor musun? = Kommst du?",
    "Kurz und täglich schlägt lang und selten: 20 Minuten jeden Tag reichen.",
    "Koppel Türkisch an etwas Festes: Audio auf dem Weg zur Uni, Karteikarten nach dem Mittagessen."
  ];

  var QUOTES = [
    "Kleine Schritte jeden Tag > große Pläne, die liegen bleiben.",
    "Disziplin ist, das zu tun, was du dir vorgenommen hast, auch wenn die Lust weg ist.",
    "Du musst nicht motiviert sein. Du musst nur anfangen. Zwei Minuten reichen.",
    "Breiter wirst du in der Küche und im Bett, nicht nur im Gym.",
    "Erledigt ist besser als perfekt.",
    "Der Plan ist nicht heilig. Verschieben ist okay, löschen auch. Liegen lassen nicht.",
    "Jeder Haken heute ist ein Schritt Richtung März.",
    "Ein verpasster Tag ist ein Ausrutscher. Zwei sind der Anfang einer neuen Gewohnheit. Nie zweimal hintereinander auslassen.",
    "Konsistenz schlägt Intensität.",
    "Was du heute lernst, musst du in der Klausurphase nicht nachholen."
  ];

  return {
    CATS: CATS, ROUTINES: ROUTINES, TRAINING_FALLBACK: TRAINING_FALLBACK, STARTER_TASKS: STARTER_TASKS,
    FOODS: FOODS, SHAKES: SHAKES, MASS_TIPS: MASS_TIPS, TURKISH: TURKISH, TURKISH_TIPS: TURKISH_TIPS, QUOTES: QUOTES
  };
})();
