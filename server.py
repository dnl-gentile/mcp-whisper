import os
from pathlib import Path

from fastmcp import FastMCP
from openai import OpenAI

mcp = FastMCP(
    name="mcp-whisper",
    instructions="Transcreve arquivos de áudio usando a OpenAI Whisper API.",
)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY environment variable is not set."
            )
        _client = OpenAI(api_key=api_key)
    return _client


@mcp.tool()
def transcribe_audio(file_path: str, language: str = "pt") -> str:
    """Transcreve um arquivo de áudio local usando o modelo Whisper da OpenAI.

    Args:
        file_path: Caminho absoluto ou relativo para o arquivo de áudio.
                   Formatos suportados: mp3, mp4, mpeg, mpga, m4a, wav, webm.
        language:  Código de idioma ISO-639-1 para guiar a transcrição
                   (padrão: "pt" para português). Exemplos: "en", "es", "fr".

    Returns:
        Texto transcrito do áudio.
    """
    audio_path = Path(file_path).expanduser().resolve()

    if not audio_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {audio_path}")

    supported = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"}
    if audio_path.suffix.lower() not in supported:
        raise ValueError(
            f"Formato '{audio_path.suffix}' não suportado. "
            f"Use um dos seguintes: {', '.join(sorted(supported))}"
        )

    client = _get_client()

    with audio_path.open("rb") as audio_file:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
        )

    return response.text


if __name__ == "__main__":
    mcp.run()
