$(function(){

    function randRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }

    function radToDeg(rad) {
        return rad * 180 / Math.PI ;
    }

    var canvas = $('#mainCanvas')[0];

    var world = new c3d.C3D(canvas);
    var camera = world.scene.camera;
    var totalTime = 0.0;

    var resizeCanvas = function(w, h) {
        world.viewport.set(w, h);
        camera.set(w/h, world.fovx);
        canvas.width = w;
        canvas.height = h;
    }
    resizeCanvas(window.innerWidth, window.innerHeight);

    $(window).on('resize', function(){
        resizeCanvas(window.innerWidth, window.innerHeight);
    });


    function generateSphere() {
        var ranRad = randRange(0.5, 10);
        world.addObject(new c3d.Sphere(ranRad, 20, 20), function(object) {
            object.translate(randRange(-10, 10), -10 + ranRad/2, -210);
        }, function(timePast, object) {
            object.rotate('x', timePast/50 * Math.PI / 4);
            object.translate(0, 0, 0.5);
            if(object.translationMatrix.values[11] > 2) {
                world.removeObject(object);
                object = null;
            }
        });    
    }

    function generateCylinder() {
        var ranRad = randRange(0.4, 5);
        world.addObject(new c3d.Cylinder(ranRad, 5, 20, true), function(object) {
            object.translate(randRange(-5, 5), -10 + ranRad/2, -210);
            object.rotate('z', Math.PI / 2);
        }, function(timePast, object) {
            object.rotate('x', -timePast/50 * Math.PI / 4);
            object.translate(0, 0, 0.5);
            if(object.translationMatrix.values[11] > 2) {
                world.removeObject(object);
                object = null;
            }
        });   
    }

    world.addObject(new c3d.Plane(400, 500, 70, 70, true), function(object) {
        object.translate(0, -10, -1);
        object.rotate('x', (-90 / 180) * Math.PI);
    }, function(timePast, object) {
        totalTime += timePast / 1000;
        object.noise(function(x, y) {
            return c3d.Math.noise([x + totalTime / 5 , y + Math.cos(totalTime / 5), Math.sin(totalTime / 5)]);
        });
    });

    var lastGen = 0, randTime = 0;
    world.start(function(timePast){
        lastGen += timePast;
        if(lastGen > randTime) {
            lastGen = 0;
            randTime = randRange(1000, 3000);
            var shapeType = randRange(0, 10);
            if(shapeType < 5) {
                generateSphere();
            }
            else {
                generateCylinder();
            }                
        }
    });

    var canvasOffset = $(canvas).offset();
    $(canvas).on('mousemove', function(e) {
        var cx = canvasOffset.left + canvas.width / 2;
        var cy = canvasOffset.top + canvas.height / 2;
        var mx = e.pageX;
        var my = e.pageY;
        world.scene.camera.lookAt(new c3d.Vector4(0, 0, 0, 1), new c3d.Vector4(0, 0, -1, 1), new c3d.Vector4(0, 1, 0, 1));
        world.scene.camera.lookAtPosition.values = [0,0,-1,1];
        world.scene.camera.upDirection.values = [0,1,0,0];
        world.scene.camera.rotate( degToRad(-(my-cy)/50), degToRad(-(mx-cx)/50), 0 );
    });
});