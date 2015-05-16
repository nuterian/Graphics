function degToRad(deg) {
    return deg * Math.PI / 180;
}

THREE.Object3D.prototype.clear = function(){
    var children = this.children;
    for(var i = children.length-1;i>=0;i--){
        var child = children[i];
        child.clear();
        this.remove(child);
    };
};

var Scene = function() {
    var time = 0, paused = true, camera, renderer, frameId;
    
    var that = this;
    this.init = function(name) {
        renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true } );
        document.getElementById(name).innerHTML = '';
        document.getElementById(name).appendChild(renderer.domElement);
    };

    this.create = function() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
        this.camera.position.set(-1000, 1000, 1000);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = - Math.PI / 4;
        this.camera.rotation.x = Math.atan( - 1 / Math.sqrt( 2 ) );
        this.scene.add(this.camera);

        $(window).on('resize', function(){
            that.resize(window.innerWidth, window.innerHeight);
        });
        this.resize(window.innerWidth, window.innerHeight);
        this.setup();
    };

    this.destroy = function() {
        paused = true;
        cancelAnimationFrame(frameId);
        if(this.scene) {
            this.scene.clear();
            this.scene = null;   
        }
        this.camera = null;
    };

    this.run = function(){
        // START THE ANIMATION LOOP.
        paused = false;
        time = (new Date().getTime()) / 1000;
        (function tick() {
            if(paused) return;
            var prevTime = time;
            var dt = (time = (new Date().getTime()) / 1000) - prevTime; 
            that.update(dt);
            renderer.render(that.scene, that.camera);
            frameId = requestAnimationFrame(tick);
        })();
    };

    this.pause = function() {
        paused = true;
    };

    this.unpause = this.run;

    this.resize = function(w, h) {
        that.camera.aspect = w / h;
        that.camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
};


///////////////////////////////////////////////////////////////////////////////////////////////////

function createShadowedLight( x, y, z, color, intensity ) {
    light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);

    //light.castShadow = true;
    //light.shadowCameraVisible = true;

    light.shadowMapWidth = 1024;
    light.shadowMapHeight = 1024;

    var d = 300;
    light.shadowCameraLeft  = -d;
    light.shadowCameraRight     = d;
    light.shadowCameraTop       = d;
    light.shadowCameraBottom    = -d;

    light.shadowCameraFar = 1000;
    light.shadowDarkness = 0.3;

    return light;
}

function generateMap(width, depth) {
    var data = [], min = Infinity, max = -Infinity;
    noise.seed(Math.random());
    for(var x = 0; x < width; x++) {
        for(var z = 0; z < depth; z++) {
            var xNorm = x / width;
            var zNorm = z / depth;
            var elevation = noise.perlin2(xNorm, zNorm);
            var roughness = noise.perlin2(xNorm, zNorm);
            var detail = noise.perlin2(xNorm, zNorm);
            var height = elevation + (roughness * detail);
            if(height < min) {
                min = height;
            }
            if(height > max) {
                max = height;
            }
            data.push(height);
        }
    }
    return {
        map: data,
        min: min,
        max: max
    };
}
    
$(function(){

    var gen = false, demoScene = new Scene();
    demoScene.init('mainCanvas');

    demoScene.setup = function() {
        var worldWidth = 25 + Math.floor(Math.random() * 5), 
            worldDepth = 25 + Math.floor(Math.random() * 5), 
            worldHeight = 15 + Math.floor(Math.random() * 5);

        var data = generateMap(worldWidth, worldDepth);

        var light = new THREE.DirectionalLight(0xFFF3C2, 0.9);
        light.position.set(-300, 10, 0);
        this.scene.add(light);
        this.scene.add(new THREE.AmbientLight(0x222222));
        this.scene.add(createShadowedLight(0, 400, 300, 0xDFF4FF, 2));

        var cubeSize = 20;
        var grassGeometry = new THREE.Geometry();
        var groundGeometry = new THREE.Geometry();
        var waterGeometry = new THREE.Geometry();
        var boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        var matrix = new THREE.Matrix4();

        var worldHalfWidth = worldWidth/2 * cubeSize, 
            worldHalfDepth = worldDepth/2 * cubeSize;

        var maxHalfHeight = Math.round(Math.abs( (data.max * worldHeight + 2) / 2));

        for(var x = 0; x < worldWidth; x++) {

            for(var z = 0; z < worldDepth; z++) {

                var halfHeight = Math.round(Math.abs( (data.map[x * worldDepth + z] * worldHeight + 2) / 2));

                for(var y = -halfHeight; y < halfHeight; y++) {

                    matrix.makeTranslation(x * cubeSize - worldHalfWidth, y * cubeSize, z * cubeSize - worldHalfDepth);

                    if(y < halfHeight - 1) {
                        groundGeometry.merge(boxGeometry, matrix);
                    }
                    else {
                        grassGeometry.merge(boxGeometry, matrix);
                    }               
                }


                for(var w = -maxHalfHeight; w < -halfHeight; w++) {
                    matrix.makeTranslation(x * cubeSize - worldHalfWidth, w * cubeSize, z * cubeSize - worldHalfDepth);
                    waterGeometry.merge(boxGeometry, matrix);                    
                }
            }
        }

        var grassMesh = new THREE.Mesh( grassGeometry, new THREE.MeshLambertMaterial({ color: 0x288A37}) );
        var groundMesh = new THREE.Mesh( groundGeometry, new THREE.MeshLambertMaterial({ color: 0x523E29 }) );
        var waterMesh = new THREE.Mesh( waterGeometry, new THREE.MeshLambertMaterial({ color: 0x005EFF, transparent: true, opacity: 0.7 }) );

        this.scene.add(grassMesh);
        this.scene.add(groundMesh);
        this.scene.add(waterMesh);
    };

    var totalTime = 0;
    demoScene.update = function(dt) {
        totalTime += dt;
        this.camera.position.x += 5 * Math.sin(totalTime);
        this.camera.up = new THREE.Vector3(0,1,0);
        this.camera.lookAt(new THREE.Vector3(0,0,0));
    };

    function generateScene() {
        demoScene.destroy();
        demoScene.create();
        totalTime = 0;
        demoScene.run();
        gen = false;
        $("#regenBtn").prop("disabled", false);
        $("#regenBtn").val("Re-generate terrain");
    }
    generateScene();

    $("#regenBtn").on("click", function() {
        if(gen) return false;
        gen = true;
            
        $(this).prop("disabled", true);
        $(this).val("Generating...");
        setTimeout(generateScene, 100);
    });

});