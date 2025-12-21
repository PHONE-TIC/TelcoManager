const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createMenu() {
    const template = [
        {
            label: 'Fichier',
            submenu: [
                { role: 'quit', label: 'Quitter' }
            ]
        },
        {
            label: 'Affichage',
            submenu: [
                { role: 'reload', accelerator: 'F5', label: 'Actualiser' },
                { role: 'forceReload', accelerator: 'Ctrl+F5', label: 'Forcer l\'actualisation' },
                { role: 'toggleDevTools', accelerator: 'F12', label: 'Outils de développement' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Réinitialiser le zoom' },
                { role: 'zoomIn', label: 'Zoom avant' },
                { role: 'zoomOut', label: 'Zoom arrière' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Plein écran' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    createMenu();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // En développement, charger depuis le serveur Vite
    // En production, charger depuis le build
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

    if (process.env.NODE_ENV !== 'production') {
        console.log('Mode développement - Chargement de:', startUrl);
        mainWindow.loadURL(startUrl);
        mainWindow.webContents.openDevTools();
    } else {
        console.log('Mode production - Chargement de:', path.join(__dirname, 'dist/index.html'));
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    // Log des erreurs de chargement
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Erreur de chargement:', errorCode, errorDescription);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
