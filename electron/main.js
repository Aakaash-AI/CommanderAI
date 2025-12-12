const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0b0f1a'
  });

  // FULL absolute path to your built frontend
  const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');

  console.log("Loading frontend from:", indexPath);
  console.log("Exists:", fs.existsSync(indexPath));

  if (process.env.ELECTRON_DEV === 'true') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(indexPath).catch(err => {
      console.error("Error loading index.html:", err);
      win.loadURL('data:text/html,<h1>Failed to load UI</h1><p>' + err + '</p>');
    });
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
