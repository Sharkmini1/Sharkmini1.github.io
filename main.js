// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0, 12, -24);
camera.lookAt(0,0,0);

// Renderer
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 100, 50);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);

// Ground
const groundMat = new THREE.MeshStandardMaterial({color: 0x228B22});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// Roads + buildings
function createCity() {
  const roadMat = new THREE.MeshStandardMaterial({color: 0x333333});
  for(let x = -200; x <= 200; x += 50) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 400), roadMat);
    road.position.set(x, 0.05, 0);
    road.receiveShadow = true;
    scene.add(road);
  }
  for(let z = -200; z <= 200; z += 50) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(400, 0.1, 5), roadMat);
    road.position.set(0, 0.05, z);
    road.receiveShadow = true;
    scene.add(road);
  }
  const bMat = new THREE.MeshStandardMaterial({color: 0xb0b0b0});
  for(let i = 0; i < 50; i++) {
    const height = Math.random()*20 + 5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(10, height, 10), bMat);
    b.position.set((Math.random()-0.5)*400, height/2, (Math.random()-0.5)*400);
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
  }
}
createCity();

// Load car model
const loader = new THREE.GLTFLoader();

let player;
loader.load('assets/car_red.glb', gltf => {
  player = gltf.scene;
  player.traverse(child => {
    if(child.isMesh){
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  player.scale.set(0.6, 0.6, 0.6);
  player.position.set(0, 0, 0);
  scene.add(player);
});

// AI cars array
const aiCars = [];
function loadAICars() {
  for(let i=0; i<5; i++) {
    loader.load('assets/car_blue.glb', gltf => {
      let aiCar = gltf.scene.clone();
      aiCar.traverse(c => {
        if(c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      aiCar.scale.set(0.6, 0.6, 0.6);
      aiCar.position.set((Math.random()-0.5)*200, 0, (Math.random()-0.5)*200);
      aiCar.userData = {angle: Math.random()*Math.PI*2, speed: 3 + Math.random()*2};
      scene.add(aiCar);
      aiCars.push(aiCar);
    });
  }
}
loadAICars();

// Controls & joystick
const stick = document.getElementById('stick');
let joyActive = false, joyStart = {x:0,y:0};
let joyX = 0, joyY = 0;
const DEAD_ZONE = 0.15;

document.getElementById('joystick').addEventListener('touchstart', e => {
  joyActive = true;
  joyStart.x = e.touches[0].clientX;
  joyStart.y = e.touches[0].clientY;
});

document.addEventListener('touchmove', e => {
  if (!joyActive) return;
  const dx = e.touches[0].clientX - joyStart.x;
  const dy = e.touches[0].clientY - joyStart.y;
  joyX = Math.max(-1, Math.min(1, dx / 50));
  joyY = Math.max(-1, Math.min(1, dy / 50));
  // Dead zone to avoid jitter
  if(Math.abs(joyX) < DEAD_ZONE) joyX = 0;
  if(Math.abs(joyY) < DEAD_ZONE) joyY = 0;
  stick.style.transform = `translate(${joyX*35}px, ${joyY*35}px)`;
});

document.addEventListener('touchend', () => {
  joyActive = false;
  joyX = 0; joyY = 0;
  stick.style.transform = `translate(0,0)`;
});

// Keyboard fallback
const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Movement vars
let speed = 0, dir = 0;

// Animate loop
let last = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - last)/1000;
  last = now;

  if(!player) return; // wait for model load

  // Controls input
  const forward = joyY || (keys['w'] ? -1 : keys['s'] ? 1 : 0);
  const turn = joyX || (keys['a'] ? -1 : keys['d'] ? 1 : 0);

  // Update speed & direction smoothly
  speed += -forward * 25 * dt;
  speed *= 0.95; // friction
  dir += turn * dt * 3 * speed / 10;

  // Move player
  player.position.x += Math.sin(dir) * speed * dt;
  player.position.z += Math.cos(dir) * speed * dt;
  player.rotation.y = dir;

  // AI cars movement
  aiCars.forEach(ai => {
    ai.position.x += Math.sin(ai.userData.angle) * ai.userData.speed * dt * 10;
    ai.position.z += Math.cos(ai.userData.angle) * ai.userData.speed * dt * 10;
    if(Math.random() < 0.01) ai.userData.angle += (Math.random() - 0.5) * 0.5;
    ai.rotation.y = ai.userData.angle;
  });

  // Camera follow smoothly
  const camTarget = new THREE.Vector3(
    player.position.x - 18 * Math.sin(dir),
    10,
    player.position.z - 18 * Math.cos(dir)
  );
  camera.position.lerp(camTarget, 0.1);
  camera.lookAt(player.position);

  // HUD update
  document.getElementById('speed').textContent = 'Speed: ' + (speed * 3.6).toFixed(1);

  renderer.render(scene, camera);
}

animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});