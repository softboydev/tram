// output.send( [150, 5, 100]);

const storage = require('electron-json-storage');
const ipc = require('electron').ipcRenderer;


/*RUNTIME*/
window.addEventListener('load',function(){
  const input = document.getElementById('input')
  window.TRAM = new MAP(input,ipc,storage)
})
/*DRUMMACHINE*/
function MAP(input,ipc,storage){
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
  this.MAPPING = {
    input: "",
    mappings: {}
  }
  this.NOTES = "CcDdEFfGgAaH"
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
            this.MAPPING = JSON.parse(data)
            this.EDITOR.innerText = this.MAPPING.input
          }
        }.bind(this));
      }
    }.bind(this));
  }
  this.save = function(){
    storage.set("mapping", JSON.stringify(this.MAPPING), function(error) {
      if (error){
        throw error
      }
      else{
        ipc.send("requireUpdateAfterMapping","")
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
    ipc.on('requireZoomOut', function () {
      this.setFontsize(this.CONFIG.fontsize - 1)
    }.bind(this));
    ipc.on('requireUpdate', function () {
      this.update()
    }.bind(this));
  }
  this.setFontsize = function(size){
    this.CONFIG.fontsize = Number(size)
    document.body.style.fontSize = size + "px"
  }
  this.refresh = function(){
    this.MAPPING.input = this.EDITOR.innerText
    this.MAPPING.mappings = {}
    let input = this.EDITOR.innerText.split('\n').map(x => x.split(''));
    let buffer = []
    for(let line in input){
      if(input[line][0] == "#"){
        //comment
      }
      else if(input[line].includes(" ")){ //mapping
        let splitted = input[line].join("").split(" ")
        let midi = splitted[1].split(/:|,|\.|\-|\|/)
        if(midi.length == 3){
          midi[0] = isNaN(Number(midi[0])) ? 1 : Number(midi[0])
          if(midi[0] < 128){
            let channel = Math.max(1,Math.min(midi[0],16))
            midi[0] = channel + 143
          }
          if(isNaN(Number(midi[1]))){
            let n = midi[1].split("")
            let note = this.NOTES.indexOf(n[0]) ? this.NOTES.indexOf(n[0]) : 0
            let octave = Number(n[1]) >= 0 && n[1] <= 9 ? Number(n[1]) * 12 : 48
            midi[1] = octave + note
          }
          else{
            midi[1] = Number(midi[1])
          }
          midi[2] = isNaN(Number(midi[2])) ? 100 : Number(midi[2])
          this.MAPPING.mappings[splitted[0]] = midi
        }
        else{
          this.MAPPING.mappings[splitted[0]] = splitted[1]
        }
      }
    }
    this.save()
  }
  this.init()
}
