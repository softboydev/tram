/*DRUMMACHINE*/
function Drummachine(tempo){
  this.BEATS = 16; //the amount of different parts in each loop
  this.BEATLENGTH = 125; //length of a single 16th
	this.TEMPO = tempo; //the fixed tempo of the drummachine
  this.position = 0; //position, that is currently played
  this.interval = null; //loop interval is stored here
  this.sets = ["A", "B"]; //all available presets
	this.textarea = document.body.getElementsByTagName("TEXTAREA")[0];
  this.loop = []; //array that holds the complete loop of the drummachine
	for(var i = 0; i < this.BEATS; i++){
		this.loop.push([]); //adds empty arrays in an amount defined by BEATS
	}
	this.input = function(){
		drummachine.reset(); //calls presets
		let layers = this.textarea.value.split("\n"); //stores each line
		for(var i = 0; i < layers.length; i++){ //for all lines
			let text = layers[i]; //stores the text of the layer
      let length = text.length; //stores the length of the text of this layer
			let inputIsMuted = text.charAt(0) == "#"; //sets falg for muting when the first char is a #
      let inputHasSet = this.sets.includes(text.charAt(0)); //sets the flag for preset when the first char is contained in this.sets
      if(inputHasSet){length--}; //when a preset is defined, the virtual length is decreased by 1, because the position of each instrument on the beat is defined by its relative positon over the overall length
			let inputIsNumber = Number(text) ? true : false; //sets flag when there is a number instead of symbols
	    if(inputIsMuted){
	      //do nothing
	    }
			//if layer is setting the tempo
	    else if(inputIsNumber){
        if(Number(text)  >= 60 && Number(text) <= 240){ //when the number is within the excepted range
          drummachine.setTempo(Number(text));
        }
	    }
      //when a valid amount of symbols are present
      else{
        /*we are not using switch case to also except uneven input and round up
          for instance counting a length of 3 as a length of 4 by passing the
          same multiplier.*/
        let multiplier; //multiplier is later used for calculating relative position in the loop
        if(length <= 1){
          multiplier = 0;
        }
        else if(length <= 2){
          multiplier = 8;
        }
        else if(length <= 4){
          multiplier = 4;
        }
        else if(length <= 8){
          multiplier = 2;
        }
        else if(length <= 16){
          multiplier = 1;
        }
        //when the line is longer the 16 everyhting past the 16th character is ignored
        else{
          multiplier = 1;
          length = 16;
        }
        let characters = text.split(""); //stores all the characters in the text as an array
        let set; //stores the preset
        inputHasSet ? set = characters.shift():  set = this.sets[0]; //uses the the first character when there is a set defined else fallbacks to the first set of this.sets
        for(var n = 0; n < length; n++){ //for all characters in layer
          new Beat(characters[n], (n * multiplier), set); //adds a new beat object to the array
        }
      }
		}
	}
  this.reset = function(){ //resets all storage arrays
    for(var i = 0; i < this.loop.length; i++){
      this.loop[i] = []; //replaces all loops with empty arrays
    }
  }
	this.upPosition = function(){
		this.position = (this.position + 1) % this.BEATS; //clock
	}
  this.setTempo = function(number){
    this.TEMPO = number;
		this.BEATLENGTH = 60000 / this.TEMPO / (this.BEATS / 4); //length of a single 16th
		this.setInterval(this);
  }
  this.setInterval = function(object){ //passing correct this object to the requestInterval function
		if(this.interval){
			clearRequestInterval(this.interval); //clears the old one
		}
    this.interval = requestInterval(
      function(){
        object.playSoundsAtCurrentPosition();
      }
    , object.BEATLENGTH);
  }
	this.playSoundsAtCurrentPosition = function(){
		for(var i = 0; i < this.loop[this.position].length; i++){ //for the loop array at the current position
			this.playSound(this.loop[this.position][i].type, this.loop[this.position][i].set); //passes sound type and sound set
		}
		this.upPosition(); //upps the position by 1 when all sounds are played
	}
	this.playSound = function(type, set){
		var url = "sounds/" + set + "/" + type + "/sound.mp3"; //filepath
	  if (!AudioContext) {
	    new Audio(url).play();
	    return;
	  }
	  if (typeof(buffers[url]) == 'undefined') {
	    buffers[url] = null;
	    var req = new XMLHttpRequest();
	    req.open('GET', url, true);
	    req.responseType = 'arraybuffer';

	    req.onload = function () {
	      context.decodeAudioData(req.response,
	        function (buffer) {
	          buffers[url] = buffer;
	          playBuffer(buffer);
	        },
	        function (err) {
	          console.log(err);
	        }
	      );
	    };
	    req.send();
	  }
	  function playBuffer(buffer) {
	    var source = context.createBufferSource();
	    source.buffer = buffer;
	    source.connect(context.destination);
	    source.start();
	  };
	  if (buffers[url]) {
	    playBuffer(buffers[url]);
	  }
	}
	this.setInterval(this);
}
/*BEAT*/
function Beat(symbol, position, set, entity){
  this.type;
  this.set = set;
  this.entity = entity;
  symbols.indexOf(symbol) < 0 ? this.type = types[0] : this.type = types[symbols.indexOf(symbol)];
	drummachine.loop[position].push(this);
}

/*RUNTIME*/
const drummachine = new Drummachine(120); //creates a new Drummachine at tempo 120
const symbols = ["-", "+", "~", "*", "<", ">", "."]; //all currrent symbols
const types = ["pause","kick","snare","tom","closedhat","openhat","click"]; //mapped to all current types by the position in the array
const AudioContext = window.AudioContext || window.webkitAudioContext || false; //stores the AudioContext
const buffers = {}; //variable to store buffers
if (AudioContext) { //if the window had a context
  const context = new AudioContext(); //create a new one based on the windows constructor
}

/*EVENTLISTENERS*/
drummachine.textarea.oninput = function(){ //refreshes the storage
	drummachine.input();
}
