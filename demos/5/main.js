var canvas = initCanvas('mainCanvas');

function resizeCanvas(canvas) {
    var w = window.innerWidth,
        h = window.innerHeight;
/*    if(window.innerWidth < window.innerHeight) {
        size = window.innerWidth;
    }

    canvas.width = canvas.height = size;
    canvas.style.width = canvas.style.height = size + 'px';*/

    canvas.width = w;
    canvas.height = h;

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

resizeCanvas(canvas);
window.addEventListener('resize', function(){
    resizeCanvas(canvas);
});

/*var shape = new Shape([], []);

loadShape('shuttle.obj');*/

var ShapeObject = function(params){
    this.path = params.path;
    this.rotate = params.rotate || new vec3(0, 0, 0);
    this.scale = params.scale || 1;
    this.translate = params.translate || new vec3(0, 0, 0);
    this.pairs = params.pairs || 3;
    this.shape = params.shape || new Shape([], []);
}

ShapeObject.prototype = {
    load: function(callback){
        if(!this.path){
            return;
        }
        var self = this;
        $.get(this.path, function(data, status){
            var verts = [], edges = [];
            var v = data.split(/[\r\n]+/);
            for(var i = 0; i < v.length; i++){
                var r = v[i].split(/\s+/);
                if(r[0] == 'v') {
                    verts.push(new vec3(+r[1], +r[2], +r[3]));
                }
                else if(r[0] == 'f') {
                    if(self.pairs < 3) {
                        edges.push([+r[1] - 1, +r[2] - 1]);
                    }
                    else {
                        for(var j = 1; j < self.pairs; j++) {
                            edges.push([+r[j] - 1, +r[j + 1] - 1]);
                        }
                        edges.push([+r[self.pairs] - 1, +r[1] - 1]);
                    }
                }
            }
            self.shape.set(verts, edges);
            if( callback ) {
                callback(self.shape);
            }
        });
    }
}

var xAxis = new Shape([new vec3(0, 0, 0), new vec3(0.1, 0, 0)], [[0, 1]]);
var yAxis = new Shape([new vec3(0, 0, 0), new vec3(0, 0.1, 0)], [[0, 1]]);
var zAxis = new Shape([new vec3(0, 0, 0), new vec3(0, 0, 0.1)], [[0, 1]]);

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(rad) {
    return rad * 180 / Math.PI ;
}

var renderer = (function(canvasEl){
    var scaleMat = new mat(),
        transMat = new mat(),
        rotXMat = new mat(),
        rotYMat = new mat(),
        rotZMat = new mat(),
        shape = new Shape([], []);

    var baseScale = 1, 
        zoomScale = 1,
        rotX = 0,
        rotY = 0,
        rotZ = 0,
        mouseDown = false,
        lastMouseX = null,
        lastMouseY = null,
        showAxis = true;

    // Bind mousewheel for zoom.
    $(canvasEl).bind('wheel mousewheel', function(e){
        if (e.originalEvent.wheelDelta !== undefined)
            delta = e.originalEvent.wheelDelta;
        else
            delta = e.originalEvent.deltaY * -1;

        zoomScale += .5 * baseScale * delta/canvas.height;
        zoomScale = Math.min(Math.max(baseScale - .5 * baseScale, zoomScale), baseScale + .5 * baseScale);

        scaleMat.scale(zoomScale, zoomScale, zoomScale);
    });

    $("#bAxis").on('change', function(){
        showAxis = $(this).prop('checked');
    });

    return {

        setScale: function(x, y, z) {
            scaleMat.scale(x, y, z);
        },

        setTranslation: function(x, y, z) {
            transMat.translate(x, y, z);
        },

        setRotation: function(x, y, z) {
            rotX = x;
            rotY = y;
            rotZ = z;
            rotXMat.rotateX(x);
            rotYMat.rotateY(y);
            rotZMat.rotateZ(z);
        },

        setShape: function(shapeObj) {
            baseScale = zoomScale = shapeObj.scale;
            this.setScale(shapeObj.scale, shapeObj.scale, shapeObj.scale);
            this.setTranslation(shapeObj.translate.x, shapeObj.translate.y, shapeObj.translate.z);
            this.setRotation(shapeObj.rotate.x, shapeObj.rotate.y, shapeObj.rotate.z);
            shape = shapeObj.shape;
        },

        update: function() {
            if(canvasEl.cursor.z === 0) {
                mouseDown = false;
                rotX += degToRad(Math.sin(time))  / 10;
                rotY += degToRad(Math.cos(time))  / 10;
                rotZ += degToRad(Math.cos(time))  / 10;

                rotXMat.rotateX(rotX);
                rotYMat.rotateY(rotY);
                rotZMat.rotateZ(rotZ);
            }
            else if(!mouseDown) {
                mouseDown = true;
                lastMouseX = canvasEl.cursor.x;
                lastMouseY = canvasEl.cursor.y;                
            }
            else {
                var newX = canvasEl.cursor.x,
                    newY = canvasEl.cursor.y;

                rotY += degToRad((newX - lastMouseX) / 10);
                rotX += degToRad((newY - lastMouseY) / 10);

                rotXMat.rotateX(rotX);
                rotYMat.rotateY(rotY);

                lastMouseX = newX;
                lastMouseY = newY;
            }
            this.setTranslation(0,  baseScale * 0.3 * Math.sin(time), 0);
        },

        render: function(g){
            g.fillStyle="gray";
            g.font = "14px sans-serif";
            g.fillText("r    x " + radToDeg(rotX).toFixed(2) + "°   y " + radToDeg(rotY).toFixed(2) + "°   z " + radToDeg(rotZ).toFixed(2) + "°", 20, canvasEl.height - 40);
            g.fillText("s    " + zoomScale.toFixed(2), 20, canvasEl.height - 20);
            g.lineJoin = 'miter';

            if(showAxis) {
                g.lineWidth="2";
                g.strokeStyle = "red";
                xAxis.render(g, canvasEl.width, canvasEl.height, [rotXMat, rotYMat, rotZMat]);
                g.strokeStyle = "green";
                yAxis.render(g, canvasEl.width, canvasEl.height, [rotXMat, rotYMat, rotZMat]);
                g.strokeStyle = "blue";
                zAxis.render(g, canvasEl.width, canvasEl.height, [rotXMat, rotYMat, rotZMat]);                
            }

            g.strokeStyle = "white";
            g.lineWidth = "1";
            shape.render(g, canvasEl.width, canvasEl.height, [scaleMat, rotXMat, rotYMat, rotZMat, transMat]);
        }
    }
})(canvas);

var cube = new ShapeObject({
    path: 'cube.obj',
    rotate: new vec3(Math.PI / 4, Math.PI / 6, -Math.PI / 6),
    scale: 0.2,
    pairs: 2
});

var octahedron = new ShapeObject({
    path: 'octahedron.obj',
    rotate: new vec3(Math.PI / 4, Math.PI / 6, -Math.PI / 6),
    scale: 0.4
});

var dodecahedron = new ShapeObject({
    path: 'dodecahedron.obj',
    rotate: new vec3(Math.PI / 4, Math.PI / 6, -Math.PI / 6),
    scale: 0.4
});

var shuttle = new ShapeObject({
    path: 'shuttle.obj',
    rotate: new vec3(-Math.PI / 4, -Math.PI / 6, Math.PI / 6),
    scale: 0.08
});

var slots = new ShapeObject({
    path: 'slots.obj',
    rotate: new vec3(Math.PI / 4, Math.PI / 6, -Math.PI / 6),
    scale: 0.028
});


$('#mCube').change(function() {
    renderer.setShape(cube);
});

$('#mOctahedron').change(function() {
    renderer.setShape(octahedron);
});

$('#mDodecahedron').change(function() {
    renderer.setShape(dodecahedron);
});

$('#mShuttle').change(function() {
    renderer.setShape(shuttle);
});

$('#mSlots').change(function() {
    renderer.setShape(slots);
});

cube.load();
octahedron.load();
dodecahedron.load();
shuttle.load();
slots.load();
renderer.setShape(cube);

canvas.update = function(g) {
    renderer.update();
    renderer.render(g);
}

