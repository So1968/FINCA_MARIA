import fs from "node:fs";

export function readBaulIndex(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { version: 3, documents: [] };
    throw new Error("Index du BAÚL inaccessible. Import bloqué pour préserver le classement.", { cause: error });
  }
  try {
    const index = JSON.parse(text);
    if (!index || typeof index !== "object" || Array.isArray(index)
      || !Array.isArray(index.documents)
      || index.documents.some((doc) => !doc || typeof doc !== "object" || Array.isArray(doc))) {
      throw new Error("Structure invalide");
    }
    return index;
  } catch (error) {
    throw new Error("Index du BAÚL illisible. Import bloqué : conserver _INDEX_BAUL.json et restaurer une copie valide.", { cause: error });
  }
}
