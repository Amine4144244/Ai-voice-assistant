import os
import io
from groq import AsyncGroq

_groq_client = None


def get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        _groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    return _groq_client


class STTService:
    # Minimum audio size in bytes to avoid Whisper hallucinations on tiny/silent clips
    MIN_AUDIO_BYTES = 300  # 300 bytes - very permissive for low-quality mics

    async def transcribe(self, audio_bytes: bytes) -> str:
        """Transcribe audio bytes using Groq Whisper."""
        size = len(audio_bytes)
        print(f"[STT] Received audio: {size} bytes")

        if size < self.MIN_AUDIO_BYTES:
            print(
                f"[STT] Audio too short ({size} bytes < {self.MIN_AUDIO_BYTES}), skipping."
            )
            return ""

        # DEBUG: Save last audio to disk so we can verify format
        debug_path = os.path.join(os.path.dirname(__file__), "..", "debug_audio.webm")
        try:
            with open(debug_path, "wb") as f:
                f.write(audio_bytes)
            print(f"[STT] Debug audio saved to {debug_path}")
        except Exception:
            pass

        try:
            client = get_groq_client()
            transcription = await client.audio.transcriptions.create(
                file=("audio.webm", audio_bytes, "audio/webm"),
                model="whisper-large-v3-turbo",
                response_format="text",
                # Prompt helps prevent hallucinations like "Thank you" on ambiguous audio
                prompt="The user is asking a question or giving a command to an AI voice assistant.",
            )
            result = (
                transcription
                if isinstance(transcription, str)
                else getattr(transcription, "text", "")
            )
            cleaned = result.strip()
            print(f"[STT] Transcript: {cleaned!r}")

            # Skip only truly empty results
            if not cleaned:
                return ""

            return cleaned
        except Exception as e:
            print(f"[STT Error]: {e}")
            return ""


class LLMService:
    def __init__(self):
        self.model = "llama-3.3-70b-versatile"

    async def chat_stream(self, text: str, session_id: str):
        """Stream a response from Groq LLaMA using async streaming."""
        if not text:
            return
        try:
            client = get_groq_client()
            stream = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful AI voice assistant. Give clear, concise responses.",
                    },
                    {"role": "user", "content": text},
                ],
                stream=True,
                max_tokens=1024,
                temperature=0.7,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        except Exception as e:
            print(f"[LLM Streaming Error]: {e}")
            yield f"[Error generating response. Please try again.]"


class TTSService:
    async def synthesize(self, text: str) -> bytes:
        """TTS stub — browser SpeechSynthesis handles audio playback instead."""
        return b""
