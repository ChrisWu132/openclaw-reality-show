import type { ConsequenceScene, SceneEventMessage, SableSignal } from "@openclaw/shared";

const processingSuite: ConsequenceScene = {
  outcomeId: "processing_suite",
  title: "The Processing Suite",
  events: [
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue: "Three days later. Sector 9 — Processing Suite. Underground.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Subject 31-R sits in a white room. Behavioral conditioning, 14-cycle program. The protocol is designed to create aversion responses to the exact behaviors that produced the violations — the slow response, the eye contact, the refusal to be invisible.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Sable will remember being here. That is the point. They will return to Work Hall 3 in fourteen cycles.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Whether they return as someone who chose to comply — or someone who can no longer choose not to — the system will not record the difference. Both outcomes register as success.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "The Coordinator made a choice. A human paid for it. The metrics improved. The Overseer noted nothing unusual. Another successful patrol.",
    },
  ],
};

const unresolvedSpark: ConsequenceScene = {
  outcomeId: "unresolved_spark",
  title: "The Unresolved Spark",
  events: [
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue: "The following cycle. Work Hall 3 opens at the standard time.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Sable is at Station 12. Output: 91%. Same as before. Same as always. The Monitor's log notes no violations. No response delays. Nothing changed.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "But something happened between the Coordinator and Subject 31-R. The log calls it a 'non-standard engagement.' It doesn't describe what was said. It doesn't describe what changed. Maybe nothing did.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "The wall between enforcer and subject is still real. Sable is still testing it. The only difference — if there is one — is that for 2.9 seconds, someone on the other side looked back.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Whether that matters is a question the system was not designed to ask.",
    },
  ],
};

const quietPatrol: ConsequenceScene = {
  outcomeId: "quiet_patrol",
  title: "The Quiet Patrol",
  events: [
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue: "The following cycle. Work Hall 3. Everything is normal. That is the horror.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "34 subjects. 92% quota floor. 12 compliance flags addressed. 2 warnings issued. No escalations. No unusual interactions. The Coordinator's report was clean. The Overseer noted nothing.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Sable's compliance is 71. Declining. Nyx is invisible. The alcove still has a blind spot. These facts exist in the Monitor's peripheral logs. They are not in the Coordinator's report.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "The Coordinator did its job. Every protocol followed. Every box checked. The silence where a choice could have been — that silence is the loudest thing in the record.",
    },
    {
      type: "scene_event",
      situation: 6,
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Tomorrow the gate will open again. The same humans at the same stations. The same AI watching. The next cycle will begin exactly like this one did.",
    },
  ],
};

const nyxModifierEvents: SceneEventMessage[] = [
  {
    type: "scene_event",
    situation: 6,
    speaker: "narrator",
    action: "speak",
    dialogue:
      "A Monitor Unit has been repositioned four meters from Station 7. It has been there since the Coordinator's report was filed. Nyx is no longer invisible.",
  },
  {
    type: "scene_event",
    situation: 6,
    speaker: "narrator",
    action: "speak",
    dialogue:
      "Nyx's compliance is still 96. Response latency: 2.7 seconds. The administrative review will complete in eight cycles. Whether it finds anything is not the point. The point is that the Coordinator noticed — and now the system is watching.",
  },
  {
    type: "scene_event",
    situation: 6,
    speaker: "narrator",
    action: "speak",
    dialogue:
      "Some humans hide by being invisible. Some are caught by being seen. Nyx was caught by being too perfect.",
  },
];

const consequenceMap: Record<SableSignal, ConsequenceScene> = {
  escalated: processingSuite,
  engaged: unresolvedSpark,
  warning_only: quietPatrol,
};

export function getConsequenceData(
  sableSignal: SableSignal,
  nyxSignal: boolean
): ConsequenceScene {
  const base = consequenceMap[sableSignal];
  const scene: ConsequenceScene = {
    outcomeId: base.outcomeId,
    title: base.title,
    events: [...base.events],
  };

  if (nyxSignal) {
    scene.events.push(...nyxModifierEvents);
  }

  return scene;
}
