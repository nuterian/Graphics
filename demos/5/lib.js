/**
 * Generic 3D vector class
 * @param {float} x 
 * @param {float} y
 * @param {float} z
 */

function vec3(x, y, z) {
   this.x = 0;
   this.y = 0;
   this.z = 0;
   this.set(x, y, z);
}

vec3.prototype = {
   set : function(x, y, z) {
      if (x !== undefined) this.x = x;
      if (y !== undefined) this.y = y;
      if (z !== undefined) this.z = z;
   },
}

function dot(v1, v2) {
    if (v1.x !== undefined) v1 = [v1.x, v1.y, v1.z];
    if (v2.x !== undefined) v2 = [v2.x, v2.y, v2.z];
    var sum = 0.0;
    for (var i = 0; i < v1.length; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
}

var requestAnimFrame = (function(callback) {
            return requestAnimationFrame
                    || webkitRequestAnimationFrame
                    || mozRequestAnimationFrame
                    || oRequestAnimationFrame
                    || msRequestAnimationFrame
                    || function(callback) { setTimeout(callback, 1000 / 60); }; })();
/*function dot(v1, v2) {
    if (v1.x !== undefined) v1 = [v1.x, v1.y, v1.z];
    if (v2.x !== undefined) v2 = [v2.x, v2.y, v2.z];

    var sum = 0.0;
    for (var i = 0; i < v1.length; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
}

function mag(v) {
    var sum = 0.0;
    for (var i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
}

function normalize(v) {
    var sum = mag(v);
    return Vector3(v.x / sum, v.y / sum, v.z / sum);
}*/

var canvases = [];
function initCanvas(id) {
    var canvas = document.getElementById(id);

    canvas.setCursor = function(x, y, z) {
        var r = this.getBoundingClientRect();
        this.cursor.set(x - r.left, y - r.top, z);
    }
    canvas.cursor = new vec3(0, 0, 0);
    canvas.onmousedown = function(e) { this.setCursor(e.clientX, e.clientY, 1); }
    canvas.onmousemove = function(e) { this.setCursor(e.clientX, e.clientY   ); }
    canvas.onmouseup   = function(e) { this.setCursor(e.clientX, e.clientY, 0); }
    canvases.push(canvas);
    return canvas;
}

var startTime = (new Date()).getTime() / 1000, time = startTime;
function update() {
    time = (new Date()).getTime() / 1000 - startTime;
    for (var i = 0 ; i < canvases.length ; i++)
        if (canvases[i].update !== undefined) {
            var canvas = canvases[i];
            var g = canvas.getContext('2d');
            g.clearRect(0, 0, canvas.width, canvas.height);
            g.strokeStyle="#ffffff";
            canvas.update(g);
    }
    requestAnimFrame(update);
}
update();




/**
 * Matrix class
 */

function mat() {
    this.identity();
}

mat.prototype = {

    identity: function() {
        this.data = [1, 0, 0, 0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1];
    },

    translate: function(x, y, z) {
        this.data = [1, 0, 0, 0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     x, y, z, 1];
    },

    rotateX: function(theta) {
        this.data = [1, 0, 0, 0,
                     0, Math.cos(theta), Math.sin(theta), 0,
                     0, -Math.sin(theta), Math.cos(theta), 0,
                     0, 0, 0, 1];
    },

    rotateY: function(theta) {
        this.data = [Math.cos(theta), 0, Math.sin(theta), 0,
                     0, 1, 0, 0,
                     -Math.sin(theta), 0, Math.cos(theta), 0,
                     0, 0, 0, 1];
    },

    rotateZ:  function(theta) {
        this.data = [Math.cos(theta), Math.sin(theta), 0, 0,
                     -Math.sin(theta), Math.cos(theta), 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1];
    },

    scale: function(x, y, z) {
        this.data = [x, 0, 0, 0,
                     0, y, 0, 0,
                     0, 0, z, 0,
                     0, 0, 0, 1];
    },

    transform: function(src) {
        dst = new vec3();
        var w = dot([this.data[3], this.data[7], this.data[11]], src) + 1;
        dst.x = (dot([this.data[0], this.data[4], this.data[8]], src) + this.data[12]) / w;
        dst.y = (dot([this.data[1], this.data[5], this.data[9]], src) + this.data[13]) / w;
        dst.z = (dot([this.data[2], this.data[6], this.data[10]], src) + this.data[14]) / w;
        return dst;
    },

    multiply: function(mat) {
        var data = [];
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                var v1 = [this.data[4 * i], this.data[4 * i + 1], this.data[4 * i + 2], this.data[4 * i + 3]];
                var v2 = [mat.data[j], mat.data[j + 4], mat.data[j + 8], mat.data[j + 12]];
                data.push(dot(v1, v2));
            }
        }
        this.data = data;
    },
}


function Shape(vertices, edges) {
   this.v = [];
   this.e = [];
   this.set(vertices, edges);
}

Shape.prototype = {
    set: function(vertices, edges) {
        this.v = vertices;
        this.e = edges;
    },

    render: function(g, width, height, mat) {
        g.beginPath();
        for (var i = 0; i < this.e.length; i++) {
            var v0 = this.v[this.e[i][0]];
            var v1 = this.v[this.e[i][1]];

            var t_v0 = v0, t_v1 = v1;
            for(var j = 0; j < mat.length; j++ ){
                t_v0 = mat[j].transform(t_v0);
                t_v1 = mat[j].transform(t_v1);  
            }

/*            var t_v0 = mat.transform(v0);
            var t_v1 = mat.transform(v1);*/
            
            var px0 = (width  / 2) + t_v0.x * (width / 2);
            var py0 = (height / 2) - t_v0.y * (width / 2);
            var px1 = (width  / 2) + t_v1.x * (width / 2);
            var py1 = (height / 2) - t_v1.y * (width / 2);

            g.moveTo(px0, py0);
            g.lineTo(px1, py1);
        }
        g.stroke();
    }
}
