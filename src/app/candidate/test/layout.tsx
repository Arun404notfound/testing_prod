/**
 * Segment layout for /candidate/test/* — explicit stacking + hit-testing so this subtree
 * is not accidentally covered by other layers (see CandidateAppShell z-index/pointer rules).
 */
export default function CandidateTestSegmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[25] min-h-0 w-full min-w-0 max-w-full pointer-events-auto isolate">
      {children}
    </div>
  );
}
