
// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron')
const path = require('path')
const fs = require('fs'); // Load the File System to execute our common tasks (CRUD)
const storage = require('electron-json-storage');
app.allowRendererProcessReuse = false
let mainWindow

function isNotEmptyObject(obj){
  return !(obj && Object.keys(obj).length === 0 && obj.constructor === Object)
}

ipcMain.on('requestUpdate', (event) => {
    requireUpdate()
})

function requireUpdate(){
  mainWindow.webContents.send("requireUpdate");
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
      requireUpdate()
    }
  })
}
function requireAction(sender){
  mainWindow.webContents.send("require" + sender.label.replace(/ /g, ''));
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
          storage.set("config", data, function(error) {
            if (error){
              console.log("Error storing JSON " + error)
            }
            else{
              requireUpdate()
            }
          })
        }
      })
    }
  })
}


function createWindow () {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 600,
    minWidth: 200,
    minHeight: 200,
    backgroundColor: '#000000',
    icon: path.join(__dirname, { darwin: 'icon.icns', linux: 'icon.png', win32: 'icon.ico' }[process.platform] || 'icon.ico'),
    // frame: process.platform !== 'darwin',
    // skipTaskbar: process.platform === 'darwin',
    // autoHideMenuBar: process.platform === 'darwin',
    webPreferences: {
      devTools: true,
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
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
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Transport',
      submenu: [
        {  click (s){requireAction(s);}, type: 'normal', label: 'Play Pause',accelerator: 'CommandOrControl+Shift+P'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Stop',accelerator: 'CommandOrControl+Shift+S'},
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Tempo Up',accelerator: 'CommandOrControl+Numadd'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Tempo Down',accelerator: 'CommandOrControl+Numsub'},
        // {  click (s){requireAction(s);}, type: 'normal', label: 'Tempo Notch Up',accelerator: 'CommandOrControl+Shift+Numadd'},
        // {  click (s){requireAction(s);}, type: 'normal', label: 'Tempo Notch Down',accelerator: 'CommandOrControl+Shift+Numsub'},
      ]
    },
    {
      label: 'MIDI',
      submenu: [
        {  click (s){requireAction(s);}, type: 'normal', label: 'Next Midi Output',accelerator: 'CommandOrControl+N'},
        {  click (s){requireAction(s);}, type: 'normal', label: 'Previous Midi Output',accelerator: 'CommandOrControl+P'},
        { type: 'separator' },
        {  click (s){requireAction(s);}, type: 'normal', label: 'Refresh Midi Outputs',accelerator: 'CommandOrControl+M'},
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
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
