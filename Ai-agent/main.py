from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from agent.graph import run_voice_graph
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# A sentinel JSON message that resets the frontend state machine to 'idle'
FINAL_SIGNAL = json.dumps({"type": "text", "role": "assistant", "content": "", "final": True})


async def safe_send_final(websocket: WebSocket, session_id: str):
    """Always send the final signal so the frontend exits 'processing' state."""
    try:
        await websocket.send_text(FINAL_SIGNAL)
    except Exception:
        pass  # Socket may already be closed; that's fine


@app.websocket("/ws/chat/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    disconnected = False

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                print(f"Disconnect signal received for {session_id}")
                disconnected = True
                break

            if "text" in message:
                try:
                    payload = json.loads(message["text"])
                    if payload.get("type") == "interrupt":
                        print(f"Interrupt received for session {session_id}")
                except json.JSONDecodeError:
                    pass

            elif "bytes" in message:
                audio_chunk = message["bytes"]
                print(f"[{session_id}] Received audio: {len(audio_chunk)} bytes")

                try:
                    async for chunk in run_voice_graph(audio_chunk, session_id):
                        # If disconnected mid-stream, abort
                        if disconnected:
                            break
                        if chunk["type"] == "text":
                            await websocket.send_text(json.dumps(chunk))
                        elif chunk["type"] == "audio":
                            await websocket.send_bytes(chunk["bytes"])
                except WebSocketDisconnect:
                    disconnected = True
                    break
                except Exception as e:
                    print(f"[{session_id}] Pipeline error: {e}")
                    # Send a user-visible error message then reset state
                    try:
                        await websocket.send_text(json.dumps({
                            "type": "text",
                            "role": "assistant",
                            "content": f"Sorry, something went wrong: {e}"
                        }))
                    except Exception:
                        pass
                finally:
                    # ALWAYS send final signal so frontend exits 'processing'
                    if not disconnected:
                        await safe_send_final(websocket, session_id)

    except WebSocketDisconnect:
        print(f"Client disconnected {session_id}")
    except Exception as e:
        print(f"Unexpected WebSocket error for {session_id}: {e}")
    finally:
        print(f"Cleaning up session {session_id}")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting Ai-agent on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
