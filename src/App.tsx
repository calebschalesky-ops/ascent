import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameData, GameStore, Settings } from './lib/store';
import { IdbStore, freshData } from './lib/store';
import Starfield from './components/Starfield';
import GameView from './components/GameView';
import Skirmish from './battle/view/Skirmish';

// PKG-03: `?skirmish` loads the skirmish mode in place of the voyage game; it neither loads nor writes the save.
// The probe (window.__probe) is dev-only: this import is dropped from a production build.
const SKIRMISH = new URLSearchParams(window.location.search).has('skirmish');
if (import.meta.env.DEV) void import('./dev/probe').then((m) => m.installProbe());

export default function App() {
  return SKIRMISH ? <Skirmish /> : <VoyageApp />;
}

const store: GameStore = new IdbStore();

function VoyageApp() {
  const [data, setData] = useState<GameData | null>(null);
  const dataRef = useRef<GameData | null>(null);
  dataRef.current = data;

  useEffect(() => {
    store.load().then((d) => setData(d ?? freshData())).catch(() => setData(freshData()));
  }, []);

  const commit = useCallback((next: GameData) => {
    dataRef.current = next; // so a second edit before the next render builds on this one
    setData(next);
    void store.save(next);
  }, []);

  const setSettings = useCallback((p: Partial<Settings>) => {
    const d = dataRef.current!;
    commit({ ...d, settings: { ...d.settings, ...p } });
  }, [commit]);

  if (!data) {
    return <div className="loading"><Starfield /><p>Loading…</p></div>;
  }

  return (
    <div className="app tab-cosmos">
      <Starfield />
      <main className="main">
        <GameView data={data} onSettings={setSettings} onJourney={(journey) => commit({ ...dataRef.current!, journey })}
          onProgress={(progress, journey) => commit({ ...dataRef.current!, progress, ...(journey !== undefined ? { journey } : {}) })}
          onPrizes={(prizes) => commit({ ...dataRef.current!, prizes })}
          onConquest={(conquest, progress) => commit({ ...dataRef.current!, conquest, ...(progress ? { progress } : {}) })}
          onInfantry={(infantry) => commit({ ...dataRef.current!, infantry })}
          onPatch={(patch) => commit({ ...dataRef.current!, ...patch })} />
      </main>
    </div>
  );
}
