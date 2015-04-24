/**
 * @class 3D engine based on HTML5 canvas
 * @name c3d
 */
c3d = {};

c3d.Object = function() {
    this.vertices = [];
    this.edges = [];
    this.resetTranslation();
    this.resetScaling();
    this.resetRotation();
    this.transformMatrix = c3d.Matrix.identity(4);
};

c3d.Object.prototype.translate = function(x, y, z) {
    this.translationMatrix = c3d.Matrix.translation(x, y, z).multiply(this.translationMatrix);
};

c3d.Object.prototype.scale = function(x, y, z) {
    if (arguments.length == 1)
        this.scalingMatrix = c3d.Matrix.scaling(x, x, x).multiply(this.scalingMatrix);
    else
        this.scalingMatrix = c3d.Matrix.scaling(x, y, z).multiply(this.scalingMatrix);
};

c3d.Object.prototype.rotate = function(axis, angle) {
    this.rotationMatrix = c3d.Matrix.rotation(axis, angle).multiply(this.rotationMatrix);
};

c3d.Object.prototype.rotateInDegree = function(axis, degree) {
    this.rotate(axis, degree * Math.PI / 180);
};

c3d.Object.prototype.resetTranslation = function() {
    this.translationMatrix = c3d.Matrix.identity(4);   
};

c3d.Object.prototype.resetScaling = function() {
    this.scalingMatrix = c3d.Matrix.identity(4);
};

c3d.Object.prototype.resetRotation = function() {
    this.rotationMatrix = c3d.Matrix.identity(4);
};

c3d.Object.prototype.prepare = function() {
    this.transformMatrix =
        this.translationMatrix.copy().multiply(this.rotationMatrix).multiply(this.scalingMatrix);
};

c3d.Object.prototype.transformVertices = function() {
    var vertices = [];
    this.prepare();
    for (var i in this.vertices)
        vertices.push(this.vertices[i].copy().multipliedBy(this.transformMatrix));
    return vertices;
};

c3d.Object.prototype.edgesWithOffset = function(offset) {
    var edges = []
    for (var i in this.edges)
        edges.push([this.edges[i][0] + offset, this.edges[i][1] + offset]);
    return edges;
};

c3d.Viewport = function(width, height) {
    this.set(width, height);
};

c3d.Viewport.prototype.set = function(width, height) {
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    if (width > height) {
        this.xFactor = width / height;
        this.yFactor = 1;
    } else {
        this.xFactor = 1;
        this.yFactor = height / width;
    }
    this.xFactor = this.yFactor = 1;    
}

c3d.Viewport.prototype.transform = function(vertex) {
    return {
        'x': this.halfWidth + vertex.getX() * this.halfWidth,
        'y': this.halfHeight - vertex.getY() * this.halfHeight,
        'z': vertex.getZ()
    };
};


/**
 * @class C3D Camera class
 * @param {Number} ratio         Aspect ratio of view, usually width/height.
 * @param {Number} fov Horizontal field-of-view.
 */
c3d.Camera = function(ratio, fov) {
    this.cameraLocation = new c3d.Vector4(0, 0, 0, 1);
    this.lookAtPosition = new c3d.Vector4(0, 0, -1, 1);
    this.upDirection = new c3d.Vector4(0, 1, 0, 0);

    this.lookAt(this.lookAtPosition, this.cameraLocation, this.upDirection);
    this.set(ratio, fov);
};

c3d.Camera.prototype.set = function(ratio, fov) {
    fov = fov || 90;
    this.perspective(fov * Math.PI / 180, ratio, 1, 200);
    this.update();    
}

c3d.Camera.prototype.lookAt = function(point, cameraLocation, upDirection) {
    var zAxis = cameraLocation.copy().subtract(point).normalize();
    var xAxis = upDirection.copy().cross3(zAxis).normalize();
    var yAxis = zAxis.copy().cross3(xAxis).normalize();
    var translationMatrix = new c3d.Matrix(4, 4, false);

    translationMatrix.values = xAxis.values.concat(yAxis.values).concat(zAxis.values).concat([0, 0, 0, 1]);

    this.viewMatrix = translationMatrix.multiply(c3d.Matrix.translation(-point.getX(), -point.getY(), -point.getZ()));
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.zAxis = zAxis;
};

c3d.Camera.prototype.move = function(cameraX, cameraY, cameraZ) {
    var shifting = c3d.Matrix.scaling(cameraX, cameraX, cameraX).multiply(this.xAxis).add(
                   c3d.Matrix.scaling(cameraY, cameraY, cameraY).multiply(this.yAxis)).add(
                   c3d.Matrix.scaling(cameraZ, cameraZ, cameraZ).multiply(this.zAxis));
    this.lookAtPosition.add(shifting);
    this.cameraLocation.add(shifting);
    this.lookAt(this.lookAtPosition, this.cameraLocation, this.upDirection);
    this.update();
};

c3d.Camera.prototype.rotate = function(xAngle, yAngle, zAngle) {
    var rotation = c3d.Matrix.rotation('x', xAngle).multiply(
                   c3d.Matrix.rotation('y', yAngle)).multiply(
                   c3d.Matrix.rotation('z', zAngle));
    var lookAtDirection = this.lookAtPosition.copy().subtract(this.cameraLocation);
    this.lookAtPosition = lookAtDirection.multipliedBy(rotation).add(this.cameraLocation);
    this.upDirection.multipliedBy(rotation);
    this.lookAt(this.lookAtPosition, this.cameraLocation, this.upDirection);
    this.update();
};

c3d.Camera.prototype.perspective = function(fovy, ratio, znear, zfar) {
    var perspectiveMatrix = new c3d.Matrix(4, 4, false);

    perspectiveMatrix.values = [1 / (Math.tan(fovy / 2) * ratio), 0, 0, 0, 0, 1 / Math.tan(fovy / 2), 0, 0];
    if (zfar === undefined)
        perspectiveMatrix.values = perspectiveMatrix.values.concat(
            [0, 0, -1, -2, 0, 0, -1, 0]);
    else
        perspectiveMatrix.values = perspectiveMatrix.values.concat(
            [0, 0, (znear + zfar) / (znear - zfar), 2 * znear * zfar / (znear - zfar), 0, 0, -1, 0]);
    this.perspectiveMatrix = perspectiveMatrix;
};

c3d.Camera.prototype.update = function() {
    this.transformMatrix = this.perspectiveMatrix.copy().multiply(this.viewMatrix);
};

c3d.Camera.prototype.transformVertex = function(vertex) {
    return vertex.multipliedBy(this.transformMatrix).dividedByW();
};


c3d.Scene = function(camera) {
    this.camera = camera;
    this.objects = [];
};

c3d.Scene.prototype = {

	constructor: c3d.Scene,

	add: function(object) {
        object.sIndex = this.objects.length;
	    this.objects.push(object);
	},

    remove: function(object) {
/*        this.objects.splice(object.sIndex, 1);
        for(var i = object.sIndex; i < this.objects.length; i++){
            this.objects[i].sIndex--;
        }*/
        this.objects[object.sIndex] = null;
    },

	render: function(drawFunction) {
	    for (var i = 0; i < this.objects.length; i++) {
            if(!this.objects[i])
                continue;
	        var vertices = this.objects[i].transformVertices();
	        var edges = this.objects[i].edges;

	        for (var j = 0; j <vertices.length; j++)
	            this.camera.transformVertex(vertices[j]);
	        drawFunction(vertices, edges);
	    }
	}

};

c3d.C3D = function(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.viewport = new c3d.Viewport(canvas.width, canvas.height);
    this.fovx = 90;
    this.scene = new c3d.Scene(new c3d.Camera(canvas.width / canvas.height, this.fovx));

    this.callbacks = [];
};

c3d.C3D.prototype = {

	constructor: c3d.C3D,

	addObject: function(object, initializer, callback) {
	    if (typeof(initializer) == 'function')
	        initializer(object);

	    this.scene.add(object);

	    if (typeof(callback) == 'function') {
            object.cbIndex = this.callbacks.length;
	        this.callbacks.push(function(timePast) {
	            callback(timePast, object);
	        });
	    }
	},

    removeObject: function(object) {
        this.callbacks[object.cbIndex] = null;
        this.scene.remove(object);
    },

	loadObject: function(url, initializer, callback) {
	    var self = this;
	    $.getJSON(url).done(function(data) {
	        var object = new c3d.Object();
	        object.edges = data.edges;
	        for (var i = 0; i < data.vertices.length; i++) {
	            var vertex = data.vertices[i];
	            object.vertices.push(new c3d.Vector4(vertex[0], vertex[1], vertex[2], 1));
	        }
	        self.addObject.call(self, object, initializer, callback);
	    });
	},

	drawLine: function(context, x1, y1, x2, y2) {
	    context.beginPath();
	    context.moveTo(x1 + 0.5, y1 + 0.5);
	    context.lineTo(x2 + 0.5, y2 + 0.5);
	    context.stroke();
	},

	drawText: function(context, text, x, y) {
	    context.fillText(text, x + 0.5, y + 0.5);
	},

	draw: function() {
	    var context = this.context;
	    var viewport = this.viewport;

	    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.fillStyle = this.context.strokeStyle = 'white';

        context.textBaseline = 'top';
        context.font = '14px sans-serif';

	    context.beginPath();
	    this.scene.render(function(vertices, edges) {
	        var points = [];

	        for (var i = 0; i < vertices.length; i++)
	            points.push(viewport.transform(vertices[i]));

	        for (var i = 0; i < edges.length; i++) {
	            var point1 = points[edges[i][0]];
	            var point2 = points[edges[i][1]];

	            if ((point1.z < -3 || point1.z > 1) ||
	                (point2.z < -3 || point2.z > 1)) continue;

	            context.moveTo(point1.x + 0.5, point1.y + 0.5);
	            context.lineTo(point2.x + 0.5, point2.y + 0.5);
	        }
	    });
	    context.stroke();
	},

	drawDebug: function(timeStamp, currentTime) {
        this.context.fillStyle="#BAD0FF";
        if (this.scene.camera !== undefined) {
            this.drawText(this.context, 'orig   x ' + this.scene.camera.cameraLocation.getX().toFixed(2) +
                '  y ' + this.scene.camera.cameraLocation.getY().toFixed(2) + '  z ' + this.scene.camera.cameraLocation.getZ().toFixed(2), 20, this.canvas.height - 60);

            this.drawText(this.context, 'look  x ' + this.scene.camera.lookAtPosition.getX().toFixed(2) +
                '  y ' + this.scene.camera.lookAtPosition.getY().toFixed(2) + '  z ' + this.scene.camera.lookAtPosition.getZ().toFixed(2), 20, this.canvas.height - 40);
        }
	},

	start: function(callback) {
	    var timeStamp = (new Date()).getTime();
	    var startTime = timeStamp / 1000;
	    var self = this;

	    if (typeof(callback) == 'function')
	        this.callbacks.push(callback);

	    function loop() {
	        var currentTime = (new Date()).getTime();
	        var timePast = currentTime / 1000 - startTime;
	        for (var i = 0; i < self.callbacks.length; i++) {
                if(self.callbacks[i])
	               self.callbacks[i](currentTime - timeStamp);
            }
	        self.draw();
            self.drawDebug(timeStamp, currentTime);

	        timeStamp = currentTime;
	        requestAnimFrame(loop);
	    }
	    loop();
	},

};

c3d.Precision = {'Tolerance': 0.01};

c3d.Matrix = function(rows, columns, initialize) {
    this.rows = rows;
    this.columns = columns;
    if (initialize === undefined || initialize) {
        this.values = [];
        for (var i = rows * columns; i > 0; i--)
            this.values.push(0);
    }
};

c3d.Matrix.prototype.copy = function() {
    var copy = new c3d.Matrix(this.rows, this.columns, false);
    copy.values = this.values.slice();
    return copy;
};

c3d.Matrix.prototype.add = function(that) {
    for (var i = this.values.length - 1; i >= 0; i--)
        this.values[i] += that.values[i];
    return this;
};

c3d.Matrix.prototype.subtract = function(that) {
    for (var i = this.values.length - 1; i >= 0; i--)
        this.values[i] -= that.values[i];
    return this;
};


c3d.Matrix.prototype.multiply = function(that) {
    var result = new c3d.Matrix(this.rows, that.columns);
    for (var i = 0; i < this.rows; i++)
        for (var j = 0; j < that.columns; j++)
            for (var k = 0; k < this.columns; k++)
                result.values[result.columns * i + j] +=
                    this.values[this.columns * i + k] *
                    that.values[that.columns * k + j];

    this.columns = that.columns;
    this.values = result.values;
    return this;
};

c3d.Matrix.identity = function(dimension) {
    var result = new c3d.Matrix(dimension, dimension);
    for (var i = 0; i < dimension; i++)
            result.values[dimension * i + i] = 1;
    return result;
};

c3d.Matrix.translation = function(x, y, z) {
    var result = c3d.Matrix.identity(4);
    for (var i = 0; i < 3; i++)
        result.values[4 * i + 3] = arguments[i];
    return result;
};

c3d.Matrix.scaling = function(x, y, z) {
    var result = c3d.Matrix.identity(4);
    for (var i = 0; i < 3; i++)
        result.values[4 * i + i] = arguments[i];
    return result;
};

c3d.Matrix.rotationIndices = {
    'x': [[1, 1], [1, 2], [2, 1], [2, 2]],
    'y': [[0, 0], [2, 0], [0, 2], [2, 2]],
    'z': [[0, 0], [0, 1], [1, 0], [1, 1]]
};

c3d.Matrix.rotation = function(axis, angle) {
    var result = c3d.Matrix.identity(4);
    var values = [Math.cos(angle), -Math.sin(angle), Math.sin(angle), Math.cos(angle)];
    for (var i in values) {
        var row = c3d.Matrix.rotationIndices[axis][i][0];
        var column = c3d.Matrix.rotationIndices[axis][i][1];
        result.values[4 * row + column] = values[i];
    }
    return result;
};

c3d.Vector4 = function(x, y, z, w) {
    c3d.Matrix.call(this, 4, 1, false);
    this.values = [x, y, z, w];
};

c3d.Vector4.prototype = new c3d.Matrix();

c3d.Vector4.prototype.getX = function() { return this.values[0]; }
c3d.Vector4.prototype.getY = function() { return this.values[1]; }
c3d.Vector4.prototype.getZ = function() { return this.values[2]; }
c3d.Vector4.prototype.getW = function() { return this.values[3]; }

c3d.Vector4.prototype.copy = function() {
    return new c3d.Vector4(this.values[0], this.values[1], this.values[2], this.values[3]);
};

c3d.Vector4.prototype.multipliedBy = function(matrix) {
    var result = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++)
        for (var j = 0; j < 4; j++)
            result[i] += matrix.values[i * 4 + j] * this.values[j];
    this.values = result;
    return this;
};

c3d.Vector4.prototype.length = function() {
    return Math.sqrt(Math.pow(this.values[0], 2) + Math.pow(this.values[1], 2) + Math.pow(this.values[2], 2) + Math.pow(this.values[3], 2));
};

c3d.Vector4.prototype.time = function(factor) {
    for (var i = 0; i < 4; i++)
        this.values[i] *= factor;
    return this;
};

c3d.Vector4.prototype.cross3 = function(that) {
    var x = this.values[1] * that.values[2] - this.values[2] * that.values[1];
    var y = this.values[2] * that.values[0] - this.values[0] * that.values[2];
    var z = this.values[0] * that.values[1] - this.values[1] * that.values[0];
    this.values = [x, y, z, 0];
    return this;
};

c3d.Vector4.prototype.dot = function(that) {
    var result = 0;
    for (var i in this.values)
        result += this.values[i] * that.values[i];
    return result;
};

c3d.Vector4.prototype.normalize = function() {
    var factor = 0;
    for (var i = 0; i < 4; i++)
        factor += Math.pow(this.values[i], 2);
    factor = Math.sqrt(factor);
    if (Math.abs(factor) > c3d.Precision.Tolerance)
        for (var i = 0; i < 4; i++)
            this.values[i] /= factor;
    return this;
};

c3d.Vector4.prototype.dividedByW = function() {
    var w = this.values[3];

    if (Math.abs(w - 1) <= c3d.Precision.Tolerance)
        return this;
    if (Math.abs(w) > c3d.Precision.Tolerance) {
        this.values[0] /= w;
        this.values[1] /= w;
        this.values[2] /= w;
    }
    return this;
};

c3d.Math = {};

c3d.Math.noise = function() {
   var abs = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = Math.abs(x[i]);
      return dst;
   };
   var add = function(x, y, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] + y[i];
      return dst;
   };
   var dot = function(x, y) {
      var z = 0;
      for (var i = 0 ; i < x.length ; i++)
         z += x[i] * y[i];
      return z;
   };
   var fade = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i]*x[i]*x[i]*(x[i]*(x[i]*6.0-15.0)+10.0);
      return dst;
   };
   var floor = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = Math.floor(x[i]);
      return dst;
   };
   var fract = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] - Math.floor(x[i]);
      return dst;
   };
   var gt0 = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] > 0 ? 1 : 0;
      return dst;
   };
   var lt0 = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] < 0 ? 1 : 0;
      return dst;
   };
   var mix = function(x, y, t, dst) {
      if (! Array.isArray(x))
         return x + (y - x) * t;
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] + (y[i] - x[i]) * t;
      return dst;
   };
   var mod289 = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] - Math.floor(x[i] * (1.0 / 289.0)) * 289.0;
      return dst;
   };
   var multiply = function(x, y, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] * y[i];
      return dst;
   };
   var multiplyScalar = function(x, s) {
      for (var i = 0 ; i < x.length ; i++)
         x[i] *= s;
      return x;
   };
   var permute = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         tmp0[i] = (x[i] * 34.0 + 1.0) * x[i];
      mod289(tmp0, dst);
      return dst;
   };
   var scale = function(x, s, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] * s;
      return dst;
   };
   var set3 = function(a, b, c, dst) {
      dst[0] = a;
      dst[1] = b;
      dst[2] = c;
      return dst;
   }
   var set4 = function(a, b, c, d, dst) {
      dst[0] = a;
      dst[1] = b;
      dst[2] = c;
      dst[3] = d;
      return dst;
   }
   var subtract = function(x, y, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = x[i] - y[i];
      return dst;
   };
   var taylorInvSqrt = function(x, dst) {
      for (var i = 0 ; i < x.length ; i++)
         dst[i] = 1.79284291400159 - 0.85373472095314 * x[i];
      return dst;
   };

   var HALF4 = [.5,.5,.5,.5];
   var ONE3  = [1,1,1];
   var f     = [0,0,0];
   var f0    = [0,0,0];
   var f1    = [0,0,0];
   var g0    = [0,0,0];
   var g1    = [0,0,0];
   var g2    = [0,0,0];
   var g3    = [0,0,0];
   var g4    = [0,0,0];
   var g5    = [0,0,0];
   var g6    = [0,0,0];
   var g7    = [0,0,0];
   var gx0   = [0,0,0,0];
   var gy0   = [0,0,0,0];
   var gx1   = [0,0,0,0];
   var gy1   = [0,0,0,0];
   var gz0   = [0,0,0,0];
   var gz1   = [0,0,0,0];
   var i0    = [0,0,0];
   var i1    = [0,0,0];
   var ix    = [0,0,0,0];
   var ixy   = [0,0,0,0];
   var ixy0  = [0,0,0,0];
   var ixy1  = [0,0,0,0];
   var iy    = [0,0,0,0];
   var iz0   = [0,0,0,0];
   var iz1   = [0,0,0,0];
   var norm0 = [0,0,0,0];
   var norm1 = [0,0,0,0];
   var nz    = [0,0,0,0];
   var nz0   = [0,0,0,0];
   var nz1   = [0,0,0,0];
   var tmp0  = [0,0,0,0];
   var tmp1  = [0,0,0,0];
   var tmp2  = [0,0,0,0];
   var sz0   = [0,0,0,0];
   var sz1   = [0,0,0,0];
   var t3    = [0,0,0];

   this.noise = function(P) {
      mod289(floor(P, t3), i0);
      mod289(add(i0, ONE3, t3), i1);
      fract(P, f0);
      subtract(f0, ONE3, f1);
      fade(f0, f);

      set4(i0[0], i1[0], i0[0], i1[0], ix );
      set4(i0[1], i0[1], i1[1], i1[1], iy );
      set4(i0[2], i0[2], i0[2], i0[2], iz0);
      set4(i1[2], i1[2], i1[2], i1[2], iz1);

      permute(add(permute(ix, tmp1), iy, tmp2), ixy);
      permute(add(ixy, iz0, tmp1), ixy0);
      permute(add(ixy, iz1, tmp1), ixy1);

      scale(ixy0, 1 / 7, gx0);
      scale(ixy1, 1 / 7, gx1);
      subtract(fract(scale(floor(gx0, tmp1), 1 / 7, tmp2), tmp0), HALF4, gy0);
      subtract(fract(scale(floor(gx1, tmp1), 1 / 7, tmp2), tmp0), HALF4, gy1);
      fract(gx0, gx0);
      fract(gx1, gx1);
      subtract(subtract(HALF4, abs(gx0, tmp1), tmp2), abs(gy0, tmp0), gz0);
      subtract(subtract(HALF4, abs(gx1, tmp1), tmp2), abs(gy1, tmp0), gz1);
      gt0(gz0, sz0);
      gt0(gz1, sz1);

      subtract(gx0, multiply(sz0, subtract(lt0(gx0, tmp1), HALF4, tmp2), tmp0), gx0);
      subtract(gy0, multiply(sz0, subtract(lt0(gy0, tmp1), HALF4, tmp2), tmp0), gy0);
      subtract(gx1, multiply(sz1, subtract(lt0(gx1, tmp1), HALF4, tmp2), tmp0), gx1);
      subtract(gy1, multiply(sz1, subtract(lt0(gy1, tmp1), HALF4, tmp2), tmp0), gy1);

      set3(gx0[0],gy0[0],gz0[0], g0);
      set3(gx0[1],gy0[1],gz0[1], g1);
      set3(gx0[2],gy0[2],gz0[2], g2);
      set3(gx0[3],gy0[3],gz0[3], g3);
      set3(gx1[0],gy1[0],gz1[0], g4);
      set3(gx1[1],gy1[1],gz1[1], g5);
      set3(gx1[2],gy1[2],gz1[2], g6);
      set3(gx1[3],gy1[3],gz1[3], g7);

      taylorInvSqrt(set4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3), tmp0), norm0);
      taylorInvSqrt(set4(dot(g4,g4), dot(g5,g5), dot(g6,g6), dot(g7,g7), tmp0), norm1);

      multiplyScalar(g0, norm0[0]);
      multiplyScalar(g1, norm0[1]);
      multiplyScalar(g2, norm0[2]);
      multiplyScalar(g3, norm0[3]);

      multiplyScalar(g4, norm1[0]);
      multiplyScalar(g5, norm1[1]);
      multiplyScalar(g6, norm1[2]);
      multiplyScalar(g7, norm1[3]);

      mix(set4(g0[0] * f0[0] + g0[1] * f0[1] + g0[2] * f0[2],
               g1[0] * f1[0] + g1[1] * f0[1] + g1[2] * f0[2],
               g2[0] * f0[0] + g2[1] * f1[1] + g2[2] * f0[2],
               g3[0] * f1[0] + g3[1] * f1[1] + g3[2] * f0[2], tmp1),

          set4(g4[0] * f0[0] + g4[1] * f0[1] + g4[2] * f1[2],
               g5[0] * f1[0] + g5[1] * f0[1] + g5[2] * f1[2],
               g6[0] * f0[0] + g6[1] * f1[1] + g6[2] * f1[2],
               g7[0] * f1[0] + g7[1] * f1[1] + g7[2] * f1[2], tmp2), f[2], nz);

      return 2.2 * mix(mix(nz[0],nz[2],f[1]), mix(nz[1],nz[3],f[1]), f[0]);
   };
};

c3d.Math.noise();

c3d.Math.turbulence = function(p, maxPower) {
    var pow = 1.0;
    var sum = 0.0;

    maxPower = (maxPower == undefined) ? 10 : maxPower;

    for (var i = 0; i < maxPower; i++) {
        sum += Math.abs(c3d.Math.noise(p) * pow) / pow;
        pow *= 2.0;
    }

    return sum;
};


c3d.Axes = function(length) {
    if (length === undefined)
        length = 90;
    this.vertices = [
        new c3d.Vector4(0, 0, 0, 1),
        new c3d.Vector4(length, 0, 0, 1),
        new c3d.Vector4(0, length, 0, 1),
        new c3d.Vector4(0, 0, -length, 1)
    ];
    this.edges = [[0, 1], [0, 2], [0, 3]];
};

c3d.Axes.prototype = new c3d.Object();
c3d.Axes.prototype.constructor = c3d.Axes;

c3d.Cube = function(length) {
    c3d.Object.call(this);

    length = length / 2;
    this.vertices = [
        new c3d.Vector4(-length, -length, -length, 1),
        new c3d.Vector4( length, -length, -length, 1),
        new c3d.Vector4(-length,  length, -length, 1),
        new c3d.Vector4( length,  length, -length, 1),
        new c3d.Vector4(-length, -length,  length, 1),
        new c3d.Vector4( length, -length,  length, 1),
        new c3d.Vector4(-length,  length,  length, 1),
        new c3d.Vector4( length,  length,  length, 1),
    ];
    this.edges = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [2, 6], [1, 5], [3, 7]];
}

c3d.Cube.prototype = new c3d.Object();
c3d.Cube.prototype.constructor = c3d.Cube;


c3d.Circle = function(radius, precision, showCenter) {
    c3d.Object.call(this);

    precision = precision || 10;

    var theta = Math.PI * 2 / precision;

    for (var i = 0; i < precision; i++) {
        this.vertices.push(new c3d.Vector4(radius * Math.cos(i * theta), radius * Math.sin(i * theta), 0, 1));
        this.edges.push([i, (i + 1) % precision]);
    }

    if (showCenter) {
        this.vertices.push(new c3d.Vector4(0, 0, 0, 1));
        for (var i = 0; i < precision; i++) {
            this.edges.push([i, this.vertices.length - 1]);
        }
    }
};

c3d.Circle.prototype = new c3d.Object();
c3d.Circle.prototype.constructor = c3d.Circle;


c3d.Sphere = function(radius, verticalPrecison, horizontalPrecision, showCenter) {
    c3d.Object.call(this);

    horizontalPrecision = horizontalPrecision || 10;
    verticalPrecison = verticalPrecison || 10;

    var delta = Math.PI / verticalPrecison;
    for (var i = 0; i <= verticalPrecison; i++) {
        var h = radius * Math.cos(i * delta + Math.PI);
        var r = Math.sqrt(Math.pow(radius, 2) - Math.pow(h, 2));
        var circle = new c3d.Circle(r, horizontalPrecision, showCenter);

        circle.rotateInDegree('x', -90);
        circle.translate(0, h, 0);

        this.edges = this.edges.concat(circle.edgesWithOffset(this.vertices.length));
        this.vertices = this.vertices.concat(circle.transformVertices());
    }

    for (var i = verticalPrecison - 1; i >= 0; i--)
        for (var j = 0; j < horizontalPrecision; j++)
            this.edges.push([i * horizontalPrecision + j, (i + 1) * horizontalPrecision + j]);
};

c3d.Sphere.prototype = new c3d.Object();
c3d.Sphere.prototype.constructor = c3d.Sphere;


c3d.Cylinder = function(radius, length, precision, showCenter) {
    c3d.Object.call(this);

    length = length / 2;

    var circle = new c3d.Circle(radius, precision, showCenter);
    circle.rotateInDegree('x', -90);

    circle.translate(0, length, 0);
    this.edges = circle.edgesWithOffset(0);
    this.vertices = circle.transformVertices();

    circle.resetTranslation();
    circle.translate(0, -length, 0);
    this.edges = this.edges.concat(circle.edgesWithOffset(circle.vertices.length));
    this.vertices = this.vertices.concat(circle.transformVertices());

    for (var i = 0; i < circle.vertices.length; i++)
        this.edges.push([i, i + circle.vertices.length]);
};

c3d.Cylinder.prototype = new c3d.Object();
c3d.Cylinder.prototype.constructor = c3d.Cylinder;


c3d.Line = function(length, precision) {
    c3d.Object.call(this);

    var startingLoc = - length / 2;
    var delta = length / precision;

    this.vertices.push(new c3d.Vector4(0, startingLoc, 0, 1));
    for (var i = 1; i <= precision; i++) {
        this.vertices.push(new c3d.Vector4(0, startingLoc + i * delta, 0, 1));
        this.edges.push([i - 1, i]);
    }
};

c3d.Line.prototype = new c3d.Object();
c3d.Line.prototype.constructor = c3d.Line;


c3d.Plane = function(width, height, horizontalPrecision, verticalPrecison) {
    c3d.Object.call(this);

    var startingLoc = - width / 2;
    var delta = width / horizontalPrecision;
    var line = new c3d.Line(height, verticalPrecison);

    line.translate(startingLoc, 0, 0);
    this.edges = this.edges.concat(line.edgesWithOffset(this.vertices.length));
    this.vertices = this.vertices.concat(line.transformVertices());

    for (var i = 1; i <= horizontalPrecision; i++) {
        line.translate(delta, 0, 0);
        this.edges = this.edges.concat(line.edgesWithOffset(this.vertices.length));
        this.vertices = this.vertices.concat(line.transformVertices());
        for (var j = 0; j < line.vertices.length; j++)
            this.edges.push([(i - 1) * line.vertices.length + j, i * line.vertices.length + j]);
    }

    this.width = width;
    this.height = height;
    this.horizontalPrecision = horizontalPrecision;
    this.verticalPrecison = verticalPrecison;
    this.numberOfVerticesPerColumn = line.vertices.length;
};

c3d.Plane.prototype = new c3d.Object();
c3d.Plane.prototype.constructor = c3d.Plane;

c3d.Math.sine = function(p){
  return 50 * Math.sin( p[0] ) + 80 * Math.cos( p[1] ) + Math.tan(p[2]);
}

c3d.Plane.prototype.noise = function(noiseFunction) {
    for (var i = 0; i <= this.horizontalPrecision; i++) {
        for (var j = 0; j <= this.verticalPrecison; j++) {
            var index = i * this.numberOfVerticesPerColumn + j;
            var x = -  this.width / 2 + i * (this.width  / this.horizontalPrecision);
            var y = - this.height / 2 + j * (this.height / this.verticalPrecison);
            if( x < -20 || x > 20 )
                this.vertices[index].values[2] = Math.abs(10 * noiseFunction(x, y));
        }
    }
}

var requestAnimFrame = (function(callback) {
            return requestAnimationFrame
                    || webkitRequestAnimationFrame
                    || mozRequestAnimationFrame
                    || oRequestAnimationFrame
                    || msRequestAnimationFrame
                    || function(callback) { setTimeout(callback, 1000 / 60); }; })();