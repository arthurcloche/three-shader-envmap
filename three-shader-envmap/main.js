import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { EquirectangularRenderer } from "./components/equiRect.js";

(async () => {
  const container = document.createElement("div"); // Create a container for the renderer
  document.body.appendChild(container); // Append the container to the body

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xff0000);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 6; // Move the camera away from the sphere

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const textureLoader = new THREE.TextureLoader();
  const envMap = textureLoader.load(
    "https://cdn.shopify.com/s/files/1/0817/9308/9592/files/studio-blur.jpg?v=1720074765"
  );
  envMap.mapping = THREE.EquirectangularRefracttMapping;
  envMap.colorSpace = THREE.SRGBColorSpace;
  const bluenoise = textureLoader.load("./bluenoise.png");
  bluenoise.wrapS = THREE.RepeatWrapping;
  bluenoise.wrapT = THREE.RepeatWrapping;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.update();
  const size = 512;
  const equirectangularRenderer = new EquirectangularRenderer(size * 2, size); // Fixed 2:1 aspect ratio
  equirectangularRenderer.shaderMaterial.uniforms.bluenoise.value = bluenoise;
  // Lights
  // const light = new THREE.DirectionalLight(0xffffff, 10);
  // light.position.set(5, 5, 5);
  // scene.add(light);
  // scene.add(new THREE.AmbientLight(0x404040)); // Ambient light for soft illumination
  // skyebox
  const skyeGeometry = new THREE.SphereGeometry(80, 32, 32);
  const skyeMaterial = new THREE.MeshBasicMaterial({
    map: null,
    side: THREE.BackSide,
  });
  const skye = new THREE.Mesh(skyeGeometry, skyeMaterial);
  scene.add(skye);
  // Sphere
  const geometry = new THREE.SphereGeometry(1, 32, 32); // Radius of 1

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 1.0 },
      tMap: { value: null },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      varying mat3 vNormalMatrix;
      // uniform mat3 normalMatrix;
      void main() {
        vNormal = normalize(normal);
        vNormalMatrix = normalMatrix;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
    uniform float time;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying mat3 vNormalMatrix;
    const float PI = 3.141592653589793;
    uniform sampler2D tMap;
    
    vec2 fromSpherical(vec3 position){
      return vec2( atan(position.z, position.x) / (2.0 * PI) + .5, 
      1.0 - acos(position.y) / PI);
    } 
    vec4 sampleSphere(vec3 normal, sampler2D bg) {
      vec2 coord = fromSpherical(normal);
      return texture(bg, (coord));
    }

    void main() {
        vec3 light = vec3(0.5, 0.2, 1.0);
        light = normalize(light);
        vec3 material = vec3(0.0, 0.0, 0.0); 
        float dProd = dot(vNormal, normalize(light));

        vec3 reflection = mix(reflect(normalize(cameraPosition), vNormal), refract(normalize(cameraPosition), vNormal, 1.0 / 1.5), sin(time)*.5+.5);
        vec4 envColor = sampleSphere(reflection, tMap);
        gl_FragColor = envColor;
      }
    `,
  });

  const sphere = new THREE.Mesh(geometry, skyeMaterial);
  sphere.position.y = 2.5;
  scene.add(sphere);

  const sphere2 = new THREE.Mesh(geometry, shaderMaterial);
  sphere2.position.y = 0;
  scene.add(sphere2);

  const knotgeometry = new THREE.TorusKnotGeometry(0.65, 0.25, 128, 64);
  const torusKnot = new THREE.Mesh(knotgeometry, shaderMaterial);
  torusKnot.position.x = -3;
  scene.add(torusKnot);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1),
    new THREE.MeshBasicMaterial({ map: null })
  );
  plane.position.y = -2;
  plane.position.x = -2;
  scene.add(plane);
  const plane2 = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1),
    new THREE.MeshBasicMaterial({ map: null })
  );
  plane2.position.y = -2;
  plane2.position.x = 2;
  scene.add(plane2);
  // equirectangularRenderer.getMesh().position.y = -1;

  // Animation loop
  const animate = (frame) => {
    requestAnimationFrame(animate);

    // Render both projections
    equirectangularRenderer.render(renderer, camera, frame);

    // Get the textures
    const equirectangularTexture =
      equirectangularRenderer.getTexture("equirectangular");
    const cartesianTexture = equirectangularRenderer.getTexture("cartesian");

    // Update materials with the preserved textures
    shaderMaterial.uniforms.tMap.value = equirectangularTexture;
    skyeMaterial.map = equirectangularTexture;
    plane.material.map = equirectangularTexture;
    plane.lookAt(camera.position);

    plane2.material.map = cartesianTexture;
    plane2.lookAt(camera.position);

    torusKnot.rotation.y += 0.01;
    // Render the scene
    controls.update();
    renderer.render(scene, camera);
  };

  animate();
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); // Update renderer size
  });
})();
