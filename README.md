# ArquivoZap

Arquivo navegável de conversas de domínio público — busca, deep-links e proveniência.

Plataforma nova inspirada na arquitetura do [MasterWhats / masterzap](https://github.com/rafaelbressan/masterzap) (Rafael Bressan): SPA leve com **chunks JSON por dia** + **lazy load LRU**.

## Stack

- Vite 6 + TypeScript (vanilla, sem framework)
- Corpus público (35 conversas / ~66.602 mensagens)
- Export `.md` / `.json` / `.zip` em `/export/`

## Como rodar

```bash
npm install --cache /tmp/npm-cache-arquivozap   # se o cache global tiver problema de permissão
npm run prepare-data   # ingest do zip público + chunk por dia
npm run dev
```

Abra `http://localhost:5173`.

## Rotas

- `#/` — home
- `#/c/{conversationId}` — conversa
- `#/c/{conversationId}/m/{messageId}` — mensagem exata

## Dados

1. `npm run ingest` baixa `masterwhats-export.zip` + `conversations.json` do espelho público
2. `npm run chunk` gera `public/data/{id}/{date}.json`, `index.json`, `search-index.json`

Fonte dos dados: [masterwhats.recomendeme.com.br](https://masterwhats.recomendeme.com.br/) / relatório PF IPJ-A 3298613/2026.

### Áudios

Há 4 MP3 públicos em `public/assets/` (`audio-nikolas-ferreira`, `silas-malafaia`, `flavio-bolsonaro`, `lula-dilma`). Mensagens com `audio_src` tocam no player; as ~462 `.opus` da Martha não vieram no export — aparecem como “Áudio indisponível” (com transcrição quando existir).

## Aviso

Conteúdo sensível de domínio público. Sem vínculo com as partes envolvidas. Exibe proveniência em cada conversa.
