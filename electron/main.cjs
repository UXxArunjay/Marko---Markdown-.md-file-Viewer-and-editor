const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let pendingFile = null;

// Find markdown file path from process arguments
function findFileInArgs(argv) {
  if (!argv || !Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (!arg || typeof arg !== 'string') continue;
    if (arg.startsWith('--') || arg.startsWith('-')) continue;

    // Check if it's an existing file or has md/markdown extension
    try {
      if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
        return path.resolve(arg);
      }
    } catch {}
  }
  return null;
}

// Check if a file was passed on initial launch
const initialFilePath = findFileInArgs(process.argv.slice(app.isPackaged ? 1 : 2));
if (initialFilePath) {
  try {
    pendingFile = {
      filePath: initialFilePath,
      fileName: path.basename(initialFilePath),
      content: fs.readFileSync(initialFilePath, 'utf-8')
    };
  } catch (err) {
    console.error('Error reading initial file:', err);
  }
}

// Single instance lock to prevent multiple duplicate windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // When user double-clicks another .md file while app is already open
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const newFilePath = findFileInArgs(commandLine.slice(app.isPackaged ? 1 : 2));
      if (newFilePath) {
        try {
          const fileData = {
            filePath: newFilePath,
            fileName: path.basename(newFilePath),
            content: fs.readFileSync(newFilePath, 'utf-8')
          };
          mainWindow.webContents.send('open-file', fileData);
        } catch (err) {
          console.error('Error opening second-instance file:', err);
        }
      }
    }
  });

  app.whenReady().then(createWindow);
}

function createWindow() {
  const appIconPath = process.platform === 'win32'
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 700,
    minHeight: 520,
    title: 'Marko — Markdown Viewer & Editor',
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(distPath)) {
        mainWindow.loadFile(distPath);
      }
    });
  } else {
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // If an initial file was opened, also send via webContents in case renderer is ready
    if (pendingFile) {
      setTimeout(() => {
        if (mainWindow && pendingFile) {
          mainWindow.webContents.send('open-file', pendingFile);
        }
      }, 500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-initial-file', () => {
  const file = pendingFile;
  pendingFile = null;
  return file;
});

ipcMain.handle('save-file', async (_event, { filePath, content }) => {
  try {
    if (!filePath) return { success: false, error: 'No file path provided' };
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false, error: err.message };
  }
});

// macOS dock activation
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
