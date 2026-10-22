import crypto from "node:crypto";

const PURPOSES = new Set(["invite", "password_reset"]);

// Seule l'empreinte est enregistrée en base. Le secret brut ne doit jamais
// apparaître dans les journaux ou les réponses d'une API de consultation.
export function generateOneTimeToken(purpose) {
  if (!PURPOSES.has(purpose)) throw new Error("Usage de jeton inconnu");
  const secret = crypto.randomBytes(32).toString("base64url");
  return {
    secret,
    hash: hashOneTimeToken(secret),
    purpose
  };
}

export function hashOneTimeToken(secret) {
  if (typeof secret !== "string" || secret.length < 20 || secret.length > 256) {
    throw new Error("Jeton invalide");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}

// À employer dans la même transaction SQL que le changement de mot de passe.
// FOR UPDATE bloque deux consommations simultanées du même jeton.
export async function consumeOneTimeToken(client, { secret, purpose, now = new Date() }) {
  if (!PURPOSES.has(purpose)) throw new Error("Usage de jeton inconnu");
  const hash = hashOneTimeToken(secret);
  const found = await client.query(
    `SELECT id, user_id FROM auth_one_time_tokens
     WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at > $3
     FOR UPDATE`,
    [hash, purpose, now]
  );
  if (!found.rowCount) return null;
  const token = found.rows[0];
  await client.query(
    "UPDATE auth_one_time_tokens SET used_at=$2 WHERE id=$1",
    [token.id, now]
  );
  return { userId: token.user_id };
}
