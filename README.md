# Organisationsapp
Umfangreiche organisationsapp aufgenommen Alltag ausgelegt und produktiv 
# 🗓️ FokusPlan – Persönlicher Organisations- & Tagesplaner

> Eine App, die meinen Alltag organisiert, mich am Ball hält und meine Ziele zusammenbringt: **Training, Bio-Lernen, Sprachen (Ewe & Türkisch) und Masseaufbau durch Ernährung**.

FokusPlan ist das Zentrum meines Ökosystems. Die bereits bestehende **Trainings-App** und die **Bio-Lern-App** werden eingebunden, damit alles an einem Ort geplant, erledigt und ausgewertet wird.

---

## 📑 Inhalt

- [Ziele](#-ziele)
- [Features](#-features)
- [Module im Detail](#-module-im-detail)
- [Beispiel-Tagesplan](#-beispiel-tagesplan)
- [Tech-Stack](#-tech-stack)
- [Installation](#-installation)
- [Projektstruktur](#-projektstruktur)
- [Datenmodell](#-datenmodell)
- [Roadmap](#-roadmap)
- [Mitwirken](#-mitwirken)
- [Lizenz](#-lizenz)

---

## 🎯 Ziele

| Bereich | Ziel | Wie FokusPlan hilft |
|---|---|---|
| 🏋️ Training | Regelmäßig trainieren, Kraft steigern | Trainingseinheiten aus der Trainings-App werden automatisch eingeplant |
| 🧬 Biologie | Stoff kontinuierlich lernen statt kurz vor der Prüfung | Lernblöcke + Wiederholungen aus der Bio-Lern-App im Kalender |
| 🇹🇷 Türkisch | Täglich kleine Fortschritte | 15–20 Min. Sprachblock, Vokabel-Streak |
| 🌍 Ewe | Grundlagen aufbauen | 10–15 Min. Sprachblock, Phrasen des Tages |
| 🍗 Masseaufbau | Breiter werden durch Ernährung | Kalorien- & Proteinziel, Mahlzeitenplan, Gewichtsverlauf |
| ✅ Organisation | Nichts vergessen, dranbleiben | To-dos, Wochenplanung, Erinnerungen, Streaks |

> ✏️ **Eigene Ziele eintragen:** Die Tabelle oben ist eine Vorlage – passe Werte (z. B. Zielgewicht, Prüfungstermine) unter `config/goals.json` an.

---

## ✨ Features

### Kern
- 📋 **To-do-Liste** mit Prioritäten (Hoch / Mittel / Niedrig), Kategorien, Fälligkeitsdatum und Unteraufgaben
- ➕ **Eigene Aufgaben hinzufügen** – jederzeit, schnell per Schnelleingabe („Morgen 18 Uhr Türkisch“)
- 🔀 **Verschieben per Drag & Drop** – zwischen Tagen, Zeitblöcken und Listen
- ⏭️ **„Auf morgen verschieben“** mit einem Tipp; unerledigte Aufgaben wandern automatisch in den nächsten Tag
- 🗓️ **Tages-, Wochen- und Monatsansicht**
- ⏰ **Time-Blocking** – Aufgaben direkt in Zeitfenster ziehen
- 🔔 **Erinnerungen & Push-Benachrichtigungen**

### Dranbleiben
- 🔥 **Streaks** für Gewohnheiten (Training, Sprachen, Proteinziel, Lernen)
- 📊 **Wochenrückblick** – was lief gut, was wurde verschoben, wo hängt es
- 🧠 **Smarte Vorschläge** – erkennt Aufgaben, die oft verschoben werden, und schlägt kleinere Schritte vor
- 🏆 **Level & Erfolge** als Motivation
- 🌅 **Morgen-Check-in / Abend-Reflexion** (1 Minute)

### Integrationen
- 🏋️ **Trainings-App** – Trainingstage & absolvierte Workouts werden synchronisiert
- 🧬 **Bio-Lern-App** – Lernkapitel und fällige Wiederholungen erscheinen als Aufgaben
- 📅 Optional: Export ins Handy-Kalender (iCal)

---

## 🧩 Module im Detail

### 1. Tagesplaner
- Zeitleiste von Aufstehen bis Schlafen
- Feste Blöcke (Schule/Uni/Arbeit, Schlaf) + flexible Blöcke
- Freie Zeitfenster werden markiert, damit Sprachen und Lernen reinpassen

### 2. Sprachen: Türkisch & Ewe 🇹🇷 🌍
- **Täglicher Mini-Block** (Standard: Türkisch 20 Min., Ewe 15 Min.) – kurz genug, um ihn nie auszulassen
- **Vokabeltrainer** mit Spaced Repetition (Karteikarten)
- **Phrase des Tages** auf dem Startbildschirm
- **Fortschritts-Tracker**: gelernte Wörter, Minuten pro Woche, Streak
- Tipp: Sprachen an bestehende Gewohnheiten koppeln (z. B. Vokabeln beim Frühstück, Audio beim Pendeln)

### 3. Ernährung & Masseaufbau 🍗
- **Kalorienrechner**: Grundumsatz + Aktivität + Überschuss (Standard: **+300–500 kcal/Tag**)
- **Proteinziel**: Standard **1,6–2,2 g pro kg Körpergewicht**
- **Mahlzeitenplan**: 4–5 Mahlzeiten am Tag als Aufgaben im Tagesplan
- **Einfache Kalorienbomben-Liste** (Haferflocken, Nüsse, Erdnussbutter, Vollmilch, Reis, Eier, Hähnchen, Olivenöl)
- **Shake-Rezepte** für schnelle Extra-Kalorien
- **Gewichtsverlauf**: wöchentliches Wiegen, Diagramm; Ziel ca. **0,25–0,5 kg Zunahme pro Woche**
- Hinweis, wenn das Gewicht 2 Wochen stagniert → Kalorien leicht erhöhen

> ⚠️ Die Ernährungswerte sind allgemeine Richtwerte und ersetzen keine ärztliche oder ernährungswissenschaftliche Beratung.

### 4. Training (Anbindung) 🏋️
- Trainingsplan aus der Trainings-App wird in den Kalender übernommen
- Ernährung passt sich an Trainingstage an (z. B. mehr Kohlenhydrate)

### 5. Lernen (Anbindung) 🧬
- Fällige Bio-Wiederholungen erscheinen automatisch als To-dos
- Prüfungstermine mit Countdown und Rückwärtsplanung

---

## 🕒 Beispiel-Tagesplan

| Uhrzeit | Block | Kategorie |
|---|---|---|
| 07:00 | Aufstehen, Frühstück (≈ 700 kcal, 35 g Protein) | 🍗 Ernährung |
| 07:20 | Türkisch-Vokabeln (10 Min.) | 🇹🇷 Sprache |
| 08:00–14:00 | Schule / Uni / Arbeit | 📚 Fix |
| 10:00 | Snack: Nüsse + Banane | 🍗 Ernährung |
| 14:30 | Mittagessen | 🍗 Ernährung |
| 15:30 | Bio lernen (45 Min.) | 🧬 Lernen |
| 16:30 | Ewe (15 Min.) | 🌍 Sprache |
| 17:30 | Training | 🏋️ Training |
| 19:00 | Abendessen + Shake | 🍗 Ernährung |
| 20:00 | Türkisch (10 Min. Hören/Sprechen) | 🇹🇷 Sprache |
| 21:30 | Abend-Reflexion & Plan für morgen | ✅ Organisation |
| 22:30 | Schlafen (Schlaf = Wachstum!) | 😴 Erholung |

Alle Blöcke sind frei **verschieb-, lösch- und ergänzbar**.

---

## 🛠️ Tech-Stack

| Ebene | Technologie |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Styling | Tailwind CSS |
| Drag & Drop | dnd-kit |
| State | Zustand |
| Speicher | IndexedDB (offline-first) via Dexie.js |
| Sync (optional) | Supabase |
| Mobile | PWA (installierbar auf dem Handy) |
| Diagramme | Recharts |
| Tests | Vitest + Testing Library |

---

## 🚀 Installation

```bash
# Repository klonen
git clone https://github.com/<dein-username>/fokusplan.git
cd fokusplan

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build
npm run build
```

Die App läuft dann unter `http://localhost:5173`.
Auf dem Handy: Seite im Browser öffnen → **„Zum Startbildschirm hinzufügen“**.

### Konfiguration

`config/goals.json` anpassen:

```json
{
  "bodyweightKg": 70,
  "calorieSurplus": 400,
  "proteinPerKg": 2.0,
  "languages": {
    "turkish": { "dailyMinutes": 20 },
    "ewe": { "dailyMinutes": 15 }
  },
  "integrations": {
    "trainingApp": true,
    "bioApp": true
  }
}
```

---

## 📁 Projektstruktur

```
fokusplan/
├── config/
│   └── goals.json
├── public/
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── DayTimeline.tsx
│   │   ├── TaskCard.tsx
│   │   ├── QuickAdd.tsx
│   │   └── StreakBadge.tsx
│   ├── modules/
│   │   ├── planner/
│   │   ├── todos/
│   │   ├── languages/      # Türkisch & Ewe
│   │   ├── nutrition/      # Kalorien, Protein, Gewicht
│   │   ├── training/       # Anbindung Trainings-App
│   │   └── biology/        # Anbindung Bio-Lern-App
│   ├── store/
│   ├── db/
│   ├── utils/
│   └── App.tsx
├── tests/
├── package.json
└── README.md
```

---

## 🗃️ Datenmodell

```ts
type Category =
  | "training" | "biology" | "turkish" | "ewe"
  | "nutrition" | "organisation" | "personal";

interface Task {
  id: string;
  title: string;
  category: Category;
  priority: "high" | "medium" | "low";
  date: string;           // ISO-Datum
  startTime?: string;     // "17:30"
  durationMin?: number;
  done: boolean;
  postponedCount: number; // wie oft verschoben
  subtasks?: Task[];
  source?: "manual" | "training-app" | "bio-app";
}

interface Habit {
  id: string;
  name: string;
  category: Category;
  streak: number;
  history: Record<string, boolean>; // Datum -> erledigt
}

interface NutritionLog {
  date: string;
  calories: number;
  proteinG: number;
  weightKg?: number;
}
```

---

## 🗺️ Roadmap

- [x] Konzept & README
- [ ] To-do-Liste mit Hinzufügen / Bearbeiten / Löschen
- [ ] Tagesansicht mit Drag & Drop
- [ ] Wochenansicht
- [ ] Streaks & Gewohnheiten
- [ ] Sprachmodul (Türkisch & Ewe) mit Karteikarten
- [ ] Ernährungsmodul mit Kalorien-/Proteinrechner
- [ ] Gewichtsverlauf-Diagramm
- [ ] Anbindung Trainings-App
- [ ] Anbindung Bio-Lern-App
- [ ] Push-Erinnerungen
- [ ] Wochenrückblick
- [ ] Cloud-Sync zwischen Geräten
- [ ] Dark Mode

---

## 🤝 Mitwirken

1. Fork erstellen
2. Feature-Branch anlegen: `git checkout -b feature/mein-feature`
3. Änderungen committen: `git commit -m "Neues Feature"`
4. Pushen: `git push origin feature/mein-feature`
5. Pull Request öffnen

---

## 📄 Lizenz

MIT – siehe [LICENSE](LICENSE).

---

<p align="center"><b>Kleine Schritte jeden Tag &gt; große Pläne, die liegen bleiben.</b> 💪</p>
