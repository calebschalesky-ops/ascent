# Trace WORLD-02: The outcome is decided by decisions and captains' characters, never luck
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c`, 2026-10-22 13:06–13:12 PDT. **Was (wave-05)** is TRC-05's
result. Judged at `--seeds 10` and at `--seeds 30` on blocks `--from 1`, `31`, `61`; the held-out block 61–90 judges
checks whose numbers were tuned on earlier seeds (A8, PKG-19 ruling). New since wave-05: PKG-19 replaced
`scripted-good` and `scripted-bad` with vision-written plans (`policy-good.ts`, `policy-bad.ts`) and added `--from`.
Commands: `npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --no-write` and `--seeds 30 --from 1|31|61` →
`shots/trc-06/sim-WORLD-02-s10.txt`, `sim-WORLD-02-s30-from{1,31,61}.txt`.

| Check | By | Measured as (sim key) | Pass range | Seeds needed | Was (wave-05) | Result | Evidence / what happened (10 / 1–30 / 31–60 / 61–90, bar in brackets) |
|---|---|---|---|---|---|---|---|
| 1 | end | same seed, same policy twice: identical | final state hash equal | 10 of 10 | pass | pass | 10/10 [10], 30/30 ×3 [30]. Browser: seed 4 untouched against 22 drags and zooms, identical endT 206, tick 6180, rng {s 2457749769, n 2318}, statuses (`shots/trc-06/probe-log.md` E4). |
| 2 | end | idle on even fleets: winner does not swing with seed | same winner (or draw) | 8 of 10 | pass | pass | 10/10 [8], 30/30, 29/30, 29/30 [24]; winner enemy (player 1 on each held-out block). |
| 3 | end | scripted-good beats idle | outcome rank higher than idle, or equal and fewer lost | 8 of 10 | partial | **fail** | 10/10 [8], 29/30 [24], 25/30 [24], **19/30 [24] FAIL on 61–90** (runner: FAIL). Good wins outright 5 of 10, 17, 15 and 11 of the blocks (was 27 of 90). Scored FAIL on held-out seeds by Daedalus's PKG-19 ruling; PKG-24 did not merge (For Caleb 13). Same points as wave-05 (a partial scored 0 there too). |
| 4 | end | scripted-bad does worse than idle | outcome rank lower, or equal and more lost | 8 of 10 | pass | pass | 10/10 [8], 28/30, 25/30, 24/30 [24] (exactly on the judge block). Bad is beaten outright 5 of 10, 11, 15, 11. |
| 5 | end | AI admiral uses the player's order set only | every AI order is a player order type | 10 of 10 | pass | pass | 10/10, 30/30 ×3; foreign 0; at 61–90: attack 2275, withdraw 29, focusSide 97, followFlagship 155, board 74. |
| 6 | end | AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push | 8 of 10 | pass | pass | 10/10 [8], 27/30, 25/30, 28/30 [24]; every push telegraphed (44 of 44 on 61–90, min lead 6 s); the misses are seeds with no push. |
| 7 | end | Jupiter's mean range > Mars-style control | meanRange(jupiter) > meanRange(control) | 8 of 10 | pass | pass | 10/10, 30/30 ×3; at 10 seeds jupiter 4841–6105 m, control 1992–2629 m. |

Feel checks (Caleb only): not judged here.

**Score 6/7** (wave-05: 6/7). Most important non-pass: check 3. The good plan beats doing nothing on 29 of seeds 1–30
and 19 of 61–90. Check 4 holds on the judge block by zero seeds of margin.
