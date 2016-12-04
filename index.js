'use strict';

const {app, BrowserWindow, dialog, shell, Menu, ipcMain, session} = require('electron');
const Config = require('electron-config');
const appMenu = require('./menu');

const config = new Config({
  defaults: {
    always_on_top: false
    ,hide_menu_bar: false
    ,skip_taskbar: true
    ,auto_launch: false
    ,keep_in_taskbar_on_close: process.platform !== 'linux'
    ,start_minimized: false
    ,systemtray_indicator: false
    ,master_password: false
    ,disable_gpu: process.platform === 'linux'
    ,proxy: false
    ,proxyHost: ''
    ,proxyPort: ''

    ,x: undefined
    ,y: undefined
    ,width: 1000
    ,height: 800
    ,maximized: false
  }
});

let mainWindow;
let isQuitting = false;

function createWindow () {
  mainWindow = new BrowserWindow({
    title: 'MultiAcc'
    ,icon: __dirname + '/resources/Icon.ico'
    ,backgroundColor: '#FFF'
    ,x: config.get('x')
    ,y: config.get('y')
    ,width: config.get('width')
    ,height: config.get('height')
    ,alwaysOnTop: config.get('always_on_top')
    ,autoHideMenuBar: config.get('hide_menu_bar')
    ,skipTaskbar: !config.get('skip_taskbar')
    ,show: !config.get('start_minimized')
    ,webPreferences: {
      webSecurity: false
      ,nodeIntegration: true
      ,plugins: true
      ,partition: 'persist:MultiAWSConsole'
    }
  });

  if ( !config.get('start_minimized') && config.get('maximized') ) mainWindow.maximize();

  process.setMaxListeners(10000);

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  Menu.setApplicationMenu(appMenu);

  mainWindow.webContents.on('new-window', function(e, url, frameName, disposition, options) {
    if ( disposition !== 'foreground-tab' ) return;
    const protocol = require('url').parse(url).protocol;
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('will-navigate', function(event, url) {
    event.preventDefault();
  });

  mainWindow.on('maximize', function(e) { config.set('maximized', true); });
  mainWindow.on('unmaximize', function(e) { config.set('maximized', false); });
  mainWindow.on('resize', function(e) { if (!mainWindow.isMaximized()) config.set(mainWindow.getBounds()); });
  mainWindow.on('move', function(e) { if (!mainWindow.isMaximized()) config.set(mainWindow.getBounds()); });
  mainWindow.on('app-command', (e, cmd) => {
    if ( cmd === 'browser-backward' ) mainWindow.webContents.executeJavaScript('history.back();');
    if ( cmd === 'browser-forward' ) mainWindow.webContents.executeJavaScript('history.back();');
  });
  mainWindow.on('close', function(e) {
    if ( !isQuitting ) {
      e.preventDefault();

      switch (process.platform) {
        case 'darwin':
          app.hide();
          break;
        case 'linux':
          config.get('keep_in_taskbar_on_close') ? mainWindow.hide() : app.quit();
          break;
        case 'win32':
        default:
          config.get('keep_in_taskbar_on_close') ? mainWindow.minimize() : mainWindow.hide();
          break;
      }
    }
  });
  mainWindow.on('closed', function(e) {
    mainWindow = null;
  });
}

ipcMain.on('getConfig', function(event, arg) {
  event.returnValue = config.store;
});

ipcMain.on('setConfig', function(event, values) {
  config.set(values);

  mainWindow.setAutoHideMenuBar(values.hide_menu_bar);
  if ( !values.hide_menu_bar ) mainWindow.setMenuBarVisibility(true);
  mainWindow.setSkipTaskbar(!values.skip_taskbar);
  mainWindow.setAlwaysOnTop(values.always_on_top);
});

ipcMain.on('setServiceNotifications', function(event, partition, op) {
  session.fromPartition(partition).setPermissionRequestHandler(function(webContents, permission, callback) {
    if (permission === 'notifications') return callback(op);
    callback(true)
  });
});

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

if (shouldQuit) {
  app.quit();
  return;
}

var allowedURLCertificates = [];
ipcMain.on('allowCertificate', (event, url) => {
  allowedURLCertificates.push(require('url').parse(url).host);
});
app.on('certificate-error', function(event, webContents, url, error, certificate, callback) {
  if ( allowedURLCertificates.indexOf(require('url').parse(url).host) >= 0 ) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
    dialog.showMessageBox(mainWindow, {
      title: 'Certification Warning'
      ,message: 'Invalid certification.\n\n'+url
      ,buttons: ['OK']
      ,type: 'warning'
    }, function() {

    });
  }
});


const tmp = require('tmp');
const mime = require('mime');
var imageCache = {};
ipcMain.on('image:download', function(event, url, partition) {
  let file = imageCache[url];
  if (file) {
    if (file.complete) {
      shell.openItem(file.path);
    }

    return;
  }

  let tmpWindow = new BrowserWindow({
    show: false
    ,webPreferences: {
      partition: partition
    }
  });

  tmpWindow.webContents.session.once('will-download', (event, downloadItem) => {
    imageCache[url] = file = {
      path: tmp.tmpNameSync() + '.' + mime.extension(downloadItem.getMimeType())
      ,complete: false
    };

    downloadItem.setSavePath(file.path);
    downloadItem.once('done', () => {
      tmpWindow.destroy();
      tmpWindow = null;
      shell.openItem(file.path);
      file.complete = true;
    });
  });

  tmpWindow.webContents.downloadURL(url);
});

if ( config.get('proxy') ) app.commandLine.appendSwitch('proxy-server', config.get('proxyHost')+':'+config.get('proxyPort'));

// Disable GPU Acceleration for Linux
// to prevent White Page bug
// https://github.com/electron/electron/issues/6139
// https://github.com/saenzramiro/rambox/issues/181
if ( config.get('disable_gpu') ) app.disableHardwareAcceleration();

app.on('ready', function() {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null && mainMasterPasswordWindow === null ) {
    config.get('master_password') ? createMasterPasswordWindow() : createWindow();
  }

  if ( mainWindow !== null ) mainWindow.show();
});

app.on('before-quit', function () {
  isQuitting = true;
});

