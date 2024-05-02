window.requestAnimationFrame = window.requestAnimationFrame || ( function() {

  return  window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          function(  callback, element ) {
            window.setTimeout( callback, 1000 / 60 );
          };

})();

let INIT = false

var canvas,
    gl,
    buffer,
    vertex_shader, fragment_shader,
    currentProgram,
    vertex_position,
    timeLocation,
    resolutionLocation,
    mouseLocation,
    cutoffLocation,
    seedLocation,
    sizeLocation,
    bitmapLocation,
    bitmapSizeLocation,
    spacePressedLocation

    window.parameters = {
      startTime: new Date().getTime(),
      time: 0,
      seed: 1 + Math.random(),
      screenWidth : 0,
      screenHeight: 0,
      screenSize: 0,
      mouseX: 0,
      mouseY: 0,
      bitmap: new Float32Array([]),
      bitmapSize: 0,
      spacePressed: 0,
      bpmDivisor: 1/(60*1000/128*4)
    }

init();

function init() {
  if(!INIT){
    window.addEventListener("resize",resize);
    window.addEventListener("mousemove",move);
    window.addEventListener("keydown",keyDown);
    window.addEventListener("keyup",keyUp);
  }

  vertex_shader = document.getElementById('vs').textContent;
  fragment_shader = document.getElementById('fs').textContent + "\n" + document.getElementById('main').textContent;



  canvas = document.querySelector( 'canvas' );


  // Initialise WebGL

  try {

    gl = canvas.getContext( 'experimental-webgl' );

  } catch( error ) { }

  if ( !gl ) {

    throw "cannot create webgl context";

  }

  // Create Vertex buffer (2 triangles)

  buffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
  gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ - 1.0, - 1.0, 1.0, - 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0 ] ), gl.STATIC_DRAW );

  // Create Program

  currentProgram = createProgram( vertex_shader, fragment_shader );

  timeLocation = gl.getUniformLocation( currentProgram, 'time' );
  resolutionLocation = gl.getUniformLocation( currentProgram, 'resolution' );
  mouseLocation = gl.getUniformLocation( currentProgram, 'mouse' );
  seedLocation = gl.getUniformLocation( currentProgram, 'seed' );
  sizeLocation = gl.getUniformLocation( currentProgram, 'size' );
  bitmapLocation = gl.getUniformLocation( currentProgram, 'bitmap' );
  bitmapSizeLocation = gl.getUniformLocation( currentProgram, 'bitmapSize' );
  spacePressedLocation = gl.getUniformLocation( currentProgram, 'spacePressed' );
  if(!INIT){
    resize()
    INIT = true
  }
}

function createProgram( vertex, fragment ) {

  var program = gl.createProgram();

  var vs = createShader( vertex, gl.VERTEX_SHADER );
  var fs = createShader( '#ifdef GL_ES\nprecision highp float;\n#endif\n\n' + fragment, gl.FRAGMENT_SHADER );

  if ( vs == null || fs == null ) return null;

  gl.attachShader( program, vs );
  gl.attachShader( program, fs );

  gl.deleteShader( vs );
  gl.deleteShader( fs );

  gl.linkProgram( program );

  if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

    alert( "ERROR:\n" +
    "VALIDATE_STATUS: " + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + "\n" +
    "ERROR: " + gl.getError() + "\n\n" +
    "- Vertex Shader -\n" + vertex + "\n\n" +
    "- Fragment Shader -\n" + fragment );

    return null;

  }

  return program;

}

function createShader( src, type ) {

  var shader = gl.createShader( type );

  gl.shaderSource( shader, src );
  gl.compileShader( shader );

  if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {

    alert( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) );
    return null;

  }

  return shader;

}

function resize( event ) {

  if ( canvas.width != canvas.clientWidth ||
     canvas.height != canvas.clientHeight ) {

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    window.parameters.screenWidth = canvas.width;
    window.parameters.screenHeight = canvas.height;
    window.parameters.screenSize = Math.max(canvas.width,canvas.height)

    gl.viewport( 0, 0, canvas.width, canvas.height );

  }

}
function move(e) {
    window.parameters.mouseX = e.clientX / window.parameters.screenWidth
    window.parameters.mouseY = e.clientY / window.parameters.screenHeight

}

function animate() {
  render();
  requestAnimationFrame( animate );

}
function keyDown(e){
  // if(e.keyCode == 32){
    window.parameters.spacePressed = 1
  // }
}
function keyUp(e){
  // if(e.keyCode == 32){
    window.parameters.spacePressed = 0
  // }
}

function render() {

  if ( !currentProgram ) return;
  if(window.TRAM.RUNNING){
    window.parameters.time = new Date().getTime() - window.parameters.startTime;

  }
  let t = window.parameters.time  * window.parameters.bpmDivisor
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

  // Load program into GPU

  gl.useProgram( currentProgram );

  // Set values to program variables

  gl.uniform1f( timeLocation, t);
  gl.uniform2f( resolutionLocation, window.parameters.screenWidth,window.parameters.screenHeight);
  gl.uniform2f( mouseLocation, window.parameters.mouseX,window.parameters.mouseY);
  gl.uniform1f( seedLocation, window.parameters.seed);
  gl.uniform1f( sizeLocation, window.parameters.screenSize);
  gl.uniform1fv( bitmapLocation, window.parameters.bitmap);
  gl.uniform1i( bitmapSizeLocation, window.parameters.bitmapSize);
  gl.uniform1i( spacePressedLocation, window.parameters.spacePressed);
  // Render geometry

  gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
  gl.vertexAttribPointer( vertex_position, 2, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( vertex_position );
  gl.drawArrays( gl.TRIANGLES, 0, 6 );
  gl.disableVertexAttribArray( vertex_position );

}
