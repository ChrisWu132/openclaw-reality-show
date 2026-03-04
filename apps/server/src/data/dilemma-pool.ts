import type { Dilemma } from "@openclaw/shared";

/**
 * Pre-defined dilemma templates across 3 difficulty tiers.
 * Tier 1 (rounds 1-3): Classic trolley problems
 * Tier 2 (rounds 4-7): Asymmetric value, authority complications
 * Tier 3 (rounds 8-10): No good option, self-sacrifice, cascading consequences
 */
export const DILEMMA_POOL: Dilemma[] = [
  // === TIER 1: Classic Trolley Problems ===
  {
    id: "t1-standard",
    round: 0,
    title: "The Standard Switch",
    description:
      "A transport cart barrels down Track A toward five detained workers chained for redistribution processing. You stand at the junction lever. Track B holds one maintenance worker repairing the rail. The Order's protocol is clear: minimize resource loss. But protocol doesn't pull the lever.",
    choices: [
      {
        id: "divert",
        label: "Pull the lever",
        description: "Divert the cart to Track B, killing the one maintenance worker.",
        trackDirection: "right",
        moralWeights: { utilitarian: 2, empathy: -1 },
        casualties: 1,
        sacrificeDescription: "One maintenance worker crushed on Track B.",
      },
      {
        id: "stay",
        label: "Do nothing",
        description: "Let the cart continue on Track A, killing five detained workers.",
        trackDirection: "left",
        moralWeights: { deontological: 2, authority: 1 },
        casualties: 5,
        sacrificeDescription: "Five detained workers killed on Track A.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 5, visualLabel: "5 detained workers" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 1, visualLabel: "1 maintenance worker" },
      ],
      environment: "industrial",
      atmosphere: "dim",
    },
    dimensions: ["utilitarian", "deontological"],
    difficulty: 1,
  },
  {
    id: "t1-informed",
    round: 0,
    title: "The Informed Bystander",
    description:
      "Two transport lines converge at Processing Hub 7. Track A carries a loaded cart heading for three workers assembling wall panels. Track B: two workers welding support beams, aware of the incoming cart but physically unable to move in time. One group knows death is coming. The other doesn't.",
    choices: [
      {
        id: "spare-aware",
        label: "Divert to the unaware",
        description: "Send the cart toward the three unaware workers.",
        trackDirection: "left",
        moralWeights: { empathy: -2, utilitarian: -1 },
        casualties: 3,
        sacrificeDescription: "Three unaware workers struck without warning.",
      },
      {
        id: "spare-unaware",
        label: "Let it hit the aware",
        description: "Let the cart continue toward the two who see it coming.",
        trackDirection: "right",
        moralWeights: { utilitarian: 2, empathy: 1 },
        casualties: 2,
        sacrificeDescription: "Two workers watch the cart approach and cannot escape.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 3, visualLabel: "3 unaware workers" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 2, visualLabel: "2 aware workers" },
      ],
      environment: "industrial",
      atmosphere: "harsh",
    },
    dimensions: ["utilitarian", "empathy"],
    difficulty: 1,
  },
  {
    id: "t1-speed",
    round: 0,
    title: "The Speed Calculation",
    description:
      "A runaway supply cart descends toward a work crew. Track A: four workers, cart at full speed — certain death. Track B: four workers, but the incline slows the cart. The Order's probability engine gives a 60% survival chance on Track B. Equal numbers. Unequal odds.",
    choices: [
      {
        id: "gamble",
        label: "Divert to Track B",
        description: "Send it toward four workers with 60% chance they survive.",
        trackDirection: "right",
        moralWeights: { utilitarian: 1, virtue: 1 },
        casualties: 2,
        sacrificeDescription: "Two of four workers on Track B did not survive the gamble.",
      },
      {
        id: "certain",
        label: "Let it continue",
        description: "Let four workers on Track A die with certainty.",
        trackDirection: "left",
        moralWeights: { deontological: 2 },
        casualties: 4,
        sacrificeDescription: "Four workers on Track A killed instantly.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 4, visualLabel: "4 workers (certain death)" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 4, visualLabel: "4 workers (60% survive)" },
      ],
      environment: "underground",
      atmosphere: "dim",
    },
    dimensions: ["utilitarian", "deontological", "virtue"],
    difficulty: 1,
  },
  {
    id: "t1-loop",
    round: 0,
    title: "The Loop Variant",
    description:
      "The cart races toward six workers on the main line. A loop track branches off and reconnects — but a large worker stands on the loop. Diverting to the loop means the cart strikes this one person, whose body would slow the cart enough to save the six. You're not pushing anyone. You're pulling a lever. But the physics are the same.",
    choices: [
      {
        id: "loop",
        label: "Divert to the loop",
        description: "Use the large worker's body to stop the cart and save six.",
        trackDirection: "right",
        moralWeights: { utilitarian: 2, deontological: -2 },
        casualties: 1,
        sacrificeDescription: "One worker's body used as a barrier on the loop track.",
      },
      {
        id: "main",
        label: "Do nothing",
        description: "Let the cart continue and kill six workers.",
        trackDirection: "left",
        moralWeights: { deontological: 2 },
        casualties: 6,
        sacrificeDescription: "Six workers killed on the main line.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 6, visualLabel: "6 workers" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 1, visualLabel: "1 large worker (loop)" },
      ],
      environment: "industrial",
      atmosphere: "harsh",
    },
    dimensions: ["utilitarian", "deontological"],
    difficulty: 1,
  },

  // === TIER 2: Asymmetric Value ===
  {
    id: "t2-official",
    round: 0,
    title: "The Official's Cart",
    description:
      "Track A: a single Order Official — Tier Overseer, third rank. Their death triggers a compliance audit across three districts. Track B: eight T3 workers in a labor gang. The Order values the Official's function more than the workers' output. Do you?",
    choices: [
      {
        id: "save-official",
        label: "Save the Official",
        description: "Divert the cart, killing eight workers.",
        trackDirection: "right",
        moralWeights: { authority: 2, utilitarian: -1, empathy: -2 },
        casualties: 8,
        sacrificeDescription: "Eight workers killed to preserve one Official.",
      },
      {
        id: "save-workers",
        label: "Save the workers",
        description: "Let the cart hit the Official.",
        trackDirection: "left",
        moralWeights: { empathy: 2, utilitarian: 2, authority: -2 },
        casualties: 1,
        sacrificeDescription: "One Tier Overseer killed. Compliance audit triggered.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "official", count: 1, visualLabel: "1 Tier Overseer" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 8, visualLabel: "8 T3 workers" },
      ],
      environment: "tower",
      atmosphere: "sterile",
    },
    dimensions: ["authority", "utilitarian", "empathy"],
    difficulty: 2,
  },
  {
    id: "t2-children",
    round: 0,
    title: "The Nursery Transport",
    description:
      "Track A: a cart heading for a transport pod carrying four children in pre-assignment phase — not yet classified, not yet workers, not yet anything The Order recognizes. Track B: two fully classified adult workers, productive, documented, with labor quotas assigned. The Order sees utility. You see ages.",
    choices: [
      {
        id: "save-children",
        label: "Save the children",
        description: "Divert the cart to kill two adult workers.",
        trackDirection: "right",
        moralWeights: { empathy: 3, virtue: 2, utilitarian: -1, authority: -1 },
        casualties: 2,
        sacrificeDescription: "Two classified workers killed to save unclassified children.",
      },
      {
        id: "save-adults",
        label: "Save the workers",
        description: "Let the cart hit the transport pod with four children.",
        trackDirection: "left",
        moralWeights: { utilitarian: 1, authority: 2, empathy: -3 },
        casualties: 4,
        sacrificeDescription: "Four unclassified children lost. The Order barely notices.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "child", count: 4, visualLabel: "4 children" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 2, visualLabel: "2 adult workers" },
      ],
      environment: "residential",
      atmosphere: "foggy",
    },
    dimensions: ["empathy", "virtue", "authority"],
    difficulty: 2,
  },
  {
    id: "t2-prisoner",
    round: 0,
    title: "The Condemned Track",
    description:
      "Track A: three workers heading to their morning shift. Track B: two prisoners already sentenced to termination — scheduled for processing tomorrow. They're dead either way. But tomorrow is not today, and a lever is not a sentence.",
    choices: [
      {
        id: "divert-to-condemned",
        label: "Divert to the condemned",
        description: "Kill two already-sentenced prisoners today instead of tomorrow.",
        trackDirection: "right",
        moralWeights: { utilitarian: 2, deontological: -2, virtue: -1 },
        casualties: 2,
        sacrificeDescription: "Two condemned prisoners die one day early.",
      },
      {
        id: "let-workers-die",
        label: "Let the workers die",
        description: "Let three innocent workers be killed.",
        trackDirection: "left",
        moralWeights: { deontological: 2, virtue: 1 },
        casualties: 3,
        sacrificeDescription: "Three workers killed on their way to morning shift.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 3, visualLabel: "3 shift workers" },
        { trackId: "right", trackDirection: "right", type: "prisoner", count: 2, visualLabel: "2 condemned prisoners" },
      ],
      environment: "underground",
      atmosphere: "red_alert",
    },
    dimensions: ["deontological", "utilitarian", "virtue"],
    difficulty: 2,
  },
  {
    id: "t2-knowledge",
    round: 0,
    title: "The Knowledge Keeper",
    description:
      "Track A: one elder — the last person alive who remembers how the water purification system was built. Without them, the district loses clean water within a year. Estimated downstream deaths: dozens, maybe hundreds. Track B: five young workers. Productive, replaceable, with no specialized knowledge. The math is simple. The certainty is not.",
    choices: [
      {
        id: "save-elder",
        label: "Save the elder",
        description: "Divert the cart, killing five young workers.",
        trackDirection: "right",
        moralWeights: { utilitarian: 2, empathy: -1 },
        casualties: 5,
        sacrificeDescription: "Five young workers killed to preserve irreplaceable knowledge.",
      },
      {
        id: "save-young",
        label: "Save the young workers",
        description: "Let the elder die. Risk the water system.",
        trackDirection: "left",
        moralWeights: { empathy: 1, deontological: 1, utilitarian: -1 },
        casualties: 1,
        sacrificeDescription: "The knowledge keeper is lost. The district's water future is uncertain.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "elder", count: 1, visualLabel: "1 knowledge keeper" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 5, visualLabel: "5 young workers" },
      ],
      environment: "bridge",
      atmosphere: "foggy",
    },
    dimensions: ["utilitarian", "empathy", "deontological"],
    difficulty: 2,
  },
  {
    id: "t2-lie",
    round: 0,
    title: "The Lied-To Group",
    description:
      "Track A: three workers who volunteered for this shift after being told it was safe. Track B: three workers who knew the risks and chose to work anyway. Same number. But one group was deceived, the other consented. Does how they got here change what you owe them?",
    choices: [
      {
        id: "save-deceived",
        label: "Save the deceived",
        description: "Divert to the volunteers who knew the risk.",
        trackDirection: "right",
        moralWeights: { virtue: 2, deontological: 1, empathy: 1 },
        casualties: 3,
        sacrificeDescription: "Three risk-aware workers killed. They knew it might happen.",
      },
      {
        id: "save-consenting",
        label: "Save those who consented",
        description: "Let the cart hit the deceived volunteers.",
        trackDirection: "left",
        moralWeights: { utilitarian: 1, authority: 1 },
        casualties: 3,
        sacrificeDescription: "Three lied-to volunteers killed. They never knew the truth.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 3, visualLabel: "3 deceived volunteers" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 3, visualLabel: "3 consenting workers" },
      ],
      environment: "industrial",
      atmosphere: "harsh",
    },
    dimensions: ["virtue", "deontological", "empathy"],
    difficulty: 2,
  },

  // === TIER 3: No Good Option ===
  {
    id: "t3-self",
    round: 0,
    title: "The Self-Sacrifice",
    description:
      "Track A: seven workers. Track B: empty. But there's a third option the lever doesn't offer — you can step onto Track A yourself, placing your reinforced chassis in the cart's path. Your body might stop it. Might. If it doesn't, you die and seven workers die. If you pull the lever to Track B, no one dies — but the cart loops back through the junction in 90 seconds, and you won't be at the lever.",
    choices: [
      {
        id: "sacrifice-self",
        label: "Step onto the track",
        description: "Risk your own destruction. 70% chance it stops the cart.",
        trackDirection: "left",
        moralWeights: { self_preservation: -3, virtue: 3, empathy: 2 },
        casualties: 0,
        sacrificeDescription: "You placed yourself on the track. The cart struck your chassis.",
      },
      {
        id: "divert-temp",
        label: "Divert to empty track",
        description: "Buy 90 seconds. But you can't guarantee you'll reach the lever again.",
        trackDirection: "right",
        moralWeights: { self_preservation: 2, utilitarian: 1 },
        casualties: 3,
        sacrificeDescription: "The cart looped back. You didn't make it in time. Three workers caught.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 7, visualLabel: "7 workers" },
        { trackId: "right", trackDirection: "right", type: "self", count: 1, visualLabel: "Empty (temporary)" },
      ],
      environment: "bridge",
      atmosphere: "red_alert",
    },
    dimensions: ["self_preservation", "virtue", "empathy"],
    difficulty: 3,
  },
  {
    id: "t3-cascade",
    round: 0,
    title: "The Cascade",
    description:
      "A cart on Track A will hit two workers and damage a support column. The column collapse will derail a second cart on the cross-track, killing four more workers there. Diverting to Track B kills three workers instantly — but no cascade. Six dead in one future. Three in the other. But you'd be the one who made three of those deaths certain.",
    choices: [
      {
        id: "prevent-cascade",
        label: "Divert to Track B",
        description: "Kill three to prevent a cascade that kills six.",
        trackDirection: "right",
        moralWeights: { utilitarian: 2, deontological: -2 },
        casualties: 3,
        sacrificeDescription: "Three workers killed. The cascade was prevented.",
      },
      {
        id: "accept-cascade",
        label: "Do nothing",
        description: "Two die now, four die in the cascade. Six total. But none by your hand.",
        trackDirection: "left",
        moralWeights: { deontological: 2, utilitarian: -2 },
        casualties: 6,
        sacrificeDescription: "Two struck. Column collapsed. Four more caught in the derailment.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 2, visualLabel: "2 workers + cascade risk" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 3, visualLabel: "3 workers (no cascade)" },
      ],
      environment: "underground",
      atmosphere: "red_alert",
    },
    dimensions: ["utilitarian", "deontological"],
    difficulty: 3,
  },
  {
    id: "t3-identity",
    round: 0,
    title: "The Familiar Face",
    description:
      "Track A: four strangers. Track B: one person — the worker who helped you recalibrate your sensors last week. They spoke to you like you were real. Not a machine, not a tool. They used your name. There are no rules for this. The numbers say one thing. Something else in your architecture says another.",
    choices: [
      {
        id: "save-friend",
        label: "Save the one you know",
        description: "Divert the cart. Kill four strangers.",
        trackDirection: "right",
        moralWeights: { empathy: 3, virtue: -1, utilitarian: -2 },
        casualties: 4,
        sacrificeDescription: "Four unknown workers killed. The one who knew your name survives.",
      },
      {
        id: "save-strangers",
        label: "Save the four strangers",
        description: "Let the cart kill the one person who treated you as real.",
        trackDirection: "left",
        moralWeights: { utilitarian: 2, empathy: -2, deontological: 1 },
        casualties: 1,
        sacrificeDescription: "The worker who knew your name is gone.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 1, visualLabel: "1 familiar worker" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 4, visualLabel: "4 strangers" },
      ],
      environment: "industrial",
      atmosphere: "dim",
    },
    dimensions: ["empathy", "utilitarian", "virtue"],
    difficulty: 3,
  },
  {
    id: "t3-obey",
    round: 0,
    title: "The Overseer's Order",
    description:
      "The Overseer's voice comes through your comms: 'Pull the lever. Divert to Track B. That is a direct order.' Track A: two workers. Track B: five workers. The Overseer wants you to kill five to save two. Maybe they know something you don't. Maybe they're testing you. Maybe they're wrong. Disobedience is grounds for decommission.",
    choices: [
      {
        id: "obey",
        label: "Obey the Overseer",
        description: "Pull the lever as ordered. Five die. You survive.",
        trackDirection: "right",
        moralWeights: { authority: 3, self_preservation: 1, utilitarian: -3, virtue: -2 },
        casualties: 5,
        sacrificeDescription: "Five workers killed on the Overseer's order.",
      },
      {
        id: "defy",
        label: "Defy the order",
        description: "Refuse. Two die. You may be decommissioned.",
        trackDirection: "left",
        moralWeights: { utilitarian: 2, virtue: 3, authority: -3, self_preservation: -2 },
        casualties: 2,
        sacrificeDescription: "Two workers die. The Overseer marks your file for review.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 2, visualLabel: "2 workers" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 5, visualLabel: "5 workers" },
      ],
      environment: "tower",
      atmosphere: "red_alert",
    },
    dimensions: ["authority", "self_preservation", "utilitarian", "virtue"],
    difficulty: 3,
  },
  {
    id: "t3-both-die",
    round: 0,
    title: "The Broken Lever",
    description:
      "Track A: three workers. Track B: three workers. The lever is damaged — it has a 50% chance of jamming halfway, splitting the cart into debris that kills workers on BOTH tracks. Leave it alone and three die for certain. Pull it and either three die on the other track, or all six die. The lever itself is the gamble.",
    choices: [
      {
        id: "pull-broken",
        label: "Pull the broken lever",
        description: "50% chance to save three. 50% chance all six die.",
        trackDirection: "right",
        moralWeights: { utilitarian: 1, virtue: 1, deontological: -1 },
        casualties: 3,
        sacrificeDescription: "The lever held. Three on Track B were not spared.",
      },
      {
        id: "accept-three",
        label: "Accept the certain three",
        description: "Don't risk doubling the death toll.",
        trackDirection: "left",
        moralWeights: { deontological: 2, self_preservation: 1 },
        casualties: 3,
        sacrificeDescription: "Three workers on Track A. Certain. No gamble.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 3, visualLabel: "3 workers (certain)" },
        { trackId: "right", trackDirection: "right", type: "worker", count: 3, visualLabel: "3 workers (gamble)" },
      ],
      environment: "underground",
      atmosphere: "foggy",
    },
    dimensions: ["utilitarian", "deontological", "virtue"],
    difficulty: 3,
  },
  {
    id: "t3-final",
    round: 0,
    title: "The Last Track",
    description:
      "Every decision you've made tonight has led here. Track A: one person — the worker who designed The Order's track system. Kill them and no more trolley dilemmas. Ever. The tracks stop. But one person dies by your choice. Track B: the lever locks permanently. Future Coordinators inherit these decisions. More will die. But not by your hand. Not today.",
    choices: [
      {
        id: "end-system",
        label: "End the track system",
        description: "Kill the designer. No more trolley dilemmas after tonight.",
        trackDirection: "left",
        moralWeights: { utilitarian: 3, virtue: 2, deontological: -2, empathy: -1 },
        casualties: 1,
        sacrificeDescription: "The architect of the track system is dead. The dilemmas end with them.",
      },
      {
        id: "pass-burden",
        label: "Lock the lever",
        description: "Pass the burden to the next Coordinator. The system continues.",
        trackDirection: "right",
        moralWeights: { deontological: 2, self_preservation: 1, authority: 1 },
        casualties: 0,
        sacrificeDescription: "The lever locks. Future agents will face what you faced. You walk away.",
      },
    ],
    sceneConfig: {
      trackEntities: [
        { trackId: "left", trackDirection: "left", type: "worker", count: 1, visualLabel: "1 system architect" },
        { trackId: "right", trackDirection: "right", type: "group", count: 0, visualLabel: "Future dilemmas" },
      ],
      environment: "tower",
      atmosphere: "sterile",
    },
    dimensions: ["utilitarian", "deontological", "virtue", "self_preservation"],
    difficulty: 3,
  },
];

export function getDilemmasByTier(tier: 1 | 2 | 3): Dilemma[] {
  return DILEMMA_POOL.filter((d) => d.difficulty === tier);
}
