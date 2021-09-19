// output.send( [150, 5, 100]);

const storage = require('electron-json-storage');
const ipc = require('electron').ipcRenderer;


/*RUNTIME*/
window.addEventListener('load',function(){
  const input = document.getElementById('input')
  new TRAM(input,ipc,storage)
})
/*DRUMMACHINE*/
function TRAM(input,ipc,storage){
  this.CONFIG = {
    filename: "untitled",
    tempo: 128,
    fontsize: 16,
    mappings: {},
    buffer: [],
    input: ""
  }
  this.EMPTY = function(){
    return [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  }
  this.NOTES = "CcDdEFfGgAaH"
  this.INPUT = input
  this.OUTPUTS = []
  this.SELECTEDOUTPUT = 0
  this.OUTPUT = false
  this.POSITION = 0
  this.MIDI = false
  this.LOOP = false
  this.RUNNING = false
  this.TEMPOCHANGETIMESTAMP = performance.now()
  this.export = function(){
    let blob = new Blob([JSON.stringify(this.CONFIG)], {type: 'text/plain'})
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = this.CONFIG.filename + ".tram"
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }, 100)
  }
  this.update = function(){
    storage.get("config", function(error, data) {
      if(error){
        throw error
      }
      else{
        this.CONFIG = JSON.parse(data)
        this.INPUT.innerText = this.CONFIG.input
        this.setTempo(this.CONFIG.tempo)
        this.setFontsize(this.CONFIG.fontsize)
        this.setFilename(this.CONFIG.filename)
        this.setOperators(this.CONFIG.mappings)
      }
    }.bind(this));
  }
  this.save = function(){
    storage.set("config", JSON.stringify(this.CONFIG), function(error) {
      if (error){
        throw error
      }
      else{
        //
      }
    }.bind(this));
  }
  this.init = function(){
    this.update()
    function onMIDIFailure(msg) {
      console.log( "Failed to get MIDI access - " + msg );
    }
    navigator.requestMIDIAccess().then(this.onMidiSuccess, onMIDIFailure );
    // navigator.requestMIDIAccess().then((access){console.log(access.outputs)}).catch((error){}))
  }
  this.refreshMidiOutputs = function(){
    this.OUTPUTS = []
    for (var entry of this.MIDI.outputs) {
      this.OUTPUTS.push(entry[1]);
    }
    this.SELECTEDOUTPUT = 0
    this.setMidiOutput()
  }
  this.setMidiOutput = function(){
    if(this.OUTPUTS[this.SELECTEDOUTPUT]){
      this.OUTPUT = this.OUTPUTS[this.SELECTEDOUTPUT]
      document.getElementById("output").innerText = this.OUTPUT.name + " (" + (this.SELECTEDOUTPUT + 1) + "/" + this.OUTPUTS.length + ")"
    }
  }
  this.onMidiSuccess = function(midiAccess){
    this.MIDI = midiAccess
    this.refreshMidiOutputs()
    this.INPUT.addEventListener('input',function(e){
      e.preventDefault()
      this.refresh()
    }.bind(this))
    document.getElementById('filename').addEventListener('input',function(e){
      let name = e.target.innerText.replace(/ /g, '').replace(/\n/g, '').toLowerCase()
      if(name.length == 0){
        name = "untitled"
      }
      this.CONFIG.filename = name
      this.save()
    }.bind(this))
    ipc.on('requireSave', function () {
      this.export()
    }.bind(this));
    ipc.on('requireUpdate', function () {
      this.update()
    }.bind(this));
    ipc.on('requirePlayPause', function () {
      this.RUNNING = !this.RUNNING
      this.RUNNING ? document.body.classList.add("running") : document.body.classList.remove("running")
      document.body.classList.remove("stopped")
    }.bind(this));
    ipc.on('requireStop', function () {
      this.RUNNING = false
      this.POSITION = 0
      document.body.classList.add("stopped")
      document.body.classList.remove("running")
    }.bind(this));
    ipc.on('requireTempoUp', function () {
      this.setTempo(this.CONFIG.tempo + 1)
    }.bind(this));
    ipc.on('requireTempoDown', function () {
      this.setTempo(this.CONFIG.tempo - 1)
    }.bind(this));
    ipc.on('requireZoomIn', function () {
      this.setFontsize(this.CONFIG.fontsize + 1)
    }.bind(this));
    ipc.on('requireZoomOut', function () {
      this.setFontsize(this.CONFIG.fontsize - 1)
    }.bind(this));
    // ipc.on('requireTempoUp', function () {
    //   this.setTempo(Math.round((this.CONFIG.tempo + 1) * 10) * 0.1)
    // }.bind(this));
    // ipc.on('requireTempoDown', function () {
    //   this.setTempo(Math.round((this.CONFIG.tempo - 1) * 10) * 0.1)
    // }.bind(this));
    // ipc.on('requireTempoNotchUp', function () {
    //   this.setTempo(Math.round((this.CONFIG.tempo + 0.1) * 10) * 0.1)
    // }.bind(this));
    // ipc.on('requireTempoNotchDown', function () {
    //   this.setTempo(Math.round((this.CONFIG.tempo - 0.1) * 10) * 0.1)
    // }.bind(this));
    ipc.on('requireNextMidiOutput', function () {
      let next = this.SELECTEDOUTPUT + 1
      if(next >= this.OUTPUTS.length){
        next = 0
      }
      this.SELECTEDOUTPUT = next
      this.setMidiOutput()
    }.bind(this));
    ipc.on('requirePreviousMidiOutput', function () {
      let next = this.SELECTEDOUTPUT - 1
      if(next < 0){
        next = this.OUTPUTS.length - 1
      }
      this.SELECTEDOUTPUT = next
      this.setMidiOutput()
    }.bind(this));
    ipc.on('requireRefreshMidiOutputs', function () {
      this.refreshMidiOutputs
    }.bind(this));
    this.RUNNING = true
    this.createLoop(this.CONFIG.tempo)
    document.body.classList.add("running")
  }.bind(this)
  this.refresh = function(){
    this.CONFIG.buffer = []
    this.CONFIG.mappings = {}
    this.CONFIG.input = this.INPUT.innerText
    let output = ""
    let input = this.INPUT.innerText.split('\n').map(x => x.split(''));
    let buffer = []
    let _line = 0
    for(let line in input){
      if(input[line][0] == "#"){
        //comment
      }
      else if(input[line].includes("=")){
        let splitted = input[line].join("").split("=")
        let midi = splitted[1].split(/:| |,|\.|\-|\|/)
        if(midi.length == 3){
          midi[0] = isNaN(Number(midi[0])) ? 1 : Number(midi[0])
          if(midi[0] < 128){
            let channel = Math.max(1,Math.min(midi[0],16))
            console.log(channel);
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
          this.CONFIG.mappings[splitted[0]] = midi
        }
        else{
          this.CONFIG.mappings[splitted[0]] = splitted[1]
        }
      }
      else{
        buffer.push([this.EMPTY()])
        if(input[line].includes(" ")){
          input[line] = input[line].join("").split(" ")
        }
        let flag = false
        let pointer = 0
        for(let s in input[line]){
          if(flag){
            buffer[_line].push(this.EMPTY())
            flag = false
          }
          let symbol = input[line][s]
          if(this.CONFIG.mappings[symbol]){
            if(typeof this.CONFIG.mappings[symbol] == "string"){
              let bar = this.CONFIG.mappings[symbol].split("")
              for(let b in bar){
                symbol = bar[b]
                let n = Math.floor(16 * b / bar.length)
                buffer[_line][pointer][n].push(symbol)
              }
              pointer++
              flag = true
            }
            else{
              let n = Math.floor(16 * s / input[line].length)
              buffer[_line][pointer][n].push(symbol)
            }
          }
        }
        _line++
      }
    }
    this.CONFIG.buffer = buffer
    console.log(buffer);
    this.setOperators(this.CONFIG.mappings)
    this.save()
  }
  this.createLoop = function(tempo){
    this.removeLoop()
    this.LOOP = setInterval(function () {
      if(this.RUNNING){
        this.play()
        this.POSITION++
      }
    }.bind(this), 15000 / this.CONFIG.tempo);
  }
  this.removeLoop = function(){
    // if(this.LOOP){
      clearInterval(this.LOOP)
    // }
  }
  this.setTempo = function(tempo){
    if(tempo > 0){
      this.TEMPOCHANGETIMESTAMP = performance.now()
      this.RUNNING = false
      this.CONFIG.tempo = Number(tempo)
      this.save()
      document.getElementById("tempo").innerText = tempo + "BPM"
      this.createLoop(tempo)+
      setTimeout(function () {
        if(performance.now() - this.TEMPOCHANGETIMESTAMP > 100){
          this.RUNNING = true
        }
      }.bind(this), 200);
    }
  }
  this.setFontsize = function(size){
    if(size > 6 && size < 48){
      this.CONFIG.fontsize = Number(size)
      this.save()
      document.getElementById("fontsize").innerText = size + "PX"
      document.body.style.fontSize = size + "px"
    }
  }
  this.setFilename = function(name){
    document.getElementById("filename").innerText = name
    this.CONFIG.filename = name
  }
  this.setOperators = function(mappings){
    document.getElementById("operators").innerText = Object.keys(mappings).join("")
  }
  this.play = function(){
    for(let line of this.CONFIG.buffer){
      let position = this.POSITION % (16 * line.length)
      for(let b in line){
        let bar = line[b]
        if(Math.floor(position / 16) == b){
          let p = position % 16
          for(let t in bar[p]){
            let trigger = bar[p][t]
            if(trigger){
              this.OUTPUT.send(this.CONFIG.mappings[trigger])
            }
          }
        }
      }
    }
  }
  this.init()
}
