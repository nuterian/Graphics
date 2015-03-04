
// Define a general purpose 3D vector object.

function Vector3() {
	this.x = 0;
	this.y = 0;
	this.z = 0;
}
Vector3.prototype = {
	set : function(x,y,z) {
		this.x = x;
		this.y = y;
		this.z = z;
	},
}

function resizeCanvas(canvas) {
	var size = window.innerHeight;
	if(window.innerWidth < window.innerHeight) {
		size = window.innerWidth;
	}

	canvas.style.width = size + 'px';
	canvas.style.height = size + 'px';	
}

function resize(gl) {
	var canvas = gl.canvas;

	// Lookup the size the browser is displaying the canvas.
	var displayWidth  = canvas.clientWidth;
	var displayHeight = canvas.clientHeight;

	// Check if the canvas is not the same size.
	if (canvas.width  != displayWidth ||
		canvas.height != displayHeight) {

		// Make the canvas the same size
		canvas.width  = displayWidth;
		canvas.height = displayHeight;

		// Set the viewport to match
		gl.viewport(0, 0, canvas.width, canvas.height);
	}
}

function start_gl(canvas_id, vertexShader, fragmentShader) {

	setTimeout(function() {
		try {

			var canvas = document.getElementById(canvas_id);
			var gl = canvas.getContext("experimental-webgl");

		} catch (e) { throw "Sorry, your browser does not support WebGL."; }

		function resize() {
			canvas.width  = window.innerWidth;
			canvas.height = window.innerHeight;
		}
		window.onresize = resize;
		resize();
		// Catch mouse events that go to the canvas.

		function setMouse(event, eventZ) {
			var r = event.target.getBoundingClientRect();
			gl.cursor.x = (event.clientX - r.left  ) / (r.right - r.left) * 2 - 1;
			gl.cursor.y = (event.clientY - r.bottom) / (r.top - r.bottom) * 2 - 1;
			if (eventZ !== undefined)
				gl.cursor.z = eventZ;
		}
		gl.cursor = new Vector3();
		canvas.onmousedown = function(event) { setMouse(event, 1); } // On mouse press, set z to 1.
		canvas.onmousemove = function(event) { setMouse(event) ; }
		canvas.onmouseup   = function(event) { setMouse(event, 0); } // On mouse press, set z to 0.

		// Initialize gl. Then start the frame loop.

		gl_init(gl, vertexShader, fragmentShader);
		gl_update(gl);
		resizeCanvas(canvas);
		window.addEventListener('resize', function(){
			resizeCanvas(canvas);
		});

	}, 100); // Wait 100 milliseconds before starting gl.
}

// Function to create and attach a shader to a gl program.

function addshader(gl, program, type, src) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS))
		throw "Cannot compile shader:\n\n" + gl.getShaderInfoLog(shader);
	gl.attachShader(program, shader);
};

// Initialize gl and create a square, given vertex and fragment shader defs.

function gl_init(gl, vertexShader, fragmentShader) {

	// Create and link the gl program, using the application's vertex and fragment shaders.

	var program = gl.createProgram();
	addshader(gl, program, gl.VERTEX_SHADER  , vertexShader  );
	addshader(gl, program, gl.FRAGMENT_SHADER, fragmentShader);
	gl.linkProgram(program);
	if (! gl.getProgramParameter(program, gl.LINK_STATUS))
		throw "Could not link the shader program!";
	gl.useProgram(program);

	// Create vertex data for a square, as a strip of two triangles.

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ -1,1,0, 1,1,0, -1,-1,0, 1,-1,0 ]), gl.STATIC_DRAW);

	// Assign value of attribute aPosition for each of the square's vertices.

	gl.aPosition = gl.getAttribLocation(program, "aPosition");
	gl.enableVertexAttribArray(gl.aPosition);
	gl.vertexAttribPointer(gl.aPosition, 3, gl.FLOAT, false, 0, 0);

	// Get the address in the fragment shader of each of my uniform variables.

	['uTime','uCursor', 'uModel', 'uShadows', 'uReflections', 'uBoolInter'].forEach(function(name) {
		gl[name] = gl.getUniformLocation(program, name);
	});

}

var _params = _params || [];

// Update is called once per animation frame.

function gl_update(gl) {
	resize(gl);
	gl.clear(gl.COLOR_BUFFER_BIT);
	var time = ((new Date()).getTime() - startTime) / 1000;            // Set uniform variables
	gl.uniform1f(gl.uTime  , time);                                  // in fragment shader.
	gl.uniform3f(gl.uCursor, gl.cursor.x, gl.cursor.y, gl.cursor.z);

	for( var i = 0; i < _params.length; i++ ) {
		var param = _params[i];
		gl.uniform1i(gl[param.name], param.value);
	} 
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);                            // Render the square.
	requestAnimFrame(function() { gl_update(gl); });                   // Animate.
}

// A browser-independent way to call a function after 1/60 second.

requestAnimFrame = (function(callback) {
			return requestAnimationFrame
					|| webkitRequestAnimationFrame
					|| mozRequestAnimationFrame
					|| oRequestAnimationFrame
					|| msRequestAnimationFrame
					|| function(callback) { setTimeout(callback, 1000 / 60); }; })();

// Remember what time we started, so we can pass relative time to shaders.

var startTime = (new Date()).getTime();