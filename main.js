// Inspired by https://github.com/pbarbiero/basic-electron-react-boilerplate
// TODO: Look into https://github.com/electron-userland/electron-builder
'use strict';

// Import parts of electron to use
const { app, BrowserWindow, Menu, Tray, clipboard } = require('electron');

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  server.passArgs(commandLine)
})

if (shouldQuit) {
  app.quit()
  return
}

const path = require('path');
const url = require('url');
const process = require('process');
const MenuBuilder = require('./menu');
const getPort = require('get-port')

const AutoLaunch = require('auto-launch');

const autoLauncher = new AutoLaunch({
  name: 'Powder Web'
})

const server = require('./server')
const streams = require('./server/streams')
const acestream = require('./server/acestream')
const sop = require('./server/sopcast')

const btoa = require('./server/utils/btoa')

const events = require('./server/utils/events')

const qrCode = require('./server/utils/qrcode')

const opn = require('opn')

if (app && app.commandLine && app.commandLine.appendSwitch)
  app.commandLine.appendSwitch("ignore-certificate-errors")

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

if (app.dock)
  app.dock.hide()

// Keep a reference for dev mode
let dev = false;
if (process.env.NODE_ENV === 'development') {
  dev = true;
  require('dotenv').config({ silent: true });
}

function createServer() {

  let frontPort
  let backPort
  let maybePort = 11485

  var getPorts = function(cb) {

    var fail = function() {
      maybePort++
      getPorts(cb)
    }

    getPort({ port: maybePort }).then(function(newPort) {
      if (newPort == maybePort) {
        cb(newPort)
      } else 
        fail()
    }).catch(function(e) {
      fail()
    })
  }

  getPorts(function(newPort) {

    frontPort = newPort
    maybePort = newPort -1

    getPorts(function(newPort) {

      backPort = newPort

      server.init(frontPort, backPort)

      setTimeout(createWindow)

    })
  })
}

const quit = () => {

//  if (mainWindow)
//    mainWindow.destroy()

  if (mainWindow.isVisible())
    mainWindow.hide()

  tray.destroy()

  var ticks = 3

  const tick = () => {
    ticks--
    if (!ticks) {
      app.quit()
    }
  }

  sop.unhackSopPlayer(() => {
    sop.kill(tick, tick)
  })

  streams.closeAll(tick)

  acestream.binary.kill(tick, tick)

}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1268,
    height: 768,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      allowpopups: true,
      webSecurity: false,
      nativeWindowOpen: true,
    },
    resizable: true,
    title: 'Powder Web',
    center: true,
    frame: false
  });

  // Disable top menu bar on Windows/Linux
  mainWindow.setMenu(null);

  // and load the index.html of the app.
  let indexPath;

  mainWindow.on('close', (e) => {
    console.log('window-close')

//    if (process.platform == 'linux') {
//      quit()
//      return
//    }

    e.preventDefault()
    mainWindow.hide()
    if (app.dock)
      app.dock.hide()
  });

  server.setMainWindow(mainWindow)

  // Build app menu
  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let tray = false
app.on('ready', () => {
  // Allow electron to serve static files
  if (!dev) {
    require('electron').protocol.interceptFileProtocol('file', (request, callback) => {
      const url = request.url.substr(7)    /* all urls start with 'file://' */
      callback({ path: path.normalize(`${__dirname}/dist/${url}`)})
    }, (err) => {
      if (err) console.error('Failed to register protocol')
    })
  }

  // Create the Browser window
  if (dev) {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS
    } = require('electron-devtools-installer');
    installExtension(REACT_DEVELOPER_TOOLS)
      .then(() => installExtension(REDUX_DEVTOOLS))
      .then(() => createWindow());
  } else {
    createServer();
  }

if (process.platform == 'darwin' || process.platform == 'win32') {
  tray = new Tray(path.join(__dirname, 'packaging', 'osx_tray.png'))
} else {
  tray = new Tray(path.join(__dirname, 'packaging', 'icons', 'powder-square-border.png'))
}
  const showApp = () => {
    if (!mainWindow.isVisible()) {
      mainWindow.loadURL( 'http' + (server.isSSL ? 's': '') + '://127.0.0.1:' + server.port() + '/auth?token=' + server.masterKey );
      mainWindow.show()
      mainWindow.focus()
      if (app.dock && !app.dock.isVisible())
        app.dock.show()
      if (dev) {
        mainWindow.webContents.openDevTools()
      }
    } else {
      mainWindow.focus()
    }
  }
  const copyEmbedKey = () => {
    const servUrl = 'http' + (server.isSSL ? 's': '') + '://127.0.0.1:' + server.port() + '/'
    const embedKey = server.embedKey
    clipboard.writeText(embedKey + '-' + btoa(servUrl));
  }
  const copyLink = (qrType) => {

    qrCode(qrType, server.argsKey, server.port(), (resp) => {
      if (resp && resp.url)
        clipboard.writeText(resp.url);
    }, (err) => {

    })
  }
  const copyLanLink = () => { copyLink('local') }
  const copyInternetLink = () => { copyLink('internet') }
  const showBrowser = () => {
    opn('http' + (server.isSSL ? 's': '') + '://127.0.0.1:' + server.port() + '/auth?token=' + server.masterKey)
  }

  const toggleStartUp = () => {

     autoLauncher.isEnabled()
    .then(function(isEnabled){
      if(isEnabled){
        autoLauncher.disable()
      } else {
        autoLauncher.enable()
      }
    })
    .catch(function(err){ })

  }

  const relaunch = () => {
//    mainWindow.destroy()
//    streams.closeAll(() => {
      app.relaunch()
      quit()
//    })
  }

  events.on('appQuit', quit)
  events.on('appRelaunch', relaunch)
  events.on('appShow', showApp)
  events.on('appShowBrowser', showBrowser)

  const buildContextMenu = (startUp) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        type: 'normal',
        click: showApp
      },
      {
        label: 'Show in Browser',
        type: 'normal',
        click: showBrowser
      },
      { type: 'separator' },
      {
        label: 'Copy LAN Link',
        type: 'normal',
        click: copyLanLink
      },
      {
        label: 'Copy Internet Link',
        type: 'normal',
        click: copyInternetLink
      },
      { type: 'separator' },
      {
        label: 'Copy Embed Key',
        type: 'normal',
        click: copyEmbedKey
      },
      { type: 'separator' },
      {
        label: 'Run on Start-Up',
        type: 'checkbox',
        checked: startUp,
        click: toggleStartUp
      },
      { type: 'separator' },
      {
        label: 'Restart',
        type: 'normal',
        click: relaunch
      },
      {
        label: 'Quit',
        type: 'normal',
        click: quit
      }
    ])
    tray.setContextMenu(contextMenu)
  }

  tray.on('click', showApp)

  tray.setToolTip('Powder Web')

   autoLauncher.isEnabled()
  .then(function(isEnabled){
    buildContextMenu(isEnabled)
  }).catch(function(err){
    buildContextMenu(false)
  })
});

//Quit when all windows are closed.
// app.on('window-all-closed', () => {
//  // On macOS it is common for applications and their menu bar
//  // to stay active until the user quits explicitly with Cmd + Q
//  if (process.platform !== 'darwin') {
//    app.quit();
//  }
// });

app.on('window-all-closed', app.quit);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
    if (!mainWindow) return
    mainWindow.removeAllListeners('close');
    mainWindow.destroy();
});

