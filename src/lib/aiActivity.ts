"use client";

const AI_ACTIVITY_EVENT = "mizekar:ai-activity-change";

type AiActivityDetail = {
  delta: 1 | -1;
};

export function notifyAiActivityStarted() {
  window.dispatchEvent(
    new CustomEvent<AiActivityDetail>(AI_ACTIVITY_EVENT, {
      detail: { delta: 1 },
    }),
  );
}

export function notifyAiActivityFinished() {
  window.dispatchEvent(
    new CustomEvent<AiActivityDetail>(AI_ACTIVITY_EVENT, {
      detail: { delta: -1 },
    }),
  );
}

export function subscribeToAiActivity(
  onChange: (detail: AiActivityDetail) => void,
) {
  const handleChange = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    onChange(event.detail as AiActivityDetail);
  };

  window.addEventListener(AI_ACTIVITY_EVENT, handleChange);

  return () => {
    window.removeEventListener(AI_ACTIVITY_EVENT, handleChange);
  };
}
