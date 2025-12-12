const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0b0f1a',
  });

  if (process.env.ELECTRON_DEV === 'true') {
    win.loadURL('http://localhost:5173');
  } else {
    // Load the built client correctly
    win.loadFile(path.join(process.resourcesPath, 'app', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
