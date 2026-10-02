# team17 — Liste de tâches

## Overview
Petite application de liste de tâches (todo list) : un front React permet
d'ajouter, cocher et supprimer des tâches, persistées dans le Postgres de la
core platform via une API REST. Aucun autre public que l'équipe et les
visiteurs du hackathon.

## Getting started
```bash
# 1. Démarrer la plateforme (une fois) :
podman network exists core-network \
  || (cd ../core-platform/core-platform && gitlab-ci-local --force-shell-executor)

# 2. Provisionner la base + les secrets :
APP=team17 ./bootstrap.sh

# 3. Construire, publier, lancer :
cd frontend && bun install && bun run build && cd ..
cd api && bun install --production && cd ..
podman build -t localhost:5000/team17/api:dev api/
podman build -t localhost:5000/team17/frontend:dev frontend/
podman push localhost:5000/team17/api:dev
podman push localhost:5000/team17/frontend:dev
APP=team17 podman compose -p team17 up -d --force-recreate

# 4. Vérifier :
curl -s localhost:8080/ && curl -s localhost:8081/health && curl -s localhost:8081/ready
```

## Design vocabulary
Le thème `core` / `core-dark` par défaut (§7.5) : `frontend/src/core.theme.css`,
classes daisyUI + tokens uniquement (`btn`, `input`, `checkbox`, `card`,
`alert`), aucune couleur ni z-index codés en dur.

## Code language
`en` pour les identifiants de code (variables, routes, colonnes) ; les textes
visibles par l'utilisateur (libellés, messages d'erreur côté front) sont en
français, langue des visiteurs du hackathon.

## Tested critical paths
Aucun test automatisé pour l'instant (hackathon, périmètre volontairement
réduit à une app à deux services). Chemin vérifié manuellement : lister,
créer, cocher/décocher et supprimer une tâche, de bout en bout via le
navigateur et `curl`.

## Performance
Toutes les routes sont des requêtes Postgres simples sur une seule table
(`tasks`), bien en dessous du SLO de 100 ms — aucun traitement asynchrone
n'est justifié ici (§4).

## Personal data register
Aucune. Les tâches ne contiennent que le texte saisi par l'utilisateur, sans
identité ni donnée personnelle associée.

## External data sources
None.

## Exposed interfaces
REST `/api/v1` (§17.1) :

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/v1/tasks` | Liste des tâches |
| POST | `/api/v1/tasks` | Créer une tâche (`{ "title": string }`) |
| PATCH | `/api/v1/tasks/:id` | Modifier `title` et/ou `done` |
| DELETE | `/api/v1/tasks/:id` | Supprimer une tâche |
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness (vérifie OpenBao + Postgres) |

## LLM FinOps
None — l'app n'appelle pas le LLM.

## Durable workflows
None — aucun traitement de fond, aucune file.

## Libraries outside the recommendations
None — stack 100 % conforme (`React + Vite`, `Hono` sur `Bun`, `pg`).

## Structuring decisions
- **Pas de service `worker`** : la todo-list ne fait tourner aucun traitement
  asynchrone (§0 KISS) ; frontend + api suffisent.
- **Secrets lus via `fetch` plutôt que `node-vault`** : un seul appel au boot
  (`secret/team17/postgres`), une dépendance en moins.
- **Schéma créé au boot (`CREATE TABLE IF NOT EXISTS`)** plutôt qu'un outil de
  migration dédié : une seule table, un seul évolutif à ce stade du hackathon.
- **Ports fixes 8080/8081** plutôt que le bloc de 10 ports des guidelines :
  contrainte de cette machine (CLAUDE.md), le pare-feu ne redirige que ces
  deux ports.

## CCoE waivers
None.

## Ports (contrainte de cette machine — voir `/srv/team17/CLAUDE.md`)

| Port | Service |
|---|---|
| 8080 | Frontend (nginx) |
| 8081 | API REST |
