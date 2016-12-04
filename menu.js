'use strict';
const os = require('os');
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const shell = electron.shell;
const appName = app.getName();

function sendAction(action) {
  const win = BrowserWindow.getAllWindows()[0];

  if (process.platform === 'darwin') {
    win.restore();
  }

  win.webContents.send(action);
}

let tpl = [
  {
    label: '&Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteandmatchstyle' },
      { role: 'selectall' },
      { role: 'delete' }
    ]
  },
  {
    label: '&View',
    submenu: [
      {
        label: '&Reload current tab',
        accelerator: 'CmdOrCtrl+R',
        click() {
          sendAction('reloadCurrentService');
        }
      },
      {
        label: '&Reload',
        accelerator: 'CmdOrCtrl+Shift+R',
        click(item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload();
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'zoomin'
      },
      {
        role: 'zoomout'
      },
      {
        role: 'resetzoom'
      }
    ]
  },
  {
    label: '&Window',
    role: 'window',
    submenu: [
      {
        label: '&Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: '&Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen'
      }
    ]
  }
];

if (process.platform === 'darwin') {
  tpl.unshift({
    label: appName,
    submenu: [
      {
        label: 'Services',
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: `Hide ${appName}`,
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  });
} else {
  tpl.unshift({
    label: '&File',
    submenu: [
      {
        role: 'quit'
      }
    ]
  });
}

var menu = electron.Menu.buildFromTemplate(tpl);
module.exports = menu;

