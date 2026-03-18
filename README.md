# mcp-whisper

MCP server para transcrição de áudio usando a OpenAI Whisper API (`whisper-1`).

## Ferramenta disponível

### `transcribe_audio`

| Parâmetro   | Tipo   | Padrão | Descrição                                      |
|-------------|--------|--------|------------------------------------------------|
| `file_path` | string | —      | Caminho local do arquivo de áudio              |
| `language`  | string | `"pt"` | Código ISO-639-1 do idioma (`"en"`, `"es"`, …) |

**Formatos suportados:** `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`

**Retorno:** texto transcrito como string.

---

## Instalação

### Pré-requisitos

- Python 3.11+
- Uma API key da OpenAI com acesso ao modelo `whisper-1`

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/dnl-gentile/mcp-whisper.git
cd mcp-whisper

# 2. Crie e ative um virtualenv
python3 -m venv .venv
source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt
```

---

## Configuração no Claude Code

### Opção A — `.mcp.json` no projeto (recomendado)

Crie ou edite o arquivo `.mcp.json` na raiz do projeto:

```json
{
  "mcpServers": {
    "mcp-whisper": {
      "type": "stdio",
      "command": "/caminho/para/.venv/bin/python",
      "args": ["/caminho/para/mcp-whisper/server.py"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

Substitua `/caminho/para/` pelo caminho absoluto real. O `${OPENAI_API_KEY}` é lido do ambiente do shell.

### Opção B — Configuração global do Claude Code

Edite `~/.claude/settings.json` e adicione o servidor na chave `mcpServers` com a mesma estrutura acima.

### Variável de ambiente

Exporte a chave antes de abrir o Claude Code (ou adicione ao `~/.zshrc`/`~/.bashrc`):

```bash
export OPENAI_API_KEY="sk-..."
```

---

## Teste rápido (CLI)

```bash
# Com o virtualenv ativo
python server.py &

# Ou via fastmcp CLI
fastmcp run server.py
```

---

## Exemplo de uso no Claude Code

Depois de configurado, o Claude Code terá acesso à ferramenta. Exemplos de prompt:

- "Transcreva o arquivo `/tmp/reuniao.mp3`"
- "Transcreva `/Users/me/audio.wav` em inglês"

---

## Variáveis de ambiente

| Variável         | Obrigatória | Descrição              |
|------------------|-------------|------------------------|
| `OPENAI_API_KEY` | Sim         | API key da OpenAI      |
