const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 8000;

function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "visa-ticket-server.exe");
  }
  return path.join(__dirname, "..", "..", "desktop_build", "visa-ticket-server.exe");
}

function getDataDir() {
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDbPath() {
  return path.join(getDataDir(), "visa_ticket_system.db");
}

function ensureEnvFile() {
  const dataDir = getDataDir();
  const envPath = path.join(dataDir, ".env");
  if (!fs.existsSync(envPath)) {
    const crypto = require("crypto");
    const secretKey = crypto.randomBytes(32).toString("hex");
    const dbPath = getDbPath();
    const envContent = [
      `DATABASE_URL=sqlite:///${dbPath.replace(/\\/g, "/")}`,
      `SECRET_KEY=${secretKey}`,
      "CORS_ORIGINS=http://localhost:8000,http://localhost:3000",
    ].join("\n");
    fs.writeFileSync(envPath, envContent, "utf-8");
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendExe = getBackendPath();

    if (!fs.existsSync(backendExe)) {
      reject(new Error(`Backend not found: ${backendExe}`));
      return;
    }

    ensureEnvFile();

    const dataDir = getDataDir();
    const dbPath = getDbPath();

    const env = {
      ...process.env,
      DATABASE_URL: `sqlite:///${dbPath.replace(/\\/g, "/")}`,
      USERDATA_DIR: dataDir,
    };

    const cwd = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "..", "backend");

    backendProcess = spawn(backendExe, [], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    let started = false;

    backendProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[Backend]", msg);
      if (!started && (msg.includes("Uvicorn running") || msg.includes("Application startup complete"))) {
        started = true;
        resolve();
      }
    });

    backendProcess.stderr.on("data", (data) => {
      console.log("[Backend]", data.toString());
    });

    backendProcess.on("error", (err) => {
      console.error("Backend error:", err);
      if (!started) reject(err);
    });

    backendProcess.on("exit", (code) => {
      console.log(`Backend exited with code ${code}`);
      backendProcess = null;
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 20000);
  });
}

function waitForBackend() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60;
    const check = () => {
      attempts++;
      const req = http.get(`http://localhost:${BACKEND_PORT}`, (res) => {
        resolve(true);
      });
      req.on("error", () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          resolve(false);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          resolve(false);
        }
      });
    };
    setTimeout(check, 1000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Visa Ticket System",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${BACKEND_PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopBackend() {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {}
    backendProcess = null;
  }
}

app.on("window-all-closed", () => {
  stopBackend();
  app.quit();
});

app.on("before-quit", () => {
  stopBackend();
});

app.whenReady().then(async () => {
  try {
    console.log("Starting Visa Ticket System...");
    console.log("Backend:", getBackendPath());
    console.log("Data:", getDataDir());
    console.log("Database:", getDbPath());

    await startBackend();
    console.log("Backend process started, waiting for readiness...");

    const ready = await waitForBackend();
    if (!ready) {
      dialog.showErrorBox(
        "Startup Error",
        "Backend server failed to start. Please reinstall the application."
      );
      app.quit();
      return;
    }

    console.log("Backend ready, opening window...");
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      "Startup Error",
      `Failed to start the application:\n\n${err.message}\n\nPlease reinstall the application.`
    );
    app.quit();
  }
});
