/**
 * A laser bolt's look: a soft glowing rod with a white-hot core, bright from the side and from the end. Long axis
 * along z (models point down −z), sized from `length`.
 */
import * as THREE from 'three';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';

export function boltGeometry(length = 1.6, radius = 0.09) {
  const g = new THREE.CapsuleGeometry(radius, length - radius * 2, 4, 10);
  g.rotateX(Math.PI / 2);
  return g;
}

export function boltMaterial(color: THREE.ColorRepresentation = 0xff3a30) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(2.5) } },
    vertexShader: /* glsl */ `
      ${LOGDEPTH_VERT_PARS}
      varying float vFace;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFace = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
        ${LOGDEPTH_VERT}
      }`,
    fragmentShader: /* glsl */ `
      ${LOGDEPTH_FRAG_PARS}
      uniform vec3 uColor; varying float vFace;
      void main(){
        float core = pow(vFace, 6.0);
        vec3 c = uColor * pow(vFace, 1.5) + vec3(2.5, 2.2, 2.0) * core;
        gl_FragColor = vec4(c, 1.0);
        ${LOGDEPTH_FRAG}
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
