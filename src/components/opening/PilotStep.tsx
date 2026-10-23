/**
 * Step 2 of a new game: your character, a person of your people (LORE.md "Bodies" and "Look"). A name, and a few
 * choices that fit the people, with the portrait redrawn as you choose.
 */
import type { NationId } from '../../lib/nations';
import { peopleOf } from '../../lib/races';
import type { Avatar, Swatch } from '../../lib/opening/profile';
import { AVATAR_OPTIONS, NAME_MAX, avatarLook, suggestName } from '../../lib/opening/profile';
import Portrait from '../codex/art/Portrait';

function Swatches({ label, list, value, onPick }: { label: string; list: Swatch[]; value: number; onPick: (i: number) => void }) {
  return (
    <fieldset className="op-field">
      <legend>{label} <span className="muted">· {list[value]?.label}</span></legend>
      <div className="op-swatches" role="radiogroup" aria-label={label}>
        {list.map((s, i) => (
          <button key={s.label} role="radio" aria-checked={i === value} aria-label={s.label} title={s.label}
            className={i === value ? 'op-swatch on' : 'op-swatch'} style={{ ['--s' as string]: s.value }} onClick={() => onPick(i)} />
        ))}
      </div>
    </fieldset>
  );
}

export default function PilotStep({ nation, avatar, onChange }: { nation: NationId; avatar: Avatar; onChange: (a: Avatar) => void }) {
  const o = AVATAR_OPTIONS[nation];
  const people = peopleOf(nation);
  const set = (p: Partial<Avatar>) => onChange({ ...avatar, ...p });
  return (
    <div className="op-pilot">
      <figure className="op-portrait">
        <Portrait nation={nation} look={avatarLook(nation, avatar)} label={`${avatar.name || 'Your pilot'}, a ${people.demonym}`} />
        <figcaption>
          <strong>{avatar.name || '—'}</strong>
          <span className="muted">{people.demonym} · {o.attire[avatar.attire].label}</span>
        </figcaption>
      </figure>
      <div className="op-form">
        <label className="op-field op-name">
          <span className="op-label">Name</span>
          <span className="op-name-row">
            <input className="field" value={avatar.name} maxLength={NAME_MAX} onChange={(e) => set({ name: e.target.value })}
              aria-label="Pilot name" placeholder={`A ${people.demonym} name`} />
            <button type="button" className="btn ghost small" onClick={() => set({ name: suggestName(nation) })}>Suggest</button>
          </span>
        </label>
        <Swatches label="Skin" list={o.skin} value={avatar.skin} onPick={(skin) => set({ skin })} />
        <Swatches label={nation === 'saturn' ? 'Fur' : 'Hair'} list={o.hair} value={avatar.hair} onPick={(hair) => set({ hair })} />
        <Swatches label="Eyes" list={o.eyes} value={avatar.eyes} onPick={(eyes) => set({ eyes })} />
        <fieldset className="op-field">
          <legend>Dress</legend>
          <div className="op-options" role="radiogroup" aria-label="Dress">
            {o.attire.map((a, i) => (
              <button key={a.label} role="radio" aria-checked={i === avatar.attire} className={i === avatar.attire ? 'op-option on' : 'op-option'}
                style={{ ['--s' as string]: a.cloth }} onClick={() => set({ attire: i })}>
                <strong>{a.label}</strong><span>{a.line}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {nation !== 'mars' && (
          <label className="op-check">
            <input type="checkbox" checked={avatar.headwear} onChange={(e) => set({ headwear: e.target.checked })} />
            <span>{o.headwear.label}</span>
          </label>
        )}
        <p className="small muted op-note">{o.note}</p>
      </div>
    </div>
  );
}
