import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

// Same host as the REST API, minus the "/api" prefix — the Nest WebSocket
// gateway lives on the default namespace at the server root, not under /api.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.6:3000/api";
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

// One shared connection reused across screens — each screen just joins/leaves
// its own rooms and adds/removes its own listeners on top of it. The gateway
// requires a valid JWT on connect (same account as the REST API), so the
// current access token rides along in the handshake.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      // Function form (not a static object) so a token refresh/rotation is
      // picked up on every reconnect attempt, not just the first connect.
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    });
  }
  return socket;
}
