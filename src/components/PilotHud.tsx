import { useEffect, useState } from 'react';
import { levelProgress } from '../lib/progression/levels';
import type { Progress } from '../lib/progression/progress';
import { baySlots, shipName } from '../lib/progression/progress';
import { SLOT_KINDS, moduleOf } from '../lib/progression/catalog';
import type { WingView, Wingmen } from './wingmen';
import type { Pilot } from '../lib/opening/profile';
import { avatarLook } from '../lib/opening/profile';
import { raceRef } from '../lib/progression/refs';
import PilotHead from './codex/art/PilotHead';

const STATE_LABEL: Record<WingView['state'], string> = { docked: 'docked', escort: 'escort', attack: 'attacking', return: 'returning' };

/**
 * In flight: who you are, your level and credits, the cruiser's fit, and the fighter bay with Launch and Recall. With
 * a pilot from the opening, their portrait, their name and their ship's own name.
 */
export default function PilotHud({ progress, pilot, wing }: { progress: Progress; pilot?: Pilot | null; wing: () => Wingmen | null }) {
  const [bay, setBay] = useState<WingView[]>([]);
  useEffect(() => {
    const id = setInterval(() => setBay(wing()?.view() ?? []), 200);
    return () => clearInterval(id);
  }, [wing]);
  const lv = levelProgress(progress.xp);
  const slots = baySlots(progress);
  const out = bay.filter((b) => b.state !== 'docked').length;
  return (
    <div className="pilot-hud" role="status" aria-label="Pilot">
      {pilot ? (
        <div className="ph-who">
          <span className="ph-portrait"><PilotHead nation={pilot.nation} look={avatarLook(pilot.nation, pilot.avatar)} label={pilot.avatar.name} /></span>
          <span className="ph-names">
            <span className="ph-name">{pilot.ship.name}</span>
            <span className="ph-sub">{pilot.avatar.name} · {raceRef(progress.nation).ships.cruiser}</span>
          </span>
        </div>
      ) : <div className="ph-name">{shipName(progress)}</div>}
      <div className="ph-line">
        <span>Level {lv.level}</span>
        <span className="ph-bar" title={lv.need ? `${lv.into} / ${lv.need} XP` : 'Top level'}>
          <span style={{ width: `${lv.need ? Math.min(100, (lv.into / lv.need) * 100) : 100}%` }} />
        </span>
        <span>{lv.need ? `${lv.into}/${lv.need} XP` : 'max'}</span>
        <span className="ph-credits">₡ {progress.credits}</span>
      </div>
      <div className="ph-fit">{SLOT_KINDS.flatMap((k) => progress.fit[k]).map((id, i) => <span key={i} className={`ph-mod ${moduleOf(id).kind}`}>{moduleOf(id).label}</span>)}</div>
      {slots > 0 && (
        <div className="ph-bay" aria-label="Fighter bay">
          <span>Bay</span>
          {Array.from({ length: slots }, (_, i) => {
            const b = bay.find((x) => x.slot === i);
            const has = i < progress.fighters;
            return <span key={i} className={`ph-slot ${has ? b?.state ?? 'docked' : 'empty'}`} title={has ? STATE_LABEL[b?.state ?? 'docked'] : 'empty slot'}>{has ? STATE_LABEL[b?.state ?? 'docked'] : 'empty'}</span>;
          })}
          <button className="ph-btn" disabled={out >= progress.fighters} onClick={() => wing()?.launch()}>Launch <kbd>B</kbd></button>
          <button className="ph-btn" disabled={!out} onClick={() => wing()?.recall()}>Recall <kbd>V</kbd></button>
        </div>
      )}
    </div>
  );
}
