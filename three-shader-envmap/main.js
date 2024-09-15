import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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
  camera.position.z = 5; // Move the camera away from the sphere

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const textureLoader = new THREE.TextureLoader();
  const envMap = textureLoader.load(
    "https://cdn.shopify.com/s/files/1/0817/9308/9592/files/studio-blur.jpg?v=1720074765"
  );
  scene.background = envMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.update();

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 10);
  light.position.set(5, 5, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040)); // Ambient light for soft illumination
  // skyebox
  const skyeGeometry = new THREE.SphereGeometry(100, 32, 32);
  const skyeMaterial = new THREE.MeshBasicMaterial({
    map: envMap,
    side: THREE.BackSide,
  });
  const skye = new THREE.Mesh(skyeGeometry, skyeMaterial);
  scene.add(skye);
  // Sphere
  const geometry = new THREE.SphereGeometry(1, 32, 32); // Radius of 1
  const material = new THREE.MeshPhongMaterial({
    color: 0x000000,
    shininess: 100,
  });

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 1.0 },
      tMap: { value: envMap },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      const float PI = 3.141592653589793;
      uniform sampler2D tMap;
      vec2 fromSpherical(vec3 position){

    return vec2(
        atan(position.z, position.x) / (2.0 * PI) + .5, 
         1.0 - acos(position.y) / PI
    );
} 

      vec4 sampleSphere(vec3 normal, sampler2D bg) {

  vec2 coord = fromSpherical(normal);
    
  return texture(bg, fract(coord));
}


      void main() {
        vec3 light = vec3(0.5, 0.2, 1.0);
        light = normalize(light);
        vec3 material = vec3(0.5, 0.2, 0.5); 
        float dProd = dot(vNormal, normalize(cameraPosition));

        vec3 reflection = reflect(normalize(cameraPosition), vNormal);
        vec4 envColor = sampleSphere(reflection, tMap);
        gl_FragColor = vec4(material,1.) + envColor * dProd;
      }
    `,
  });

  const sphere = new THREE.Mesh(geometry, shaderMaterial);
  scene.add(sphere);

  // Animation loop
  const animate = (frame) => {
    requestAnimationFrame(animate);
    sphere.position.y = Math.sin(((Math.PI * frame) / 2000) * 2);
    controls.update();
    renderer.render(scene, camera);
  };

  animate();
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
    camera.updateProjectionMatrix(); // Update the projection matrix
    renderer.setSize(window.innerWidth, window.innerHeight); // Update renderer size
  });
})();
