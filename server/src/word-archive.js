import yauzl from "yauzl";
import { SaxesParser } from "saxes";

export async function readWord(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.length ||
    buffer.length > 10 * 1024 * 1024
  )
    throw Object.assign(new Error("Document .docx limité à 10 Mio."), {
      status: 400,
    });
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error)
          return reject(
            Object.assign(
              new Error("Document Word .docx illisible ou chiffré."),
              { status: 400 },
            ),
          );
        let settled = false;
        let entries = 0;
        const fail = (reason) => {
          if (settled) return;
          settled = true;
          zip.close();
          reject(Object.assign(new Error(reason), { status: 400 }));
        };
        zip.on("error", () => fail("Archive Word invalide."));
        zip.on("end", () => {
          if (!settled)
            fail("Le document ne contient pas de texte Word lisible.");
        });
        zip.on("entry", (entry) => {
          if (++entries > 2000) return fail("Archive Word trop complexe.");
          if (entry.fileName !== "word/document.xml") {
            zip.readEntry();
            return;
          }
          if (
            entry.uncompressedSize > 2 * 1024 * 1024 ||
            entry.generalPurposeBitFlag & 1
          )
            return fail("Texte Word trop volumineux ou chiffré.");
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError) return fail("Impossible de lire le texte Word.");
            let size = 0;
            const chunks = [];
            stream.on("data", (chunk) => {
              size += chunk.length;
              if (size > 2 * 1024 * 1024) {
                stream.destroy();
                fail("Texte Word trop volumineux.");
              } else chunks.push(chunk);
            });
            stream.on("error", () => fail("Texte Word endommagé."));
            stream.on("end", () => {
              if (settled) return;
              try {
                let text = "";
                let inText = false;
                const parser = new SaxesParser({ xmlns: true });
                parser.on("doctype", () => {
                  throw new Error("DTD interdite");
                });
                parser.on("opentag", (tag) => {
                  if (
                    tag.uri ===
                    "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                  ) {
                    if (tag.local === "t") inText = true;
                    if (tag.local === "tab") text += "\t";
                    if (tag.local === "br") text += "\n";
                  }
                });
                parser.on("text", (value) => {
                  if (inText) text += value;
                });
                parser.on("closetag", (tag) => {
                  if (
                    tag.uri ===
                    "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                  ) {
                    if (tag.local === "t") inText = false;
                    if (tag.local === "p") text += "\n";
                  }
                });
                parser.write(Buffer.concat(chunks).toString("utf8")).close();
                if (!text.trim() || text.length > 100000)
                  return fail("Texte vide ou supérieur à 100 000 caractères.");
                settled = true;
                zip.close();
                resolve(text);
              } catch {
                fail("Contenu XML Word invalide.");
              }
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}
