# PublicWhats

Arquivo navegável de conversas de domínio público — busca, deep-links e proveniência.

Repositório: [pedroabreutech/publicWhats](https://github.com/pedroabreutech/publicWhats)  
Site: [https://publicwhats.vercel.app](https://publicwhats.vercel.app)

Plataforma inspirada na arquitetura do [MasterWhats / masterzap](https://github.com/rafaelbressan/masterzap): SPA leve com **chunks JSON por dia** + **lazy load LRU**.

## Stack

- Vite 6 + TypeScript (vanilla, sem framework)
- Corpus público (35 conversas / ~66.602 mensagens) já em `public/data/`
- Export `.md` / `.json` / `.zip` em `public/export/`
- Áudios e avatares em `public/assets/`

## Como rodar (clone completo)

```bash
git clone https://github.com/pedroabreutech/publicWhats.git
cd publicWhats
npm install
npm run dev
```

Abra `http://localhost:5173`. Os dados já vêm no repositório — não é necessário rodar `prepare-data` para usar o app.

### Regenerar dados (opcional)

```bash
npm run prepare-data   # re-baixa o zip público e recria chunks
```

## Rotas

- `#/` — home
- `#/c/{conversationId}` — conversa
- `#/c/{conversationId}/m/{messageId}` — mensagem exata

## Áudios

Há 4 MP3 em `public/assets/` (`audio-nikolas-ferreira`, `silas-malafaia`, `flavio-bolsonaro`, `lula-dilma`). Mensagens `.opus` sem arquivo aparecem como “Áudio indisponível”.

## Aviso

Conteúdo sensível de domínio público. Sem vínculo com as partes envolvidas. Exibe proveniência em cada conversa.
