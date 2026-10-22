#!/usr/bin/env node
// Récupération LOCALE uniquement : à lancer dans le conteneur API depuis le PC administrateur.
// Nouveau mot de passe transmis sur stdin, jamais en argument ou dans un journal.
import crypto from "node:crypto";
import pg from "pg";

const email = String(process.argv[2] || process.env.FINCA_BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Adresse de compte incorrecte.");
  process.exit(2);
}

let password = "";
for await (const chunk of process.stdin) {
  password += chunk.toString("utf8");
  if (password.length > 2048) {
    console.error("Entrée trop longue.");
    process.exit(2);
  }
}
password = password.replace(/\r?\n$/, "");
if (password.length < 12 || password.length > 200) {
  console.error("Mot de passe : entre 12 et 200 caractères.");
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, hash) => error ? reject(error) : resolve(hash));
  });
  const passwordHash = "scrypt$" + salt + "$" + derived.toString("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE users SET password_hash=$2, updated_at=NOW() WHERE LOWER(email)=$1 AND active=TRUE RETURNING id",
      [email, passwordHash]
    );
    if (result.rowCount !== 1) {
      await client.query("ROLLBACK");
      console.error("Compte actif introuvable. Aucun changement.");
      process.exitCode = 3;
    } else {
      await client.query("DELETE FROM sessions WHERE user_id=$1", [result.rows[0].id]);
      await client.query("COMMIT");
      console.log("Mot de passe réinitialisé. Toutes les sessions de ce compte sont fermées.");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
} catch {
  console.error("La récupération a échoué : vérifie le serveur et la base de données.");
  process.exitCode = 1;
} finally {
  password = "";
  await pool.end();
}
