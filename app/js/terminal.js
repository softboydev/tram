// output.send( [150, 5, 100]);

const storage = require('electron-json-storage');
const ipc = require('electron').ipcRenderer;


/*RUNTIME*/
window.addEventListener('load',function(){
  const input = document.getElementById('input')
  window.TRAM = new TERMINAL(input,ipc,storage)
})
/*DRUMMACHINE*/
function TERMINAL(input,ipc,storage){
  this.CONFIG = {
    filename: "untitled",
    tempo: 128,
    clocksend: false,
    transportsend: false,
    clockrecieve: false,
    transportrecieve: false,
    clocktype: false,
    clocksource: false,
    fontsize: 16,
    mappings: {},
    buffer: [],
    input: "",
  }
  this.EDITOR = input
  this.update = function(){
    storage.get("config", function(error, data) {
      if(error){
        throw error
      }
      else{
        this.CONFIG = JSON.parse(data)
        this.setFontsize(this.CONFIG.fontsize)
        storage.get("mapping", function(error, data) {
          if(error){
            throw error
          }
          else{
            this.EDITOR.innerText = this.MAPPING.input
          }
        }.bind(this));
      }
    }.bind(this));
  }
  this.save = function(){
    storage.set("config", JSON.stringify(this.CONFIG), function(error) {
      if (error){
        throw error
      }
      else{
        ipc.send("requireUpdateAfterTerminal","")
      }
    }.bind(this));
  }
  this.init = function(){
    this.update()
    this.EDITOR.addEventListener('input',function(e){
      e.preventDefault()
      this.refresh()
    }.bind(this))
    ipc.on('requireZoomIn', function () {
      this.setFontsize(this.CONFIG.fontsize + 1)
    }.bind(this));
    ipc.on('requireZoomOut', function () {
      this.setFontsize(this.CONFIG.fontsize - 1)
    }.bind(this));
  }
  this.setFontsize = function(size){
    this.CONFIG.fontsize = Number(size)
    document.body.style.fontSize = size + "px"
  }
  this.refresh = function(){
    this.CONFIG.input = this.EDITOR.innerText
    this.save()
  }
  this.init()
}
