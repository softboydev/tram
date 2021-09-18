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
    tempo: 128,
    mappings: {},
    buffer: [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],
    input: ""
  }
  this.CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  this.INPUT = input
  this.OUTPUTS = []
  this.SELECTEDOUTPUT = 0
  this.OUTPUT = false
  this.POSITION = 0
  this.MIDI = false
  this.LOOP = false;
  this.RUNNING = false
  this.update = function(){
    storage.get("config", function(error, data) {
      if(error){
        throw error
      }
      else{
        this.CONFIG = JSON.parse(data)
        this.INPUT.innerText = this.CONFIG.input
        this.setTempo(this.CONFIG.tempo)
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
      document.getElementById("output").innerText = this.OUTPUT.name + " [" + (this.SELECTEDOUTPUT + 1) + "/" + this.OUTPUTS.length + "]"
    }
  }
  this.onMidiSuccess = function(midiAccess){
    this.MIDI = midiAccess
    this.refreshMidiOutputs()
    this.INPUT.addEventListener('input',function(e){
      e.preventDefault()
      this.refresh()
    }.bind(this))
    ipc.on('requireSave', function () {

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
      this.setTempo(Math.round(this.CONFIG.tempo + 1))
    }.bind(this));
    ipc.on('requireTempoDown', function () {
      this.setTempo(Math.round(this.CONFIG.tempo - 1))
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
    this.CONFIG.buffer = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
    this.CONFIG.mappings = {}
    this.CONFIG.input = this.INPUT.innerText
    let output = ""
    let input = this.INPUT.innerText.split('\n').map(x => x.split(''));
    for(let line in input){
      if(input[line][0] == "#"){
        //comment
      }
      else if(input[line].includes("=")){
        let splitted = input[line].join("").split("=")
        this.CONFIG.mappings[splitted[0]] = splitted[1].split(":")
      }
      else{
        if(input[line].includes(" ")){
          input[line] = input[line].join("").split(" ")
        }
        for(let s in input[line]){
          let symbol = input[line][s]
          if(this.CONFIG.mappings[symbol]){
            let n = Math.floor(16 * s / input[line].length)
            this.CONFIG.buffer[n].push(symbol)
          }
        }
      }
    }
    console.log(this.CONFIG.mappings);
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
      this.CONFIG.tempo = Number(tempo)
      this.save()
      document.getElementById("tempo").innerText = tempo + "BPM"
      this.createLoop(tempo)
    }
  }
  this.play = function(){
    let position = this.POSITION % 16
    for(let sample in this.CONFIG.buffer[position]){
      let signal = [Number(this.CONFIG.mappings[this.CONFIG.buffer[position][sample]][0]), Number(this.CONFIG.mappings[this.CONFIG.buffer[position][sample]][1]), Number(this.CONFIG.mappings[this.CONFIG.buffer[position][sample]][2])]
      this.OUTPUT.send(signal);
    }
  }
  this.init()
}
