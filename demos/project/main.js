var camera, scene, renderer;
var geometry, material, mesh;
var controls;

var objects = [];

var maxGridHeight = 100;
var collisionRadius = 20;
var rMatrix = new THREE.Matrix4().makeRotationY((360-90) * Math.PI / 180);
var bMatrix = new THREE.Matrix4().makeRotationY(180 * Math.PI / 180);
var lMatrix = new THREE.Matrix4().makeRotationY(90 * Math.PI / 180);

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

if ( havePointerLock ) {

	var element = document.body;

	element.addEventListener( 'click', function ( event ) {

		// Ask the browser to lock the pointer
		element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
		element.requestPointerLock();
	}, false );

}

var time = Date.now();

var data,
	worldWidth = 120,
	worldDepth = 120,
	unitSize = 10,
	worldHalfWidth = 750,
	worldHalfDepth = 750;

init();
animate();

function init() {

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x7AABF0, 0, 1000 );

	var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
	light.position.set( 0.5, 1, 0.75 );
	scene.add( light );

	controls = new THREE.PointerLockControls( camera );
	controls.enabled = true;
	scene.add( controls.getObject() );

	data = generateHeight(worldWidth, worldDepth);
	renderTerrain(data, unitSize);

	renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true } );
	renderer.setClearColor( 0xC7EBFF );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById('gameContainer').appendChild( renderer.domElement );
	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	detectCollision();

	var delta = (Date.now() - time) * 2;
	controls.update(delta);

	renderer.render(scene, camera);

	time = Date.now();

	requestAnimationFrame(animate);
}

function renderTerrain(gridData, unitSize){
    var gridWidth = worldWidth = gridData.grid[0].length;
    var gridHeight = worldDepth = gridData.grid.length;
    Window.unitSize = unitSize;

    worldHalfWidth = Math.floor(gridWidth/2) * unitSize;
    worldHalfDepth = Math.floor(gridHeight/2) * unitSize;

	var terrainMaterials = [
		// Snow
		new THREE.MeshLambertMaterial( { 
			color: 0xffffff, ambient: 0x666666, vertexColors: THREE.VertexColors } ),
		// Grass
		new THREE.MeshLambertMaterial( { 
			color: 0x196E26, ambient: 0x444444, vertexColors: THREE.VertexColors } ),
		// Dirt
		new THREE.MeshLambertMaterial( { color: 0x7A5A3D, ambient: 0x444444, vertexColors: THREE.VertexColors } ),
		// Sand
		new THREE.MeshLambertMaterial( { color: 0xEBDBAE, ambient: 0x444444, vertexColors: THREE.VertexColors } ),
		// Shallow Water
		new THREE.MeshLambertMaterial( { color: 0x476EED, ambient: 0x444444, vertexColors: THREE.VertexColors } ),
		// Deep Water
		new THREE.MeshLambertMaterial( { color: 0x243D8C, ambient: 0x444444, vertexColors: THREE.VertexColors } )
	];

    var light = new THREE.Color( 0xffffff );
	var shadow = new THREE.Color( 0XBBBBBB );

    var matrix = new THREE.Matrix4();
    var pxGeometry = new THREE.PlaneGeometry( unitSize, unitSize );
    pxGeometry.faces[ 0 ].vertexColors = [ light, shadow, light ];
    pxGeometry.faces[ 1 ].vertexColors = [ shadow, shadow, light ];
    pxGeometry.faceVertexUvs[ 0 ][ 0 ][ 0 ].y = 0.5;
    pxGeometry.faceVertexUvs[ 0 ][ 0 ][ 2 ].y = 0.5;
    pxGeometry.faceVertexUvs[ 0 ][ 1 ][ 2 ].y = 0.5;
    pxGeometry.applyMatrix( matrix.makeRotationY( Math.PI / 2 ) );
    pxGeometry.applyMatrix( matrix.makeTranslation( unitSize/2, 0, 0 ) );

    var nxGeometry = new THREE.PlaneGeometry( unitSize, unitSize );
    nxGeometry.faces[ 0 ].vertexColors = [ light, shadow, light ];
    nxGeometry.faces[ 1 ].vertexColors = [ shadow, shadow, light ];
    nxGeometry.faceVertexUvs[ 0 ][ 0 ][ 0 ].y = 0.5;
    nxGeometry.faceVertexUvs[ 0 ][ 0 ][ 2 ].y = 0.5;
    nxGeometry.faceVertexUvs[ 0 ][ 1 ][ 2 ].y = 0.5;
    nxGeometry.applyMatrix( matrix.makeRotationY( - Math.PI / 2 ) );
    nxGeometry.applyMatrix( matrix.makeTranslation( - unitSize/2, 0, 0 ) );

    var pyGeometry = new THREE.PlaneGeometry( unitSize, unitSize );
    pyGeometry.faces[ 0 ].vertexColors = [ light, light, light ];
    pyGeometry.faces[ 1 ].vertexColors = [ light, light, light ];
    pyGeometry.faceVertexUvs[ 0 ][ 0 ][ 1 ].y = 0.5;
    pyGeometry.faceVertexUvs[ 0 ][ 1 ][ 0 ].y = 0.5;
    pyGeometry.faceVertexUvs[ 0 ][ 1 ][ 1 ].y = 0.5;
    pyGeometry.applyMatrix( matrix.makeRotationX( - Math.PI / 2 ) );
    pyGeometry.applyMatrix( matrix.makeTranslation( 0, unitSize/2, 0 ) );

    var py2Geometry = new THREE.PlaneGeometry( unitSize, unitSize );
    py2Geometry.faces[ 0 ].vertexColors = [ light, light, light ];
    py2Geometry.faces[ 1 ].vertexColors = [ light, light, light ];
    py2Geometry.faceVertexUvs[ 0 ][ 0 ][ 1 ].y = 0.5;
    py2Geometry.faceVertexUvs[ 0 ][ 1 ][ 0 ].y = 0.5;
    py2Geometry.faceVertexUvs[ 0 ][ 1 ][ 1 ].y = 0.5;
    py2Geometry.applyMatrix( matrix.makeRotationX( - Math.PI / 2 ) );
    py2Geometry.applyMatrix( matrix.makeRotationY( Math.PI / 2 ) );
    py2Geometry.applyMatrix( matrix.makeTranslation( 0, unitSize/2, 0 ) );

    var pzGeometry = new THREE.PlaneGeometry( unitSize, unitSize );
    pzGeometry.faces[ 0 ].vertexColors = [ light, shadow, light ];
    pzGeometry.faces[ 1 ].vertexColors = [ shadow, shadow, light ];
    pzGeometry.faceVertexUvs[ 0 ][ 0 ][ 0 ].y = 0.5;
    pzGeometry.faceVertexUvs[ 0 ][ 0 ][ 2 ].y = 0.5;
    pzGeometry.faceVertexUvs[ 0 ][ 1 ][ 2 ].y = 0.5;
    pzGeometry.applyMatrix( matrix.makeTranslation( 0, 0, unitSize/2 ) );

    var nzGeometry = new THREE.PlaneGeometry( unitSize, unitSize );
    nzGeometry.faces[ 0 ].vertexColors = [ light, shadow, light ];
    nzGeometry.faces[ 1 ].vertexColors = [ shadow, shadow, light ];
    nzGeometry.faceVertexUvs[ 0 ][ 0 ][ 0 ].y = 0.5;
    nzGeometry.faceVertexUvs[ 0 ][ 0 ][ 2 ].y = 0.5;
    nzGeometry.faceVertexUvs[ 0 ][ 1 ][ 2 ].y = 0.5;
    nzGeometry.applyMatrix( matrix.makeRotationY( Math.PI ) );
    nzGeometry.applyMatrix( matrix.makeTranslation( 0, 0, - unitSize/2 ) );

    var positions = [];
    for(var i = 0; i < gridWidth; i++) {
    	for(var j = 0; j < gridHeight; j++) {
    		positions.push([i,j]);
    	}
    }

    var gridHeightRange = getScaledY(gridData.max - gridData.min);
    var stepSize = Math.floor(gridHeightRange/4);
    var gridMaxLevel = getScaledY(gridData.max);
    var waterLevel = getScaledY(gridData.min) + Math.floor(stepSize/2);
    var cx = Math.floor(gridWidth/2);
    var cz = Math.floor(gridHeight/2);


    (function renderTerrain(positions) {
        var geometry = new THREE.Geometry();
        for(var i = 0; i < positions.length; i++) {
            var x = positions[i][0], z = positions[i][1];
            var h = getY( x, z );

            var materialIndex = 1;
            if(h == waterLevel) {
            	materialIndex = 3;
            }
            else if(h >= gridMaxLevel - 1) {
            	materialIndex = 0
            }
            else if(h < gridMaxLevel - 1 && h >= gridMaxLevel - stepSize) {
            	materialIndex = 2
            }
            else if(h < gridMaxLevel - stepSize && h >= waterLevel + 1) {
            	materialIndex = 1;
            }
            else if(h < waterLevel && h >= waterLevel - stepSize){
            	materialIndex = 4;
            }
            else {
            	materialIndex = 5;
            }

            matrix.makeTranslation(
                (x - cx) * unitSize,
                h * unitSize,
                (z - cz) * unitSize
            );

            var px = getY( x + 1, z );
            var nx = getY( x - 1, z );
            var pz = getY( x, z + 1 );
            var nz = getY( x, z - 1 );

            var pxpz = getY( x + 1, z + 1 );
            var nxpz = getY( x - 1, z + 1 );
            var pxnz = getY( x + 1, z - 1 );
            var nxnz = getY( x - 1, z - 1 );

            var a = nx > h || nz > h || nxnz > h ? 0 : 1;
            var b = nx > h || pz > h || nxpz > h ? 0 : 1;
            var c = px > h || pz > h || pxpz > h ? 0 : 1;
            var d = px > h || nz > h || pxnz > h ? 0 : 1;

            if ( a + c > b + d ) {

                var colors = py2Geometry.faces[ 0 ].vertexColors;
                colors[ 0 ] = b === 0 ? shadow : light;
                colors[ 1 ] = c === 0 ? shadow : light;
                colors[ 2 ] = a === 0 ? shadow : light;

                var colors = py2Geometry.faces[ 1 ].vertexColors;
                colors[ 0 ] = c === 0 ? shadow : light;
                colors[ 1 ] = d === 0 ? shadow : light;
                colors[ 2 ] = a === 0 ? shadow : light;

			    py2Geometry.faces[ 0 ].materialIndex = materialIndex;
			    py2Geometry.faces[ 1 ].materialIndex = materialIndex;
                
                geometry.merge( py2Geometry, matrix );

            } else {
                var colors = pyGeometry.faces[ 0 ].vertexColors;
                colors[ 0 ] = a === 0 ? shadow : light;
                colors[ 1 ] = b === 0 ? shadow : light;
                colors[ 2 ] = d === 0 ? shadow : light;

                var colors = pyGeometry.faces[ 1 ].vertexColors;
                colors[ 0 ] = b === 0 ? shadow : light;
                colors[ 1 ] = c === 0 ? shadow : light;
                colors[ 2 ] = d === 0 ? shadow : light;
                
			    pyGeometry.faces[ 0 ].materialIndex = materialIndex;
			    pyGeometry.faces[ 1 ].materialIndex = materialIndex;

                geometry.merge( pyGeometry, matrix );

            }

            if ( ( px != h && px != h + 1 ) || x == 0 ) {

                var colors = pxGeometry.faces[ 0 ].vertexColors;
                colors[ 0 ] = pxpz > px && x > 0 ? shadow : light;
                colors[ 2 ] = pxnz > px && x > 0 ? shadow : light;

                var colors = pxGeometry.faces[ 1 ].vertexColors;
                colors[ 2 ] = pxnz > px && x > 0 ? shadow : light;
                
			    pxGeometry.faces[ 0 ].materialIndex = materialIndex;
			    pxGeometry.faces[ 1 ].materialIndex = materialIndex;

                geometry.merge( pxGeometry, matrix );

            }

            if ( ( nx != h && nx != h + 1 ) || x == worldWidth - 1 ) {

                var colors = nxGeometry.faces[ 0 ].vertexColors;
                colors[ 0 ] = nxnz > nx && x < worldWidth - 1 ? shadow : light;
                colors[ 2 ] = nxpz > nx && x < worldWidth - 1 ? shadow : light;

                var colors = nxGeometry.faces[ 1 ].vertexColors;
                colors[ 2 ] = nxpz > nx && x < worldWidth - 1 ? shadow : light;

                nxGeometry.faces[ 0 ].materialIndex = materialIndex;
    			nxGeometry.faces[ 1 ].materialIndex = materialIndex;

                geometry.merge( nxGeometry, matrix );

            }

            if ( ( pz != h && pz != h + 1 ) || z == worldDepth - 1 ) {

                var colors = pzGeometry.faces[ 0 ].vertexColors;
                colors[ 0 ] = nxpz > pz && z < worldDepth - 1 ? shadow : light;
                colors[ 2 ] = pxpz > pz && z < worldDepth - 1 ? shadow : light;

                var colors = pzGeometry.faces[ 1 ].vertexColors;
                colors[ 2 ] = pxpz > pz && z < worldDepth - 1 ? shadow : light;

			    pzGeometry.faces[ 0 ].materialIndex = materialIndex;
			    pzGeometry.faces[ 1 ].materialIndex = materialIndex;

                geometry.merge( pzGeometry, matrix );

            }

            if ( ( nz != h && nz != h + 1 ) || z == 0 ) {

                var colors = nzGeometry.faces[ 0 ].vertexColors;
                colors[ 0 ] = pxnz > nz && z > 0 ? shadow : light;
                colors[ 2 ] = nxnz > nz && z > 0 ? shadow : light;

                var colors = nzGeometry.faces[ 1 ].vertexColors;
                colors[ 2 ] = nxnz > nz && z > 0 ? shadow : light;

			    nzGeometry.faces[ 0 ].materialIndex = materialIndex;
			    nzGeometry.faces[ 1 ].materialIndex = materialIndex;

                geometry.merge( nzGeometry, matrix );

            }

        }
        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(terrainMaterials));
        scene.add(mesh);
        objects.push(mesh);

        var waterDepth = waterLevel - getScaledY(gridData.min);
        console.log(waterDepth);
		var waterMesh = new THREE.Mesh(new THREE.BoxGeometry(worldWidth * unitSize,  worldDepth * unitSize, waterDepth * unitSize), new THREE.MeshLambertMaterial({ color: 3162475, ambient: 4473924, transparent: true, opacity: 0.9}));
    	waterMesh.material.side = THREE.DoubleSide;
    	waterMesh.rotation.x = -Math.PI / 2;
    	waterMesh.position.set(0, (waterLevel - waterDepth/2) * unitSize, 0);

    	scene.add(waterMesh);

    })(positions);
    controls.getObject().position.set(0, (getScaledY(gridData.max) + 10) * unitSize, 0);
    $('.loading').hide();
}

function generateHeight( width, depth ) {

    var grid = new Array(width), min = Infinity, max = -Infinity, x, z;
    noise.seed(Math.random());
    
    for(x = 0; x < width; x++) {
        grid[x] = new Array(depth);
    }
    for(x = 0; x < width; x++) {
        for(z = 0; z < depth; z++) {
            var xNorm = x / width;
            var zNorm = z / depth;

            var elevation = noise.perlin2(xNorm, zNorm) * 0.5;
            var roughness = noise.perlin2(xNorm, zNorm) * 0.1;
            var detail = noise.perlin2(xNorm, zNorm) * 2.5;

            var height = elevation + (roughness * detail);
            if(height < min) {
                min = height;
            }
            if(height > max) {
                max = height;
            }
            grid[x][z] = height;
        }
    }

    return {
        grid: grid,
        min: min,
        max: max
    };
}

function getY( x, z ) {
    if(data.grid[x] !== undefined) {
        return getScaledY(data.grid[ x ][ z ]) | 0;
    }
    return 0;
}

function getScaledY(y) {
	return Math.round(y * maxGridHeight);
}

function detectCollision() {
	unlockAllDirection();
	
	var rotationMatrix;
	var cameraDirection = controls.getDirection(new THREE.Vector3(0, 0, 0)).clone();
	var cameraPosition = controls.getObject().position;

	var dRay = new THREE.Raycaster(cameraPosition, new THREE.Vector3(0, -1, 0), cameraPosition, collisionRadius);

	var fRay = new THREE.Raycaster(cameraPosition, cameraDirection, cameraPosition, collisionRadius);
	var rRay = new THREE.Raycaster(cameraPosition, cameraDirection.clone().applyMatrix4(rMatrix), cameraPosition, collisionRadius);
	var bRay = new THREE.Raycaster(cameraPosition, cameraDirection.clone().applyMatrix4(bMatrix), cameraPosition, collisionRadius);
	var lRay = new THREE.Raycaster(cameraPosition, cameraDirection.clone().applyMatrix4(lMatrix), cameraPosition, collisionRadius);

	if(dRay.intersectObjects(objects).length > 0){
		controls.isOnObject(true);
	}

	if( fRay.intersectObjects(objects).length > 0 && controls.moveForward()) {
		controls.lockMoveForward(true);	
	}
	if( bRay.intersectObjects(objects).length > 0 && controls.moveBackward()) {
		controls.lockMoveBackward(true);	
	}
	if( rRay.intersectObjects(objects).length > 0 && controls.moveRight()) {
		controls.lockMoveRight(true);	
	}
	if( lRay.intersectObjects(objects).length > 0 && controls.moveLeft()) {
		controls.lockMoveLeft(true);	
	}

	if(cameraPosition.x < -worldHalfWidth){
		cameraPosition.x = -worldHalfWidth;
		controls.velocity.x = 0;
	}
	if(cameraPosition.x > worldHalfWidth) {
		cameraPosition.x = worldHalfWidth;
		controls.velocity.x = 0;
	}
	if(cameraPosition.z > worldHalfDepth) {
		cameraPosition.z = worldHalfDepth;
		controls.velocity.z = 0;
	}
	if(cameraPosition.z < -worldHalfDepth) {
		cameraPosition.z = -worldHalfDepth;
		controls.velocity.z = 0;
	}
}

function lockMovement() {
	if(controls.moveForward()){
		controls.lockMoveForward(true);
	}
	if(controls.moveBackward()){
		controls.lockMoveBackward(true);
	}
	if(controls.moveRight()){
		controls.lockMoveRight(true);
	}
	if(controls.moveLeft()){
		controls.lockMoveLeft(true);
	}
}

function unlockAllDirection(){
	controls.lockMoveForward(false);
	controls.lockMoveBackward(false);
	controls.lockMoveLeft(false);
	controls.lockMoveRight(false);
	controls.isOnObject(false);
}