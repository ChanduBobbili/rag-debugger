from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict
import asyncio
import json

router = APIRouter()


class WebSocketManager:
    def __init__(self) -> None:
        # trace_id -> set of connected websockets
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, trace_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections[trace_id].add(ws)

    async def disconnect(self, trace_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._connections[trace_id].discard(ws)
            if not self._connections[trace_id]:
                del self._connections[trace_id]

    async def broadcast(self, trace_id: str, data: dict) -> None:
        """Broadcast to all clients subscribed to this trace_id."""
        payload = json.dumps(data, default=str)
        dead: set[WebSocket] = set()
        async with self._lock:
            sockets = set(self._connections.get(trace_id, set()))
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        # Clean up dead connections
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections[trace_id].discard(ws)


ws_manager = WebSocketManager()


@router.websocket("/ws/{trace_id}")
async def websocket_endpoint(ws: WebSocket, trace_id: str) -> None:
    await ws_manager.connect(trace_id, ws)
    try:
        while True:
            # Keep alive — client can send pings
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(trace_id, ws)
