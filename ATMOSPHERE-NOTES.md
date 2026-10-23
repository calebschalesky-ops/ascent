# Atmosphere, terrain and precision: research notes

Compiled 2026-10-18. Every URL below was opened in this session and returned content, unless it is listed in "Not verified" at the end. Where a page did not show a date I say so. Summaries are in my own words.

Game facts these notes serve: three.js r170, planets about 370 units radius at about 150,000 units from the origin, logarithmic depth buffer, camera-relative modelViewMatrix composed in double precision on the CPU, ship 0.37 units long.

## 1. Planetary terrain LOD

**Chunked LOD**
- Author: Thatcher Ulrich. URL: http://tulrich.com/geekstuff/chunklod.html
- Date: undated page (news items run 2002 to Jan 2004; research began 2001); presented at SIGGRAPH 2002. Accessed 2026-10-18.
- The method renders continuous LOD from prebuilt chunks of mesh, with geomorphs and batched primitives, so it suits GPUs. He lists the downsides himself: heavy preprocessing and data that is awkward for height or collision queries. That second point is the reason we keep a CPU height function and share it with collision. The page does not describe skirts; the linked sig-notes.pdf downloaded but I could not read its compressed text, so I make no claim about what it says on cracks.

**CDLOD: Continuous Distance-Dependent Level of Detail for Rendering Heightmaps**
- Author: Filip Strugar. URL: https://github.com/fstrugar/CDLOD (repo page that hosts the 2010 paper and source)
- Date: 2010 (per the repo). Accessed 2026-10-18.
- Quadtree of regular grids, with the LOD choice based on true 3D distance from the viewer to the terrain, and a transition scheme between levels that needs no stitching of meshes. The repo says it is closer in spirit to Ulrich's chunked LOD than to clipmaps. I read only the repo abstract, not the PDF. The Ulrich-style quadtree plus distance rule is what we want; geomorphing is optional for us.

**Making Worlds 1 - Of Spheres and Cubes**
- Author: Steven Wittens. URL: https://acko.net/blog/making-worlds-1-of-spheres-and-cubes/
- Date: 2009-08-23.
- Maps a gridded cube onto a sphere by pushing each point out to the enclosing sphere, which is cheap and avoids heavy trigonometry. Cell size varies across a face, but far less than on a latitude-longitude grid, with no pole pinching. Each face becomes a quadtree used as chunked LOD, chunks are independent of each other so they can be paged in and out, and the tree walk can skip chunks past the horizon.

**jMonkeyEngine "Jmeplanet" thread**
- Author: aaronperkins. URL: https://hub.jmonkeyengine.org/t/jmeplanet/21917
- Date: first posted 2012-04-27, updated to 2013-01-27.
- A small open planet renderer built from six quads in a cube, vertices normalised onto a sphere, quadtree LOD, and "skirt based seam correction". It names skirts as the crack fix but does not explain them. Skirts are a downward-hanging strip of triangles on each chunk edge that hides gaps between neighbours at different LODs.

**three.js forum: "How to make a cube out of six bounding boxes" (post 9)**
- Author: miguelmyers8. URL: https://discourse.threejs.org/t/how-to-make-a-cube-out-of-six-bounding-boxes/35330/9
- Date: 2022-02-26.
- Someone porting SimonDev's tutorial "3D World Generation #4 (Planetary LOD)" to their own code, asking why each cube face is a Box3 in quadtree.js. It confirms the three.js pattern: six face roots, a quadtree per face, split by distance. The post links the code at github.com/simondevyoutube/ProceduralTerrain_Part4 (src/quadtree.js). No reply explaining the Box3 choice is on the page.

**simondevyoutube/ProceduralTerrain_Part4 (repo)**
- Author: SimonDev (GitHub user simondevyoutube). URL: https://github.com/simondevyoutube/ProceduralTerrain_Part4
- Undated (the page shows 2 commits, no dates). Accessed 2026-10-18.
- The repo exists with src/ and resources/ folders and no description. I could not open the raw quadtree.js (404 on the main branch path), so I can only say it is the code the forum thread points at. Treat it as a pointer to read, not as something I checked line by line.

## 2. Atmospheric scattering and real planet data

**GPU Gems 2, Chapter 16: Accurate Atmospheric Scattering**
- Author: Sean O'Neil. URL: https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering
- Date: 2005 (book copyright, second printing April 2005).
- Defines optical depth as average density along a ray times the ray length, with out-scattering as the inner integral and in-scattering summed along the view ray. The shader version replaces the lookup table with an exponential fit, and his demo atmosphere is only about 2.5% of the planet radius thick, with scale height a quarter of that. A game-exaggerated thin shell is therefore standard practice. Cost figures in the chapter: roughly 300 operations per vertex for a naive five-sample integral, about 60 with the table.

**Precomputed Atmospheric Scattering**
- Authors: Eric Bruneton and Fabrice Neyret. URL: https://hgpu.org/?p=2795
- Date: Computer Graphics Forum 27(4), pp. 1079-1086, June 2008 (hgpu listing posted 2011-02-10).
- Precomputes the light transport for all view and sun directions, with multiple Rayleigh and Mie scattering, and reads it back in constant time. It handles ground-to-space views, aerial perspective and shadow shafts. Powerful, but it needs 3D/4D lookup textures and a precompute pass, which is more than a phone-friendly browser game needs. The paper itself was behind a bot wall; the abstract on hgpu is what I read.
- Companion: Eric Bruneton, "Precomputed Atmospheric Scattering: a New Implementation" (2017), https://ebruneton.github.io/precomputed_atmospheric_scattering/ . A cleaned-up reference implementation with a WebGL2 demo, custom density profiles for air and aerosols, and ozone. Useful to read for how density profiles are parameterised.

**A Scalable and Production Ready Sky and Atmosphere Rendering Technique**
- Author: Sebastien Hillaire (Epic Games). URL: https://github.com/sebh/UnrealEngineSkyAtmosphere (code repo for the EGSR 2020 paper)
- Date: 2020 (EGSR 2020; CGF 39(4)). Accessed 2026-10-18.
- The repo confirms the paper and compares the method with Bruneton and a path tracer. From the abstract I saw only in search results (the Eurographics page returned 403): it uses small lookup tables only, adds a cheap multiple-scattering approximation, and scales from phones to PCs. The paper PDF was too large or unreadable to fetch, so the mobile-cost claim is second-hand.

**Coding Adventure: Atmosphere**
- Author: Sebastian Lague (YouTube). URL: https://www.youtube.com/watch?v=DxfEbulyFcY
- Date: 2020 (search metadata only; a third-party index says 2020-11-16). Not confirmed from the page.
- The fetch confirmed only the title. Search-engine text says it builds a post-process atmosphere shader for planets, with a ray march and optical-depth samples. Treat the content summary as unconfirmed.

**NASA Planetary Fact Sheets (nssdc.gsfc.nasa.gov/planetary/factsheet/)**
Author: NASA NSSDC. Dates are the "last updated" lines on each page.

| Body | URL | Scale height | Surface pressure | Updated |
|---|---|---|---|---|
| Earth | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html | 8.5 km | 1014 mb (1.014 bar) | 2024-11-15 |
| Venus | https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html | 15.9 km | 92 bar | 2024-01-11 |
| Mars | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html | 11.0 km | 6.36 mb (0.0064 bar; seasonal 4.0-8.7 mb) | 2025-05-19 |
| Jupiter | https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html | 27 km | listed as >>1000 bar | 2024-10-02 |
| Saturn | https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html | 59.5 km | listed as >>1000 bar | 2025-03-18 |
| Moon | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | not given | about 3e-15 bar at night; "tenuous" | 2024-01-11 |
| Mercury | https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html | not given | under about 5e-15 bar; surface-bounded exosphere | 2024-01-11 |

All the scale heights and pressures you gave check out. Notes: the gas giants have no solid surface, so the pressure figure belongs to a reference level, not a floor. Mercury's page uses the word "exosphere"; the Moon page does not, it only calls the atmosphere tenuous. For both, the right game behaviour is a black sky and no drag or heating.

## 3. Floating origin, precision, depth

**Maximizing Depth Buffer Range and Precision**
- Author: Outerra (blog, @cameni). URL: https://outerra.blogspot.com/2012/11/maximizing-depth-buffer-range-and.html
- Date: 2012-11-28.
- A normal depth buffer spends about half its resolution just past the near plane and is usable over roughly four decades of distance. Logarithmic depth gives about nine decades, but writes depth per fragment, which costs speed and disables early-Z. A reversed floating-point depth buffer gives similar range with better hardware behaviour, but the OpenGL 0.5 depth bias ruins it unless clip control is available. This is the main reason a 0.37-unit ship and 370-unit planets can coexist in one frustum.

**three.js WebGLRenderer docs (logarithmicDepthBuffer, reversedDepthBuffer)**
- Author: three.js contributors. URL: https://threejs.org/docs/pages/WebGLRenderer.html
- Undated, accessed 2026-10-18. This is the current docs page, not the r170 docs.
- logarithmicDepthBuffer defaults to false, is for scenes with huge scale ranges, and the docs warn it uses gl_FragDepth and can slow rendering. The page also documents a reversedDepthBuffer option that needs EXT_clip_control and is described as faster and more accurate. I believe that option arrived after r170, so check the r170 source before relying on it; I did not verify the version it was added in.

**Hybrid Multi-Frustum Logarithmic Depth Buffer**
- Author: Dan Bagnell (Cesium). URL: https://cesium.com/blog/2018/05/24/logarithmic-depth/
- Date: 2018-05-24.
- Compares splitting the scene into several depth ranges against a single log-depth frustum. Log depth means fewer draw calls and no seams at frustum boundaries, but it needs fragment depth writes, and very large triangles can still misbehave at extreme distance. That last point matters for big sky or ocean quads and for chunks with few vertices.

**Kerbal Space Program: Krakensbane / floating origin**
- Author: forum posters, KSP community. URL (search result, content not opened): https://forum.kerbalspaceprogram.com/topic/207101-question-on-krakensbane
- Not usable as a citation. Both the KSP wiki and the forum returned 403 or an Anubis wall to my fetch. See "Not verified".

**Chris Thorne, "Using a Floating Origin to Improve Fidelity and Performance of Large, Distributed Virtual Worlds"**
- Not opened. Only a search-engine view of the bibliographic record (CW 2005, pp. 263-270). See "Not verified".

## 4. Heating and drag

**The Drag Equation (NASA Glenn)**
- Author: NASA Glenn Research Center, Beginner's Guide to Aerodynamics. URL: https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/drageq.html
- Undated, accessed 2026-10-18. (The shorter /www/k-12/rocket/drageq.html URL only says the page moved, and the new URL it gives returned 404.)
- Gives D = Cd x A x 0.5 x rho x V^2, with Cd bundling shape, inclination, viscosity and compressibility, and A a reference area. Drag scales linearly with density and with the square of speed, so exponential density plus a Cd times area per ship covers the model.

**A general stagnation-point convective heating equation for arbitrary gas mixtures (NASA TR R-376)**
- Authors: K. Sutton and R. A. Graves Jr. URL: https://ntrs.nasa.gov/citations/19720003329
- Date: 1971-11-01.
- The abstract describes stagnation-point convective heating for blunt bodies in many gas mixtures, with a general equation that sums contributions from the base gases. The abstract does not state the form q proportional to sqrt(rho/Rn) x V^3, and I did not open the report body. That form, and the constant of about 1.74e-4 for Earth air in SI, come from my own recall and a search-result summary, so treat them as unconfirmed here. For a game the scaling is what matters, not the constant. A per-planet gas multiplier is the only thing the report suggests we might want.

## What we took from this

- Terrain is a quadtree per cube face, split by 3D distance from the camera (Ulrich, Strugar, Wittens, SimonDev's repo). Six roots, four children per node, and the horizon test from Wittens lets us skip far-side chunks.
- Cube points go to the sphere by normalising. It is cheap and the distortion is mild (Wittens). We keep the normalised-cube mapping rather than a fancier one, because chunk edges stay straight and shared between neighbours.
- Cracks between LODs are handled with skirts, not stitching or geomorphing, as in the jMonkeyEngine planet and as an alternative to CDLOD's morphing. Skirt depth should scale with chunk size.
- Ulrich warns that chunked data is awkward for height and collision queries. So the height function is pure CPU noise, called by both the mesh builder and the collision code with the same arguments. Collision never reads the rendered mesh.
- Density is exponential in altitude with a per-planet scale height. Use the NASA values (Earth 8.5, Venus 15.9, Mars 11, Jupiter 27, Saturn 59.5 km) as ratios, then multiply thickness up for the game, as O'Neil's thin shell already does. Moon and Mercury get zero density.
- Sky colour comes from optical depth along the view direction (O'Neil's definition: density times path length), mapped to a blue-to-black gradient with the stars fading as it falls. Bruneton's tables and Hillaire's LUTs are the quality ceiling, and we skip them on phones because of the lookup-texture cost and the precompute pass.
- Heating is proportional to sqrt(rho) x V^3 and drag to rho x V^2 (NASA Glenn; Sutton-Graves in spirit). The heating form is from recall and needs a check against the NASA report body before we quote it anywhere. Both use the same exponential rho, so the glow and the slowdown start together.
- No origin shifting. Keep the camera-relative CPU matrices and the log depth buffer (Outerra, three.js docs, Cesium). The cost is per-fragment depth writes, so keep chunk triangles small enough to avoid the large-triangle failure Cesium describes. Revisit reversed-Z only after confirming it exists in our three.js version.
- The atmosphere co-rotates with the planet, so air speed relative to the ship equals ship velocity minus the surface velocity at that point. This is our own design choice; none of the sources address it.

## Not verified (do not cite)

- Thorne 2005 floating-origin paper: only a bibliographic record seen in search results; dblp returned an Anubis wall. Title and venue (Cyberworlds 2005, pp. 263-270) are likely right but unconfirmed.
- Kerbal Space Program Krakensbane: the KSP wiki and forum all returned 403 or a bot wall. Nothing from KSP is used above.
- Hillaire paper body, Bruneton paper body, SimonDev quadtree.js body, Ulrich sig-notes.pdf body: the pages or PDFs would not yield readable text. Claims about them rest on the pages named above.
- Phil Nowell's cube-to-sphere page: the one I tried (mathproofs.blogspot.com) returned only a title with no author or formula, so I dropped it.
- Sutton-Graves exact form and constant, and Lague's video contents and exact date: see the notes above.
