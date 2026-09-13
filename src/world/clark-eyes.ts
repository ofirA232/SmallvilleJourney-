import * as THREE from 'three';

// A material edit in bind-pose coordinates: the mask follows the skinned face.
// Keep the source atlas unchanged so the original comparison stays available.
export function blueClarkEyes(root: THREE.Object3D) {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.material;
    if (!(source instanceof THREE.MeshStandardMaterial)) return;
    const material = source.clone();
    material.customProgramCacheKey = () => 'clark-dark-blue-eyes-v2';
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 eyeBindPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\neyeBindPosition = position;');
      shader.fragmentShader = 'varying vec3 eyeBindPosition;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 eyeDelta = vec2(abs(eyeBindPosition.x) - 0.071, eyeBindPosition.y - 1.266);
        float eyeOval = length(eyeDelta / vec2(0.019, 0.024));
        float region = (1.0 - smoothstep(0.82, 1.0, eyeOval)) * step(0.137, eyeBindPosition.z);
        float brightness = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
        // Recolor the existing dark area as a whole. Keep its original shading
        // and highlights instead of drawing a bright ring around a new pupil.
        float iris = region * (1.0 - smoothstep(0.08, 0.18, brightness));
        vec3 blue = vec3(0.12, 0.28, 0.60) * brightness;
        diffuseColor.rgb = mix(diffuseColor.rgb, blue, iris);
      `);
    };
    object.material = material;
  });
}
