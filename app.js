import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#art-canvas");
const stageFrame = document.querySelector(".stage-frame");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d7eceb");
scene.fog = new THREE.Fog("#d0e7e4", 14, 34);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 2.2, 13.8);
camera.lookAt(0, 0.6, -2);

const clock = new THREE.Clock();
const pointer = new THREE.Vector2(0, 0);
const sharkRig = new THREE.Group();
const room = new THREE.Group();
const dust = new THREE.Group();
let sharkMixer = null;

scene.add(room);
scene.add(sharkRig);
scene.add(dust);

const ambientLight = new THREE.AmbientLight("#dff6f6", 2.1);
scene.add(ambientLight);

const keyLight = new THREE.SpotLight("#f4ffff", 30, 50, 0.52, 0.55, 1.4);
keyLight.position.set(0, 8, 8);
keyLight.target.position.set(0, 1.5, -1.5);
scene.add(keyLight);
scene.add(keyLight.target);

const sideLight = new THREE.DirectionalLight("#8fd5d7", 1.5);
sideLight.position.set(-6, 2, 5);
scene.add(sideLight);

const fillLight = new THREE.DirectionalLight("#93ffff", 0.8);
fillLight.position.set(6, 4, -8);
scene.add(fillLight);

const roomGeometry = new THREE.BoxGeometry(19, 8.5, 13);
const roomMaterial = new THREE.MeshStandardMaterial({
  color: "#edf0ed",
  roughness: 0.96,
  metalness: 0.02,
  side: THREE.BackSide,
});
const roomMesh = new THREE.Mesh(roomGeometry, roomMaterial);
roomMesh.position.z = -2.4;
room.add(roomMesh);

const floorGeometry = new THREE.PlaneGeometry(17, 11);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: "#6c8f92",
  roughness: 0.9,
  metalness: 0.05,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -2.45, -2.2);
room.add(floor);

const backPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(15.5, 5.6),
  new THREE.MeshStandardMaterial({
    color: "#b7ebe8",
    roughness: 0.18,
    metalness: 0.02,
    transparent: true,
    opacity: 0.78,
  }),
);
backPanel.position.set(0, 0.35, -8.35);
room.add(backPanel);

const tankEdges = new THREE.Mesh(
  new THREE.BoxGeometry(16.25, 6.2, 6.8),
  new THREE.MeshPhysicalMaterial({
    color: "#8cf0f2",
    transmission: 0.94,
    transparent: true,
    opacity: 0.14,
    roughness: 0.08,
    metalness: 0,
    ior: 1.16,
    thickness: 1.6,
    side: THREE.DoubleSide,
  }),
);
tankEdges.position.set(0, 0.05, -2.15);
room.add(tankEdges);

const frameOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(16.25, 6.2, 6.8)),
  new THREE.LineBasicMaterial({
    color: "#4dbdc6",
    transparent: true,
    opacity: 0.55,
  }),
);
frameOutline.position.copy(tankEdges.position);
room.add(frameOutline);

const caustics = new THREE.Mesh(
  new THREE.PlaneGeometry(15.6, 5.8, 128, 64),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      tint: { value: new THREE.Color("#96ffff") },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float time;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        transformed.z += sin((uv.x * 9.0) + time * 0.55) * 0.06;
        transformed.z += cos((uv.y * 13.0) + time * 0.35) * 0.03;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      uniform vec3 tint;

      float wave(vec2 uv, float scale, float speed) {
        return sin(uv.x * scale + time * speed) * cos(uv.y * (scale * 0.7) - time * speed * 0.75);
      }

      void main() {
        float glow = 0.0;
        glow += wave(vUv, 22.0, 0.6);
        glow += wave(vUv.yx, 16.0, 0.4);
        glow = smoothstep(0.55, 1.15, glow);
        float vignette = smoothstep(0.0, 0.18, vUv.x) * smoothstep(0.0, 0.18, 1.0 - vUv.x);
        vignette *= smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.22, 1.0 - vUv.y);
        float alpha = glow * 0.22 * vignette;
        gl_FragColor = vec4(tint, alpha);
      }
    `,
  }),
);
caustics.position.set(0, 0.35, -8.2);
room.add(caustics);

const floorGlow = new THREE.Mesh(
  new THREE.CircleGeometry(4.9, 64),
  new THREE.MeshBasicMaterial({
    color: "#8ef6f7",
    transparent: true,
    opacity: 0.1,
  }),
);
floorGlow.rotation.x = -Math.PI / 2;
floorGlow.position.set(0, -2.43, -2.05);
room.add(floorGlow);

for (let index = 0; index < 120; index += 1) {
  const mote = new THREE.Mesh(
    new THREE.SphereGeometry(0.012 + Math.random() * 0.02, 8, 8),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.5 + Math.random() * 0.04, 0.55, 0.8),
      transparent: true,
      opacity: 0.22 + Math.random() * 0.25,
    }),
  );

  mote.position.set(
    (Math.random() - 0.5) * 13,
    (Math.random() - 0.1) * 5,
    -5 + (Math.random() - 0.5) * 6,
  );
  mote.userData = {
    offset: Math.random() * Math.PI * 2,
    speed: 0.15 + Math.random() * 0.22,
    drift: 0.08 + Math.random() * 0.12,
  };
  dust.add(mote);
}

function enhanceMaterial(material) {
  const artMaterial = material.clone();

  if ("roughness" in artMaterial) {
    artMaterial.roughness = 0.48;
  }
  if ("metalness" in artMaterial) {
    artMaterial.metalness = 0.05;
  }

  artMaterial.transparent = false;
  artMaterial.opacity = 1;
  artMaterial.side = THREE.DoubleSide;
  artMaterial.depthWrite = true;
  artMaterial.envMapIntensity = 1.1;
  artMaterial.alphaTest = 0;

  if ("emissive" in artMaterial) {
    artMaterial.emissive = new THREE.Color("#1e5f65");
    artMaterial.emissiveIntensity = 0.08;
  }

  artMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0 };
    artMaterial.userData.shader = shader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
uniform float time;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `
        #include <color_fragment>
        float waveBand = sin(vViewPosition.y * 2.5 + time * 0.7) * 0.08;
        diffuseColor.rgb += vec3(0.02, 0.09, 0.11) * waveBand;
        diffuseColor.rgb += vec3(0.0, 0.06, 0.07) * sin(vViewPosition.x * 3.5 - time * 0.8) * 0.03;
      `,
    );
  };

  return artMaterial;
}

function createFallbackShark() {
  const fallback = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.85, 3.8, 10, 18),
    new THREE.MeshPhysicalMaterial({
      color: "#7f989e",
      roughness: 0.35,
      metalness: 0.05,
      transmission: 0.15,
      thickness: 0.6,
      clearcoat: 0.5,
    }),
  );
  body.rotation.z = Math.PI / 2;
  fallback.add(body);

  const finMaterial = new THREE.MeshStandardMaterial({
    color: "#6f8b90",
    roughness: 0.56,
    metalness: 0.08,
  });

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 4), finMaterial);
  dorsal.position.set(0.15, 0.85, 0);
  dorsal.rotation.z = -0.15;
  fallback.add(dorsal);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.4, 4), finMaterial);
  tail.position.set(-2.7, 0.1, 0);
  tail.rotation.z = -Math.PI / 2;
  tail.rotation.y = Math.PI / 4;
  fallback.add(tail);

  const sideFinA = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.95, 4), finMaterial);
  sideFinA.position.set(-0.35, -0.62, 0.45);
  sideFinA.rotation.set(0.3, 0.28, -1.1);
  fallback.add(sideFinA);

  const sideFinB = sideFinA.clone();
  sideFinB.position.z = -0.45;
  sideFinB.rotation.y *= -1;
  fallback.add(sideFinB);

  const jaw = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 1.15, 4),
    new THREE.MeshStandardMaterial({
      color: "#d7e5e2",
      roughness: 0.5,
      metalness: 0.02,
    }),
  );
  jaw.position.set(2.25, -0.18, 0);
  jaw.rotation.z = -Math.PI / 2.15;
  jaw.scale.set(0.85, 0.55, 0.7);
  fallback.add(jaw);

  const silhouette = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.05, 4.1, 10, 18),
    new THREE.MeshBasicMaterial({
      color: "#163f46",
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  silhouette.rotation.z = Math.PI / 2;
  silhouette.scale.set(1.02, 0.92, 1.2);
  silhouette.position.z = -0.12;
  fallback.add(silhouette);

  fallback.rotation.y = Math.PI;
  fallback.scale.setScalar(1.26);
  fallback.position.set(0, 0.45, 0);

  return fallback;
}

function centerAndScaleModel(model) {
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  let hasMesh = false;

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry) {
      return;
    }

    if (!child.geometry.boundingBox) {
      child.geometry.computeBoundingBox();
    }

    meshBounds.copy(child.geometry.boundingBox);
    meshBounds.applyMatrix4(child.matrixWorld);

    if (!hasMesh) {
      bounds.copy(meshBounds);
      hasMesh = true;
    } else {
      bounds.union(meshBounds);
    }
  });

  if (!hasMesh) {
    return;
  }

  bounds.getSize(size);
  bounds.getCenter(center);

  model.position.sub(center);
  model.updateMatrixWorld(true);

  const dominantSize = Math.max(size.x, size.y, size.z) || 1;
  const scale = 100.5 / dominantSize;
  model.scale.setScalar(scale);
  model.position.multiplyScalar(scale);
}

const loader = new GLTFLoader();
const fallbackShark = createFallbackShark();
sharkRig.add(fallbackShark);

loader.load(
  "./public/great_white_shark__megalodon.glb",
  (gltf) => {
    const shark = gltf.scene;

    const rawBounds = new THREE.Box3().setFromObject(shark);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBounds.getSize(rawSize);
    rawBounds.getCenter(rawCenter);
    console.log("[Shark] raw bounds size:", rawSize, "center:", rawCenter);

    centerAndScaleModel(shark);

    console.log("[Shark] after centerAndScale — position:", shark.position, "scale:", shark.scale.x);

    shark.position.x = 0;
    shark.position.z = 0;
    shark.position.y = 0;
    shark.rotation.y = Math.PI;

    console.log("[Shark] final position:", shark.position);

    let meshCount = 0;
    shark.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
        child.renderOrder = 2;
        child.material = enhanceMaterial(child.material);
      }
    });
    console.log("[Shark] mesh count:", meshCount);

    if (gltf.animations?.length) {
      sharkMixer = new THREE.AnimationMixer(shark);
      const swimClip =
        gltf.animations.find((clip) => clip.name.includes("Swim")) ?? gltf.animations[0];
      const action = sharkMixer.clipAction(swimClip);
      action.timeScale = 0.45;
      action.play();
    }

    sharkRig.remove(fallbackShark);
    sharkRig.add(shark);
    console.log("[Shark] added to sharkRig. sharkRig children:", sharkRig.children.length);
  },
  undefined,
  (err) => { console.error("[Shark] GLB load error:", err); },
);

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await stageFrame.requestFullscreen().catch(() => {});
  } else {
    await document.exitFullscreen().catch(() => {});
  }
}

stageFrame.addEventListener("dblclick", () => {
  toggleFullscreen();
});

window.addEventListener("pointermove", (event) => {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
});

window.addEventListener("resize", resize);
resize();

function resize() {
  const width = stageFrame.clientWidth;
  const height = stageFrame.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (sharkMixer) {
    sharkMixer.update(delta);
  }

  caustics.material.uniforms.time.value = elapsed;

  sharkRig.position.x = Math.sin(elapsed * 0.18) * 0.9 + pointer.x * 0.22;
  sharkRig.position.y = Math.sin(elapsed * 0.22) * 0.16 + pointer.y * 0.08;
  sharkRig.position.z = -2.2 + Math.cos(elapsed * 0.13) * 0.35;
  sharkRig.rotation.y = Math.PI + Math.sin(elapsed * 0.22) * 0.16 + pointer.x * 0.12;
  sharkRig.rotation.z = Math.sin(elapsed * 0.28) * 0.05;

  if (fallbackShark.parent) {
    fallbackShark.rotation.x = Math.sin(elapsed * 0.45) * 0.03;
    fallbackShark.rotation.z = Math.sin(elapsed * 0.33) * 0.04;
    fallbackShark.position.y = 0.45 + Math.sin(elapsed * 0.5) * 0.08;
  }

  sharkRig.traverse((child) => {
    if (child.material?.userData?.shader) {
      child.material.userData.shader.uniforms.time.value = elapsed;
    }
  });

  dust.children.forEach((mote, index) => {
    const { offset, speed, drift } = mote.userData;
    mote.position.y += Math.sin(elapsed * speed + offset + index) * 0.0008;
    mote.position.x += Math.cos(elapsed * speed * 0.65 + offset) * 0.0005;
    mote.position.z += Math.sin(elapsed * drift + offset) * 0.0007;
  });

  floorGlow.material.opacity = 0.08 + Math.sin(elapsed * 0.7) * 0.02;
  backPanel.material.opacity = 0.74 + Math.sin(elapsed * 0.4) * 0.03;
  tankEdges.rotation.y = Math.sin(elapsed * 0.08) * 0.03;
  frameOutline.rotation.y = tankEdges.rotation.y;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
