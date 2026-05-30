export function countProctoringEvents(events: { type: string }[]): {
  tabSwitchCount: number;
  fullscreenExitCount: number;
} {
  let tabSwitchCount = 0;
  let fullscreenExitCount = 0;
  for (const e of events) {
    if (e.type === "TAB_SWITCH") tabSwitchCount += 1;
    if (e.type === "FULLSCREEN_EXIT") fullscreenExitCount += 1;
  }
  return { tabSwitchCount, fullscreenExitCount };
}

/**
 * Trust score rules: start 100; camera denied −20; each tab switch −10; each fullscreen exit −15; floor 0.
 */
export function computeProctoringTrustScore(args: {
  cameraGranted: boolean;
  tabSwitchCount: number;
  fullscreenExitCount: number;
}): { trustScore: number; violations: string[] } {
  let trustScore = 100;
  const violations: string[] = [];

  if (!args.cameraGranted) {
    trustScore -= 20;
    violations.push("Camera access was not granted");
  }
  if (args.tabSwitchCount > 0) {
    trustScore -= 10 * args.tabSwitchCount;
    violations.push(`Tab or window hidden ${args.tabSwitchCount} time(s) during the test`);
  }
  if (args.fullscreenExitCount > 0) {
    trustScore -= 15 * args.fullscreenExitCount;
    violations.push(`Left fullscreen ${args.fullscreenExitCount} time(s)`);
  }

  trustScore = Math.max(0, Math.round(trustScore));
  return { trustScore, violations };
}
