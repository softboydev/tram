
  var $beats = document.querySelectorAll('.beat');

  var currentTick = 0;
  var lastTick = TICKS - 1;
  var tickTime = 1 / (4 * BPM / (60 * 1000));

  var requestInterval = function(fn, delay) {
    var start = new Date().getTime();
    var handle = {};

    function loop() {
      var current = new Date().getTime();
      var delta = current - start;
      if (delta >= delay) {
        fn.call();
        start = new Date().getTime();
      }
      handle.value = requestAnimationFrame(loop);
    }
    handle.value = requestAnimationFrame(loop);
    return handle;
  };

  requestInterval(function() {
    for (var i = 0; i < slength; i++) {
      var lastBeat = $beats[i * TICKS + lastTick];
      var currentBeat = $beats[i * TICKS + currentTick];
      lastBeat.classList.remove('ticked');
      currentBeat.classList.add('ticked');
      if (currentBeat.classList.contains('on')) {
        // new Audio(soundPrefix + sounds[i]).play();

        
      }
    }
    lastTick = currentTick;
    currentTick = (currentTick + 1) % TICKS;
  }, 1 / (4 * BPM / (60 * 1000)));
}());
