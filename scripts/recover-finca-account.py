#!/usr/bin/env python3
"""Récupération locale interactive : aucun secret en argument, environnement ou fichier."""
import getpass
import json
import re
import subprocess
import sys
import warnings

NODE_CODE = r'''
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
let client;
let transaction = false;
const fail = (code) => Object.assign(new Error(code), { recoveryCode: code });
try {
  const source = fs.readFileSync(path.resolve("src/server.js"), "utf8").replace(/\s+/g, "");
  if (!source.includes('crypto.scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}') ||
      !/return`scrypt\$\$\{salt\}\$\$\{derived\.toString\(["']hex["']\)\}`/.test(source)) throw fail("SOURCE_UNSUPPORTED");
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (raw.length > 8192) throw fail("INVALID_INPUT");
  }
  const { email, password } = JSON.parse(raw);
  if (typeof email !== "string" || email.length > 254 || !email.includes("@") ||
      typeof password !== "string" || password.length < 12 || password.length > 200) throw fail("INVALID_INPUT");
  client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  await client.connect();
  await client.query("BEGIN"); transaction = true;
  const found = await client.query("SELECT id,active,password_hash FROM users WHERE email=$1 FOR UPDATE", [email.trim().toLowerCase()]);
  if (found.rowCount !== 1) throw fail("ACCOUNT_NOT_FOUND");
  const user = found.rows[0];
  if (!user.active) throw fail("ACCOUNT_INACTIVE");
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(user.password_hash)) throw fail("HASH_UNSUPPORTED");
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64, { N:16384, r:8, p:1, maxmem:64*1024*1024 });
  const encoded = `scrypt$${salt}$${derived.toString("hex")}`;
  await client.query("UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2", [encoded,user.id]);
  await client.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
  await client.query("INSERT INTO audit_log(actor_id,action,object_type,object_id,result) VALUES($1,'account_local_password_recovery','user',$2,'ok')", [user.id,String(user.id)]);
  const checked = await client.query("SELECT password_hash FROM users WHERE id=$1", [user.id]);
  if (checked.rows[0]?.password_hash !== encoded) throw fail("VERIFICATION_FAILED");
  await client.query("COMMIT"); transaction = false;
  console.log(JSON.stringify({ok:true}));
} catch (error) {
  if (transaction) await client.query("ROLLBACK").catch(() => {});
  console.log(JSON.stringify({ok:false,code:error.recoveryCode || "DATABASE_ERROR"}));
  process.exitCode = 1;
} finally { if (client) await client.end().catch(() => {}); }
'''

MESSAGES = {
    "SOURCE_UNSUPPORTED": "Le code installé n’a pas le format attendu. Arrêt sans modification.",
    "INVALID_INPUT": "Adresse ou longueur de mot de passe invalide. Arrêt sans modification.",
    "ACCOUNT_NOT_FOUND": "Aucun compte ne correspond à cette adresse. Aucun compte créé.",
    "ACCOUNT_INACTIVE": "Ce compte est désactivé. Ses droits et son état restent inchangés.",
    "HASH_UNSUPPORTED": "Le format du compte nécessite une vérification supplémentaire. Aucun changement.",
    "VERIFICATION_FAILED": "Échec de vérification : transaction annulée.",
    "DATABASE_ERROR": "Opération non confirmée : connexion ou transaction en erreur. Aucun secret affiché.",
}

def read_credentials():
    if not sys.stdin.isatty():
        raise ValueError("Lancez ce fichier depuis un terminal interactif.")
    email = input("Adresse mail de votre compte FINCA MARIA : ").strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+", email):
        raise ValueError("Adresse mail invalide.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        password = getpass.getpass("Nouveau mot de passe FINCA MARIA (12 caractères minimum, saisie invisible) : ")
        confirmation = getpass.getpass("Confirmez le nouveau mot de passe (saisie invisible) : ")
    if password != confirmation:
        raise ValueError("Les deux saisies sont différentes. Aucun changement.")
    if not 12 <= len(password.encode("utf-16-le")) // 2 <= 200:
        raise ValueError("Le mot de passe doit contenir entre 12 et 200 caractères.")
    return {"email": email, "password": password}

def main():
    print("Récupération du compte FINCA MARIA — réunions, fichiers et droits conservés.")
    print("Sudo demande le mot de passe Linux ; ensuite, vous choisirez celui de FINCA MARIA.")
    subprocess.run(["sudo", "-v"], check=True)
    credentials = read_credentials()
    result = subprocess.run(
        ["sudo", "docker", "exec", "-i", "finca_maria-finca-api-1", "node", "--input-type=module", "-e", NODE_CODE],
        input=json.dumps(credentials), text=True, capture_output=True,
    )
    try:
        outcome = json.loads(result.stdout)
    except (ValueError, TypeError):
        raise ValueError("Récupération non confirmée. Vérifiez que le conteneur FINCA MARIA fonctionne.")
    if result.returncode or outcome.get("ok") is not True:
        raise ValueError(MESSAGES.get(outcome.get("code"), "Récupération non confirmée."))
    print("Mot de passe modifié. Anciennes sessions de ce compte déconnectées.")
    print("Connectez-vous avec votre adresse mail et le nouveau mot de passe.")
    ports = subprocess.run(["sudo", "docker", "port", "finca_maria-finca-web-1", "8080/tcp"], text=True, capture_output=True)
    match = re.search(r":(\d+)\s*$", ports.stdout.splitlines()[0]) if ports.stdout.splitlines() else None
    if match:
        url = "http://localhost:" + match.group(1)
        try:
            subprocess.Popen(["xdg-open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError:
            print("Ouvrez votre navigateur à l’adresse : " + url)

if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nOpération interrompue. Aucun mot de passe affiché.", file=sys.stderr)
        sys.exit(1)
    except (ValueError, subprocess.CalledProcessError, getpass.GetPassWarning) as error:
        print(str(error) if isinstance(error, ValueError) else "Opération interrompue : autorisation ou saisie masquée indisponible.", file=sys.stderr)
        sys.exit(1)
