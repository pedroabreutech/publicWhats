# PublicWhats

Arquivo público de conversas + **painel editorial** para jornalistas criarem casos e importarem conversas pela web (sem Git).

- Site: [https://publicwhats.vercel.app](https://publicwhats.vercel.app)
- Repo: [pedroabreutech/publicWhats](https://github.com/pedroabreutech/publicWhats)

## Como rodar

Requer **Node 20+**.

```bash
cp .env.example .env.local   # senha padrão: publicwhats
npm install
npm run dev
```

Abra:
- Público: http://localhost:5173
- Painel: http://localhost:5173/admin/login

## MVP do CMS

1. Login em `/admin/login` (senha `CMS_PASSWORD`)
2. **Criar caso** (escândalo)
3. Abrir o caso → **importar JSON** de conversa (`messages` + contato, ou export `{ conversation, messages, profile }`)
4. O caso aparece na home e em `/c/{caso}`

O corpus inicial (Vorcaro / Bolsonaro / Lula) continua disponível como caso **Arquivo público (corpus inicial)** (somente leitura).

### Persistência

- **Local:** grava em `data/cms/`
- **Vercel:** o CMS grava no Vercel Blob quando `BLOB_READ_WRITE_TOKEN` está definido. Sem o token, criar/editar casos falha (o corpus estático em `public/data` continua ok).

Variáveis:

```bash
CMS_PASSWORD=sua-senha
CMS_SECRET=segredo-com-pelo-menos-32-caracteres!!
# BLOB_READ_WRITE_TOKEN=...
```

## Stack

- Next.js 15 (App Router) + TypeScript
- API routes + iron-session
- Visualizador client-side com lazy load por dia
- Corpus estático legado em `public/data` + `public/assets`

## Scripts legados

```bash
npm run prepare-data   # re-gera chunks do corpus estático
npm run legacy:vite    # app Vite antigo (backup)
```
