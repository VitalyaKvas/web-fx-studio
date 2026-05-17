import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x06070a, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x06070a, 6, 18);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5.2);

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x217eff, 0.9);
rim.position.set(-3, 1, -4);
scene.add(rim);

const group = new THREE.Group();
scene.add(group);

const palette = [0x217eff, 0xa371f7, 0x2ecc71, 0xff5160, 0xbd9f65];
for (let i = 0; i < 5; i++) {
  const geo = new THREE.IcosahedronGeometry(0.45, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i],
    roughness: 0.35,
    metalness: 0.6,
    flatShading: true,
  });
  const m = new THREE.Mesh(geo, mat);
  const a = (i / 5) * Math.PI * 2;
  m.position.set(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8);
  group.add(m);
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4, 64),
  new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.9 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.55;
scene.add(floor);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now();
function frame(t) {
  const dt = (t - last) / 1000;
  last = t;
  group.rotation.y += dt * 0.4;
  group.children.forEach((m, i) => {
    m.rotation.x += dt * (0.6 + i * 0.1);
    m.rotation.y += dt * (0.4 + i * 0.08);
  });
  camera.position.x = Math.sin(t * 0.0003) * 0.4;
  camera.lookAt(0, 0.2, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

console.log('Three.js Orbit — scene mounted · ' + group.children.length + ' meshes');
requestAnimationFrame(frame);
