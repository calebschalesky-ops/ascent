/**
 * Report lines as data (PKG-06; written in Kalliope's seat). A captain's line is a body chosen by report type and mood,
 * plus a tail chosen by trait (or none), each picked by comms' seeded stream. Every common type has at least three
 * bodies per mood, so every type × trait × mood cell has at least three lines.
 *
 * House voice: a warship's comms. Short, concrete, numbers where a captain would give them. Greek, Roman and Byzantine
 * register in names and forms of address only; no lore in the lines. Placeholders are filled from battle data:
 * {ship} the speaker's ship, {about} the other ship, {side} a shield side, {hull} a hull percentage, {system} a ship
 * system, {do} what the captain is doing, {target} a target, {maneuver}, {task}, {n}, {cost}, {have}.
 */
import type { Mood, Trait } from '../types';
import type { ReportType } from './types';

type ByMood = Record<Mood, string[]>;

export const BODY: Partial<Record<ReportType, ByMood>> = {
  withdraw: {
    confident: ['Hull at {hull}%. She still answers, but I would take her out. Request to withdraw.', 'We have done our share. {hull}% hull. Permission to pull out?', 'Admiral, {ship} at {hull}%. Asking leave to withdraw while we can still jump.'],
    steady: ['{ship} at {hull}% hull. Request permission to withdraw.', 'Hull {hull}%. We should pull out. Your word, Admiral.', 'Taking too much. {hull}% left. Request we withdraw.'],
    strained: ['{hull}% hull and falling. Request we pull out now.', 'We cannot hold this, Admiral. {hull}%. Let us go.', 'She is breaking up. {hull}%. Request to withdraw.'],
    panicked: ['We are coming apart! {hull}%! Let us out!', 'Admiral, get us out of here! {hull}% and falling!', 'Withdraw, we have to withdraw! {hull}%!'],
    defiant: ['{hull}% hull. I would stay, but I am asking. Withdraw?', 'She has {hull}% left in her. Say the word and we pull out. Say nothing and we fight.', 'I will not run unless you tell me to. {hull}% hull.'],
  },
  pursue: {
    confident: ['{about} is running. We can catch her. Pursue?', 'Their {about} has broken. Request we run her down.', '{about} is turning for home. Give me leave and she is ours.'],
    steady: ['{about} has broken off. Request to pursue.', 'Enemy {about} is running. Pursue or hold?', '{about} is trying to jump. We can chase. Your call.'],
    strained: ['{about} is running. We could go after her, if you want it.', '{about} broke. Chase her or stay on the line?', 'One of theirs is running, {about}. Pursue?'],
    panicked: ['{about} is running. Do we go? Tell me quickly.', 'They are breaking, {about} first. Do we chase?', '{about} is off. I need orders.'],
    defiant: ['{about} is running and I want her. Pursue?', 'Let me finish {about}. Say yes.', '{about} is getting away. Give me the word.'],
  },
  cover: {
    confident: ['The flagship is taking it hard. Request we close and cover her.', 'Flagship needs a shield. {ship} can be there in a minute.', 'Let us cover the flagship, Admiral. We have the speed.'],
    steady: ['Flagship is hurt. Request to cover.', 'You are taking fire, Admiral. {ship} can cover you. Permission?', 'Request we close on the flagship and cover.'],
    strained: ['Flagship is in trouble. Do we cover you or hold here?', 'You are hurt, Admiral. Cover or hold?', 'Flagship is taking too much. We can come. Say so.'],
    panicked: ['The flagship! Do we come to you?', 'Admiral, you are hit! Cover you or hold?', 'Flagship is burning! Orders!'],
    defiant: ['Nobody touches the flagship. Let us cover.', 'I am coming to cover you unless you say no.', 'Flagship needs us. Request to cover.'],
  },
  shieldDown: {
    confident: ['{side} side is open. We can turn a fresh side. Request we turn.', 'Lost the {side} shield. Nothing serious yet. Reinforce it?', '{side} shield is down. Easy fix if I get the power.'],
    steady: ['{side} side is open. Request we turn.', '{side} shield down. Reinforce or carry on?', 'Lost the {side} shield. Request power to {side}.'],
    strained: ['{side} side is open and they know it. Request we turn.', '{side} shield is gone. We need power there now.', 'They have our {side} side open. Orders?'],
    panicked: ['{side} side is open! They are in!', '{side} shield gone! We have to turn!', 'We are open on the {side}! Help us!'],
    defiant: ['{side} shield is down. Let them come.', 'They opened our {side} side. Reinforce, or we take it on the hull.', '{side} side is open. We stay unless you say otherwise.'],
  },
  breach: {
    confident: ['Hull breach. We lost {system}, but we are still in the fight.', 'Took one through. No {system}, hull {hull}%. Carry on?', 'Breach aft of the bridge. Damage control is on {system}.'],
    steady: ['Hull breach. Lost {system}. {hull}% hull.', 'Breach amidships. Lost {system}. Orders?', 'We have lost {system}. Hull {hull}%. Pull out or carry on?'],
    strained: ['Breach! Lost {system}, hull {hull}%.', 'Lost {system}. We are venting. Orders?', 'They are through the hull. No {system}.'],
    panicked: ['Breach! We lost {system}! Hull {hull}%!', 'She is venting everywhere! No {system}!', 'We are holed! No {system}! Orders, Admiral!'],
    defiant: ['They holed us and took {system}. Still firing.', 'Breach. Lost {system}. It changes nothing.', 'Lost {system}. We fight on unless you call us off.'],
  },
  breaking: {
    confident: ['Crew is shaken. Give them a word, Admiral.', 'My people have had enough of this. Orders?', 'We are close to the edge here. Hold or pull out?'],
    steady: ['Crew is close to breaking. Hold or withdraw?', 'My people are near their limit. Orders?', 'We will not hold much longer. Your word.'],
    strained: ['They are going to break, Admiral. I cannot keep them.', 'Crew is near done. Pull us out or tell me to stand.', 'We are about to break. Orders, quickly.'],
    panicked: ['They are running for the pods! Let us go!', 'I cannot hold them! We have to get out!', 'We are breaking! Admiral!'],
    defiant: ['My crew is wavering. I am not. Orders?', 'They are close to running. I will hold them if you ask it.', 'Crew is near breaking. Say stand and we stand.'],
  },
  protest: {
    confident: ['That puts us in their arc with {hull}% hull. Confirm?', 'We can do it, but it will cost us. Confirm the order?', 'Admiral, are you sure? {hull}% hull. Confirm.'],
    steady: ['Admiral, that puts us in their railgun arc. Confirm?', 'With {hull}% hull? Confirm the order.', 'That is a hard one. Confirm and we go.'],
    strained: ['We will not survive that, Admiral. Confirm?', '{hull}% hull and you want us in there? Confirm.', 'Please confirm. We are not in shape for this.'],
    panicked: ['We cannot! Not at {hull}%! Confirm it if you mean it!', 'That will kill us! Confirm?', 'No, Admiral, please, confirm that?'],
    defiant: ['That is a bad order. Confirm it and we go.', 'I think you are wrong. Confirm.', 'Confirm, and I will do it. I want it on the record.'],
  },
  refuse: {
    confident: ['No, Admiral. Not that order.', 'I will not do that. Find someone else.', 'Respectfully, no.'],
    steady: ['I will not do that, Admiral.', 'Refused. Relieve me if you want.', 'No. Not with this ship.'],
    strained: ['No. I will not throw my crew away.', 'I cannot do that, Admiral. I will not.', 'Refused. We are barely holding as it is.'],
    panicked: ['No! I will not!', 'I cannot, I will not, no!', 'Not that! No!'],
    defiant: ['I will not strike my colours. Not for you, not for anyone.', 'No. {ship} does not run.', 'Refused. Relieve me after the battle.'],
  },
  ack: {
    confident: ['{do}. Good call.', 'Understood. {do}.', 'With pleasure. {do}.'],
    steady: ['Understood. {do}.', 'Aye, Admiral. {do}.', '{do}. {ship} out.'],
    strained: ['Understood. {do}.', '{do}. We will try.', 'Aye. {do}, as best we can.'],
    panicked: ['{do}! Going!', 'Yes! {do}!', '{do}, {do}, going now!'],
    defiant: ['{do}. They will not like it.', 'Aye. {do}.', '{do}. Watch us.'],
  },
  timeoutChoice: {
    confident: ['No word from the flagship. {do}.', 'Heard nothing, so I made the call. {do}.', 'Admiral is busy. {do}.'],
    steady: ['No answer. {do}.', 'No reply from the flagship. {do}.', 'Taking it on myself. {do}.'],
    strained: ['Nobody is answering. {do}.', 'I cannot wait any longer. {do}.', 'No orders. {do}.'],
    panicked: ['Nobody answered! {do}!', 'No orders! {do}!', 'We are on our own! {do}!'],
    defiant: ['No answer, so it is my call. {do}.', 'Silence from the flagship. {do}.', 'I will not wait. {do}.'],
  },
  ping: {
    confident: ['{ship}, hull {hull}%. All in hand.', 'Hull {hull}%. We are doing fine.', '{hull}% hull. Nothing to worry about here.'],
    steady: ['{ship}. Hull {hull}%. On station.', 'Hull {hull}%. Engaged.', 'Hull at {hull}%. Holding.'],
    strained: ['Hull {hull}%. It is getting hard.', '{hull}% hull. We are taking a lot.', 'Hull {hull}%. We need help soon.'],
    panicked: ['{hull}%! We are being torn apart!', 'Hull {hull}%, it is bad, it is very bad!', 'We are going down! {hull}%!'],
    defiant: ['Hull {hull}%. Still here.', '{hull}%. We will last.', 'Hull {hull}%. Ask me again when it matters.'],
  },
};

/** Ship systems as a captain says them. */
export const SYSTEM_SAY: Record<string, string> = {
  engines: 'the engines', guns: 'the guns', pd: 'point defence', hangar: 'the hangar', jump: 'the jump drive',
};

/** One-set lines (no mood split): status traffic the flag lieutenant folds. */
export const STATUS: Partial<Record<ReportType, string[]>> = {
  kill: ['{ship} reports {about} out of the fight.', '{about} is finished. Credit to {ship}.', '{ship}: {about} is down.'],
  lost: ['We have lost {ship}.', '{ship} is gone.', 'No signal from {ship}.'],
  broke: ['{ship} has broken off and is running.', '{ship} is out of the line.', '{ship} broke. Nothing from her captain.'],
  // PKG-14: a captain firing on a ship our marines have boarded (EXP-05 s5).
  fireSlack: ["Their fire's slackened, Admiral.", "{about}'s guns have gone ragged. Our marines are pulling her crew off them.", '{about} is firing slower. The boarders are keeping her busy.'],
  // PKG-14: a captain whose standing shield order can no longer hold (EXP-02 s8).
  shieldHold: ["Can't hold your split, Admiral. Our {side} side is down and that's where they're shooting. Moving power to {side}.", "The {side} side is open and taking their fire. I'm breaking your split to cover it.", "Admiral, they're through on the {side}. Your split won't hold. Shifting power."],
};

/** Trait tails by family: the part of a line that sounds like this captain and no other. '' means no tail. */
export type Family = 'ask' | 'report' | 'push' | 'ack' | 'self';
export const FAMILY: Partial<Record<ReportType, Family>> = {
  withdraw: 'ask', pursue: 'ask', cover: 'ask', shieldDown: 'ask', breach: 'report', breaking: 'ask', protest: 'push',
  refuse: 'push', ack: 'ack', timeoutChoice: 'self', ping: 'report',
};

export const TAIL: Record<Family, Record<Trait, string[]>> = {
  ask: {
    Bold: ['', 'I would rather push.', 'Quickly, Admiral.'],
    Cautious: ['', 'Better safe.', 'I have it costed both ways.'],
    Veteran: ['', 'Seen this before.', 'No rush. A few seconds.'],
    Ambitious: ['', 'Remember who asked.', 'This is our chance.'],
    Fanatic: ['', 'For the house.', 'We do not fear it.'],
    'Glory-hound': ['', 'Let us earn something today.', 'I want this one.'],
    'By-the-book': ['', 'Standing by for orders.', 'Per standing orders, I am asking.'],
    'Grudge-holder': ['', 'Do not ignore me twice.', 'I will remember the answer.'],
    Protector: ['', 'The others come first.', 'Whatever keeps the line together.'],
    Pessimist: ['', 'It will only get worse.', 'I do not like our odds.'],
    Optimist: ['', 'We can manage.', 'Nothing we cannot fix.'],
  },
  report: {
    Bold: ['', 'Still pushing.', 'We hit back harder.'],
    Cautious: ['', 'Watching it closely.', 'I would not risk more.'],
    Veteran: ['', 'Damage control is on it.', 'We have had worse.'],
    Ambitious: ['', 'Note that we are still in it.', 'We have done the most work out here.'],
    Fanatic: ['', 'We do not stop.', 'The house holds.'],
    'Glory-hound': ['', 'Point me at something.', 'Give us a target.'],
    'By-the-book': ['', 'Logged.', 'Report ends.'],
    'Grudge-holder': ['', 'I know which ship did it.', 'They will pay for that.'],
    Protector: ['', 'The others are all right.', 'Our people are covered.'],
    Pessimist: ['', 'It looks bad.', 'I would not count on us.'],
    Optimist: ['', 'Nothing serious.', 'We are fine.'],
  },
  push: {
    Bold: ['', 'I am not afraid of it.', 'Ask me for something harder.'],
    Cautious: ['', 'There is a better way.', 'I have run the numbers.'],
    Veteran: ['', 'I have seen ships lost like this.', 'Trust me on this one.'],
    Ambitious: ['', 'Not for nothing.', 'It does us no credit.'],
    Fanatic: ['', 'The house does not ask that of us.', 'Never.'],
    'Glory-hound': ['', 'There is no glory in that.', 'Give that one to someone else.'],
    'By-the-book': ['', 'It is against standing orders.', 'Put it in writing.'],
    'Grudge-holder': ['', 'I will remember this.', 'Again, Admiral?'],
    Protector: ['', 'It leaves the others open.', 'Who covers them?'],
    Pessimist: ['', 'We will not come back.', 'I know how this ends.'],
    Optimist: ['', 'Even I cannot see it working.', 'There must be a better way.'],
  },
  ack: {
    Bold: ['', 'About time.', 'Hard about.'],
    Cautious: ['', 'Carefully.', 'Watching our flanks.'],
    Veteran: ['', 'Done it before.', 'On it.'],
    Ambitious: ['', 'Remember who did it.', 'Watch this.'],
    Fanatic: ['', 'For the house.', 'Without fear.'],
    'Glory-hound': ['', 'Finally.', 'Now we are talking.'],
    'By-the-book': ['', 'As ordered.', 'Logged.'],
    'Grudge-holder': ['', 'Noted.', 'This time.'],
    Protector: ['', 'Keeping the others close.', 'Nobody left behind.'],
    Pessimist: ['', 'If we must.', 'For what it is worth.'],
    Optimist: ['', 'This will work.', 'Easy.'],
  },
  /** A captain deciding alone on a timeout. */
  self: {
    Bold: ['', 'Should have asked sooner.', 'I was not going to sit here.'],
    Cautious: ['', 'The safe course.', 'Better than guessing.'],
    Veteran: ['', 'I have done this before.', 'You can change it later.'],
    Ambitious: ['', 'Remember who made the call.', 'I will take the credit or the blame.'],
    Fanatic: ['', 'The house decides for me.', 'No hesitation.'],
    'Glory-hound': ['', 'The bold way.', 'Watch this.'],
    'By-the-book': ['', 'Per standing orders.', 'Logged as my decision.'],
    'Grudge-holder': ['', 'Noted that nobody answered.', 'I will remember the silence.'],
    Protector: ['', 'Nobody left behind.', 'Keeping the line together.'],
    Pessimist: ['', 'For what it is worth.', 'Not that it matters.'],
    Optimist: ['', 'It will work out.', 'Easy.'],
  },
};

/** Answer labels (the buttons) and what a captain says they are doing when they take that answer. */
export const LABEL: Record<string, string> = {
  withdraw: 'Withdraw', stay: 'Stay', pursue: 'Pursue', hold: 'Hold', cover: 'Cover the flagship', reinforce: 'Reinforce {side}',
  carryOn: 'Carry on', fallBack: 'Fall back on the flagship', standFast: 'Stand fast', escortsClose: 'Escorts close up',
  allCover: 'All ships to the flagship', confirm: 'Confirm', belay: 'Belay that',
  reinforceBoard: 'Reinforce', pullBack: 'Pull back',
  // PKG-22 (F-03, F-08): answers that match what was asked.
  sendPods: 'Send the pods', keepFiring: 'Keep firing', turn: 'Turn a fresh side', shieldsTo: 'Shields to {side}',
};
export const DOING: Record<string, string> = {
  withdraw: 'Pulling out', stay: 'We stay', pursue: 'Going after her', hold: 'Holding here', cover: 'Coming to cover you',
  reinforce: 'Power to {side}', carryOn: 'Carrying on', fallBack: 'Falling back on the flagship', standFast: 'We stand',
  escortsClose: 'Escorts closing up', allCover: 'All ships to the flagship', confirm: 'Going in', belay: 'Belayed',
  attack: 'Engaging {target}', focusSide: 'Working on their {side} side', holdPosition: 'Holding position',
  followFlagship: 'Forming on the flagship', shieldPower: 'Shields reset',
  maneuver: 'Maneuvering on {target}',
  reinforceBoard: 'More pods away', pullBack: 'Pulling the marines out',
  // PKG-14: a direct board order's acknowledgement said the raw kind ('board').
  board: 'Boarders away for {target}',
  // PKG-22
  sendPods: 'Pods away', keepFiring: 'Guns stay on her', turn: 'Turning a fresh side to them', shieldsTo: 'Power to {side}',
};

/** The flagship's officers answer in person. No moods: they are on your bridge, and steady is their job. */
export const OFFICER: Record<string, string[]> = {
  gunsOn: ['All batteries on {target}. Firing.', 'Guns on {target}, aye.', 'Shifting fire to {target}. Rails first.'],
  holdFire: ['Holding fire. Guns are cold.', 'Cease fire, aye. All batteries hold.', 'Guns silent until you say.'],
  gunsFree: ['Guns free. Picking our own targets.', 'Batteries back on their own targets.', 'Fire at will, aye.'],
  shieldPower: ['Power shifted. The {side} side is heaviest now.', 'Shields reset, aye. Most power to {side}.', 'Done. The {side} side takes the load.'],
  shieldEven: ['Shields even all round.', 'Power spread evenly, aye.', 'Four sides even.'],
  overloadGuns: ['Overloading the guns. Shields will thin.', 'Guns on overload, aye. Watch our shields.', 'Pushing the batteries. They will not last forever.'],
  feedEngines: ['Feeding the engines. Guns will slow.', 'Power to engines and the jump drive, aye.', 'Engines first. Damage control on the drive.'],
  powerNormal: ['Power back to normal.', 'Normal power, aye.', 'Back to standard settings.'],
  helm: ['{maneuver}, aye. Bringing her round.', 'Helm answering. {maneuver}.', 'Aye. {maneuver}. Stand by for the turn.'],
  launchPods: ['Pods away for {target}.', 'Boarders launching. Target {target}.', 'Marines away, aye. Going for {target}.'],
  launchPodsFlagship: ['Pods away for {target}. Their flagship, Admiral. We go for the bridge.', 'Marines away for {target}, aye. Straight at their flagship.', 'Boarders launching at {target}. If we take her, their line goes with her.'],
  // PKG-14: a launch refused gives its true reason (boarding.ts BoardRefusal), never "not ready".
  podsOutOfRange: ['{target} is out of range, Admiral. {km} km off; the pods reach {reach}.', 'Too far. {target} is {km} km out and the pods reach {reach}.', 'Cannot reach {target} from here. {km} km; we need her inside {reach}.'],
  podsHangarOut: ['The hangar is down, Admiral. Nothing launches until it is repaired.', 'Hangar is wrecked. No pods can go.', 'Cannot launch. The hangar took a hit and it is out.'],
  podsNoMarines: ['Not enough marines left to send, Admiral. We keep a guard aboard.', 'The marines are all out or holding the ship. Nobody left to send.', "We are down to the ship's guard. I will not strip her."],
  podsGone: ['{target} is not in the fight any more.', 'Nothing left of {target} to board.', '{target} is gone, Admiral.'],
  noPods: ['No pods aboard, Admiral. Nothing to launch.', 'We have no boarding craft to send.', 'Cannot do it. No pods aboard.'],
  fighters: ['Wings tasked to {task}, aye.', 'Fighter command: {task}.', 'Wings will {task}.'],
  notFlagship: ['That order is for the flagship’s own crew.', 'Only our own crew can take that order.', 'That is a flagship order, Admiral.'],
  noTarget: ['No such target in the field.', 'Cannot find {target} on the plot.', 'Target is gone, Admiral.'],
  // PKG-14: engineering, when a standing shield order cannot hold (EXP-02 s8).
  shieldCantHold: ["Can't hold your split, Admiral. The {side} side is down and they're on it. Moving power to {side}.", "The {side} shield is gone and that's where the fire is. Your split won't hold; shifting power.", "Admiral, we're open on the {side}. I have to break your split to cover it."],
  // PKG-14: the marine commander's decision while our marines fight inside an enemy ship (EXP-05 s6).
  boardHolding: ['{ours} of ours against {theirs} aboard {about}. We are winning. Reinforce, pull back, or let them carry on?', 'The fight on {about} is going our way, {ours} to {theirs}. Send more, pull them out, or leave it?', 'Marines holding aboard {about}, {ours} against {theirs}. Your call, Admiral.'],
  boardLosing: ['It is going badly on {about}. {ours} of ours against {theirs}. Reinforce or pull them out?', "{about}'s crew are holding us, {theirs} to our {ours}. More pods, or bring them home?", 'We are outnumbered aboard {about}, {ours} to {theirs}. I need a decision.'],
  // PKG-22 (TRC05-6): ahead, but not by enough to be sure of her. Never "outnumbered" when our figure is the bigger one.
  boardClose: ['It is close on {about}. {ours} of ours against {theirs}. Reinforce, pull back, or let them carry on?', 'We are ahead on {about}, {ours} to {theirs}, but only just. More pods would settle it.', "Even fight on {about}'s decks, {ours} to {theirs}. Your call, Admiral."],
  boardNoPods: ['No pods left to send.', 'Nothing left to reinforce with.', 'We have no launcher that can reach her.'],
  marineOwnCall: ['No word, so {about} is my call. {do}.', 'I will take that one, Admiral. {do}.', 'Heard nothing about {about}. {do}.'],
  // PKG-22 (F-03): the master of guns, when our rounds go through an enemy side he is watching. {open}: bow, stern,
  // port side, starboard side.
  sideOpen: ['Their {open} is down on {about}. Our rounds are going through to the hull.', "{about}'s {open} is open, Admiral. We are hitting hull.", '{about} is open on her {open}. Pods can go in there.'],
  sideOpenNoReach: ['Nothing of ours can put pods on her from here.', 'No launcher of ours is in reach of her.', 'She is beyond our pods for now.'],
  sideClosed: ['{about} has her {open} back up.', "Power's back on {about}'s {open}. Pods would bounce now.", "{about}'s {open} is holding again."],
  // PKG-22 (F-07): what the scoreboard's count means after a capture.
  score: ['{house} counts {total} ships now: {own} + {taken} taken.', 'The board shows {house} at {total}: {own} + {taken} taken.', '{house} is at {total} on the board, {own} + {taken} taken.'],
  noPoints: ['Not enough command points: {cost} needed, {have} ready.', 'The bridge is saturated. {cost} needed, {have} ready.', 'Too many orders in flight. Need {cost}, have {have}.'],
  threatenedHull: ['We are taking it hard, Admiral. Hull {hull}%. Bring the escorts in?', 'Flagship hull at {hull}%. Orders?', 'They are concentrating on us. Hull {hull}%.'],
  threatenedShips: ['{n} of theirs in range of us, Admiral.', 'Flagship under heavy fire. {n} enemy ships in range.', 'They are closing on the flagship, {n} of them.'],
};

/** Maneuver and task names as spoken. */
/** PKG-22 (F-10, TRC05-3): an order as the event log says it, never the internal kind name. */
export const ORDER_SAY: Record<string, string> = {
  shieldPower: 'shields reset', attack: 'engaging', focusSide: 'working on a side', holdPosition: 'holding position',
  followFlagship: 'forming on the flagship', withdraw: 'withdrawing', gunsOn: 'guns on target', holdFire: 'guns hold or free',
  overloadGuns: 'guns on overload', feedEngines: 'power to the engines', helm: 'helm answering', launchPods: 'pods away',
  fighters: 'wings tasked', board: 'boarders away', pullBack: 'marines pulling back', maneuver: 'maneuvering',
};
export const orderSay = (kind: string) => ORDER_SAY[kind] ?? 'orders taken';

/** PKG-22: a shield side as the master of guns says it. */
export const OPEN_SAY: Record<string, string> = { fore: 'bow', aft: 'stern', port: 'port side', starboard: 'starboard side' };

export const MANEUVER_SAY: Record<string, string> = {
  close: 'Closing the range', openRange: 'Opening the range', freshSide: 'Turning a fresh side', crossBow: 'Crossing their bow',
  holdStation: 'Holding station', ram: 'Ramming speed',
};

/**
 * The marine commander, on PKG-05's boarding events. A key is the report type for our boarders on their ship; the same
 * key + 'Us' is their boarders on ours (PKG-14: a capture by us reads as a win, a capture of ours as a loss).
 */
export const MARINE: Record<string, string[]> = {
  // PKG-22 (F-08): the side the pods are aiming at, so "Shields to {side}" answers it.
  boardersInbound: ['Boarders inbound on {ship}, coming at her {side} side.', 'Enemy pods closing on {ship}. They are aiming at her {side}.', 'They are sending boarders at {ship}, {side} side.'],
  boardLaunch: ['Our pods are away from {ship}, bound for {about}.', '{ship} has launched boarders at {about}.', 'Boarders away from {ship}.'],
  boardDeflected: ['Pods turned away at {about}. Her {side} shield is still up.', "Boarders deflected off {about}'s {side} side. The shield held.", "Pods could not get through {about}'s {side} shield."],
  // PKG-14 (item 7): the side was down at launch, but the defender put power back on it before the pods arrived.
  boardDeflectedRepowered: ["They put power back on {about}'s {side} side. Our pods were turned away.", "{about} re-powered her {side} shield before we got there. Pods deflected.", "Her {side} side came back up, Admiral. {about} shunted power to it. Pods turned away."],
  boardDeflectedUs: ['Their pods glanced off {about}. Our {side} shield held.', 'Enemy boarders turned away at {about}.', "{about}'s {side} shield threw their pods off."],
  boardBreach: ['Our boarders are through on {about}.', 'Breach on {about}. Our marines are aboard.', 'We have cut into {about}.'],
  boardBreachUs: ['Enemy boarders are through on {about}.', 'They have cut into {about}. Her crew are fighting.', 'Breach on {about}. Their marines are aboard.'],
  boardFight: ['Our marines are fighting on the decks of {about}.', 'Deck fight on {about}. We are holding.', 'Marines pushing through {about}, deck by deck.'],
  boardFightUs: ['Repelling boarders aboard {about}.', "{about}'s crew are fighting their marines in the passages.", 'Still fighting boarders on {about}.'],
  // PKG-22 (F-07): a capture opens with the news itself, both ways.
  captured: ['{about} is ours, Admiral. She has struck her colours.', '{about} is ours. Our prize crew is aboard.', '{about} is ours. She flies our colours now.'],
  capturedUs: ['{about} is taken, Admiral. Their marines hold her decks.', '{about} is taken. She flies their colours now.', '{about} is taken. We lost the fight for her decks.'],
  repelled: ['Our boarders were thrown off {about}.', 'We lost the fight aboard {about}. The marines are gone.', "{about}'s crew beat our boarders."],
  repelledUs: ['Boarders repelled on {about}. Decks are clear.', '{about} threw them off.', 'Decks clear on {about}. Their marines are finished.'],
  scuttled: ['{about} blew her charges with our marines aboard.', 'Her captain scuttled {about} rather than strike. We lost the boarders.', '{about} is gone. Scuttle charges, with our people inside.'],
  scuttledUs: ['{about} scuttled herself rather than strike.', 'Her captain blew the charges on {about}. She is gone, and their boarders with her.', 'We lost {about}. She went up before they could take her.'],
};

/**
 * The flag lieutenant's fold of status traffic (PKG-14: reads like a person, numbers in words). {N} is the count as a
 * capitalised word, {n} lower case; {reports} agrees with it. shields/targets: [plural, one].
 */
export const SUMMARY = {
  head: ['{N} {reports}, Admiral.', 'Admiral, {n} {reports} since the last.', '{N} {reports} from the line, Admiral.', 'From the line, {n} {reports}.'],
  shields: ['{n} ships trimming shields', 'one ship trimming shields'],
  targets: ['{n} retargeting', 'one retargeting'],
  quiet: ['Line holding.', 'Nothing needs you.', 'All quiet on the line.'],
};
