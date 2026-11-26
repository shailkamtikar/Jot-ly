# How to run Jotly on your computer

You only need this file and a terminal. No Claude needed.

## What you need installed (one time)

- **Node.js** (version 22 or newer). Check with: `node -v`
  Download from https://nodejs.org if the command is not found.
- **Git** (only if you are cloning the project onto a new machine).

## 1. Open a terminal in the project folder

Windows PowerShell:

```powershell
cd C:\Users\HP\projects\Jotly
```

## 2. Install the dependencies (first time only)

```powershell
npm ci
```

Wait until it finishes. You only repeat this if you delete the `node_modules` folder or pull new changes that add packages.

## 3. Start the server

```powershell
npm run dev
```

You will see a line like `Local: http://localhost:5273/`.

## 4. Open it in your browser

Go to **http://localhost:5273**

Use Chrome or Edge for the best results. The browser asks for microphone permission the first time you record a sticker: click **Allow**.

## 5. Stop the server

Click the terminal window and press **Ctrl + C**.

---

## Everyday commands

| What you want | Command |
|---|---|
| Start the app (development) | `npm run dev` |
| Check everything (lint, types, tests, build) | `npm run check` |
| Run the browser tests | `npm run e2e` |
| Build the production version | `npm run build` |
| Preview the production build | `npm run preview` (also on port 5273) |

## If something goes wrong

**"Port 5273 is already in use"**
Jotly is probably already running in another terminal, or another program is using that port. Close the other terminal (Ctrl + C), or find what is using the port:

```powershell
netstat -ano | findstr :5273
```

The number at the end of the line is the process ID. Stop it with `taskkill /PID <number> /F` only if you are sure it is a leftover Jotly server.

**"npm is not recognized"**
Node.js is not installed or the terminal was opened before installing it. Install Node.js, then open a new terminal.

**The page shows a different app**
Make sure the address is exactly `http://localhost:5273`. Other projects on this computer use other ports (for example 5173).

**Microphone does not work**
- Use `http://localhost:5273` (not a file opened directly from disk).
- Click the lock icon next to the address, set Microphone to Allow, then reload.
- Close other apps that may be using the microphone (Zoom, Teams, etc.).

**Blank page or strange errors after pulling new code**
Stop the server, then:

```powershell
npm ci
npm run dev
```

**My notes disappeared**
Notes are stored inside your browser (IndexedDB) on this computer only. They are lost if you clear site data or use a private window. Use **Backup** in the sidebar to download a `.zip` copy, and **Restore from file** to bring it back.

## Where things are

- `src/` – the app code
- `e2e/` – browser tests
- `docs/` – product notes, the build playbook, performance notes
- `README.md` – short overview of the project

## Getting the code from GitHub on a new computer

```powershell
git clone https://github.com/shailkamtikar/Jot-ly.git
cd Jot-ly
npm ci
npm run dev
```

Then open http://localhost:5273.
