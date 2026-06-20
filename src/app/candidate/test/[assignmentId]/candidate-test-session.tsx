"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TestBlock } from "@/lib/candidate-test-payload";
import { CandidateTestRunner } from "./test-runner";

async function postProctor(attemptId: string, body: unknown) {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    await fetch(`${base}/api/candidate/attempts/${attemptId}/proctor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* Proctoring calls are best-effort; do not block the test if the network fails. */
  }
}

function captureVideoFrameDataUrl(video: HTMLVideoElement): string | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

async function snapshotFromStream(stream: MediaStream): Promise<string | null> {
  const tmp = document.createElement("video");
  tmp.playsInline = true;
  tmp.muted = true;
  tmp.srcObject = stream;
  try {
    await tmp.play();
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => {
    const t = window.setTimeout(() => resolve(), 1800);
    tmp.onloadeddata = () => {
      window.clearTimeout(t);
      resolve();
    };
  });
  const url = captureVideoFrameDataUrl(tmp);
  tmp.srcObject = null;
  return url;
}

type StartApiPayload = {
  attemptId?: string;
  code?: string;
  reason?: string;
  message?: string;
  resultId?: string | null;
};

export function CandidateTestSession({
  assignmentId,
  blocks,
}: {
  assignmentId: string;
  blocks: TestBlock[];
}) {
  const [phase, setPhase] = useState<"gate" | "active">("gate");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [completedResultId, setCompletedResultId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const suppressProctorEventsRef = useRef(false);
  const beginInFlightRef = useRef(false);

  const sendEvent = useCallback((attempt: string, eventType: "TAB_SWITCH" | "FULLSCREEN_EXIT") => {
    void postProctor(attempt, { action: "event", eventType });
  }, []);

  useEffect(() => {
    if (phase !== "active" || !attemptId) return;

    const onVisibility = () => {
      if (suppressProctorEventsRef.current) return;
      if (document.visibilityState === "hidden") {
        sendEvent(attemptId, "TAB_SWITCH");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let wasFs = Boolean(document.fullscreenElement);
    const onFs = () => {
      if (suppressProctorEventsRef.current) {
        wasFs = Boolean(document.fullscreenElement);
        return;
      }
      const nowFs = Boolean(document.fullscreenElement);
      if (fullscreenActive && wasFs && !nowFs) {
        sendEvent(attemptId, "FULLSCREEN_EXIT");
      }
      wasFs = nowFs;
    };
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [attemptId, phase, fullscreenActive, sendEvent]);

  useEffect(() => {
    const v = previewRef.current;
    if (!v || !stream || phase !== "active") return;
    v.srcObject = stream;
    void v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [stream, phase]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const beginTest = useCallback(async () => {
    console.log("[candidate-test] begin button clicked");
    if (beginInFlightRef.current) {
      console.log("[candidate-test] begin ignored (already in flight)");
      return;
    }
    beginInFlightRef.current = true;
    setGateError(null);
    setCompletedResultId(null);

    try {
      const id = String(assignmentId ?? "").trim();
      if (!id) {
        setGateError("Missing assignment id. Open this test from the candidate dashboard link.");
        return;
      }

      setStarting(true);

      const payload = JSON.stringify({ assignmentId: id });
      const url = "/api/candidate/attempts/start";

      console.log("[candidate-test] POST /api/candidate/attempts/start", { url, payload });

      let startRes: Response;
      try {
        startRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          credentials: "same-origin",
        });
      } catch (err) {
        console.error("[candidate-test] fetch(start) threw", err);
        setGateError("Network error while starting the attempt. Check your connection and try again.");
        return;
      }

      const rawText = await startRes.text();
      let data: StartApiPayload = {};
      try {
        data = rawText ? (JSON.parse(rawText) as StartApiPayload) : {};
      } catch {
        data = {};
      }

      console.log("[candidate-test] start response", {
        status: startRes.status,
        ok: startRes.ok,
        body: data,
        rawLength: rawText.length,
        rawPreview: rawText.slice(0, 500),
      });

      if (data.code === "assignment_completed" || data.reason === "assignment_completed") {
        setCompletedResultId(typeof data.resultId === "string" ? data.resultId : null);
        setGateError("Assessment already completed.");
        return;
      }

      if (!startRes.ok) {
        const msg =
          typeof data.message === "string" && data.message.length > 0
            ? data.message
            : `Request failed (HTTP ${startRes.status}).${data.code ? ` Code: ${data.code}.` : ""}`;
        setGateError(msg);
        return;
      }

      const aid = data.attemptId;
      if (typeof aid !== "string" || aid.length === 0) {
        setGateError(
          "The server response did not include a valid attempt id. Check the network tab for /api/candidate/attempts/start.",
        );
        return;
      }
      setAttemptId(aid);

      let media: MediaStream | null = null;
      try {
        media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        await postProctor(aid, { action: "camera", granted: true });
        const shot = await snapshotFromStream(media);
        if (shot) {
          await postProctor(aid, { action: "snapshot", dataUrl: shot });
        }
        setStream(media);
      } catch {
        media?.getTracks().forEach((t) => t.stop());
        await postProctor(aid, { action: "camera", granted: false });
      }

      let fsOk = false;
      const root = document.documentElement;
      if (root.requestFullscreen) {
        try {
          await root.requestFullscreen();
          fsOk = Boolean(document.fullscreenElement);
        } catch {
          fsOk = false;
        }
      }
      setFullscreenActive(fsOk);

      setPhase("active");
    } finally {
      beginInFlightRef.current = false;
      setStarting(false);
    }
  }, [assignmentId]);

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {phase === "active" && stream ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-40 w-36 overflow-hidden rounded-md border border-slate-300 bg-black shadow-lg">
          <video ref={previewRef} className="h-24 w-full object-cover" playsInline muted autoPlay />
          <p className="bg-black/70 px-1 py-0.5 text-center text-[10px] text-white">Live preview</p>
        </div>
      ) : null}

      {phase === "gate" ? (
        <div style={{ padding: 40 }}>
          <h1 style={{ marginBottom: 16 }}>Begin test</h1>
          {gateError ? <p style={{ marginBottom: 12, color: "#b91c1c" }}>{gateError}</p> : null}
          {completedResultId ? (
            <p style={{ marginBottom: 12 }}>
              <Link href={`/candidate/reports/${completedResultId}`} className="text-sm font-medium text-[#2563EB] hover:underline">
                View report
              </Link>
            </p>
          ) : null}
          {starting ? <p style={{ marginBottom: 8 }}>Starting…</p> : null}
          <button type="button" onClick={beginTest}>
            Allow camera & begin test
          </button>
        </div>
      ) : attemptId ? (
        <CandidateTestRunner assignmentId={assignmentId} attemptId={attemptId} blocks={blocks} />
      ) : null}
    </div>
  );
}
