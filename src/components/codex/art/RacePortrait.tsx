/**
 * A people as the accepted reference sheet paints them (lib/raceArt.ts): the front figure in flight armour, the head
 * study, and the leader where the sheet has a clean one. Each image is shown at its own size or smaller. If any image
 * fails to load, the SVG Portrait is drawn instead.
 */
import { useState } from 'react';
import type { NationId } from '../../../lib/nations';
import { RACE_ART, aDemonym, artUrl } from '../../../lib/raceArt';
import { peopleOf } from '../../../lib/races';
import Portrait from './Portrait';

export default function RacePortrait({ nation }: { nation: NationId }) {
  const [failed, setFailed] = useState(false);
  const a = RACE_ART[nation];
  if (failed || !a) return <Portrait nation={nation} />;
  const who = peopleOf(nation).demonym;
  const fail = () => setFailed(true);
  return (
    <div className="race-art">
      <img className="race-art-body" src={artUrl(a.body)} width={a.body.w} height={a.body.h} style={{ maxWidth: a.body.w }}
        alt={`${aDemonym(who)} in flight armour, from the front`} onError={fail} />
      <div className="race-art-side">
        <img src={artUrl(a.head)} width={a.head.w} height={a.head.h} style={{ maxWidth: a.head.w }}
          alt={`The face of ${aDemonym(who).toLowerCase()}`} onError={fail} />
        {a.leader && (
          <figure className="race-art-leader">
            <img src={artUrl(a.leader)} width={a.leader.w} height={a.leader.h} style={{ maxWidth: a.leader.w }}
              alt={`${a.leader.title} of the ${peopleOf(nation).name}`} onError={fail} />
            <figcaption>{a.leader.title}</figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}
