# ECHELON // PRISM-DARKNET & AEGISTRAP Full Project Package

This archive contains the complete standalone Vite + React + Tailwind v4 project with both UI suites integrated:
1. **ECHELON // PRISM-DARKNET (`src/components/EchelonDarknetSuite.jsx`)**: Kinetic NSA-grade Tor, I2P, and ZeroNet darknet crawler & SIEM incident correlation engine.
2. **AEGISTRAP (`src/components/AegisTrapSuite.jsx`)**: Active Honeypot Fleet & Live TTY Session Replay dashboard.
3. **Unified Suite Switcher (`src/App.jsx`)**: Top bar allowing instant switching between both systems.
4. **Backend Docker Blueprint (`backend_blueprint/docker-compose.yml`)**: Ready-to-run Tor ControlPort (`:9051`) and `i2pd` SAMv3 (`:7656`) container definitions.

## Quick Start (Windows PowerShell / Linux Bash)

```bash
# 1. Extract the ZIP archive and enter the folder
cd echelon_aegistrap_full_project

# 2. Install dependencies
npm install

# 3. Start the Vite dev server
npm run dev
```

Then open **http://localhost:5173** in your browser.
