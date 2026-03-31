from typing import TypedDict, AsyncGenerator
from services.groq_client import STTService, LLMService, TTSService


class VoiceState(TypedDict):
    session_id: str
    audio_input: bytes
    transcript: str
    llm_response: str
    audio_output: bytes


# A simplified generator that represents the pipeline
async def run_voice_graph(
    audio_chunk: bytes, session_id: str
) -> AsyncGenerator[dict, None]:
    print(f"[{session_id}] Starting voice graph with {len(audio_chunk)} bytes")

    # 1. STT (Speech to Text)
    stt_service = STTService()
    print(f"[{session_id}] Calling STT transcribe...")
    transcript = await stt_service.transcribe(audio_chunk)
    print(f"[{session_id}] STT transcript result: {transcript!r}")

    # Guard: If nothing was transcribed, don't trigger the LLM
    if not transcript:
        print(f"[{session_id}] STT returned empty transcript, skipping.")
        return

    yield {"type": "text", "role": "user", "content": transcript}

    # 2. LLM Processing
    print(f"[{session_id}] Calling LLM with transcript: {transcript!r}")
    llm_service = LLMService()
    text_stream = llm_service.chat_stream(transcript, session_id)

    # We buffer text to send to TTS
    buffer = ""
    tts_service = TTSService()

    async for text_chunk in text_stream:
        buffer += text_chunk
        yield {"type": "text", "role": "assistant", "content": text_chunk}

        # Send to TTS at sentence boundaries
        if buffer.endswith((".", "?", "!", "\n")):
            audio_response = await tts_service.synthesize(buffer)
            if audio_response:
                yield {"type": "audio", "bytes": audio_response}
            buffer = ""

    # Send remaining buffer to TTS
    if buffer:
        audio_response = await tts_service.synthesize(buffer)
        if audio_response:
            yield {"type": "audio", "bytes": audio_response}

    # Signal turn is fully complete
    yield {"type": "text", "role": "assistant", "content": "", "final": True}
