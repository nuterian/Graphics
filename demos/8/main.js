function degToRad(deg) {
    return deg * Math.PI / 180;
}

var Scene = function() {
    var time = 0, paused = true, camera, renderer;
    
    var that = this;
    this.init = function(name) {
        this.reset();
        // CREATE THE WEBGL RENDERER, AND ATTACH IT TO THE DOCUMENT BODY.
        renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true } );
        document.getElementById(name).innerHTML = '';
        document.getElementById(name).appendChild(renderer.domElement);

        $(window).on('resize', function(){
            that.resize(window.innerWidth, window.innerHeight);
        });
        this.resize(window.innerWidth, window.innerHeight);

        this.setup();
     };

     this.reset = function() {
        paused = true;
        this.scene = new THREE.Scene();

        // CREATE THE CAMERA, AND ATTACH IT TO THE SCENE
        this.camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
        this.camera.position.set(-1000, 1000, 1000);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = - Math.PI / 4;
        this.camera.rotation.x = Math.atan( - 1 / Math.sqrt( 2 ) );
        this.scene.add(this.camera);
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
            requestAnimationFrame(tick);
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
    }
}
    
$(function(){

    var gen = false, demoScene;
    function generateScene() {
        if(demoScene) {
            demoScene.pause();
        }

        demoScene = new Scene();

        var cube;
        demoScene.setup = function(){
            /// SETUP LIGHTS
            /////////////////////////////
            this.scene.add(new THREE.AmbientLight(0x222222));
            var light = new THREE.DirectionalLight(0xFFF3C2, 0.9);
            light.position.set(-300, 10, 0);
            this.scene.add(light);
            light = createShadowedLight(0, 400, 300, 0xDFF4FF, 2);
            this.scene.add(light);

            var cubeSize = 20;
            var cubeHalfSize = cubeSize / 2;
            var grassGeometry = new THREE.Geometry();
            var groundGeometry = new THREE.Geometry();
            var waterGeometry = new THREE.Geometry();
            var boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            var matrix = new THREE.Matrix4();

            var worldWidth = 30, worldDepth = 30, worldHeight = 20;
            var worldHalfWidth = worldWidth/2 * cubeSize, worldHalfDepth = worldDepth/2 * cubeSize;
            var data = generateMap(worldWidth, worldDepth);
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
            var waterMesh = new THREE.Mesh( waterGeometry, new THREE.MeshLambertMaterial({ color: 0x005EFF }) );

            this.scene.add(grassMesh);
            this.scene.add(groundMesh);
            this.scene.add(waterMesh);

            gen = false;
            $("#regenBtn").prop("disabled", false);
            $("#regenBtn").val("Re-generate terrain");
        };
        demoScene.init('mainCanvas');

        var tot = 0;
        demoScene.update = function(dt) {
            tot += dt;
            this.camera.position.x += 5 * Math.sin(tot);
            this.camera.up = new THREE.Vector3(0,1,0);
            this.camera.lookAt(new THREE.Vector3(0,0,0));
        };
        demoScene.run();
    }
    generateScene();

    $("#regenBtn").on("click", function() {
        if(gen === true) return false;
        gen = true;
            
        $(this).prop("disabled", true);
        $(this).val("Generating...");
        setTimeout(generateScene, 100);
    });

});