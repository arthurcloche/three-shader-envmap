import * as THREE from "three";

export class EquirectangularRenderer {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    // Create two framebuffers
    this.equirectangularRenderTarget = new THREE.WebGLRenderTarget(
      this.width,
      this.height
    );
    this.cartesianRenderTarget = new THREE.WebGLRenderTarget(
      this.width,
      this.height
    );

    // Create a shader material for rendering
    this.shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        bluenoise: { value: null },
        equirected: { value: true },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;
        uniform bool equirected;
        uniform sampler2D bluenoise;
        const float PI = 3.141592653589793;

        vec3 toSpherical(vec2 uv) {
          float theta = uv.x * 2.0 * PI;
          float phi = uv.y * PI; 
          return normalize(vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta)));
        }

        void main() {
          vec2 uv = vUv;
          vec2 resolution = resolution;
          vec3 position;
          float iterationCount = 0.0;
          float radius = 0.0;
          float noiseOffset = 0.0;
          float distance = 0.0;
          
          vec4 color = vec4(0.0);
          vec2 coord = (uv-.5) * vec2(resolution.x/resolution.y,1.);
          vec3 normals = equirected ? toSpherical(uv) : vec3(coord,0.5);
          for(float i = 0.; i<44.; i++) {
            position = radius * normals;
            position.z -= 2.;
            distance = length(position);
            position /= distance * 0.2;
            position.xz *= mat2(cos(time * 0.2 + vec4(0.0, 33.0, 11.0, 0.0)));

            noiseOffset = min(distance - 0.3, texture2D(bluenoise, coord).r * 0.05) + 0.1;
            radius += noiseOffset;
            float glow = sin(position.x + cos(position.y) * cos(position.z)) * sin(position.z + sin(position.y) * cos(position.x + time));
            color += 0.05 / (0.4 + noiseOffset) 
                * mix(smoothstep(0.5, 0.7, glow ),1.0, 0.05 / (distance * distance)) 
                * smoothstep(5.0, 0.0, distance)
                * (1.0 + cos(radius * 3.0 + vec4(0.0, 1.0, 2.0, 0.0)));
          }
          gl_FragColor = vec4(color.rgb, 1.0);
        }
      `,
    });

    // Create a fullscreen quad to display the framebuffer texture
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    this.quadMaterial = this.shaderMaterial;
    this.quad = new THREE.Mesh(geometry, this.quadMaterial);
  }

  updateUniforms(uniforms) {
    for (const key in uniforms) {
      this.shaderMaterial.uniforms[key].value = uniforms[key];
    }
  }

  getMesh() {
    return this.quad;
  }

  getTexture(type = "equirectangular") {
    return type === "equirectangular"
      ? this.equirectangularRenderTarget.texture
      : this.cartesianRenderTarget.texture;
  }

  render(renderer, camera, time) {
    // Update shader uniforms
    this.shaderMaterial.uniforms.time.value = time / 1000.0;

    // Render equirectangular projection
    this.shaderMaterial.uniforms.equirected.value = true;
    renderer.setRenderTarget(this.equirectangularRenderTarget);
    renderer.clear();
    renderer.render(this.quad, camera);

    // Render Cartesian projection
    this.shaderMaterial.uniforms.equirected.value = false;
    renderer.setRenderTarget(this.cartesianRenderTarget);
    renderer.clear();
    renderer.render(this.quad, camera);

    // Reset the render target to default
    renderer.setRenderTarget(null);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.shaderMaterial.uniforms.resolution.value.set(width, height);
    this.equirectangularRenderTarget.setSize(width, height);
    this.cartesianRenderTarget.setSize(width, height);
  }

  dispose() {
    this.equirectangularRenderTarget.dispose();
    this.cartesianRenderTarget.dispose();
    this.shaderMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
