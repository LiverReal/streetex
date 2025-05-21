//global vars
const lerpFactorModel = 0.1; // Adjust for speed (closer to 1 = faster)


    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    const map = new maplibregl.Map({
        container: 'map',
        style:
            'https://tiles.openfreemap.org/styles/liberty',
        zoom: 18,
        maxZoom: 19,
        minZoom: 16,
        center: [59.408384, 10.452992],
        pitch: 75,
        maxPitch: 80,
        interactive: true,
        projection: 'globe',
        canvasContextAttributes: {antialias: true} // create the gl context with MSAA antialiasing, so custom layers are antialiased
    });

    // parameters to ensure the model is georeferenced correctly on the map
    const modelOrigin = [59.408384, 10.452992];
    const modelAltitude = 0;
    const modelRotate = [Math.PI / 2, 0, 0];

    const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
    );

    // transformation parameters to position, rotate and scale the 3D model onto the map
    const modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        /* Since our 3D model is in real world meters, a scale transform needs to be
        * applied since the CustomLayerInterface expects units in MercatorCoordinates.
        */
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    };


        const customLayer = {
            id: '3d-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd(map, gl) {
                this.camera = new THREE.Camera();
                this.scene = new THREE.Scene();

                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(100, 100, 100);
                directionalLight.castShadow = true;
                this.scene.add(directionalLight);

                directionalLight.shadow.camera.near = 0.1;
                directionalLight.shadow.camera.far = 2000;
                directionalLight.shadow.camera.left = -500;
                directionalLight.shadow.camera.right = 500;
                directionalLight.shadow.camera.top = 500;
                directionalLight.shadow.camera.bottom = -500;

                directionalLight.shadow.mapSize.width = 4096;
                directionalLight.shadow.mapSize.height = 4096;

                const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
                const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
                const ground = new THREE.Mesh(groundGeometry, groundMaterial);
                ground.rotation.x = -Math.PI / 2;
                ground.position.y = modelAsMercatorCoordinate.z + 0.01;
                ground.receiveShadow = true;
                this.scene.add(ground);
this.currentPosition = {
    x: modelTransform.translateX,
    y: modelTransform.translateY,
    z: modelTransform.translateZ
};

this.targetPosition = {
    x: modelTransform.translateX,
    y: modelTransform.translateY,
    z: modelTransform.translateZ
};

                const loader = new GLTFLoader();
                loader.load(
                    'https://maplibre.org/maplibre-gl-js/docs/assets/34M_17/34M_17.gltf',
                    (gltf) => {
                        gltf.scene.traverse(function (node) {
                            if (node.isMesh || node.isLight) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                            }
                        });
                        this.model = gltf.scene;
                        this.scene.add(this.model);

                    }
                );
                this.map = map;

                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true
                });
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                this.renderer.autoClear = false;
            },
            render(gl, args) {

//model loop

if (this.model) {
this.model.rotation.y += 0.001; // Rotate around Y-axis
this.model.position.y += 0; // Move up
}

// Smooth interpolation (lerp)

this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * lerpFactorModel;
this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * lerpFactorModel;
this.currentPosition.z += (this.targetPosition.z - this.currentPosition.z) * lerpFactorModel;


                const rotationX = new THREE.Matrix4().makeRotationAxis(
                    new THREE.Vector3(1, 0, 0),
                    modelTransform.rotateX
                );
                const rotationY = new THREE.Matrix4().makeRotationAxis(
                    new THREE.Vector3(0, 1, 0),
                    modelTransform.rotateY
                );
                const rotationZ = new THREE.Matrix4().makeRotationAxis(
                    new THREE.Vector3(0, 0, 1),
                    modelTransform.rotateZ
                );

                const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
                const l = new THREE.Matrix4()
.makeTranslation(
    this.currentPosition.x,
    this.currentPosition.y,
    this.currentPosition.z
)

                    .scale(
                        new THREE.Vector3(
                            modelTransform.scale,
                            -modelTransform.scale,
                            modelTransform.scale
                        )
                    )
                    .multiply(rotationX)
                    .multiply(rotationY)
                    .multiply(rotationZ);

                this.camera.projectionMatrix = m.multiply(l);
                this.renderer.resetState();
                this.renderer.render(this.scene, this.camera);
                this.map.triggerRepaint();
            }
        };

function moveModelTo(lngLat) {
    const newMerc = maplibregl.MercatorCoordinate.fromLngLat(lngLat, modelAltitude);
    customLayer.targetPosition = {
        x: newMerc.x,
        y: newMerc.y,
        z: newMerc.z
    };
}

// move to your own location
const geolocateControl = new maplibregl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true
  },
  trackUserLocation: true,
  showUserHeading: true,
  showUserLocation: false
});
map.addControl(geolocateControl);

//check  for new location
geolocateControl.on('geolocate', (event) => {
  const { latitude, longitude, accuracy } = event.coords;
  console.log(`You are at ${latitude}, ${longitude} with accuracy of ${accuracy} meters.`);
    setTimeout(() => moveModelTo([longitude, latitude]), 0);
    const now = new Date();
    //const now = new Date("Mon May 19 2025 13:19:15 GMT+0100 (British Summer Time)");
    //const now = new Date("Mon May 19 2025 23:19:15 GMT+0100 (British Summer Time)");
    //const now = new Date("Mon May 19 2025 19:19:15 GMT+0100 (British Summer Time)");
    const sunPos = SunCalc.getPosition(now, latitude, longitude);
    const sunAltitude = sunPos.altitude; // radians, -PI/2 to PI/2
    console.log(`The sun is at ${sunAltitude}, and your date is ${now}`);
    updateSkyLight(sunAltitude);
});


// Day and night colors for sky and fog
const daySkyColor = "#72e7ff";
const nightSkyColor = "#010338";

const dayFogColor = "#61b2f4";
const nightFogColor = "#10125c";

const dayHorizonColor = "#bcfcff";
const nightHorizonColor = "#23254a";

function lerpColor(colorStart, colorEnd, t) {
    // Helper to parse a hex color string like "#RRGGBB" into [red, green, blue] integers
    const parseHexColor = (hexColor) => 
        hexColor.match(/\w\w/g).map(component => parseInt(component, 16));

    const [startRed, startGreen, startBlue] = parseHexColor(colorStart);
    const [endRed, endGreen, endBlue] = parseHexColor(colorEnd);

    const lerpRed = Math.round(startRed + (endRed - startRed) * t);
    const lerpGreen = Math.round(startGreen + (endGreen - startGreen) * t);
    const lerpBlue = Math.round(startBlue + (endBlue - startBlue) * t);

    return `rgb(${lerpRed},${lerpGreen},${lerpBlue})`;
}

// Assume sunAltitude is in radians, 0 at horizon, PI/2 overhead
function updateSkyLight(sunAltitude) {
    // Normalize sunAltitude to 0..1 where 0 = night, 1 = day
    const t = Math.min(Math.max(sunAltitude * 2, 0), 1);
    console.log(`Sunaltitude: ${sunAltitude}, t for colorLerp: ${t}, sunAltitude math operation: ${sunAltitude * 2}`)

    const skyColor = lerpColor(nightSkyColor, daySkyColor, t);
    const fogColor = lerpColor(nightFogColor, dayFogColor, t);
    const horizonColor = lerpColor(nightHorizonColor, dayHorizonColor, t);

    map.setSky({
        'sky-color': skyColor,
        'sky-horizon-blend': 1,
        'horizon-color': horizonColor,
        'horizon-fog-blend': 0.5,
        'fog-color': fogColor,
        'fog-ground-blend': 0.2
    });
}



    map.on('load', () => {
//first adding visuals
        map.addLayer(customLayer);

map.addSource('flat-dem', {
  type: 'raster-dem',
  tiles: ['tiles/{z}/{x}/{y}.png'],
  tileSize: 256,
  encoding: 'mapbox',
  minzoom: 0,
  maxzoom: 0, // 👈 prevent requests for missing tiles
});

    //map.setTerrain({ source: 'flat-dem', exaggeration: 0 });

    map.setSky({
        'sky-color': "#72e7ff",
        'sky-horizon-blend': 1,
        'horizon-color': "#bcfcff",
        'horizon-fog-blend': 0.5,
        'fog-color': "#61b2f4",
        'fog-ground-blend': 0.2
    });

//camera movement
map.dragRotate.disable();    // allow rotation by mouse drag (desktop)
map.touchZoomRotate.disable(); // allow pinch zoom and rotation (mobile)

map.dragPan.disable();      // disable panning (desktop + mobile)

map.keyboard.disable();     // disable keyboard navigation (optional)

map.scrollZoom.disable();   // disable scroll wheel zoom (optional)
map.boxZoom.disable();      // disable box zoom (optional)
map.doubleClickZoom.disable(); // disable zoom on double click (optional)

//zoom vars

// Lerp factor — controls speed (0.1 = 10% per frame)
let lerpFactorCamera = 1;
let lerpFactorZoom = 1;
let zoomSensitivity = 0.002;
let bearingSensitivity = 0.1;
let pitchSensitivity = 0.15;
let dragWindow = 10;

let currentZoom = map.getZoom();
let targetZoom = map.getZoom();
let currentBearing = map.getBearing();
let targetBearing = map.getBearing();
let currentPitch = map.getPitch();
let targetPitch = map.getPitch();

let touchZooming = false;
let isTouch = false;

function handleTouch() {
  isTouch = true;
  console.log("User is using touch input");
  document.getElementById("input").innerHTML = `touch`;
  zoomSensitivity = 0.001;
    bearingSensitivity = 0.4;
    pitchSensitivity = 0;
    lerpFactorCamera = 0.7;
    lerpFactorZoom = 1;
    dragWindow = 20;
  window.removeEventListener('touchstart', handleTouch);
}

function handleMouse() {
  if (!isTouch) {
    document.getElementById("input").innerHTML = `mouse`;
    console.log("User is using mouse input");
    zoomSensitivity = 0.001;
    bearingSensitivity = 0.12;
    pitchSensitivity = 0.13;
    lerpFactorCamera = 0.3;
    lerpFactorZoom = 1;
    dragWindow = 10;
  }
  window.removeEventListener('mousemove', handleMouse);
}

window.addEventListener('touchstart', handleTouch, { once: true });
window.addEventListener('mousemove', handleMouse, { once: true });

//camera zooming (pc)

map.getCanvas().addEventListener('wheel', (event) => {
  event.preventDefault();

  // Calculate zoom delta (invert wheel direction if needed)
  let delta = -event.deltaY * zoomSensitivity;

  // Clamp zoom within map's min/max zoom
  targetZoom = targetZoom + delta;

}, { passive: false });

    let isMouseDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let oldBearing = 0;
    let oldPitch = 75;

//camera panning (pc and touch)
    document.addEventListener('pointerdown', function(e) {
      isMouseDown = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;

    });

    document.addEventListener('pointermove', function(e) {
      if (!isMouseDown) return;
    
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      

      if (Math.abs(dx) > dragWindow || Math.abs(dy) > dragWindow) {
        isDragging = true;
        const centerY = window.innerHeight / 2;
        if (!touchZooming) {
          targetBearing = oldBearing + dx*bearingSensitivity;
          oldPitch = Math.min(Math.max(oldPitch, map.getMinPitch()), map.getMaxPitch());
          targetPitch = oldPitch - dy*pitchSensitivity;
        }

        //console.log(`Dragging... dx=${dx}, dy=${dy}`);
      }
    });

    document.addEventListener('pointerup', function() {
      if (isDragging) {
        //console.log("drag ended");
    oldBearing = targetBearing;
      oldPitch = targetPitch;
      } else {
        //console.log("click");
      }
      isMouseDown = false;
    });

//camera zooming (touch)
let initialDistance = null;

function getDistance(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.hypot(dx, dy);
}

document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialDistance = getDistance(e.touches[0], e.touches[1]);
  }
});

document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && initialDistance !== null) {
    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const zoomFactor = currentDistance / initialDistance;

    document.getElementById("debug").innerHTML = `yo guys this is zoomfactor: ${zoomFactor} and uhh this is how much were zooming rn i think: ${(targetZoom) * (((zoomFactor - 1) * zoomSensitivity) + 1)}`;

    if (zoomFactor > 1.05) {
      touchZooming = true;
      //console.log("Zooming in");
      targetZoom = (targetZoom) * (((zoomFactor - 1) * zoomSensitivity) + 1);
    } else if (zoomFactor < 0.95) {
      touchZooming = true;
      //console.log("Zooming out");
      targetZoom = (targetZoom) * (((zoomFactor - 1) * zoomSensitivity) + 1);
    }

    // Optionally update initialDistance if you want continuous zoom detection
    // initialDistance = currentDistance;
  }
}, { passive: false });

document.addEventListener('touchend', () => {
  initialDistance = null;
  touchZooming = false;
});

document.addEventListener('touchcancel', () => {
  initialDistance = null;
  touchZooming = false;
});

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });


//camera moving
function lerp(start, end, t) {
    return start + (end - start) * t;
}

function animateCamera() {

    //console.log(targetZoom, targetPitch)
    targetZoom = Math.min(Math.max(targetZoom, map.getMinZoom()), map.getMaxZoom());
    targetPitch = Math.min(Math.max(targetPitch, map.getMinPitch()), map.getMaxPitch());

    currentBearing = lerp(currentBearing, targetBearing, lerpFactorCamera);
    currentPitch = lerp(currentPitch, targetPitch, lerpFactorCamera);
    currentZoom = lerp(currentZoom, targetZoom, lerpFactorZoom)

    map.setBearing(currentBearing);
    map.setPitch(currentPitch);
    map.zoomTo(currentZoom);

    requestAnimationFrame(animateCamera);
}

animateCamera();

console.log('All resources finished loading! (mostly)');
    setTimeout(() => { 
        document.getElementById("map").style.opacity = 1;
    }, 300);


});

map.on('render', () => {
//update camera to player movement
  if (customLayer.currentPosition) {
    const mercatorCoord = new maplibregl.MercatorCoordinate(
      customLayer.currentPosition.x,
      customLayer.currentPosition.y,
      customLayer.currentPosition.z
    );
    const lngLat = mercatorCoord.toLngLat();

    const currentCenter = map.getCenter();
    // Check if position changed enough (use a tiny threshold)
    const threshold = 1e-7; // adjust if needed
    const lngDiff = Math.abs(lngLat.lng - currentCenter.lng);
    const latDiff = Math.abs(lngLat.lat - currentCenter.lat);

    if (lngDiff > threshold || latDiff > threshold) {
      map.jumpTo({ center: [lngLat.lng, lngLat.lat] });
    }
  }
});
