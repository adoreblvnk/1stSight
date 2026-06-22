"use client";

// React useEffect API: https://react.dev/reference/react/useEffect
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, CircleStop, MapPin, Radio, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Coordinates = { lat: number; lng: number };

type StreamBodycam = {
  id: string;
  slotId: number;
  displayName: string;
  status: "connected" | "stopped";
  locationStatus: "exact" | "approximate" | "none";
  lastChunkId?: string;
  lastError?: string;
};

type StreamSession = {
  title: string;
  location: string;
  analysisPaused: boolean;
  bodycams: StreamBodycam[];
  lastError?: string;
};

function getPosition() {
  return new Promise<Coordinates | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    // Geolocation API: https://developer.mozilla.org/docs/Web/API/Geolocation/getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );
  });
}

function recorderMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

// WebRTC API: https://developer.mozilla.org/docs/Web/API/RTCPeerConnection
const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function postWebRtcCandidate(bodycamId: string, source: "bodycam" | "ops", candidate: RTCIceCandidateInit) {
  await fetch("/api/stream/webrtc/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bodycamId, source, candidate }),
  });
}

export function BodycamCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingActiveRef = useRef(false);
  const webrtcConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webrtcAnswerPollRef = useRef<number | null>(null);
  const webrtcCandidatePollRef = useRef<number | null>(null);
  const webrtcCandidateSeqRef = useRef(0);
  const bodycamIdRef = useRef<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [session, setSession] = useState<StreamSession | null>(null);
  const [bodycam, setBodycam] = useState<StreamBodycam | null>(null);
  const [cameraState, setCameraState] = useState("Camera not started");
  const [locationState, setLocationState] = useState("Location not requested");
  const [uploadState, setUploadState] = useState("Waiting to start");
  const [visualState, setVisualState] = useState("Low-latency video not connected");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/stream/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { session?: StreamSession | null }) => setSession(result.session ?? null))
      .catch(() => null);

    return () => {
      recordingActiveRef.current = false;
      cleanupWebRtc();
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function cleanupWebRtc() {
    if (webrtcAnswerPollRef.current !== null) window.clearInterval(webrtcAnswerPollRef.current);
    if (webrtcCandidatePollRef.current !== null) window.clearInterval(webrtcCandidatePollRef.current);
    webrtcAnswerPollRef.current = null;
    webrtcCandidatePollRef.current = null;
    webrtcCandidateSeqRef.current = 0;
    webrtcConnectionRef.current?.close();
    webrtcConnectionRef.current = null;
  }

  async function pollOpsCandidates(bodycamId: string, peerConnection: RTCPeerConnection) {
    const response = await fetch(`/api/stream/webrtc/candidates?bodycamId=${encodeURIComponent(bodycamId)}&source=ops&afterSeq=${webrtcCandidateSeqRef.current}`, { cache: "no-store" });
    if (!response.ok) return;

    const result = await response.json() as { candidates?: Array<{ seq: number; candidate: RTCIceCandidateInit }> };
    for (const item of result.candidates ?? []) {
      webrtcCandidateSeqRef.current = Math.max(webrtcCandidateSeqRef.current, item.seq);
      await peerConnection.addIceCandidate(item.candidate).catch(() => null);
    }
  }

  async function startWebRtcBroadcast(mediaStream: MediaStream, bodycamId: string) {
    cleanupWebRtc();
    setVisualState("Preparing low-latency video");

    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    webrtcConnectionRef.current = peerConnection;

    mediaStream.getTracks().forEach((track) => peerConnection.addTrack(track, mediaStream));
    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) void postWebRtcCandidate(bodycamId, "bodycam", event.candidate.toJSON());
    });
    peerConnection.addEventListener("connectionstatechange", () => {
      const state = peerConnection.connectionState;
      setVisualState(state === "connected" ? "Low-latency video connected" : `Low-latency video ${state}`);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await fetch("/api/stream/webrtc/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodycamId, offer }),
    });
    setVisualState("Waiting for Ops Centre live video answer");

    webrtcAnswerPollRef.current = window.setInterval(async () => {
      if (peerConnection.remoteDescription || peerConnection.signalingState === "closed") return;

      const response = await fetch(`/api/stream/webrtc/answer?bodycamId=${encodeURIComponent(bodycamId)}`, { cache: "no-store" });
      if (!response.ok) return;

      const result = await response.json() as { answer?: RTCSessionDescriptionInit | null };
      if (!result.answer) return;

      await peerConnection.setRemoteDescription(result.answer);
      setVisualState("Low-latency video connecting");
    }, 1000);

    webrtcCandidatePollRef.current = window.setInterval(() => {
      if (peerConnection.signalingState !== "closed") void pollOpsCandidates(bodycamId, peerConnection);
    }, 1000);
  }

  function chunkExtension(blob: Blob) {
    if (blob.type.includes("mp4")) return "mp4";
    if (blob.type.includes("webm")) return "webm";
    return "webm";
  }

  async function uploadChunk(blob: Blob, chunkStartedAt: string) {
    const bodycamId = bodycamIdRef.current;
    if (!bodycamId || blob.size === 0) return;

    const formData = new FormData();
    formData.set("bodycamId", bodycamId);
    formData.set("chunkStartedAt", chunkStartedAt);
    formData.set("chunk", blob, `bodycam-${Date.now()}.${chunkExtension(blob)}`);

    try {
      setUploadState("Uploading 5-second chunk");
      const response = await fetch("/api/stream/chunk", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "Chunk analysis failed.");
        setSession(result.session ?? null);
        setUploadState("Upload or analysis unavailable");
        return;
      }

      setSession(result.session);
      setUploadState(result.events?.length ? "Chunk analyzed with evidence" : "Chunk analyzed, no event detected");
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Chunk upload failed.");
      setUploadState("Upload failed");
    }
  }

  function startChunkRecorder(mediaStream: MediaStream) {
    if (!recordingActiveRef.current || mediaStream.getVideoTracks().every((track) => track.readyState === "ended")) return;

    const mimeType = recorderMimeType();
    // MediaRecorder API: https://developer.mozilla.org/docs/Web/API/MediaRecorder
    const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
    const blobParts: Blob[] = [];
    const chunkStartedAt = new Date().toISOString();
    recorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) blobParts.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      if (!recordingActiveRef.current) return;

      const chunk = new Blob(blobParts, { type: recorder.mimeType || mimeType || "video/webm" });
      void uploadChunk(chunk, chunkStartedAt);
      window.setTimeout(() => startChunkRecorder(mediaStream), 0);
    });
    recorder.addEventListener("error", () => {
      setError("Browser recording failed. Check camera permissions and supported MediaRecorder formats.");
      setUploadState("Recorder error");
    });
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 5000);
  }

  function startRecorder(mediaStream: MediaStream) {
    recordingActiveRef.current = true;
    startChunkRecorder(mediaStream);
    setUploadState("Recording and uploading every 5 seconds");
  }

  function startBodycam() {
    if (!displayName.trim()) {
      setError("Enter your display name before starting bodycam.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setCameraState("Requesting camera permission");
        setLocationState("Requesting location permission");
        const [position, mediaStream] = await Promise.all([
          getPosition(),
          // Media Capture and Streams API: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true }),
        ]);

        setLocationState(position ? "Exact geolocation attached" : "Location unavailable; server will use incident proximity fallback");
        streamRef.current = mediaStream;
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        setCameraState("Camera live");

        const response = await fetch("/api/stream/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: displayName.trim(), position }),
        });
        const result = await response.json();

        if (!response.ok) {
          setSession(result.session ?? null);
          setError(typeof result.error === "string" ? result.error : "Bodycam could not join stream.");
          setUploadState("Not connected");
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        bodycamIdRef.current = result.bodycam.id;
        setSession(result.session);
        setBodycam(result.bodycam);
        void startWebRtcBroadcast(mediaStream, result.bodycam.id).catch((webrtcError) => {
          setVisualState("Low-latency video unavailable; chunk analysis still active");
          console.warn("WebRTC bodycam broadcast unavailable", webrtcError);
        });
        startRecorder(mediaStream);
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Camera, location, or stream join failed.");
        setCameraState("Camera unavailable");
        setUploadState("Not connected");
      }
    });
  }

  async function stopBodycam() {
    recordingActiveRef.current = false;
    cleanupWebRtc();
    setVisualState("Low-latency video stopped");
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraState("Camera stopped");
    setUploadState("Stopped");

    if (bodycamIdRef.current) {
      await fetch("/api/stream/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodycamId: bodycamIdRef.current, status: "stopped" }),
      }).catch(() => null);
    }

    bodycamIdRef.current = null;
    setBodycam(null);
  }

  const connectedCount = session?.bodycams.filter((item) => item.status === "connected").length ?? 0;
  const maxedOut = !bodycam && connectedCount >= 4;

  return (
    <main className="min-h-dvh bg-command p-4 text-command-foreground md:p-8">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[var(--radius-shell)] border border-command-border bg-card">
          <div className="border-b border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Responder bodycam</p>
            <h1 className="mt-1 text-2xl font-semibold">Stage medical assistance stream</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Start a real browser camera stream for Ops Centre analysis. Chunks are uploaded every 5 seconds for server-side frame extraction and structured AI review.</p>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-[360px_1fr]">
            <div className="bg-card p-4">
              <Field>
                <FieldLabel htmlFor="display-name">Display name</FieldLabel>
                <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Medic 1" disabled={Boolean(bodycam)} />
              </Field>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={startBodycam} disabled={isPending || Boolean(bodycam) || maxedOut}>
                  <Camera data-icon="inline-start" />
                  Start bodycam
                </Button>
                <Button variant="outline" onClick={stopBodycam} disabled={!bodycam}>
                  <CircleStop data-icon="inline-start" />
                  Stop
                </Button>
              </div>
              <Button className="mt-3 w-full" variant="outline" render={<Link href="/live?incident=stage-medical-assistance-stream" />} nativeButton={false}>
                Open Ops Centre live dashboard
              </Button>
              {maxedOut ? <div className="mt-4 border border-destructive bg-destructive/10 p-3 text-sm text-destructive">Maximum bodycams connected. Up to 4 live bodycams can join this stream.</div> : null}
              {error ? <div className="mt-4 border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
            </div>
            <div className="bg-screen p-4 text-screen-foreground">
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full bg-black object-cover" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Camera", cameraState, Camera],
                  ["Live video", visualState, Radio],
                  ["Location", locationState, MapPin],
                  ["Upload", uploadState, Radio],
                  ["Analysis", session?.analysisPaused ? "Paused by Ops Centre" : session?.lastError ?? "Automatic analysis active", ShieldAlert],
                ].map(([label, value, Icon]) => (
                  <div key={String(label)} className="border border-screen-border bg-black/30 p-3">
                    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">
                      <Icon className="size-3" />
                      {String(label)}
                    </p>
                    <p className="mt-1 text-sm">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <aside className="rounded-[var(--radius-shell)] border border-command-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Connection</p>
          <h2 className="mt-1 text-lg font-semibold">{bodycam ? `Slot ${bodycam.slotId}` : "Not connected"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{session?.location ?? "91 Ubi Ave 4, Singapore 408827"}</p>
          <div className="mt-4 grid gap-2">
            {[1, 2, 3, 4].map((slot) => {
              const item = session?.bodycams.find((candidate) => candidate.slotId === slot && candidate.status === "connected");
              return (
                <div key={slot} className={cn("border p-3", item ? "border-success bg-success/10" : "border-border bg-background")}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Slot {slot}</p>
                  <p className="mt-1 text-sm font-medium">{item?.displayName ?? "Available"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item ? `${item.locationStatus} location` : "No bodycam connected"}</p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
