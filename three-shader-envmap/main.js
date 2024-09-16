import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { EquirectangularRenderer } from "./components/equiRect.js";

await (async () => {
  const container = document.createElement("div"); // Create a container for the renderer
  document.body.appendChild(container); // Append the container to the body

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 6; // Move the camera away from the sphere

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const textureLoader = new THREE.TextureLoader();
  const envMap = textureLoader.load(
    "https://cdn.shopify.com/s/files/1/0817/9308/9592/files/studio-blur.jpg?v=1720074765"
  );
  envMap.mapping = THREE.EquirectangularReflectMapping;
  envMap.colorSpace = THREE.SRGBColorSpace;
  const bluenoise = textureLoader.load(
    "https://cdn.shopify.com/s/files/1/0817/9308/9592/files/cb49c003b454385aa9975733aff4571c62182ccdda480aaba9a8d250014f00ec.png?v=1726273875"
  );
  bluenoise.wrapS = THREE.RepeatWrapping;
  bluenoise.wrapT = THREE.RepeatWrapping;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.update();
  const size = 512;
  const equirectangularRenderer = new EquirectangularRenderer(size * 2, size); // Fixed 2:1 aspect ratio
  equirectangularRenderer.shaderMaterial.uniforms.bluenoise.value = bluenoise;

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
      tOrientation: { value: false },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normal);
        vPosition = (vec4(position,1.) * modelMatrix).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix  * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
    uniform bool tOrientation;
    uniform bool time;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vPosition;
    const float PI = 3.141592653589793;
    uniform sampler2D tMap;
    
    vec2 reflectionFromSpherical(vec3 position){
      float theta = asin(position.y);
      float phi = atan(position.z, position.x);
      return vec2(1.-(phi + PI) / (2.0 * PI), (theta + PI / 2.0) / PI);

      // return vec2( atan(position.z, position.x) / (2.0 * PI) + .5, 
      // 1.0 - acos(position.y) / PI);
    } 
    vec2 refractionFromSpherical(vec3 position){
      float theta = asin(position.y);
      float phi = atan(position.z, position.x);
      return vec2(1.-(phi + PI) / (2.0 * PI), (theta + PI / 2.0) / PI);
      
      // return vec2( atan(position.z, position.x) / (2.0 * PI) + .5, 
      // 1.0 - acos(position.y) / PI);
    }
      vec2 fromSpherical(vec3 position){
      float theta = asin(position.y);
      float phi = atan(position.z, position.x);
      return vec2(1.-(phi + PI) / (2.0 * PI), (theta + PI / 2.0) / PI);
      
      // return vec2( atan(position.z, position.x) / (2.0 * PI) + .5, 
      // 1.0 - acos(position.y) / PI);
    } 
    vec4 sampleSphere(vec3 normal, sampler2D bg) {
      vec2 coord = fromSpherical(normal);
      return texture(bg, (coord));
    }
    vec3 toneMapFilmic(vec3 color) {
    // Filmic tone mapping
    float a = 0.15; // Exposure
    float b = 0.50; // Contrast
    float c = 0.10; // Brightness
    float d = 0.20; // Saturation
    float e = 0.02; // White point

    color = color * a / (color * (1.0 + b) + c);
    color = color / (color + vec3(e));
    return color;
}
    void main() {
        vec3 view = normalize(cameraPosition-vPosition);
        vec3 light = vec3(0.5, 0.2, 1.0);
        light = normalize(light);
        vec3 material = vec3(0.0, 0.0, 0.0); 
        float dProd = dot(vNormal, normalize(light));
      
        vec3 reflection = tOrientation ? reflect(-view, vNormal) : refract(-view, vNormal,  0.01);
        vec4 envColor = sampleSphere(reflection, tMap);
        //envColor = texture(tMap, reflection.rg);
        //envColor.rgb = toneMapFilmic(envColor.rgb);
        envColor.rgb = pow(envColor.rgb, vec3(1.0 / 2.2));
        gl_FragColor = envColor;
      }
    `,
  });

  // const sphere = new THREE.Mesh(geometry, skyeMaterial);
  // sphere.position.y = 2.5;
  // scene.add(sphere);

  const sphere2 = new THREE.Mesh(geometry, shaderMaterial);
  sphere2.position.x = 2;
  sphere2.position.y = 1;
  scene.add(sphere2);

  const knotgeometry = new THREE.TorusKnotGeometry(0.65, 0.25, 128, 64);
  const torusKnot = new THREE.Mesh(knotgeometry, shaderMaterial);
  torusKnot.position.x = -2;
  torusKnot.position.y = 1;
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

    // torusKnot.rotateY(0.01);
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

  const gui = new GUI({ width: 300 });
  const params = { "Refraction/Reflection": false };
  gui.add(params, "Refraction/Reflection").onChange(function (value) {
    if (value) {
      shaderMaterial.uniforms.tOrientation.value = true;
    } else {
      shaderMaterial.uniforms.tOrientation.value = false;
    }

    shaderMaterial.needsUpdate = true;
  });
})();
