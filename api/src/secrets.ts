// Lecture des secrets dans OpenBao (KV v2) au démarrage — voir le contrat
// Secrets de app-builder-guidances/README.md. Aucun SDK : un simple fetch
// évite une dépendance supplémentaire pour un seul appel au boot.

const VAULT_ADDR = process.env.VAULT_ADDR ?? "http://openbao.internal:8200";
const VAULT_TOKEN = process.env.VAULT_TOKEN ?? "root-dev-token";
const VAULT_PATH = process.env.VAULT_PATH ?? "secret/team17";

export async function readSecret(name: string): Promise<Record<string, string>> {
  const url = `${VAULT_ADDR}/v1/secret/data/${VAULT_PATH.replace(/^secret\//, "")}/${name}`;
  const res = await fetch(url, { headers: { "X-Vault-Token": VAULT_TOKEN } });
  if (!res.ok) {
    throw new Error(`secret read failed: ${name} (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { data: { data: Record<string, string> } };
  return body.data.data;
}
