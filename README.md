# mcp-whisper

MCP server para transcrição de áudio usando OpenAI Whisper (`whisper-1`).

Duas modalidades de execução:

| Modalidade | Arquivo | Transport |
|---|---|---|
| Local (Python/stdio) | `server.py` | stdio |
| Cloud (Firebase Functions/TypeScript) | `functions/src/index.ts` | Streamable HTTP |

---

## Cloud (Firebase Cloud Functions)

### Ferramenta disponível: `transcribe_audio`

| Parâmetro | Tipo | Padrão | Descricao |
|---|---|---|---|
| `audio_url` | string | — | URL publica do arquivo de audio |
| `audio_base64` | string | — | Conteudo do arquivo em base64 |
| `filename` | string | `audio.mp3` | Nome com extensao (necessario com base64) |
| `language` | string | `pt` | Codigo ISO-639-1 do idioma |

Fornecer `audio_url` **ou** `audio_base64` (pelo menos um).

**Formatos suportados:** `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`

**Retorno:** texto transcrito como string.

---

## Deploy

### 1. Pre-requisitos

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Acesso ao projeto Firebase `socii-crm`

### 2. Instalar dependencias

```bash
cd functions
npm install
```

### 3. Configurar Firebase Secrets

```bash
# API key da OpenAI
firebase functions:secrets:set OPENAI_API_KEY --project socii-crm

# Token de autenticacao do MCP (gere um valor aleatorio forte)
firebase functions:secrets:set MCP_SECRET --project socii-crm
```

Para gerar um `MCP_SECRET` seguro:

```bash
openssl rand -hex 32
```

### 4. Deploy

```bash
firebase deploy --only functions --project socii-crm
```

A URL final sera:

```
https://us-central1-socii-crm.cloudfunctions.net/mcp
```

---

## Registrar no Claude Code

Adicione ao `.mcp.json` do projeto sociilaw:

```json
{
  "mcpServers": {
    "mcp-whisper": {
      "type": "http",
      "url": "https://us-central1-socii-crm.cloudfunctions.net/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_SECRET}"
      }
    }
  }
}
```

A variavel `MCP_SECRET` deve estar exportada no ambiente do shell (`.zshrc`):

```bash
export MCP_SECRET="<valor-configurado-no-firebase-secret>"
```

---

## Desenvolvimento local

```bash
cd functions
npm run build:watch

# Em outro terminal
firebase emulators:start --only functions --project socii-crm
```

O emulador ficara disponivel em:
```
http://127.0.0.1:5001/socii-crm/us-central1/mcp
```

Para testar localmente sem MCP_SECRET configurado, o endpoint aceita requests sem autenticacao (o secret so e exigido quando configurado).

---

## Versao local (Python/stdio)

Ver instrucoes no arquivo `server.py` e na configuracao `.mcp.json` com `type: stdio`.

---

## Variaveis de ambiente / Secrets

| Secret | Obrigatorio | Descricao |
|---|---|---|
| `OPENAI_API_KEY` | Sim | API key da OpenAI |
| `MCP_SECRET` | Recomendado | Bearer token para autenticar requests ao endpoint MCP |
