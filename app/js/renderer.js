// output.send( [150, 5, 100]);

const storage = require('electron-json-storage');
const ipc = require('electron').ipcRenderer;

/*RUNTIME*/
window.addEventListener('load',function(){
  const input = document.getElementById('input')
  window.ACID = new ACID(input)
  window.TRAM = new TRAM(input,ipc,storage)
  animate();
})
/*VIDEOSYNTH*/
function ACID(input){
  this.input = input
  this.init = function(){
    this.update()
  }
  this.update = function(){
    let TEXT = this.input.innerText
    let ALGO = this.process(TEXT)
    let MAIN = document.getElementById("main")
    let INNER = MAIN.innerHTML
    MAIN.innerHTML = INNER.slice(0,INNER.indexOf("gl_FragColor")) + "gl_FragColor =" + ALGO + ";}"
    init()
  }
  this.process = function(text){
    let lines = text.replaceAll("\n\n","\n").split("\n") //splits the input by lines
    let words = lines.map((l) => l.split(' '))
    let _lines = []
    for(let l in words){
      let line = words[l]
      if(line && line[0].charAt(0) == "#"){
        //dont process comments
      }
      else if(line.length == 2 && window.TRAM.CONFIG.terminal != 0){
        //dont process mappings in terminal modes that allow it
      }
      else{
        _lines.push(lines[l])
      }
    }
    lines = _lines
    let chars = lines.map((l) => l.split("")) //splits the input by chars, removing white spaces
    let bitmap = text.replaceAll("\n","").split("").map((c) => c == " " ? 0.0 : (c.charCodeAt(0) - 47) / 43)
    window.parameters.bitmap = new Float32Array(bitmap)
    window.parameters.bitmapSize = window.parameters.bitmap.length
    let CMDS = chars //stores the character into variable for clarity
    let RGB = [["0.0"],["0.0"],["0.0"]] //array that holds the commands for each color channel
    for(let l = 0; l < CMDS.length; l++){ //iterates over all lines
      let c = l % 4 //determines color channel from line number

      let CMD = CMDS[l]
      if(CMD.length > 0){
        CMD = this.convert(CMD)
        if(CMD.length > 0){
          if(c == 0){
            RGB[0].push(CMD)
            RGB[1].push(CMD)
            RGB[2].push(CMD)
          }
          else{
              RGB[c-1].push(CMD)
          }
        }
      }

    }
    let vec = "vec4(mod(" + RGB[0].join(" + ") + ",1.0001),mod(" + RGB[1].join(" + ") + ",1.0001),mod(" + RGB[2].join(" + ") + ",1.0001),1.0)"
    return vec
  }
  this.analyze = function(c){
    const LOP_NUMBERS = "0123456789"
    const HIP_NUMBERS = "abcdefghijklmnopqrstuvwxyz"
    const NUMBERS = LOP_NUMBERS + HIP_NUMBERS //represent a fixed value
    const OPERATORS = "ADTM" //are used to string together values
    const VALUES = "HJRXYZIO" //represent a dynamic value, treated like numbers
    const FUNCTIONS = "QSVUEKCPNLGBW"
    const CHARACTERS = OPERATORS + VALUES + FUNCTIONS
    const VALUE_FUNC = NUMBERS + VALUES
    const OP_CON = ["+","*","/","-"]
    const FNC_CON = ["SQUARE(","SINE(","TRIANGLE(","INVERT(","EXPAND(","COMPRESS(","CLOCK(","PLASMA(","SIMPLEX(","LOWER(","BIGGER(","BITMAP(","WATER("]
    const MAX_ARG_PER_FNC = [2,1,1,1,1,1,1,3,2,2,2,1,3]

    let CHAR = c

    let TYPE = CHAR == " " ? "END" : NUMBERS.includes(CHAR) ? "NUMBER" : CHARACTERS.includes(CHAR) ? "CHARACTER" : "UNKNOWN"
    let SUB = TYPE == "NUMBER" ? (LOP_NUMBERS.includes(CHAR) ? "LOP" : "HIP") : (OPERATORS.includes(CHAR) ? "OPERATOR" : VALUES.includes(CHAR) ? "VALUE" : FUNCTIONS.includes(CHAR) ? "FUNCTION" : "UNKNOWN")
    let FUNC = VALUE_FUNC.includes(CHAR) ? "VALUE" : SUB

    let VALUE = false
    let ARGUMENTS = 0
    if(TYPE == "NUMBER"){
      v = SUB == "LOP" ? LOP_NUMBERS.indexOf(CHAR) / (LOP_NUMBERS.length - 1) : HIP_NUMBERS.indexOf(CHAR) / (HIP_NUMBERS.length - 1)
      v = v == 1 ? "1.0" : v == 0 ? "0.0" : "" + v
      VALUE = v
    }
    else if(TYPE == "CHARACTER"){
      if(SUB == "OPERATOR"){
        VALUE = OP_CON[OPERATORS.indexOf(CHAR)]
      }
      else if(SUB == "VALUE"){
        VALUE = CHAR
      }
      else if(SUB == "MAPPING"){
        VALUE = MAP_CON[MAPPINGS.indexOf(CHAR)]
        ARGUMENTS = 1
      }
      else if(SUB == "FUNCTION"){
        VALUE = FNC_CON[FUNCTIONS.indexOf(CHAR)]
        ARGUMENTS = MAX_ARG_PER_FNC[FUNCTIONS.indexOf(CHAR)]
      }
    }

    return {
      char: CHAR,
      type: TYPE,
      sub: SUB,
      func: FUNC,
      value: VALUE,
      arguments: ARGUMENTS
    }
  }
  this.convert = function(array){
    let CMD = ""
    let CLOSE_BRACKETS = 0
    let ARGUMENT_N = []

    array = array.map((c) => this.analyze(c))
    array = array.filter((c) => c.type != "UNKNOWN")
    for(let c = 0; c < array.length; c++){ //iterates over all chars

      let N = c == array.length - 1 ? false : array[c+1] //stores next char
      let P = c == 0 ? false : array[c-1] //stores previous char
      let C = array[c] //stores current char
      if(C.type == "END"){
        while(CLOSE_BRACKETS>0){
          CMD += ")"
          CLOSE_BRACKETS--
        }
        ARGUMENT_N = []
      }
      else if(C.func == "VALUE"){
        let ADDED_FLAG = false
          if(P.sub == "OPERATOR" || P.sub == "FUNCTION" || !P || ARGUMENT_N.length > 0){ //when the previous char was an operator or function or there is none
            CMD += C.value //add value to command
            ADDED_FLAG = true
          }
          if(N.sub != "OPERATOR"){
            if(ARGUMENT_N.length > 0){
              ARGUMENT_N[ARGUMENT_N.length-1] = ARGUMENT_N[ARGUMENT_N.length-1]-1
              if(ARGUMENT_N[ARGUMENT_N.length-1] == 0){
                while(ARGUMENT_N[ARGUMENT_N.length-1] == 0){
                  CMD += ")"
                  CLOSE_BRACKETS--
                  ARGUMENT_N.pop()
                  if(ARGUMENT_N.length > 0 && N && N.sub != "OPERATOR" && N.type != "END"){
                    CMD += ","
                  }
                  else if(ARGUMENT_N.length == 0 && N.type != "END"){
                    while(CLOSE_BRACKETS>0){
                      CMD += ")"
                      CLOSE_BRACKETS--
                    }
                  }
                }
              }
              else if(N && N.type != "END"){
                CMD += ","
              }
            }
          }
          if((P.type == "NUMBER" || P.sub == "VALUE" || P.type == "END") && !ADDED_FLAG ){ //when the previous char was a number as well add the value with a + operation
            CMD += "+" + C.value
          }

      }
      else if(C.type == "CHARACTER"){
        if(C.sub == "OPERATOR"){
          if(C.sub == "OPERATOR" && P.sub == "OPERATOR" && N.sub == "OPERATOR"){
            //nothing
          }
          else if(C.sub == "OPERATOR" && P.sub == "OPERATOR"){
            if(N){
              CMD += "+1.0"
              CMD += C.value
            }

          }
          else if(N && P && P.sub != "FUNCTION" && N.sub != "OPERATOR"){
            CMD += C.value
          }
        }
        else if(C.sub == "FUNCTION"){
            if(P.sub == "OPERATOR" || P.sub == "MAPPING" || P.sub == "FUNCTION" || !P || ARGUMENT_N.length > 0){ //when the previous char was an operator or there is none
              CMD += C.value //add value to command
            }
            else if(P.type == "NUMBER" || P.sub == "VALUE" || P.type == "END" ){ //when the previous char was a number as well add the value with a + operation
              CMD += "+" + C.value
            }
            if(ARGUMENT_N.length > 0){
              ARGUMENT_N[ARGUMENT_N.length-1] = ARGUMENT_N[ARGUMENT_N.length-1]-1
              if(ARGUMENT_N[ARGUMENT_N.length-1] == 0){
                ARGUMENT_N.pop()
              }
            }
            ARGUMENT_N.push(C.arguments)
            CLOSE_BRACKETS++
        }
      }
    }
    while(CLOSE_BRACKETS>0){
      CMD += ")"
      CLOSE_BRACKETS--
    }
    CMD = CMD.replaceAll("PLASMA(","PLASMA(XY,").replaceAll("PLASMA(XY,)","PLASMA(XY)").replaceAll("SIMPLEX(","SIMPLEX(XY,").replaceAll("SIMPLEX(XY,)","SIMPLEX(XY)").replaceAll("WATER(","WATER(XY,").replaceAll("WATER(XY,)","WATER(XY)")
    console.log(CMD);
    return CMD
  }
  setTimeout(function () {
    this.init()
  }.bind(this), 10)
}
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
    clocksource: false,
    terminal: 0, //0 no mapping, 1 only remapping, 2 all
    fontsize: 16,
    mappings: {},
    buffer: [],
    input: ""
  }
  this.MAPPING = {
    input: "",
    mappings: {}
  }
  this.OPERATORS = {}
  this.NOTES = "CcDdEFfGgAaH"
  this.EDITOR = input
  this.OUTPUTS = []
  this.INPUTS = []
  this.SELECTEDOUTPUT = 0
  this.SELECTEDINPUT = 0
  this.OUTPUT = false
  this.INPUT = false
  this.POSITION = 0
  this.MIDI = false
  this.LOOP = false
  this.CLOCK = false
  this.RUNNING = false
  this.STOPPED = false
  this.TEMPOCHANGETIMESTAMP = performance.now()
  this.export = function(){
    let blob = new Blob([JSON.stringify({config:this.CONFIG,mapping:this.MAPPING})], {type: 'text/plain'})
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
        this.EDITOR.innerText = this.CONFIG.input
        this.setFontsize(this.CONFIG.fontsize)
        this.setTempo(this.CONFIG.tempo)
        this.setFilename(this.CONFIG.filename)
        this.setClockSend(this.CONFIG.clocksend)
        this.setClockRecieve(this.CONFIG.clockrecieve)
        this.setTransportSend(this.CONFIG.transportsend)
        this.setTransportRecieve(this.CONFIG.transportrecieve)
        this.setClockType(this.CONFIG.clocktype)
        this.setClockSource(this.CONFIG.clocksource)
        this.setTerminalMode(this.CONFIG.terminal)
        this.setOperators()
        storage.get("mapping", function(error, data) {
          if(error){
            throw error
          }
          else{
            data = data ? data : "{}"
            this.MAPPING = JSON.parse(data)
            this.updateOperators()
            this.refresh()
          }
        }.bind(this));
      }
    }.bind(this));
  }
  this.updateOperators = function(){
    this.OPERATORS = {
        ...this.CONFIG.mappings,
        ...this.MAPPING.mappings
    }
  }
  this.save = function(){
    storage.set("config", JSON.stringify(this.CONFIG), function(error) {
      if (error){
        throw error
      }
    }.bind(this));
  }
  this.connect = function(){
    const open = document.getElementById("uiOpen")
    const save = document.getElementById("uiSave")
    const help = document.getElementById("uiHelp")
    const zoomIn = document.getElementById("uiIn")
    const zoomOut = document.getElementById("uiOut")
    const transportSend = document.getElementById("transportsend")
    const transportRecieve = document.getElementById("transportrecieve")
    const transport = document.getElementById("transport")
    const midi = document.getElementById("uiMidi")
    const inPrev = document.getElementById("uiInPrev")
    const inNext = document.getElementById("uiInNext")
    const outPrev = document.getElementById("uiOutPrev")
    const outNext = document.getElementById("uiOutNext")
    const slower = document.getElementById("uiSlower")
    const faster = document.getElementById("uiFaster")
    const clock = document.getElementById("clocktype")
    const clockSource = document.getElementById("clocksource")
    const clockSend = document.getElementById("clocksend")
    const clockRecieve = document.getElementById("clockrecieve")
    const terminalMode = document.getElementById("terminalmode")
    open.addEventListener("click",function(){
      ipc.send("requireOpen","")
    })
    save.addEventListener("click",function(){
      this.export()
    }.bind(this))
    help.addEventListener("click",function(){
      this.toggleHelp()
    }.bind(this))
    zoomIn.addEventListener("click",function(){
      this.setFontsize(this.CONFIG.fontsize + 1)
    }.bind(this))
    zoomOut.addEventListener("click",function(){
      this.setFontsize(this.CONFIG.fontsize - 1)
    }.bind(this))
    transportSend.addEventListener("click",function(){
      this.setTransportSend(!this.CONFIG.transportsend)
    }.bind(this))
    transportRecieve.addEventListener("click",function(){
      this.setTransportRecieve(!this.CONFIG.transportrecieve)
    }.bind(this))
    transport.addEventListener("click",function(){
      this.playpause()
    }.bind(this))
    midi.addEventListener("click",function(){
      this.refreshMidi()
    }.bind(this))
    inPrev.addEventListener("click",function(){
      this.previousMidiInput()
    }.bind(this))
    inNext.addEventListener("click",function(){
      this.nextMidiInput()
    }.bind(this))
    outPrev.addEventListener("click",function(){
      this.previousMidiOutput()
    }.bind(this))
    outNext.addEventListener("click",function(){
      this.nextMidiOutput()
    }.bind(this))
    terminalMode.addEventListener("click",function(){
      this.setTerminalMode(this.CONFIG.terminal + 1)
    }.bind(this))
    slower.addEventListener("click",function(){
      this.setTempo(this.CONFIG.tempo - 1)
    }.bind(this))
    faster.addEventListener("click",function(){
      this.setTempo(this.CONFIG.tempo + 1)
    }.bind(this))
    clock.addEventListener("click",function(){
      this.setClockType(!this.CONFIG.clocktype)
    }.bind(this))
    clockSource.addEventListener("click",function(){
      this.setClockSource(!this.CONFIG.clocksource)
      this.createLoop()
    }.bind(this))
    clockSend.addEventListener("click",function(){
      this.setClockSend(!this.CONFIG.clocksend)
    }.bind(this))
    clockRecieve.addEventListener("click",function(){
      this.setClockRecieve(!this.CONFIG.clockrecieve)
    }.bind(this))
  }
  this.init = function(){
    ACID.update()
    this.connect()
    this.update()
    function onMIDIFailure(msg) {
      console.log( "Failed to get MIDI access - " + msg );
    }
    navigator.requestMIDIAccess().then(this.onMidiSuccess, onMIDIFailure );
  }
  this.refreshMidi = function(){
    this.clearMidiInput()
    this.clearMidiOutput()
    this.refreshMidiInputs()
    this.refreshMidiOutputs()
  }
  this.refreshMidiInputs = function(){
    this.INPUTS = []
    for (var entry of this.MIDI.inputs) {
      this.INPUTS.push(entry[1]);
    }
    this.SELECTEDINPUT = 0
    this.setMidiInput()
  }
  this.refreshMidiOutputs = function(){
    this.OUTPUTS = []
    for (var entry of this.MIDI.outputs) {
      this.OUTPUTS.push(entry[1]);
    }
    this.SELECTEDOUTPUT = 0
    this.setMidiOutput()
  }
  this.clearMidiOutput = function(){
    if(this.OUTPUT){
      this.OUTPUT.close()
      this.OUTPUT = false
    }
  }
  this.clearMidiInput = function(){
    if(this.INPUT){
      this.INPUT.close()
      this.INPUT = false
    }
  }
  this.setMidiOutput = function(){
    if(this.OUTPUTS[this.SELECTEDOUTPUT]){
      this.OUTPUT = this.OUTPUTS[this.SELECTEDOUTPUT]
      this.OUTPUT.open()
      document.getElementById("outputs").innerText = this.OUTPUT.name + " (" + (this.SELECTEDOUTPUT + 1) + "/" + this.OUTPUTS.length + ")"
    }
  }
  this.setMidiInput = function(){
    if(this.INPUTS[this.SELECTEDINPUT]){
      this.INPUT = this.INPUTS[this.SELECTEDINPUT]
      this.INPUT.onmidimessage = function(message) {
        this.handleInput(message.data)
      }.bind(this)
      if(this.INPUT.state == "closed"){
        this.INPUT.open()
      }
      document.getElementById("inputs").innerText = this.INPUT.name + " (" + (this.SELECTEDINPUT + 1) + "/" + this.INPUTS.length + ")"
    }
  }
  this.handleInput = function(data){
    let fb = data[0]
    switch(fb){
      case 248: //start/play from stop
        if(this.CONFIG.clockrecieve){
          this.CLOCK()
        }
        break
      case 250: //start/play from stop
        if(this.CONFIG.transportrecieve){
          this.start()
        }
        break
      case 251: //continue/play from wherever
        if(this.CONFIG.transportrecieve){
          this.continue()
        }
        break
      case 252: //stop/pause
        if(this.CONFIG.transportrecieve){
          if(!this.RUNNING){
            this.STOPPED = true
          }
          this.stop()
        }
        break
    }
  }.bind(this)
  this.toggleHelp = function(){
    let operators = Object.keys(this.CONFIG.mappings).join("")
    help = document.getElementById("help")
    help.innerText = "Use # for comments\nUse = for variables\nUse " + operators + "  for beats\nUse CMD/STRG for shortcuts"
    help.classList.toggle("is-active")
  }
  this.playpause = function(){
    if(this.RUNNING){
      this.stop()
    }
    else{
      if(this.STOPPED){
        this.start()
      }
      else{
        this.continue()
      }
    }
  }
  this.start = function(){
    this.STOPPED = false
    this.POSITION = 0
    this.RUNNING = true
    document.body.classList.remove("stopped")
    document.body.classList.add("running")
    if(this.OUTPUT.send && this.CONFIG.transportsend){
      this.send([0xFF]) //reset clock
      this.send([0xFA]) //start clock after stop
    }
  }
  this.continue = function(){
    this.RUNNING = true
    document.body.classList.remove("stopped")
    document.body.classList.add("running")
    if(this.OUTPUT.send && this.CONFIG.transportsend){
      this.send([0xFB]) //continue clock after pause
    }
  }
  this.stop = function(){
    if(this.OUTPUT.send && this.CONFIG.transportsend){
      this.send([0xFC])
      if(this.STOPPED){
        this.send([0xFF]) //reset clock
      }
    }
    this.RUNNING = false
    if(this.STOPPED){
      document.body.classList.add("stopped")
    }
    document.body.classList.remove("running")
  }
  this.onMidiSuccess = function(midiAccess){
    this.MIDI = midiAccess
    this.refreshMidi()
    this.EDITOR.addEventListener('input',function(e){
      e.preventDefault()
      this.refresh()
      ACID.update()
    }.bind(this))
    ipc.on('requireToggleUI', function () {
      document.body.classList.toggle("ui-hidden")
    }.bind(this));
    ipc.on('requireZoomIn', function () {
      this.setFontsize(this.CONFIG.fontsize + 1)
    }.bind(this));
    ipc.on('requireZoomOut', function () {
      this.setFontsize(this.CONFIG.fontsize - 1)
    }.bind(this));
    ipc.on('requireUpdate', function () {
      this.update()
    }.bind(this));
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

      ipc.on('requirePlayPause', function () {
        this.playpause()
      }.bind(this));
      ipc.on('requireStop', function () {
        this.STOPPED = true
        this.stop()
      }.bind(this));
      ipc.on('requireTempoUp', function () {
        this.setTempo(this.CONFIG.tempo + 1)
      }.bind(this));
      ipc.on('requireTempoDown', function () {
        this.setTempo(this.CONFIG.tempo - 1)
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
      ipc.on('requireToggleClockSource', function () {
        this.setClockSource(!this.CONFIG.clocksource)
      }.bind(this));
      ipc.on('requireSweepMidi', function () {
        this.sweep()
      }.bind(this));
      ipc.on('requirePreviousMidiOutput', function () {
        this.previousMidiOutput()
      }.bind(this));
      ipc.on('requireNextMidiOutput', function () {
        this.nextMidiOutput()
      }.bind(this));
      ipc.on('requirePreviousMidiInput', function () {
        this.previousMidiInput()
      }.bind(this));
      ipc.on('requireNextMidiInput', function () {
        this.nextMidiInput()
      }.bind(this));
      ipc.on('requireRefreshMidiDevices', function () {
        this.refreshMidiOutputs()
      }.bind(this));
      ipc.on('requireHelp', function () {
        this.toggleHelp()
      }.bind(this));
      ipc.on('requireSetTerminalModeToNone', function () {
        this.setTerminalMode(0)
      }.bind(this));
      ipc.on('requireSetTerminalModeToWords', function () {
        this.setTerminalMode(1)
      }.bind(this));
      ipc.on('requireSetTerminalModeToAll', function () {
        this.setTerminalMode(2)
      }.bind(this));
      this.createLoop(this.CONFIG.tempo)
      this.start()
      document.body.classList.add("running")
  }.bind(this)
  this.refresh = function(){
    this.CONFIG.buffer = []
    this.CONFIG.mappings = {}
    this.CONFIG.input = this.EDITOR.innerText
    this.updateOperators()
    let input = this.EDITOR.innerText
    let lines = input.split('\n')
    let included = []
    let buffer = []
    for(let l in lines){
      let line = lines[l]
      let words = line.split(' ')
      if(line.charAt(0) == "#"){
        //comment
      }
      else{
        if(words.length > 1 && this.CONFIG.terminal != 0){ //only when there was at least one space character a mapping could happen
          let operator = words[0] //interpretes the first word as the operator
          let command = words[1] //interpretes the second one as the command
          let midi = command.split(/:|,|\.|\-|\|/) //tries to cast the command to midi
          let validMidi = midi.length == 3
          if(!this.OPERATORS[operator]){ //only if the word hasnt been mapped yet
            if(validMidi && this.CONFIG.terminal == 2){ //when the cast to midi was successfull
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
              this.CONFIG.mappings[operator] = midi


              this.updateOperators()
              words.splice(0,2) //removes the mapped words from the word array
            }
            else if(!validMidi){ //store a mapping
              this.CONFIG.mappings[operator] = command
              this.updateOperators()
              words.splice(0,2) //removes the mapped words from the word array
            }

          }
        }
        let allops = Object.keys(this.OPERATORS).sort((a, b) => {
          if (a.length < b.length) {
            return 1;
          }
          if (a.length > b.length) {
            return -1;
          }
          return 0;
        });
        if(words.length > 0){ //if there are still words left to map
          let lastR = 10
          let r = 0
          let array
          while(r <= lastR){
            array = []
            for(let w in words){
              let word = words[w]
              let found = false
              for(let operator of allops){ //iterate over all operators
                if(word.includes(operator)){ //when the word includes an operator
                  found = true
                  let command = this.OPERATORS[operator]
                  // if(r != lastR){
                    let b = word.slice(0,word.indexOf(operator))
                    let a = word.slice(word.indexOf(operator)+operator.length)
                    word = []
                    if(b){
                      array.push(...b.split(""))
                    }
                    array.push(typeof command == "string" ? command : operator)
                    if(a){
                      array.push(...a.split(""))
                    }
                  // }
                  // else{
                    // array.push(...word.split(""))
                  // }
                }
              }
              if(!found){
                array.push(...word.split(""))
              }
            }
            words = array
            r++
          }
          let symbols = words
          let bars = []
          while(symbols.length){
            if(symbols.length > 16){
              bars.push(symbols.splice(0, 16))
            }
            else{
              bars.push(symbols)
              symbols = false
            }
          }
          symbols = words
          while(bars.length){
            let bar = ["","","","","","","","","","","","","","","",""]
            let b = bars.splice(0,1)[0]
            let m = 16 / b.length
            let n = 0
            while(b.length){
              let c = b.splice(0,1)[0]
              bar[Math.floor(m*n)] = c
              n++
            }
            symbols = symbols.concat(bar)
          }
          buffer.push(symbols)
        }
      }
      this.updateOperators()
    }
    this.CONFIG.buffer = buffer
    if(this.CONFIG.terminal != 0){
      this.updateOperators()
      this.setOperators()
    }
    this.save()
  }
  this.createLoop = function(tempo){
    this.removeLoop()
    this.CLOCKPULSES = this.CONFIG.clocktype ? 48 : 24
    this.CLOCKTIME = 60000 / this.CONFIG.tempo / this.CLOCKPULSES
    this.CLOCKSTART = performance.now()
    this.CLOCKMOD = 4
    this.LASTFRAME = 0
    this.CLOCK = function(){
      let timestamp = performance.now() - this.CLOCKSTART
      let frame = Math.floor(timestamp / this.CLOCKTIME)
      if(frame > this.LASTFRAME){
        this.LASTFRAME = frame
        if(this.RUNNING){
          let delta = timestamp % this.CLOCKTIME
          if(frame % (this.CLOCKPULSES * 0.25) == 0){
            this.play(delta)
            this.POSITION++
          }
          if(this.OUTPUT.send && this.CONFIG.clocksend){
            this.OUTPUT.send([0xF8], delta)
          }
        }
      }
    }.bind(this)
    this.CLOCKINTERVAL = setInterval(function(){
      if(!this.CONFIG.clocksource){
        this.CLOCK()
      }
    }.bind(this), this.CLOCKTIME * 0.25);
  }
  this.removeLoop = function(){
    if(this.CLOCKINTERVAL){
      clearInterval(this.CLOCKINTERVAL)
    }
  }
  this.setTempo = function(tempo){
    if(tempo > 0){
      this.TEMPOCHANGETIMESTAMP = performance.now()
      this.RUNNING = false
      this.CONFIG.tempo = Number(tempo)
      window.parameters.bpmDivisor = 1/(60*1000/tempo*4)
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
  this.setTerminalMode = function(mode){
    mode = mode % 3
    document.getElementById("terminalmode").innerText = ["Terminal:None","Terminal:Words","Terminal:All"][mode]
    this.CONFIG.terminal = mode
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
    this.createLoop(tempo)
    document.getElementById("clocktype").innerText = flag ? "48ppq" : "24ppq"
  }
  this.setClockSource = function(flag){
    this.CONFIG.clocksource = flag
    this.save()
    document.getElementById("clocksource").innerText = flag ? "EXT" : "INT"
  }
  this.previousMidiOutput = function () {
    let next = this.SELECTEDOUTPUT - 1
    if(next < 0){
      next = this.OUTPUTS.length - 1
    }
    this.SELECTEDOUTPUT = next
    this.setMidiOutput()
  }.bind(this)
  this.nextMidiOutput = function () {
    let next = this.SELECTEDOUTPUT + 1
    if(next >= this.OUTPUTS.length){
      next = 0
    }
    this.SELECTEDOUTPUT = next
    this.setMidiOutput()
  }.bind(this)
  this.previousMidiInput = function () {
    let next = this.SELECTEDINPUT - 1
    if(next < 0){
      next = this.INPUTS.length - 1
    }
    this.SELECTEDINPUT = next
    this.setMidiInput()
  }.bind(this)
  this.nextMidiInput = function () {
    let next = this.SELECTEDINPUT + 1
    if(next >= this.INPUTS.length){
      next = 0
    }
    this.SELECTEDINPUT = next
    this.setMidiInput()
  }.bind(this)
  this.play = function(delta){
    if(this.OUTPUT.send){
      for(let line of this.CONFIG.buffer){
        let p = this.POSITION % line.length
        if(line[p] && this.OPERATORS[line[p]]){
          this.send(this.OPERATORS[line[p]],delta)
        }
      }
    }
  }
  this.send = function(cmd,delta){
    let func = cmd[0]
    if(143 < func && func < 160){ //if note on should be sent
      this.OUTPUT.send([func - 16,cmd[1],cmd[2]]) //send note off on same channel beforehands
    }
    this.OUTPUT.send(cmd,delta)
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
