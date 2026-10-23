/**
 * The pilot's face where it is drawn small (the flight HUD, the launch card): the painted head from the people's
 * accepted sheet (lib/raceArt.ts), never larger than its own pixels. If it fails to load, the SVG Portrait in the
 * player's chosen look is drawn instead. The painted head does not follow the customiser's skin, hair, eyes or
 * attire; whether it should always win is Caleb's call (race-art-build's pass 3 notes).
 */
import { useState } from 'react';
import type { NationId } from '../../../lib/nations';
import { RACE_ART, artUrl } from '../../../lib/raceArt';
import type { PortraitLook } from './Portrait';
import Portrait from './Portrait';

export default function PilotHead({ nation, look, label }: { nation: NationId; look?: PortraitLook; label: string }) {
  const [failed, setFailed] = useState(false);
  const head = RACE_ART[nation]?.head;
  if (failed || !head) return <Portrait nation={nation} look={look} label={label} />;
  return (
    <img className="pilot-head" src={artUrl(head)} width={head.w} height={head.h} style={{ maxWidth: head.w }}
      alt={label} onError={() => setFailed(true)} />
  );
}
