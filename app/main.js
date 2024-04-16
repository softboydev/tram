
// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron')
const path = require('path')
const fs = require('fs'); // Load the File System to execute our common tasks (CRUD)
const storage = require('electron-json-storage');
app.allowRendererProcessReuse = false
let mainWindow
let mapWindow
let terminalWindow
let DEV = false

function isNotEmptyObject(obj){
  return !(obj && Object.keys(obj).length === 0 && obj.constructor === Object)
}

ipcMain.on('requestUpdate', (event) => {
    requireUpdate()
})
ipcMain.on('requireUpdateAfterMapping', (event) => {
    requireUpdate()
})
ipcMain.on('requireUpdateAfterTerminal', (event) => {
    mainWindow.webContents.send("requireUpdate")
})
ipcMain.on('requireOpen', (event) => {
    openFile()
})

function requireUpdate(){
  mainWindow.webContents.send("requireUpdate")
  if(terminalWindow){
    terminalWindow.webContents.send("requireUpdate")
  }
}
function checkForEmptyStorage(){
  storage.get("config", function(error, data) {
    if(error){
      throw error
    }
    else if(!isNotEmptyObject(data)){
      resetStorage()
    }
  })
  function isNotEmptyObject(obj){
    return !(obj && Object.keys(obj).length === 0 && obj.constructor === Object)
  }
}
function resetStorage(){
  let data = ""
  storage.set("config", data, function(error) {
    if (error){
      throw error
    }
    else{
      storage.set("mapping", data, function(error) {
        if (error){
          throw error
        }
        else{
          requireUpdate()
        }
      })
    }
  })
}
function requireAction(sender){
  let action = "require" + sender.label.replace(/ /g, '')
  switch (action){
    case "requireOpenMappingWindow":
        createMappingWindow()
      break
    case "requireCloseMappingWindow":
        destroyMappingWindow()
      break
    case "requireOpenTerminalWindow":
        createTerminalWindow()
      break
    case "requireCloseTerminalWindow":
        destroyTerminalWindow()
      break
    default:
      mainWindow.webContents.send(action)
      if(terminalWindow){
        terminalWindow.webContents.send(action)
      }
      if(mapWindow){
        mapWindow.webContents.send(action)
      }
  }
}

function openFile(){
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  }).then(result => {
    if(!result.canceled && result.filePaths.length > 0){
      let filepath = result.filePaths[0]
      fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            alert("An error ocurred reading the file :" + err.message);
            return;
        }
        else{
          let parsed = JSON.parse(data)
          storage.set("mapping", JSON.stringify(parsed.mapping), function(error) {
            if (error){
              console.log("Error storing JSON to mapping " + error)
            }
            else{
              storage.set("config", JSON.stringify(parsed.config), function(error) {
                if (error){
                  console.log("Error storing JSON to config " + error)
                }
                else{
                  requireAction({label:"Update"})
                }
              })
            }
          })
        }
      })
    }
  })
}
function destroyMappingWindow(){
  if(mapWindow){
    mapWindow.close()
  }
}
function destroyTerminalWindow(){
  if(terminalWindow){
    terminalWindow.close()
  }
}
function createMappingWindow () {
  if(!mapWindow){
    mapWindow = new BrowserWindow({
      width: 400,
      height: 400,
      minWidth: 200,
      minHeight: 200,
      backgroundColor: '#000000',
      icon: path.join(__dirname, { darwin: 'icon.icns', linux: 'icon.png', win32: 'icon.ico' }[process.platform] || 'icon.ico'),
      // frame: process.platform !== 'darwin',
      // skipTaskbar: process.platform === 'darwin',
      // autoHideMenuBar: process.platform === 'darwin',
      webPreferences: {
        devTools: DEV,
        enableRemoteModule: true,
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    mapWindow.on('close', function() {
      mapWindow = null
    });
    mapWindow.on('unresponsive', () => {
      console.log('ERROR 61 - Map Window does not respond, let\'s quit')
      mapWindow = null
    })

    mapWindow.webContents.on('crashed', () => {
      console.log('ERROR 62 - Map Webcontent renderer crashed, let\'s quit')
      mapWindow = null
    })

    mapWindow.webContents.on('destroyed', () => {
      console.log('ERROR 63 - Map Webcontent destroyed, let\'s quit')
      mapWindow = null
    })
    mapWindow.loadFile('map.html')
  }

}
function createTerminalWindow () {
  if(!terminalWindow){
    terminalWindow = new BrowserWindow({
      width: 800,
      height: 400,
      minWidth: 200,
      minHeight: 200,
      backgroundColor: '#000000',
      icon: path.join(__dirname, { darwin: 'icon.icns', linux: 'icon.png', win32: 'icon.ico' }[process.platform] || 'icon.ico'),
      // frame: process.platform !== 'darwin',
      // skipTaskbar: process.platform === 'darwin',
      // autoHideMenuBar: process.platform === 'darwin',
      webPreferences: {
        devTools: DEV,
        enableRemoteModule: true,
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    terminalWindow.on('close', function() {
      terminalWindow = null
    });
    terminalWindow.on('unresponsive', () => {
      console.log('ERROR 61 - Terminal Window does not respond, let\'s quit')
      terminalWindow = null
    })

    terminalWindow.webContents.on('crashed', () => {
      console.log('ERROR 62 - Terminal Webcontent renderer crashed, let\'s quit')
      terminalWindow = null
    })

    terminalWindow.webContents.on('destroyed', () => {
      console.log('ERROR 63 - Terminal Webcontent destroyed, let\'s quit')
      terminalWindow = null
    })
    terminalWindow.loadFile('terminal.html')
  }

}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 200,
    minHeight: 200,
    backgroundColor: '#000000',
    icon: path.join(__dirname, { darwin: 'icon.icns', linux: 'icon.png', win32: 'icon.ico' }[process.platform] || 'icon.ico'),
    // frame: process.platform !== 'darwin',
    // skipTaskbar: process.platform === 'darwin',
    // autoHideMenuBar: process.platform === 'darwin',
    webPreferences: {
      devTools: DEV,
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  })
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'midi') {
      return callback(true)
    }
  })
  mainWindow.on('close', function() {
  });
  mainWindow.on('unresponsive', () => {
    console.log('ERROR 61 - Window does not respond, let\'s quit')
    app.quit()
  })

  mainWindow.webContents.on('crashed', () => {
    console.log('ERROR 62 - Webcontent renderer crashed, let\'s quit')
    app.quit()
  })

  mainWindow.webContents.on('destroyed', () => {
    console.log('ERROR 63 - Webcontent destroyed, let\'s quit')
    app.quit()
  })
  mainWindow.loadFile('index.html')
}
function createMenu(){

  const isMac = process.platform === 'darwin'

  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        {  click (s){requireAction(s);}, type: 'normal', label: 'Save',accelerator: 'CommandOrControl+S'},
        {  click (s){openFile();}, type: 'normal', label: 'Open',accelerator: 'CommandOrControl+O' },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' },
        // { role: 'toggleDevTools' },
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Zoom In',accelerator: 'CommandOrControl+Shift+NumAdd'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Zoom Out',accelerator: 'CommandOrControl+Shift+NumSub'},
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle UI',accelerator: 'CommandOrControl+Option+.'},
      ]
    },
    {label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]
    },
    {
      label: 'Transport',
      submenu: [
        {  click (s){requireAction(s);}, type: 'normal', label: 'Play Pause',accelerator: 'CommandOrControl+Shift+P'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Stop',accelerator: 'CommandOrControl+Shift+S'},
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Tempo Up',accelerator: 'CommandOrControl+Numadd'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Tempo Down',accelerator: 'CommandOrControl+Numsub'}
      ]
    },
    {
      label: 'MIDI',
      submenu: [
        {  click (s){requireAction(s);}, type: 'normal', label: 'Refresh Midi Devices',accelerator: 'CommandOrControl+Shift+R'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Next Midi Input',accelerator: 'CommandOrControl+Shift+>'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Previous Midi Input',accelerator: 'CommandOrControl+Shift+<'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Next Midi Output',accelerator: 'CommandOrControl+Shift+Option+>'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Previous Midi Output',accelerator: 'CommandOrControl+Shift+Option+<'},

        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle Clock Send'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle Clock Recieve'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle Clock Type'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle Clock Source'},
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle Transport Send'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Toggle Transport Recieve'},
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        {  click (s){requireAction(s);}, type: 'normal', label: 'Set Terminal Mode To None',accelerator:"CommandOrControl+Option+0"},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Set Terminal Mode To Words',accelerator:"CommandOrControl+Option+1"},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Set Terminal Mode To All',accelerator:"CommandOrControl+Option+2"},
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Open Mapping Window',accelerator:"CommandOrControl+M"},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Close Mapping Window',accelerator:"CommandOrControl+Shift+M"},
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Help',accelerator: 'CommandOrControl+?'},
        // { type: 'separator' },
        // { label: 'Open Mappings',click (s){createMap();}, type: 'normal'},
        // { label: 'Close Mappings',click (s){destroyMap();}, type: 'normal'},
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  checkForEmptyStorage()
  createMenu()
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  app.on('gpu-process-crashed', () => {
    console.log('ERROR 64 - App GPU process has crashed, let\'s quit')
    app.quit()
  })

  process.on('uncaughtException', function (err) {
    console.log('ERROR 60 - process thrown exception, let\'s quit')
    console.log(err)
  app.quit()
})
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
