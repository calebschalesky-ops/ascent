# Gemini prompts: graphics pass (2026-10-20)

Caleb's method (gamestudio/games/date-night/CHAR-ART-PROMPTS.md): **one new Gemini chat per subject**, the style
anchor attached, one prompt pasted, judged against the re-roll rules below, saved under the file name given.
Raw downloads go in **`gemini-in/`** at the worktree root (not committed). Then:

```bash
node scripts/gemini-clean.mjs
```

It writes the game files listed under each subject, at the size the game shows them (× 3 for sharp screens), and a
contact sheet `shots/graphics-pass/gemini-contact.jpg` to check by eye.

## Why these subjects, and not planets or skies

The pass found what procedural art could not fix and what it could. The moons were flat balls; that was fixed in the
shader (GRAPHICS-PASS.md #1), so no planet textures are asked for here. The painted people are the art that is
**worse than its own source**: each head in the codex, the pilot step and the flight HUD is a 108–166 px crop cut
from a 1024 × 572 reference sheet, so the faces are soft and some carry the sheet's known flaws. A close portrait
painted from the same sheet keeps the person and fixes the resolution. The title screen is a plain card on flat
navy; it gets one key-art image, handed to the screen session to place (CSS is theirs).

## Re-roll rules (all subjects)

Re-roll (same chat, "Again, same instructions") if any of these hold; three rolls at most, then take the best and
note the flaw here.
- Any text, letters, numbers, signature or watermark in the image.
- Not the same person as the attached sheet: different face shape, hair, skin or eye colour, or armour colours.
- A known flaw from 02-RACES Results comes back (named per subject below).
- Anime, chibi, cartoon or photoreal rendering; soft or cute; more than one person.
- Head cut off at the top, or the face smaller than a third of the frame height (portraits).
- For the key art: a planet without its armour, a recognisable real logo, or a busy centre where the title goes.

## Portrait template (one per people)

Style anchor: the people's accepted sheet, `art-refit/refs/races/<file>` (named per subject). The prompt:

> Use the attached concept sheet as the reference for this person and the art style: the SAME individual as the pilot
> in the sheet, with the same face, hair, eyes, skin, build and flight armour, the same colours and trim. Paint ONE
> close portrait of him: head and shoulders, the face large, turned a few degrees from the viewer and looking just past
> the camera, calm and hard. Portrait format, 4:5, the top of the head a little below the top edge, the chest plate at
> the bottom edge. Premium stylized sci-fi key art like a AAA game's character reveal: painterly, clean, readable,
> dramatic light: {LIGHT}. Background: {BACKGROUND}, soft and out of focus so the face stands clear. {FIX} No text, no
> letters, no numbers, no logos, no watermark, no border, no swatches, no other people. Not cute, not chibi, not
> cartoon, not anime, not photoreal.

| Subject | Anchor | {LIGHT} | {BACKGROUND} | {FIX} | Saves as |
|---|---|---|---|---|---|
| Earth, Humans | `earth.webp` | a strong blue rim light from behind, a warm key light from the upper left | deep navy space with the blue curve of Earth low behind him | Brown skin, short dark hair, brown eyes, an ordinary unedited human face. | `earth-portrait.png` |
| Moon, Selenitai | `moon.webp` | a cold pale-blue rim light from behind, a hard white key light from the upper left | black space, the grey Moon curving low behind him, a small blue Earth | A long neck and a narrow face with high cheekbones, silver-white hair tied back, ice-blue eyes. | `moon-portrait.png` |
| Mercury, Hemerodromoi | `mercury.webp` | a harsh white-gold rim light from behind, a hard white key light from the upper left | black space with the white glare of a huge Sun at one side | Very dark brown skin, heavy eyelids, amber-gold eyes, close-cropped black hair; a man in his late twenties, not older. | `mercury-portrait.png` |
| Venus, Nephelai | `venus.webp` | a warm gold rim light from behind, a bright warm key light from the upper left | a deep violet sky over pale-gold cloud tops | Dark brown hair, green eyes, skin with a faint pearly sheen; an adult man with a hard, handsome face, not childlike. | `venus-portrait.png` |
| Mars, Quirites | `mars-v3.webp` | a cold ice-blue rim light from behind, a pale warm key light from the upper left | a thin butterscotch haze over the rust-red curve of Mars | Olive-tan skin, short black hair, large dark pupils with a faint eyeshine, a square jaw. | `mars-portrait.png` |
| Jupiter, Diadochoi | `jupiter.webp` | a strong magenta-violet rim light from behind, a cool dim key light from the upper left | Jupiter's cream and rust bands huge and soft behind him | Very large eyes with violet irises, very pale cool skin, pale silver-white hair, a long neck. | `jupiter-portrait.png` |
| Saturn, Autochthones | `saturn-v3.webp` | a strong ember-orange rim light from behind, a cool key light from the upper left | a dim orange haze with Saturn's rings huge and faint behind him | Very large dark eyes, a thick dark-brown mane at the neck and shoulders like a lion's ruff, ordinary human ears, a square jaw. | `saturn-portrait.png` |

Game files: `public/races/<people>/head.webp`, cut to the head box's own aspect (lib/raceArt.ts keeps the display
size, so nothing else changes). The sheet crops stay in git history.

## Title key art (one chat)

Style anchor: `art-refit/refs/mars.webp` (the armoured-planet sheet the game's god-armour follows).

> Use the attached image as the art style ONLY: premium stylized sci-fi key art, painterly, Greek ornament fused with
> hard engineering, gold trim, strong rim light from one sun. Do NOT copy its layout, swatches, insets or border. Paint
> a 16:9 game title backdrop: a wide view across the solar system from beside Earth, deep navy-black space with a rich
> violet and teal nebula, the Sun bright at the upper left. In the lower right foreground, the curve of Earth inside a
> colossal golden armour cage with a blue-lit ring. Across the middle distance, small and clear, the other armoured
> worlds in a loose line: red Mars ringed by crimson Roman shields, banded Jupiter crowned by violet lightning-bolt
> spires with magenta arcs, golden Saturn inside a wall on its rings. A small formation of brass starships with blue
> engine trails crossing from left to right. Keep the centre and upper middle calm and dark (the title goes there).
> No text, no letters, no numbers, no logos, no watermark, no border. Not cartoon, not anime, not photoreal.

Saves as `title-keyart.png` → game file `public/art/title-keyart.webp` (1920 × 1080). Not wired: the title screen is
the screen session's (styles, opening components). See GRAPHICS-PASS.md, handoffs.

## Run log (2026-10-20, run by the graphics-pass session in Caleb's Chrome)

**Attachments refused.** Every prompt sent with an image attached got "Sorry, I can't edit images for you yet":
`mars-v3.webp` in plain chat, `mars-v3.webp` with the Create image tool on, `refs/mars.webp` (no people) with Create
image on. Three tries, same day. So the anchor could not be attached; each prompt was rewritten text-only, carrying the
sheet's description (from art-refit/02-RACES.md SUBJECT and STYLE) in words, and each result was judged by eye against
the sheet's head (`sheets/heads-before.jpg`). Re-test: one chat with any image attached.

The text-only form that worked, per people (the full text of each is in this session's transcript; the pattern):

> Create an image, portrait format 3:4, a stylized digital painting with visible brushwork like premium game concept
> art, not a 3D render. A close portrait, head and shoulders, of {who, from 02-RACES SUBJECT: build, face, skin, hair,
> eyes, ears}. He wears {armour and colours, from the sheet}. Face large in the frame, turned a few degrees from the
> viewer, looking just past the camera, calm and hard. Dramatic light: {LIGHT}. Background: {BACKGROUND}, soft and out
> of focus. The whole head inside the frame with a little space above the hair. No text, no letters, no numbers, no
> logos, no watermark, no border, no other people. Not cute, not chibi, not cartoon, not anime, not photoreal.

The send step: Enter in Gemini's box did not always send; the Send button did.

| Subject | Rolls | Verdict | Saved |
|---|---|---|---|
| Title key art | 1 (after the attachment refusal, "generate from the description, without the attachment") | Accepted. Armoured Earth, crimson-shield Mars, spired Jupiter, walled Saturn, brass ships, no text. Jupiter sits a little into the upper middle; the title should go upper left of centre. | `title-keyart.jpg` → `public/art/title-keyart.webp` |
| Mars | 1 | Accepted. Matches the sheet's face. Hair touches the top edge (the crop keeps it). | `mars-portrait.jpg` |
| Earth | 1 | Accepted. Brass meander, olive wreath, sky-blue band: all from the sheet. | `earth-portrait.jpg` |
| Moon | 2 | Roll 1 rejected: photoreal 3D render (rule: not photoreal), kept in `gemini-rejected/`. Roll 2 "the same man, but painted" accepted. | `moon-portrait.jpg` |
| Mercury | 1 | Accepted. Very dark skin, heavy lids, amber eyes, mask up, plain bronze. Reads a little older than the late twenties asked. | `mercury-portrait.jpg` |
| Venus | 1 | Accepted. Green and gold Byzantine plate, green eyes. The pearly skin sheen did not come through. | `venus-portrait.jpg` |
| Jupiter | 1 | Accepted. Violet eyes, pale cool skin, purple and gold with a sunburst and lion. | `jupiter-portrait.jpg` |
| Saturn | 1 | Accepted with a flaw: the eyes are ordinary size, not the 1.5× the lore asks (the sheet's head has the same flaw). Mane, owl crest and mask hose are right. | `saturn-portrait.jpg` |

No usage limit was hit, no setting was changed, nothing was signed in or out or accepted.

## Pass 3 (2026-10-21, graphics-pass-3 session, Caleb's Chrome)

### Re-tests
- **Attachment: still refused.** `art-refit/refs/races/mars-v3.webp` attached through the chat's image input with a
  Create-image prompt: "Sorry, I can't edit images for you yet." (chat `0b5e7b71ce404288`). Four tries over two days now.
- **Gemini will not edit its own image either.** In the same chat, "The same image, the same woman ... change only her
  skin to a deep brown" got the same refusal. So does any re-roll that says "Again", "the same image" or "your last
  image". What works is a fresh generation: "Create a new image from the same description as my first message, with
  these changes: ...". Variants of one person are therefore separate paintings, never edits.
- Enter in the box sends most of the time; when it does not, the Send message button does (find it by name).
- Each image is taller than the chat view; scroll through the whole picture before judging it.

### Pilot portraits (the player's own pilot)
Subjects: one woman and one man of each people. The first plan (22 images, a pair per skin-tone group, Earth 4 groups
and Mars 2) was made from the old swatches and is overruled by "One people, one look" (ART-DIRECTION.md, branch
claude/one-look-per-people 40d650f): every people's skin swatches are now shades of one tone, so one pair per people.
Template (all subjects): *Create an image, portrait format 4:5, a [painterly] digital painting with visible brushwork
like premium game concept art, not a 3D render. A close portrait, head and shoulders, of {who: people, a woman / a man,
age, build, face, skin in words, hair, eyes, human ears}. {She/He} wears {the people's flight armour, from 02-RACES.md
COLORS, and their headwear}. Face large in the frame, turned a few degrees from the viewer, looking just past the camera,
calm and hard. Dramatic light: {LIGHT}. Background: {BACKGROUND}, soft and out of focus. The whole head inside the frame
with a clear space above the hair, the chest plate at the bottom edge. No text, no letters, no numbers, no logos, no
watermark, no border, no other people. Not cute, not chibi, not cartoon, not anime, not photoreal.* LIGHT and BACKGROUND
as in the portrait table above. **Next run: add the skin in hex and "the same skin as the pilot" (af-graphics' rule).**

| Saves as | Chat | Rolls | Verdict under one-look |
|---|---|---|---|
| `pilot-earth-f` | `f33981ee8a7fe11d` | 1 | Accepted: warm brown skin, dark hair in a braid, brown eyes, headset. |
| `pilot-earth-m` | `c893617300b5a9a4` | 1 | Accepted: tan-brown skin (a shade light of #9a6a4a), dark brown hair, brown eyes. |
| `pilot-moon-f` | `6cf0993f96389ba2` | 1 | Accepted. Laurel touches the top edge. |
| `pilot-moon-m` | `b8d14a0a7f9a7dd1` | 1 | Accepted. |
| `pilot-mercury-f` | `e988f0ae5a500da2` | 1 | Accepted. Mask touches the top edge. |
| `pilot-mercury-m` | `0926bb60a6dbd0fa` | 2 | Roll 1 had a hard black bar across the top; roll 2 accepted (pale glare behind). Download the 2nd image. |
| `pilot-venus-f` | `348199b04f4f5b09` | 1 | Accepted: braided crown, pearl circlet, green veil. |
| `pilot-venus-m` | `9999352ad5ba6274` | 1 | Accepted. |
| `pilot-mars-f` | `0b5e7b71ce404288` | 1 (after the attachment refusal) | Accepted: olive tan, black hair. Armour more crimson than the sheet's steel grey. |
| `pilot-mars-m` | `77f0a15969855bb1` | 1 | Accepted. No eyeshine, eyes normal size (the sheet's own flaw). |
| `pilot-jupiter-f` | `3af1806488109dd2` | 3 | Roll 1 a hard neon outline round the head (cartoon); roll 2 refused as an edit; roll 3 accepted. Download the last image. |
| `pilot-jupiter-m` | `876bfe77846377b6` | 1 | Accepted. Strong magenta rim, soft. |
| `pilot-saturn-f` | `39d6389fae599e8c` | 1 | Accepted: very large dark eyes, mane, owl-eye mark. |
| `pilot-saturn-m` | `e882084ff98bb0aa` | 3 | Roll 1 eyes normal and long hair; roll 2 ruff and short hair, eyes still normal size, no brow mark (accepted with the flaw); roll 3 refused as an edit. Download the 2nd image. |

Generated before the ruling and now **not used** (drift from the people's one look): Earth deep-skinned woman
`59e6a613b461aa19` and man `6cbc50e4e8e61083`, East Asian woman `04cdc5d4050f4507`, olive Latin man `40688bc9190144c6`,
fair auburn woman `1435e635b6b19ed7`, light sandy-haired man `9e3e9d4f5f9066ef`; Mars deep-brown woman
`8f2629a103266c14` and man `9ea4a72a7442fbde`.

### Leaders and the Earth head (one-look repaints), queued, not run
Template: *Create an image, tall portrait format 9:16, a painterly digital painting with visible brushwork like premium
game concept art, not a 3D render and not a cartoon. ONE full-length figure, head to feet, standing straight and facing
the viewer, centred, with a little space above the head and below the feet: {who}. {Skin in words} ({hex}), the same
skin as the pilot; {hair}; {eyes}; {face}; human ears. Ceremonial armour: {from 02-RACES.md "Second figure"}. Dramatic
light: {LIGHT}. Background: {BACKGROUND}, soft and out of focus, a dark polished floor under {his} feet. No text, no
letters, no numbers, no logos, no watermark, no border, no swatches, no other people. Not cute, not chibi, not cartoon,
not anime, not photoreal.* Saves as `leader-<people>.png`; gemini-clean cuts it to the leader box.

| Saves as | Who | Skin |
|---|---|---|
| `leader-earth` | The Strategos, older Human, grey at the temples, brass cuirass with olive-leaf relief over a navy tunic, brass gorget, navy cloak edged sky blue, brass baton, gunmetal Corinthian helmet with a sky-blue crest under one arm | sun-browned warm medium brown `#9a6a4a` |
| `leader-mars` | A consul, older Quirite, grey at the temples, polished-steel cuirass edged in gold under a white toga with a broad red border, armoured boots, ivory baton | olive tan `#c48f6a` |
| `leader-mercury` | The King of the Field, older Hemerodrome, grey in cropped hair, dark bronze cuirass edged in gold, bronze greaves, long rust-red cloak, crested bronze helmet with one gold band under one arm | very dark brown `#3a2418` |
| `earth-portrait` | The Earth head (portrait template above), the codex face | sun-browned `#9a6a4a`; today's head reads light tan |

**Stopped, 2026-10-21 ~12:45 PT:** opening a new Gemini chat for the Strategos landed on Google's reCAPTCHA page
("Our systems have detected unusual traffic from your computer network"). Not solved (CAPTCHAs are Caleb's to clear).
Nothing has been downloaded yet; downloads need Caleb's yes. Re-test: open gemini.google.com once Caleb has cleared it.
