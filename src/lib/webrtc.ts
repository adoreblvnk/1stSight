const defaultIceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const defaultVideoMaxBitrateKbps = 1200;

function turnIceServer(): RTCIceServer | null {
  const urls = process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS?.split(",").map((url) => url.trim()).filter(Boolean) ?? [];
  const username = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME?.trim();
  const credential = process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL?.trim();

  if (urls.length === 0) return null;
  if (!username || !credential) return { urls };

  return { urls, username, credential };
}

function iceTransportPolicy(): RTCIceTransportPolicy | undefined {
  const value = process.env.NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY?.trim();
  if (value === "all" || value === "relay") return value;
  return undefined;
}

export function browserRtcConfiguration(): RTCConfiguration {
  const turn = turnIceServer();

  return {
    // WebRTC RTCConfiguration: https://developer.mozilla.org/docs/Web/API/RTCPeerConnection/RTCPeerConnection#configuration
    iceServers: turn ? [...defaultIceServers, turn] : defaultIceServers,
    iceTransportPolicy: iceTransportPolicy(),
  };
}

export function webRtcVideoMaxBitrateBitsPerSecond() {
  const value = Number(process.env.NEXT_PUBLIC_WEBRTC_VIDEO_MAX_BITRATE_KBPS);
  const kbps = Number.isFinite(value) && value > 0 ? value : defaultVideoMaxBitrateKbps;
  return Math.round(kbps * 1000);
}
