# 🗓️ FokusPlan – Persönlicher Organisations- & Tagesplaner

> Eine App, die meinen Alltag organisiert, mich am Ball hält und meine Ziele zusammenbringt: **Training, Bio-Lernen, Sprachen (Ewe & Türkisch) und Masseaufbau durch Ernährung**.

FokusPlan ist das Zentrum meines Ökosystems. Er läuft als Web-App (PWA) auf dem iPhone-Home-Bildschirm, offline, ohne Konto und ohne Server, genau wie die **Trainingsapp** und die **Ewe-Lernapp**.

## ✨ Was die App kann

### 📅 Heute
- **Fertiger Tagesplan** aus Routinen: Uni und Praktikum (feste Termine), Training (aus der Trainingsapp), 6 Mahlzeiten, Türkisch 20 Min., Ewe 15 Min., Bio-Lernblöcke, Abend-Check und Schlafenszeit
- **Freie Lücken** werden angezeigt („Frei bis 15:30 · 45 Min. – + hier planen“)
- **Flexible Blöcke** (Sprachen, Bio) legt die App automatisch in freie Lücken. **⚡ Auto-Planen** verteilt Aufgaben ohne Uhrzeit.
- **Coach**: was als Nächstes kommt, verpasste Blöcke neu einplanen, Kalorien-Rückstand, gefährdete Serien, oft verschobene Aufgaben, Prüfungs-Countdown
- **Morgen-Check-in** (Energie, Schlaf, Top 3) und **Abend-Check** (Rückblick, Offenes auf morgen)
- **Fokus-Timer** für jeden Block. Sprachminuten werden automatisch gezählt.

### ➕ Hinzufügen & Verschieben
- **+** öffnet die Schnelleingabe und versteht z. B. `morgen 18 Uhr Protokoll schreiben 45min ! #uni`
- **⏭** schiebt eine Aufgabe auf morgen. Im Menü gibt es Übermorgen, +1 Woche, +30 Min., die nächste Lücke, ohne Uhrzeit und den Eingang.
- **⠿ ziehen** in der Tagesansicht: auf eine Lücke (neue Uhrzeit), auf eine andere Aufgabe (Zeiten tauschen) oder nach „Ohne Uhrzeit“
- **Wochenansicht**: Aufgabe gedrückt halten und auf einen anderen Tag oder in den Eingang ziehen
- Unerledigte To-dos wandern automatisch in den nächsten Tag und bekommen den Zähler „↻ verschoben“.
- **In Schritte teilen** für Aufgaben, die immer wieder liegen bleiben
- Wiederholungen (täglich, Mo–Fr, wöchentlich) und alle **Routinen** sind unter *Mehr → Routinen* frei bearbeitbar oder pausierbar.

### 🍗 Masseaufbau
- Kalorienziel nach Mifflin-St Jeor × Aktivität + Überschuss (Standard +400 kcal), Protein 2 g/kg
- Essen per Schnellauswahl eintragen (Portionen ×½ bis ×3) oder als eigenen Eintrag
- Gewichtsverlauf mit 7-Tage-Schnitt. Steht das Gewicht 2 Wochen still, schlägt die App +150 kcal vor.
- Shake-Rezepte, Masse-Einkaufsliste, Tipp des Tages

### 🗣️ Sprachen
- **Türkisch**: Wort des Tages mit Aussprache, über 170 Karteikarten mit Wiederholungsintervallen (1, 3, 7, 16 … Tage), Grammatik-Tipps
- **Ewe**: Satz des Tages (aus der Ewe-Lernapp), Link zur Ewe-App, Fortschritt von dort
- Minuten pro Woche für beide Sprachen

### 🔥 Dranbleiben
- Serien für Training, Türkisch, Ewe, Bio, Proteinziel, Kalorienziel und pünktlich ins Bett, jeweils mit einer 4-Wochen-Übersicht
- XP und Level, **Wochenrückblick** mit konkreten Vorschlägen
- **Prüfungen** mit Countdown und automatischem Lernplan rückwärts (8 Blöcke)
- Erinnerungen 5 Minuten vor jedem Block, solange die App offen ist. Dazu gibt es den **Kalender-Export (.ics)** mit Alarm für die nächsten 7 Tage.

## 🔗 Verbindung mit Trainings- und Ewe-App

Laufen alle Apps über **GitHub Pages** unter derselben Adresse (`https://dgb10145.github.io/…`), teilen sie sich den Browser-Speicher. FokusPlan liest dann:
- aus der **Trainingsapp** die Einheiten pro Tag und welche Übungen abgehakt sind (z. B. „Trainingsapp 5/7“), dazu das Turnier-Datum
- aus der **Ewe-Lernapp** die Serie und die Karten von heute

Ohne Verbindung nutzt FokusPlan eine eingebaute Kopie des Trainingsplans. Die Adresse einer Bio-Lernapp lässt sich unter *Mehr → Einstellungen* eintragen.

## 📲 Auf das iPhone bringen

1. Repository → *Settings* → *Pages* → *Source: GitHub Actions*. Der Workflow `.github/workflows/pages.yml` veröffentlicht die App bei jedem Push.
2. `https://dgb10145.github.io/Organisationsapp/` in **Safari** öffnen.
3. **Teilen** → **Zum Home-Bildschirm**.

Lokal testen: `python3 -m http.server` im Projektordner, dann `http://localhost:8000`.

## 📁 Dateien

```
index.html            Oberfläche
css/app.css           Gestaltung (hell/dunkel)
js/data.js            Standard-Routinen, Lebensmittel, Türkisch-Wortschatz, Tipps
js/ewe-phrases.js     Ewe-Sätze aus der Ewe-Lernapp
js/app.js             Planer, Coach, Ernährung, Sprachen, Serien, Drag & Drop
sw.js                 Offline-Cache
manifest.webmanifest  PWA-Manifest
```

## 💾 Daten

Alles liegt im `localStorage` dieses Geräts (Schlüssel `fokusplan-v1`). Unter *Mehr* gibt es Backup und Import, um die Daten auf ein anderes Gerät zu übertragen.

> ⚠️ Die Ernährungswerte sind allgemeine Richtwerte und ersetzen keine ärztliche oder ernährungswissenschaftliche Beratung.

<p align="center"><b>Kleine Schritte jeden Tag &gt; große Pläne, die liegen bleiben.</b> 💪</p>
