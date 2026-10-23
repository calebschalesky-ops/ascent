/** Small three.js helpers shared by the voyage scene. */
import * as THREE from 'three';

export const GLYPH_FONT = '"Noto Sans Symbols", "Segoe UI Symbol", "Apple Symbols", serif';
/** The glass interface's display face (styles.css --display), so names in the scene match the HUD round them. */
export const LABEL_FONT = '"Segoe UI Variable Display", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif';


/** An angle (degrees) and ring radius to a point on the plane (anticlockwise seen from above, +y). */
export const onPlane = (lon: number, r: number, y = 0) => {
  const a = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(a), y, -r * Math.sin(a));
};


/** `height` is world units, or a fraction of the screen height when `screen` is true. */
export function textSprite(text: string, font: string, color: string, height: number, screen = false) {
  const px = 128;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const setFont = () => { ctx.font = `${px * 0.66}px ${font}`; };
  setFont();
  const w = Math.max(px, Math.ceil(ctx.measureText(text).width + px * 0.4));
  c.width = w;
  c.height = px;
  setFont();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.09;
  ctx.strokeStyle = 'rgba(4, 6, 20, 0.85)';
  ctx.strokeText(text, w / 2, px / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, px / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  if (screen) mat.sizeAttenuation = false;
  s.scale.set((height * w) / px, height, 1);
  return s;
}


export function circleLine(r: number, color: THREE.ColorRepresentation, opacity: number, segments = 128) {
  const pts = Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a));
  });
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
}
