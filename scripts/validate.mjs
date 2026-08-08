import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html",
  "styles.css",
  "script.js",
  "src/time.mjs",
  "src/content.mjs",
];
const errors = [];
const contents = new Map();

for (const path of required) {
  const absolutePath = resolve(root, path);
  try {
    await access(absolutePath);
    contents.set(path, await readFile(absolutePath, "utf8"));
  } catch {
    errors.push("Missing required file: " + path);
  }
}

const html = contents.get("index.html") || "";
const script = contents.get("script.js") || "";
const references = [
  ...html.matchAll(/(?:href|src)="([^"]+)"/g),
  ...script.matchAll(/from\s+"([^"]+)"/g),
].map((match) => match[1]);

for (const reference of references) {
  if (/^(?:https?:|#|data:)/.test(reference)) {
    errors.push("External or non-file runtime reference: " + reference);
    continue;
  }
  try {
    await access(resolve(root, reference));
  } catch {
    errors.push("Broken local reference: " + reference);
  }
}

const forbidden = [
  "WhatsApp",
  "wa.me",
  "tel:",
  "phone number",
  "private photo",
  "localStorage",
  "analytics",
];
for (const [path, source] of contents) {
  for (const token of forbidden) {
    if (source.toLowerCase().includes(token.toLowerCase())) {
      errors.push(`Forbidden public runtime token in ${path}: ${token}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Validated " + required.length + " runtime files.");
