const storage = require('electron-json-storage');
const ipc = require('electron').ipcRenderer;
ipc.on('update-settings', function (event,store) {
    console.log(store);
});
/*DRUMMACHINE*/
function TRAM(tempo,input,symbols){
	this.TEMPO = tempo
  this.INPUT = input
  this.SYMBOLS = symbols
  this.POSITION = 0
  this.BUFFER = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  this.SOUNDS = []
  this.LOOP = false;
  this.init = function(){
    this.INPUT.addEventListener('input',function(){
    	this.refresh()
    }.bind(this))
    for(let symbol in this.SYMBOLS){
      this.SOUNDS.push(new Audio('/sounds/' + symbol + '.mp3'));
    }
    this.LOOP = this.createLoop(this.TEMPO)
  }
  this.refresh = function(){
    this.BUFFER = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
    let input = this.INPUT.value.split('\n').map(x => x.split(''));
    for(let line in input){
      for(let symbol in input[line]){
        if(this.SYMBOLS.includes(input[line][symbol])){
          this.BUFFER[Math.floor(16 / input[line].length) * symbol].push(this.SYMBOLS.indexOf(input[line][symbol]))
        }
      }
    }
    console.log(this.BUFFER);
  }
  this.createLoop = function(tempo){
    this.POSITION = 0
    this.LOOP = setInterval(function () {
      this.play()
      this.POSITION++
    }.bind(this), 15000 / this.TEMPO);
  }
  this.play = function(){
    let position = this.POSITION % 16
    for(let sample in this.BUFFER[position]){
      this.SOUNDS[this.BUFFER[position][sample]].pause()
      this.SOUNDS[this.BUFFER[position][sample]].currentTime = 0;
      this.SOUNDS[this.BUFFER[position][sample]].play()
    }
  }
}

/*RUNTIME*/
window.addEventListener('load',function(){
  const symbols = ["+", "~", "*", "<", ">", "."]
  const input = document.getElementById('input')
  const drummachine = new TRAM(128,input,symbols)
  drummachine.init()
})
