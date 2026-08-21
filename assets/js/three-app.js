import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CAMPUS, CYCLE } from "./data.js";

const scenes = new Map();

function dispose(id) {
  const s = scenes.get(id);
  if (!s) return;
  s.alive = false;
  s.renderer.dispose();
  s.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => m.dispose?.());
    }
  });
  scenes.delete(id);
}

export function killAll() {
  [...scenes.keys()].forEach(dispose);
}

function mount(el, build) {
  const id = el.dataset.scene;
  dispose(id);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(el.clientWidth, el.clientHeight);
  el.innerHTML = "";
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  const rec = { alive: true, renderer, scene, camera, controls, raf: 0, pick: null };
  scenes.set(id, rec);
  build(rec);
  const tick = () => {
    if (!rec.alive) return;
    rec.tick?.(0.016);
    controls.update();
    renderer.render(scene, camera);
    rec.raf = requestAnimationFrame(tick);
  };
  tick();
  const onResize = () => {
    if (!rec.alive) return;
    const w = el.clientWidth, h = el.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  new ResizeObserver(onResize).observe(el);
}

function glassMat(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transmission: 0.72,
    thickness: 0.55,
    roughness: 0.12,
    metalness: 0.04,
    ior: 1.38,
    reflectivity: 0.5,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    transparent: true,
    ...extra,
  });
}

export function homeScene(el) {
  mount(el, (rec) => {
    const { scene, camera } = rec;
    camera.position.set(0, 0.5, 5.4);
    rec.controls.autoRotate = true;
    rec.controls.autoRotateSpeed = 0.45;
    rec.controls.minDistance = 4;
    rec.controls.maxDistance = 9;
    scene.add(new THREE.AmbientLight(0xc8fff8, 0.8));
    const a = new THREE.PointLight(0x4ec4b0, 40, 18);
    a.position.set(3, 3, 2);
    scene.add(a);
    const b = new THREE.PointLight(0x7dce82, 22, 16);
    b.position.set(-3, 1.4, -2);
    scene.add(b);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), glassMat(0x9ceef4, { transmission: 0.55, thickness: 1.1 }));
    scene.add(drop);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: 0x8ee8d8, transparent: true, opacity: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    const nodes = [
      [2.6, 0.2, 0, 0x7ee0c8],
      [1.8, 0.3, 1.8, 0x7eb6ff],
      [0, 0.15, 2.7, 0x8ee08a],
      [-1.8, 0.25, 1.8, 0x9ef0ff],
      [-2.6, 0.2, 0, 0x5ec8e8],
      [-1.8, 0.1, -1.8, 0xc6f0a8],
      [0, 0.2, -2.7, 0x6ed0c0],
      [1.8, 0.15, -1.8, 0xa8e0d0],
    ];
    nodes.forEach(([x, y, z, c]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 }));
      m.position.set(x, y, z);
      scene.add(m);
    });
    rec.tick = () => { drop.rotation.y += 0.003; };
  });
}

export function cycleScene(el, onPick) {
  mount(el, (rec) => {
    const { scene, camera } = rec;
    camera.position.set(0, 1.6, 5.6);
    rec.controls.autoRotate = true;
    rec.controls.autoRotateSpeed = 0.3;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.PointLight(0x7ec8ff, 20, 14).translateX(2).translateY(3));
    const pts = [
      new THREE.Vector3(0, -0.2, 1.8),
      new THREE.Vector3(1.6, 0.9, 0.9),
      new THREE.Vector3(1.4, 1.8, -0.4),
      new THREE.Vector3(0, 2.1, -1.4),
      new THREE.Vector3(-1.5, 1.1, -0.6),
      new THREE.Vector3(-1.7, 0.1, 0.8),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.03, 8, true), new THREE.MeshBasicMaterial({ color: 0x8ee8d8 }));
    scene.add(tube);
    const colors = [0x7eb6ff, 0xc8e8ff, 0x8ee0d0, 0x4ec4b0, 0x7dce82];
    const marks = [];
    CYCLE.forEach((st, i) => {
      const p = curve.getPointAt(i / CYCLE.length);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.35 }));
      m.position.copy(p);
      m.userData.id = st.id;
      scene.add(m);
      marks.push(m);
    });
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), glassMat(0xd8fbff, { transmission: 0.4 }));
    scene.add(drop);
    rec.pick = (id) => onPick?.(id);
    rec.renderer.domElement.addEventListener("click", (e) => {
      const r = rec.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, rec.camera);
      const hit = ray.intersectObjects(marks)[0];
      if (hit) rec.pick(hit.object.userData.id);
    });
    let t = 0;
    rec.tick = (d) => {
      t += d * 0.05;
      curve.getPointAt(t % 1, drop.position);
    };
  });
}

export function lifeScene(el) {
  mount(el, (rec) => {
    const { scene, camera } = rec;
    camera.position.set(0, 0.5, 6.2);
    rec.controls.autoRotate = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.PointLight(0x7ec8ff, 22, 14).translateX(2.4).translateY(2.8));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 48), glassMat(0x6ed0e0, { transmission: 0.5, thickness: 0.9 })));
    const rings = [
      { r: 1.7, c: 0x7eb6ff, s: 0.35 },
      { r: 2.15, c: 0x8ee0d0, s: -0.22 },
      { r: 2.6, c: 0x7dce82, s: 0.16 },
    ];
    const groups = rings.map((rg) => {
      const g = new THREE.Group();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(rg.r, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: rg.c, transparent: true, opacity: 0.55 }));
      torus.rotation.x = Math.PI / 2.4;
      g.add(torus);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), glassMat(rg.c, { transmission: 0.35 }));
      bead.position.set(rg.r, 0, 0);
      g.add(bead);
      scene.add(g);
      return { g, s: rg.s };
    });
    rec.tick = (d) => groups.forEach((x) => { x.g.rotation.y += x.s * d; });
  });
}

export function saveScene(el, onPick) {
  mount(el, (rec) => {
    const { scene, camera } = rec;
    camera.position.set(3.4, 3.6, 4.4);
    rec.controls.autoRotate = true;
    rec.controls.autoRotateSpeed = 0.28;
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    scene.add(new THREE.PointLight(0xe8ffff, 28, 18).translateX(2).translateY(4));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ color: 0x0a3a40, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.32;
    scene.add(floor);
    const rooms = [
      { id: "bath", c: 0x7eb6ff, p: [-1.35, 0.2, 0.4] },
      { id: "kitchen", c: 0x4ec4b0, p: [1.35, 0.2, 0.4] },
      { id: "laundry", c: 0x8ee0d0, p: [-1.35, 0.2, -1.5] },
      { id: "garden", c: 0x7dce82, p: [1.35, 0.2, -1.5] },
    ];
    const boxes = rooms.map((r) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.3), glassMat(r.c, { transmission: 0.45, thickness: 0.4 }));
      m.position.set(...r.p);
      m.userData.id = r.id;
      scene.add(m);
      return m;
    });
    rec.renderer.domElement.addEventListener("click", (e) => {
      const r = rec.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, rec.camera);
      const hit = ray.intersectObjects(boxes)[0];
      if (hit) onPick?.(hit.object.userData.id);
    });
  });
}

export function campusScene(el, onPick) {
  mount(el, (rec) => {
    const { scene, camera } = rec;
    camera.position.set(10, 11, 12);
    rec.controls.maxPolarAngle = 1.2;
    rec.controls.minDistance = 8;
    rec.controls.maxDistance = 22;
    rec.controls.autoRotate = true;
    rec.controls.autoRotateSpeed = 0.25;
    scene.add(new THREE.AmbientLight(0xc8e8e0, 0.85));
    scene.add(new THREE.DirectionalLight(0xfff2d8, 1.1).translateX(6).translateY(10).translateZ(4));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), new THREE.MeshStandardMaterial({ color: 0x1a4a3a, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.2), glassMat(0x2a7d9b, { transmission: 0.35, roughness: 0.18, color: 0x1a6a88 }));
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.03, -6.4);
    scene.add(river);
    const road = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 9), new THREE.MeshStandardMaterial({ color: 0x3a3a42 }));
    road.position.set(0, 0.03, 2);
    scene.add(road);

    const meshes = [];
    CAMPUS.forEach((b) => {
      const x = (b.x - 500) / 55;
      const z = (b.y - 380) / 55;
      const w = b.w / 55;
      const d = b.h / 55;
      const h = b.jal ? 0.95 : 0.7;
      const mat = b.jal
        ? glassMat(new THREE.Color(b.color), { transmission: 0.38, thickness: 0.35 })
        : new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.45, metalness: 0.08 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.35), h, Math.max(d, 0.28)), mat);
      m.position.set(x, h / 2, z);
      m.userData.id = b.id;
      scene.add(m);
      meshes.push(m);
    });
    for (let i = 0; i < 28; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6), new THREE.MeshStandardMaterial({ color: 0x2f7a45 }));
      t.position.set((Math.random() - 0.5) * 16, 0.28, (Math.random() - 0.5) * 10);
      scene.add(t);
    }
    rec.renderer.domElement.addEventListener("click", (e) => {
      const r = rec.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, rec.camera);
      const hit = ray.intersectObjects(meshes)[0];
      if (hit) onPick?.(hit.object.userData.id);
    });
  });
}
