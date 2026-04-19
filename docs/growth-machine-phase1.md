# Arganor Growth Machine - Phase 1

Cette phase ajoute un socle Supabase strictement **server-only** et ne remplace aucune source JSON existante.

## Variables d'environnement requises

Ajoutez ces variables dans `.env.local` en local et dans les variables d'environnement Vercel :

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
ARGANOR_OPENAI_MODEL=gpt-5.4-mini
ARGANOR_ENABLE_AI_GENERATION=true
```

Pour les runs GitHub Actions, ajoutez aussi ces deux secrets dans le depot :

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

Notes IA :

- `OPENAI_API_KEY` est optionnelle. Sans elle, la Growth Machine garde le mode deterministe actuel.
- `ARGANOR_OPENAI_MODEL` est optionnelle. Sans elle, le socle utilise `gpt-5.4-mini`.
- `ARGANOR_ENABLE_AI_GENERATION=false` force le fallback deterministe meme si une cle API est presente.

## Regles importantes

- `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais etre exposee au client.
- La couche serveur Supabase vit dans [src/lib/supabase/server.ts](/C:/Users/nskad/.codex/worktrees/b0c6/arganor/src/lib/supabase/server.ts) et commence par `import "server-only"`.
- Les references Growth Machine restent explicites et souples :
  - `product_ref` = slug produit texte
  - `post_ref` = slug article texte
  - `cluster_ref` = nom de cluster texte
- Les cles de memoire sont namespacées :
  - `product:...`
  - `post:...`
  - `cluster:...`
  - `hook:...`

## Premiere API admin additive

Une route admin minimale est disponible pour la queue :

- `GET /api/admin/queue?status=queued&limit=20`
- `POST /api/admin/queue`

Elle est protegee par `ARGANOR_API_KEY` selon les memes regles que les autres endpoints admin.

Une route admin minimale est disponible pour la memoire :

- `GET /api/admin/memory?prefix=cluster&limit=20`
- `GET /api/admin/memory?memoryKey=cluster:global:validation`
- `POST /api/admin/memory`

Elle est egalement protegee par `ARGANOR_API_KEY`.

Une route admin minimale est disponible pour les prompts :

- `GET /api/admin/prompts?status=active&limit=20`
- `GET /api/admin/prompts?activeOnly=true`
- `GET /api/admin/prompts?id=<prompt_id>`
- `POST /api/admin/prompts`

Le registre par defaut vit dans [prompt-registry.ts](/C:/Users/nskad/.codex/worktrees/b0c6/arganor/src/lib/growth-machine/prompt-registry.ts).

Pour semer les prompts de base dans Supabase, utilisez :

```json
{
  "seedDefaults": true
}
```

sur `POST /api/admin/prompts` avec `ARGANOR_API_KEY`.

Une route admin minimale est disponible pour la vue d'ensemble Growth Machine :

- `GET /api/admin/growth`
- `POST /api/admin/growth`

Elle retourne un resume Supabase de :

- `content_queue`
- `autopilot_runs`
- `agent_memory`
- `prompt_versions`
- `experiments`

Le dashboard admin l'utilise pour afficher l'etat du socle Growth Machine sans modifier le rendu public.

Le `POST /api/admin/growth` lance un cycle complet cote admin, en mode sur :

- seed optionnel des prompts
- briefs strategiques
- draft packs
- content drafts
- reviews
- aucune promotion publique par defaut

Chaque cycle cree aussi une entree `autopilot_runs` avec les stats du lot traite.

Une route admin minimale de strategie est disponible :

- `GET /api/admin/strategy?limit=3`
- `POST /api/admin/strategy`

Elle genere des briefs strategiques deterministes a partir :

- des produits JSON existants
- des posts JSON existants
- du prompt actif `strategist/daily-opportunity-selection`

Quand `OPENAI_API_KEY` est disponible, la selection strategique peut etre assistee par IA, mais elle reste bornee par :

- les doublons deja presents dans la queue ouverte
- la memoire recente `agent_memory`
- le pool de candidats deterministes calcule localement

Le `GET` renvoie un apercu. Le `POST` pousse ces briefs dans `content_queue` en `draft`.

Une route admin minimale de preparation de drafts est disponible :

- `GET /api/admin/drafts?limit=10`
- `GET /api/admin/drafts?queueId=<queue_id>`
- `POST /api/admin/drafts`

Elle lit les briefs `draft` de `content_queue`, resolve les prompts `writer` et `creative`, puis ecrit un `draftPack` non destructif dans le `payload` des items concernes.

Une route admin minimale de generation de brouillons structures est disponible :

- `GET /api/admin/content-drafts?limit=10`
- `GET /api/admin/content-drafts?queueId=<queue_id>`
- `POST /api/admin/content-drafts`

Elle lit les `draftPack` deja presents dans `content_queue`, puis ajoute un `contentDraft` structure au `payload` :

- brouillon d'article
- slug propose unique
- variantes de pins
- prompts image textuels

Toujours sans ecrire dans les JSON publics.

Une route admin minimale de review est disponible :

- `GET /api/admin/review?limit=10`
- `GET /api/admin/review?queueId=<queue_id>`
- `POST /api/admin/review`

Elle lit les `contentDraft` et ecrit une `review` dans le `payload` de `content_queue` avec :

- `approved`
- `needs_revision`
- `rejected`

Enfin, une route de promotion controlee est disponible :

- `GET /api/admin/promote?queueId=<queue_id>` pour la preview
- `POST /api/admin/promote` avec `{ "queueId": "...", "confirmWrite": true }` pour ecrire dans `posts.json`

La promotion est bloquee tant que :

- il n'y a pas de `review`
- le verdict n'est pas `approved`
- le slug existe deja

La promotion n'est pas branchee sur un bouton de publication aveugle dans le dashboard.

## Vue admin dediee

Une page dediee est disponible sur :

- `/admin/growth`

Elle permet d'inspecter les items de `content_queue` un par un, puis de declencher :

- `draft pack`
- `content draft`
- `review`
- `promotion preview`
- `promotion explicite`

La page propose aussi :

- un filtre `approved only`
- un compteur `ready to promote`
- un apercu lisible de l'article, des pins et de la promotion
- un mode JSON brut optionnel pour debug

## Validation locale du workflow quotidien

Deux scripts npm permettent maintenant de rejouer localement la chaine quotidienne de l'autopilot :

```bash
npm run autopilot:local
npm run autopilot:local:keep
npm run autopilot:local:fast
```

`npm run autopilot:local` lance :

- generation
- validation RSS
- build safety check
- resume autopilot

Puis restaure automatiquement :

- `src/data/posts.json`
- `src/data/products.json`
- `src/data/autopilot-status.json`
- les nouvelles images ajoutees dans `public/pins`

`npm run autopilot:local:keep` garde au contraire les fichiers generes dans le workspace.

`npm run autopilot:local:fast` saute le `build` final. C'est utile dans les environnements restreints ou sandboxes qui bloquent certains `spawn`, tout en validant quand meme :

- la generation
- la validation RSS
- le resume autopilot
- le rollback automatique

Cela sert de pendant local au `workflow_dispatch` GitHub avec `skip_publish=true`.
