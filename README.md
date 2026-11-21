# HUMAN.EXE — The Future Was Never Written

An interactive 2075 digital archaeology museum built with **React 19**, **TypeScript**, **Three.js**, **GSAP ScrollTrigger**, **Tailwind CSS**, and a server-side **Gemini Archivist AI** endpoint.

Created by **Vanshika & Siddhika**.

---

## Core Features

- **6-Scene Cinematic Opening Sequence**: Scroll-choreographed metallic core opening culminating in `THE QUESTION` freeze frame and archive descent.
- **Five Interactive 3D Historical Chapters**:
  - **CH 01 · The First Spark** (Prehistory / Fire, Stone Tool, Carved Limestone & Herd Shelter)
  - **CH 02 · Engines of Change** (Industrial Revolution / Steam Engine, Interactive Gear Train, Regulatory Clock & Blueprints)
  - **CH 03 · The Silent Code** (Computing Vault / Animated CRT Terminal, Mainframe Racks, PCB & Processor)
  - **CH 04 · The Connected World** (Interactive 3D Earth Globe, ARPANET / CERN / Subsea Nodes, Cloud & Identity Vaults)
  - **CH 05 · The Age of Machines** (2075 Neural Observatory, Creative Engine, Human Memory Core)
- **48 Timelines & 5 Convergent 2075 Endings**: Transparent decision lineage (`Selected` vs `Pending` chapters), Humanity Index (Innovation, Connection, Human Agency + archival exploration bonuses), interactive 48-path simulator, print-ready & downloadable Dossier.
- **Lost Memories, Corrupted Files & Secret Archives**: Hidden 3D discoveries, multi-fragment file reconstruction lab, cross-era clues in the Archivist's Journal, and `localStorage`-persisted state with schema validation.
- **Spatial Web Audio Engine**: Procedural ambient synths, mechanical SFX, and optional Web Speech narration with 4-channel mixer and zero forced autoplay on page reload.
- **2075 Archivist AI Assistant**: Server-side Gemini endpoint (`POST /api/archivist`) grounded in your active decisions, discoveries, and Humanity Index, separating historical facts from 2075 speculative fiction.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Three.js, GSAP (`ScrollTrigger`), Lucide Icons
- **Backend / API**: Express (local full-stack dev + Node preview) & Vercel Serverless Function (`/api/archivist.ts`) powered by `@google/genai` (`gemini-4-hydrogen`)

---

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` if running locally and configure:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
```

> **Note:** `GEMINI_API_KEY` is read strictly on the server (`/api/archivist`). If omitted, the museum runs normally and the Archivist AI modal displays a clear configuration notice instead of fabricating replies.

### 3. Available Scripts

- `npm run dev` — Starts the Express + Vite full-stack server on `http://localhost:3000`
- `npm run build` — Builds the production client bundle into `dist/`
- `npm run lint` — Runs TypeScript type checking (`tsc --noEmit`)
- `npm test` — Executes automated tests covering all 48 paths, scoring math, `localStorage` sanitization, and API validation (`tests/archive.test.ts`)

---

## Vercel Deployment

1. Connect the repository to Vercel.
2. Add `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
3. `vercel.json` automatically routes non-API requests to `/index.html` while preserving serverless functions under `/api/*` (`/api/archivist.ts`).
4. Build Command: `npm run build` · Output Directory: `dist`.

---

© 2026 HUMAN.EXE. All rights reserved.
