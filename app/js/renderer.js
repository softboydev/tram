// output.send( [150, 5, 100]);

const storage = require('electron-json-storage');
const ipc = require('electron').ipcRenderer;


/*RUNTIME*/
window.addEventListener('load',function(){
  const input = document.getElementById('input')
  window.TRAM = new TRAM(input,ipc,storage)
})
/*DRUMMACHINE*/
function TRAM(input,ipc,storage){
  this.CONFIG = {
    filename: "untitled",
    tempo: 128,
    clocksend: false,
    transportsend: false,
    clockrecieve: false,
    transportrecieve: false,
    clocktype: false,
    fontsize: 16,
    mappings: {},
    maps: {},
    buffer: [],
    input: "",
    mapInput: ""
  }
  this.NOTES = "CcDdEFfGgAaH"
  this.INPUT = input
  this.OUTPUTS = []
  this.SELECTEDOUTPUT = 0
  this.OUTPUT = false
  this.POSITION = 0
  this.MIDI = false
  this.LOOP = false
  this.CLOCK = false
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
        this.setClockSend(this.CONFIG.clocksend)
        this.setClockRecieve(this.CONFIG.clockrecieve)
        this.setTransportSend(this.CONFIG.transportsend)
        this.setTransportRecieve(this.CONFIG.transportrecieve)
        this.setClockType(this.CONFIG.transportrecieve)
        this.setOperators()
      }
    }.bind(this));
  }
  this.save = function(){
    console.log(this.CONFIG);
    storage.set("config", JSON.stringify(this.CONFIG), function(error) {
      if (error){
        throw error
      }
      else{
        // ipc.send("requestUpdate","")
      }
    }.bind(this));
  }
  this.init = function(){
    this.update()
    function onMIDIFailure(msg) {
      console.log( "Failed to get MIDI access - " + msg );
    }
    navigator.requestMIDIAccess().then(this.onMidiSuccess, onMIDIFailure );
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
      this.OUTPUT.open()
      document.getElementById("output").innerText = this.OUTPUT.name + " (" + (this.SELECTEDOUTPUT + 1) + "/" + this.OUTPUTS.length + ")"
    }
  }
  this.toggleHelp = function(){
    let operators = Object.keys(this.CONFIG.mappings).join("")
    help = document.getElementById("help")
    help.innerText = "Use # for comments\nUse = for variables\nUse " + operators + "  for beats\nUse CMD/STRG for shortcuts"
    help.classList.toggle("is-active")
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
      if(this.POSITION == 0 && this.RUNNING && this.OUTPUT.send && this.CONFIG.transportsend){
        this.send([0xFA]) //start clock after stop
      }
      else if(this.RUNNING && this.OUTPUT.send && this.CONFIG.transportsend){
        this.send([0xFB]) //continue clock after pause
      }
      else if(!this.RUNNING && this.OUTPUT.send && this.CONFIG.transportsend){
        this.send([0xFC]) //stop clock
      }
    }.bind(this));
    ipc.on('requireStop', function () {
      if(this.OUTPUT.send && this.CONFIG.transportsend){
        this.send([0xFC]) //stop clock
        this.send([0xFF]) //reset clock
      }
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
    ipc.on('requireToggleClockSend', function () {
      this.setClockSend(!this.CONFIG.clocksend)
    }.bind(this));
    ipc.on('requireToggleClockRecieve', function () {
      this.setClockRecieve(!this.CONFIG.clockrecieve)
    }.bind(this));
    ipc.on('requireToggleTransportSend', function () {
      this.setTransportSend(!this.CONFIG.transportsend)
    }.bind(this));
    ipc.on('requireToggleTransportRecieve', function () {
      this.setTransportRecieve(!this.CONFIG.transportrecieve)
    }.bind(this));
    ipc.on('requireToggleClockType', function () {
      this.setClockType(!this.CONFIG.clocktype)
      this.createLoop()
    }.bind(this));
    ipc.on('requireNextMidiDevice', function () {
      let next = this.SELECTEDOUTPUT + 1
      if(next >= this.OUTPUTS.length){
        next = 0
      }
      this.SELECTEDOUTPUT = next
      this.setMidiOutput()
    }.bind(this));
    ipc.on('requireSweepMidi', function () {
      this.sweep()
    }.bind(this));
    ipc.on('requirePreviousMidiDevice', function () {
      let next = this.SELECTEDOUTPUT - 1
      if(next < 0){
        next = this.OUTPUTS.length - 1
      }
      this.SELECTEDOUTPUT = next
      this.setMidiOutput()
    }.bind(this));
    ipc.on('requireRefreshMidiDevices', function () {
      this.refreshMidiOutputs
    }.bind(this));
    ipc.on('requireHelp', function () {
      this.toggleHelp()
    }.bind(this));
    this.RUNNING = true
    if(this.OUTPUT.send){
      this.send([0xFA]) //start midi clock
    }
    this.createLoop(this.CONFIG.tempo)
    document.body.classList.add("running")
  }.bind(this)
  this.refresh = function(){
    this.CONFIG.buffer = []
    this.CONFIG.mappings = {}
    this.CONFIG.input = this.INPUT.innerText
    let input = this.INPUT.innerText.split('\n').map(x => x.split(''));
    let buffer = []
    for(let line in input){
      if(input[line][0] == "#"){
        //comment
      }
      else if(input[line].includes("=")){ //mapping
        let splitted = input[line].join("").split("=")
        let midi = splitted[1].split(/:| |,|\.|\-|\|/)
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
          this.CONFIG.mappings[splitted[0]] = midi
        }
        else{
          this.CONFIG.mappings[splitted[0]] = splitted[1]
        }
      }
      else if(input[line].length){ //symbols
        if(input[line].includes(" ")){ //remove spaces when words are used
          input[line] = input[line].join("").split(" ")
        }
        let symbols = input[line]
        let allAtomic = false
        let r = 0 //recursion counter
        let lastR = 10
        while(!allAtomic && r <= lastR){
          allAtomic = true
          let sMax = symbols.length
          for(let s = sMax - 1; s >= 0; s--){
            let symbol = symbols[s]
              if(this.CONFIG.mappings[symbol]){ //when the symbol can be mapped
                if(typeof this.CONFIG.mappings[symbol] == "string"){ //when the symbol is not atomic
                  if(r != lastR){ //when not in last round of recursion
                    let sub = this.CONFIG.mappings[symbol] //store a sub array
                    sub = sub.includes(" ") ? sub.split(" ") : sub.split("") //when the subarray contains words
                    symbols.splice(s, 1, ...sub) //insert the subarray into the main array
                    allAtomic = false //reset the flag
                  }
                  else{ //when in last round of recursion
                    symbols.splice(s, 1);
                  }
                }
              }
              else{ //when the symbol cant be mapped
                symbols[s] = "" //insert an empty string into array
              }
            }
            r++
          }
          buffer.push(symbols)
        }
      }
    this.CONFIG.buffer = buffer
    this.setOperators()
    this.save()
  }
  this.createLoop = function(tempo){
    this.removeLoop()
    this.LOOP = setInterval(function () {
      if(this.RUNNING){
        this.play()
        this.POSITION++
      }
    }.bind(this), 60000 / this.CONFIG.tempo / 4);
    let d = this.CONFIG.clocktype ? 48 : 24
    this.CLOCK = setInterval(function() {
      if(this.RUNNING && this.OUTPUT.send && this.CONFIG.clocksend){
        this.send([0xF8])
      }
    }.bind(this), 60000 / this.CONFIG.tempo / d)
  }
  this.removeLoop = function(){
    // if(this.LOOP){
      clearInterval(this.LOOP)
      clearInterval(this.CLOCK)
    // }
  }
  this.setTempo = function(tempo){
    if(tempo > 0){
      this.TEMPOCHANGETIMESTAMP = performance.now()
      this.RUNNING = false
      this.CONFIG.tempo = Number(tempo)
      this.save()
      document.getElementById("tempo").innerText = tempo + "BPM"
      this.createLoop(tempo)
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
    this.save()
  }
  this.setOperators = function(){
    document.getElementById("operators").innerText = Object.keys(this.CONFIG.mappings).map(x => typeof this.CONFIG.mappings[x] != "string" ? x : "").join("")
  }
  this.setClockSend = function(flag){
    this.CONFIG.clocksend = flag
    this.save()
    document.getElementById("clocksend").innerText = flag ? "send" : "nosend"
  }
  this.setClockRecieve = function(flag){
    this.CONFIG.clockrecieve = flag
    this.save()
    document.getElementById("clockrecieve").innerText = flag ? "recieve" : "norecieve"
  }
  this.setTransportSend = function(flag){
    this.CONFIG.transportsend = flag
    this.save()
    document.getElementById("transportsend").innerText = flag ? "send" : "nosend"
  }
  this.setTransportRecieve = function(flag){
    this.CONFIG.transportrecieve = flag
    this.save()
    document.getElementById("transportrecieve").innerText = flag ? "recieve" : "norecieve"
  }
  this.setClockType = function(flag){
    this.CONFIG.clocktype = flag
    this.save()
    document.getElementById("clocktype").innerText = flag ? "48ppq" : "24ppq"
  }
  this.play = function(){
    if(this.OUTPUT.send){
      for(let line of this.CONFIG.buffer){
        let p = this.POSITION % line.length
        if(line[p] && this.CONFIG.mappings[line[p]]){
          this.send(this.CONFIG.mappings[line[p]])
        }
      }
    }
  }
  this.send = function(cmd){
    let func = cmd[0]
    if(143 < func && func < 160){ //if note on should be sent
      this.OUTPUT.send([func - 16,cmd[1],cmd[2]],performance.now()) //send note off on same channel beforehands
    }
    this.OUTPUT.send(cmd)
  }
  this.sweep = function(){
    for(let a = 128; a <= 160; a++){
      for(let b= 0; b <= 127; b++){
        this.OUTPUT.send([a,b,100])
      }
    }
  }
  this.init()
}
