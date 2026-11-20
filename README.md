# ✈️ DOMINO SKY — AI Flight Disruption Cascade & Recovery Simulator

**Event:** PromptWars 2026 (Hack2Skill × The Cloud Club × Google for Developers)  
**Participant:** Yalagani Harsha Vardhan (`HARSHA-18811`)  
**Deployment Platform:** Vercel  
**Repository:** [https://github.com/HARSHA-18811/domino-sky.git](https://github.com/HARSHA-18811/domino-sky.git)

---

## 📌 Executive Summary & Problem Statement

> *"A 90-minute thunderstorm in Mumbai can cancel a flight from Bengaluru to Kolkata five hours later."*

Airline operations operate on tightly coupled aircraft rotations, turnaround windows, crew duty limitations, and multi-leg passenger connections. When an airport experiences a closure or ground stop, delays do not stay local—they propagate deterministically through aircraft rotations and break passenger connections across distant airports with completely clear skies.

**Domino Sky** is an enterprise-grade airline network disruption cascade and recovery simulator built with a deterministic propagation engine and an AI-powered operations dispatcher.

---

## 🏗️ Core Architecture & Official Dataset

Domino Sky strictly enforces the **official dataset as the single source of truth**:
- **16 Airports:** Delhi (DEL), Mumbai (BOM), Bengaluru (BLR), Hyderabad (HYD), Chennai (MAA), Kolkata (CCU), Ahmedabad (AMD), Kochi (COK), Goa (GOI), Pune (PNQ), Jaipur (JAI), Guwahati (GAU), Lucknow (LKO), Chandigarh (IXC), Bhubaneswar (BBI), Thiruvananthapuram (TRV).
- **70 Scheduled Flights:** Across 16 aircraft tail rotations (`VT-DS01` through `VT-DS16`).
- **21 Monitored Passenger Connections:** Multi-leg transfers with strict minimum connecting times.
- **16 Crew Rosters:** Subject to the regulatory 600-minute (10-hour) Flight Duty Period limit.
- **2 Strategic Spare Reserves:** `VT-DS17` based at BLR and `VT-DS18` based at DEL.

### 📐 Pure Deterministic Engine (`lib/simulation/engine.ts`)
*No LLMs are used for flight calculations.*
- **Closure Impact:** Identifies flights arriving or departing within the airport closure window.
- **Turnaround Buffer Rule:** Subsequent rotation legs require `min_turnaround_minutes` (default 30m or specified flight buffer).
- **Connection Rule:** Connection is missed if `actual_arrival(from_flight) + min_connect_minutes > actual_departure(to_flight)`.
- **Crew Rule:** Duty runs from `duty_start` to scheduled/actual arrival of the last leg; flags warnings at >90% and critical violations at >600 minutes.

---

## 🚀 Key Modules Built

1. **Executive Operations Dashboard (`/`)**
   - Live KPI cards: Total Flights (70), On-Time, Delayed, Cancelled, Affected Pax, Stranded Pax, Available Fleet, Crew Violations.
   - SVG circular network health gauge.
   - Live operational event stream.

2. **Interactive Flight Network Map (`/network`)**
   - High-contrast visual radar map of Indian airspace.
   - 16 airport nodes with pulsing rings for disrupted hubs.
   - Quadratic Bézier flight paths color-coded by delay severity (Green: On-time, Yellow: Minor, Orange: Significant, Red: Critical/Cancelled).
   - Interactive airport inspection drawer.

3. **Disruption Simulation Studio (`/simulator`)**
   - Quick-trigger benchmark presets:
     - **Mumbai 90m Thunderstorm at 14:00 (Official Hackathon Scenario)**
     - Delhi 120m Winter Fog & Runway Closure at 08:00
     - Bengaluru 60m Radar Outage at 11:00
     - Hyderabad 75m Heavy Rainfall at 12:00
   - Custom airport, duration (30–300m), and start time controls.

4. **Flight Operations Schedule (`/flights`)**
   - Comprehensive ledger of all 70 flights.
   - Real-time search by flight number, city pair, or tail ID.
   - Drill-down modal displaying upstream predecessor flight, block time, passengers, and root cause.

5. **Passenger Impact Analysis (`/passengers`)**
   - Monitored transfer ledger for all 21 connecting pairs.
   - Categorized by Safe, At-Risk (<30m buffer), and Missed (Stranded).
   - Hub distribution breakdown of stranded travelers.

6. **Fleet Roster & Reserve Management (`/aircraft`)**
   - Real-time state of all 16 operating aircraft + 2 reserve spares.
   - Multi-leg rotation chains with delay accumulation.
   - Standby readiness tracking for `VT-DS17` (BLR) and `VT-DS18` (DEL).

7. **Crew Duty Monitoring (`/crew`)**
   - DGCA regulatory compliance tracking for 16 crew rosters.
   - Visual duty bar indicators showing percentage utilization against 600m ceiling.
   - Automated flag for replacement crew dispatch when duty limits are breached.

8. **AI Operations Dispatcher & Recovery Engine (`/dispatcher`)**
   - Generates priority recovery recommendations:
     - **Deploy Spare Aircraft** (e.g., dispatch `VT-DS17` at BLR or `VT-DS18` at DEL).
     - **Strategic Flight Cancellation** (to protect downstream evening rotations).
     - **Gate-Hold Connection Protection** (to save high-value passenger transfers).
   - **Before vs After Audit:** Side-by-side comparison of delayed flights, delay minutes saved, and passengers protected.
   - **Interactive AI Operations Assistant:** Conversational query engine that inspects simulation state to answer operational queries.

9. **What-If Scenario Laboratory (`/scenarios`)**
   - Run, compare, and contrast multiple disruption scenarios simultaneously.
   - Preserves original dataset immutability across all experiments.

10. **Analytics & Data Export (`/analytics`)**
    - Hub delay accumulation vulnerability profiles.
    - Export complete simulation results as **JSON** or **CSV**.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router) with Turbopack
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Modern Dark Aviation Control Room Design System)
- **Icons & Graphics:** Custom SVG Indian Airspace Radar & Lucide
- **Deterministic Math:** Pure TypeScript Engine (`engine.ts`)
- **Deployment:** Vercel Ready (Zero-config Next.js serverless output)

---

## 🏃 Local Setup & Running

```bash
# Clone the repository
git clone https://github.com/HARSHA-18811/domino-sky.git
cd domino-sky

# Install dependencies
npm install

# Run the development server
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 🚢 Deploy to Vercel

1. Push your repository to GitHub under `HARSHA-18811/domino-sky`.
2. Connect your GitHub repository to [Vercel](https://vercel.com).
3. Framework preset: **Next.js** (all defaults work automatically).
4. *(Optional)* Add `GEMINI_API_KEY` in Environment Variables for enhanced LLM dispatcher summaries.
5. Deploy!

---

*Built with passion for PromptWars 2026.*
