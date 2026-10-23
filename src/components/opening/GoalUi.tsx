/**
 * The launch: the card that ends the opening and names the first goal, and the small line in flight that tracks it.
 * The goal comes from `firstGoal(nation)` (lib/opening/goal.ts): the first raid, which comes to you, so the card has
 * no course to set. A goal with a target still offers one.
 */
import type { GoalState } from '../../lib/opening/goal';
import { firstGoal } from '../../lib/opening/goal';
import { DEST_LABEL } from '../../lib/nav';
import type { Pilot } from '../../lib/opening/profile';
import { avatarLook } from '../../lib/opening/profile';
import PilotHead from '../codex/art/PilotHead';

export function LaunchCard({ goal, pilot, skipped, autoKey, onGo, onSelf }: { goal: GoalState; pilot: Pilot | null; skipped: boolean; autoKey: string; onGo: () => void; onSelf: () => void }) {
  const g = firstGoal(goal.nation);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  return (
    <div className="launch-backdrop" role="dialog" aria-label="Your first goal">
      <div className="launch-card">
        {pilot && <div className="launch-portrait"><PilotHead nation={pilot.nation} look={avatarLook(pilot.nation, pilot.avatar)} label={pilot.avatar.name} /></div>}
        <div className="launch-text">
          <p className="op-kicker">{skipped ? 'Tutorial skipped' : 'Shakedown complete'}{pilot ? ` · ${pilot.avatar.name}, ${pilot.ship.name}` : ''}</p>
          <h2>{g.title}</h2>
          {g.feud && <p className="op-kicker">The feud: {g.feud}</p>}
          <p>{g.why}</p>
          {g.target ? (
            <>
              <p className="launch-task"><strong>Destroy {g.need} of their ships at {DEST_LABEL[g.target]}.</strong> {g.reward}</p>
              <div className="launch-btns">
                <button className="btn" onClick={onGo} autoFocus>Set course for {DEST_LABEL[g.target]}</button>
                <button className="btn ghost" onClick={onSelf}>I’ll fly myself</button>
              </div>
              <p className="small muted">{touch ? 'The course is on your map; tap Auto to fly it. ☰ Menu pauses.' : `The course is on your map; ${autoKey} engages the autopilot. Esc opens the menu.`}</p>
            </>
          ) : (
            <>
              <p className="launch-task"><strong>Destroy {g.need} of their fighters.</strong> {g.reward}</p>
              <div className="launch-btns">
                <button className="btn" onClick={onSelf} autoFocus>Ready</button>
              </div>
              <p className="small muted">{touch ? 'Their beacons show on your map when they arrive. ☰ Menu pauses.' : 'Their beacons show on your map when they arrive. Esc opens the menu.'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoalLine({ goal }: { goal: GoalState }) {
  const g = firstGoal(goal.nation);
  return (
    <div className={goal.done ? 'goal-line done' : 'goal-line'} role="status" aria-label="Goal">
      <span className="gl-kicker">{goal.done ? 'Goal complete' : 'Goal'}</span>
      <span className="gl-title">{g.title}</span>
      <span className="gl-count">{Math.min(goal.kills, g.need)} / {g.need}{goal.done ? '' : g.target ? ` · ${DEST_LABEL[g.target]}` : ' · inbound'}</span>
    </div>
  );
}
