const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  const startUrl = 'http://localhost:3000';
  win.loadURL(startUrl);
}

app.whenReady().then(createWindow);
