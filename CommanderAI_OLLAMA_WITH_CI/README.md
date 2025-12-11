
# Commander AI — Ollama (llama3.2) - Ready-to-build Project

This project runs Commander AI locally using **Ollama** as the LLM backend (no external API key required).
It uses SSE for streaming tokens from the local Ollama process to the Electron React frontend.

## What you need
1. Install Ollama: https://ollama.com/download
2. Run Ollama daemon (normally `ollama run` or service). Ensure Ollama listens on default port (11434).
3. Pull the chosen model:
   ```
   ollama pull llama3.2
   ```

## Quick start (development)
1. Extract project
2. Install root dev deps:
   ```bash
   npm install
   ```
3. Install server and client deps (postinstall handles this) or run manually:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
4. Start Ollama and confirm `http://localhost:11434/` is reachable.
5. Run dev servers:
   ```bash
   npm run dev
   ```
   - Server: http://localhost:3000
   - Client: http://localhost:5173

6. To run Electron (production client build):
   ```bash
   npm run build-client
   npm start
   ```

## Build EXE
```bash
npm run build:win
```
This requires `electron-builder` and a proper Windows build environment.

## Notes
- The server proxies user messages to Ollama's local API and streams responses via SSE to the client.
- The app is preconfigured to use model `llama3.2`. Change in `server/config.js` if needed.
- Your uploaded logo is included at `client/src/assets/commander_logo.png`.



## Automatic GitHub Actions build (Windows EXE)

You can build the Windows EXE in GitHub Actions instead of building locally.

1. Push this repository to GitHub on the `main` branch.
2. Optionally add code-signing secrets if you have them:
   - `CSC_LINK` - a secure URL to your code signing certificate (if you want signed builds)
   - `CSC_KEY_PASSWORD` - password for the cert
3. Go to the Actions tab in GitHub and run the "Build CommanderAI Windows EXE" workflow (or trigger by pushing to `main`).
4. When the job completes, download the `commanderai-windows` artifact from the workflow run — it will contain the EXE/installer.

Note: Building in CI uses `electron-builder` and `windows-latest` runner. If you need a portable EXE option, change `package.json` build target in the repo before running.
