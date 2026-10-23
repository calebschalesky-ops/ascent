/**
 * Shader snippets shared by the effects. Every custom shader includes the logarithmic depth buffer chunks, so the
 * effects keep working if the scene switches `logarithmicDepthBuffer` on (they compile to nothing when it is off).
 */
export const LOGDEPTH_VERT_PARS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
`;
export const LOGDEPTH_VERT = /* glsl */ `
#include <logdepthbuf_vertex>
`;
export const LOGDEPTH_FRAG_PARS = /* glsl */ `
#include <logdepthbuf_pars_fragment>
`;
export const LOGDEPTH_FRAG = /* glsl */ `
#include <logdepthbuf_fragment>
`;

/** A soft round sprite falloff for point particles: 1 at the centre, 0 at the rim. */
export const SOFT_POINT = /* glsl */ `
float softPoint(vec2 pc){ float r = length(pc - 0.5) * 2.0; return clamp(1.0 - r, 0.0, 1.0); }
`;
