import { execFile } from "node:child_process";
import { access, lstat, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;
const APPROVED_EXACT_PATHS = new Set([
  ".github/workflows/pages.yml",
  ".gitignore",
  "README.md",
  "package.json",
  "index.html",
  "styles.css",
  "script.js",
  "scripts/build-site.mjs",
  "scripts/validate.mjs",
  "src/content.mjs",
  "src/time.mjs",
  "tests/build.test.mjs",
  "tests/content.test.mjs",
  "tests/controller.test.mjs",
  "tests/time.test.mjs",
  "assets/social-preview.png",
  "assets/favicon.svg",
]);
const APPROVED_DOC =
  /^docs\/superpowers\/(?:specs|plans)\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;
const DENIED_EXTENSION =
  /\.(?:txt|log|csv|tsv|zip|7z|rar|tar|gz|pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|webp|gif|heic|mp3|m4a|wav|ogg|mp4|mov|mkv|webm)$/i;
const CANONICAL_URL =
  "https://whizher.github.io/our-tiny-universe/";
const PREVIEW_URL = CANONICAL_URL + "assets/social-preview.png";
const HTML_URL_ATTRIBUTES = new Set([
  "action",
  "background",
  "data",
  "formaction",
  "href",
  "manifest",
  "ping",
  "poster",
  "src",
  "xlink:href",
]);
const NETWORK_API_NAMES = new Set([
  "Audio",
  "EventSource",
  "Image",
  "SharedWorker",
  "WebSocket",
  "WebTransport",
  "Worker",
  "XMLHttpRequest",
  "fetch",
  "importScripts",
  "sendBeacon",
]);
const DEPLOYED_SOURCE_PATHS = new Set([
  "assets/favicon.svg",
  "assets/social-preview.png",
  "index.html",
  "script.js",
  "src/content.mjs",
  "src/time.mjs",
  "styles.css",
]);
const required = [
  "index.html",
  "styles.css",
  "script.js",
  "src/time.mjs",
  "src/content.mjs",
  "assets/favicon.svg",
];

export function validateTrackedEntries(entries) {
  const errors = [];
  for (const entry of entries) {
    const approvedPath =
      APPROVED_EXACT_PATHS.has(entry.path) || APPROVED_DOC.test(entry.path);
    if (!approvedPath) {
      errors.push("Unapproved tracked path: " + entry.path);
      continue;
    }
    if (entry.isRegularFile === false) {
      errors.push("Tracked path is not a regular file: " + entry.path);
      continue;
    }
    if (DENIED_EXTENSION.test(entry.path)) {
      errors.push("Forbidden tracked file type: " + entry.path);
      continue;
    }
    const limit =
      entry.path === "assets/social-preview.png"
        ? MAX_PREVIEW_BYTES
        : MAX_TEXT_BYTES;
    if (entry.size > limit) {
      errors.push("Tracked file exceeds size limit: " + entry.path);
    }
  }
  return errors;
}

function parseHtmlAttributes(source, sourcePath, errors) {
  const attributes = new Map();
  let offset = 0;

  while (offset < source.length) {
    while (/\s/.test(source[offset] || "")) {
      offset += 1;
    }
    if (offset >= source.length) {
      break;
    }
    if (source[offset] === "/") {
      if (source.slice(offset + 1).trim()) {
        errors.push("Malformed HTML attributes in " + sourcePath);
      }
      break;
    }

    const nameMatch = /^[^\s"'<>\/=]+/.exec(source.slice(offset));
    if (!nameMatch) {
      errors.push("Malformed HTML attributes in " + sourcePath);
      break;
    }
    const name = nameMatch[0].toLowerCase();
    offset += nameMatch[0].length;
    while (/\s/.test(source[offset] || "")) {
      offset += 1;
    }

    let value = null;
    if (source[offset] === "=") {
      offset += 1;
      while (/\s/.test(source[offset] || "")) {
        offset += 1;
      }
      const quote = source[offset];
      if (quote !== '"' && quote !== "'") {
        const valueMatch = /^[^\s>]+/.exec(source.slice(offset));
        value = valueMatch ? valueMatch[0] : "";
        offset += value.length;
        errors.push(`Unquoted HTML attribute in ${sourcePath}: ${name}`);
      } else {
        const valueStart = offset + 1;
        const valueEnd = source.indexOf(quote, valueStart);
        if (valueEnd === -1) {
          errors.push("Malformed HTML attributes in " + sourcePath);
          break;
        }
        value = source.slice(valueStart, valueEnd);
        offset = valueEnd + 1;
      }
    }

    if (attributes.has(name)) {
      errors.push(`Duplicate HTML attribute in ${sourcePath}: ${name}`);
    }
    attributes.set(name, value);
  }

  return attributes;
}

function containsUrl(value) {
  return /\b(?:https?|wss?):\/\/|(?:data|blob):|(?:^|[\s=;])\/\//i.test(
    value,
  );
}

function isApprovedMetadata(tag, attributes, value) {
  if (tag === "link") {
    return (
      attributes.get("rel")?.trim().toLowerCase() === "canonical" &&
      value === CANONICAL_URL
    );
  }
  if (tag !== "meta") {
    return false;
  }

  const property = attributes.get("property")?.trim().toLowerCase();
  const name = attributes.get("name")?.trim().toLowerCase();
  return (
    (property === "og:url" && value === CANONICAL_URL) ||
    (property === "og:image" && value === PREVIEW_URL) ||
    (name === "twitter:image" && value === PREVIEW_URL)
  );
}

function isApprovedManualShareLink(tag, attributes, value) {
  return (
    tag === "a" &&
    attributes.has("data-share-fallback") &&
    attributes.get("data-share-fallback") === null &&
    value === CANONICAL_URL
  );
}

function extractCssReferences(source, sourcePath, errors) {
  const references = [];
  if (source.includes("\\")) {
    errors.push("Unsupported CSS escape in " + sourcePath);
  }
  if (/\b(?:image|image-set|src)\s*\(/i.test(source)) {
    errors.push("Forbidden CSS resource function in " + sourcePath);
  }
  if (/@import\b/i.test(source)) {
    errors.push("Forbidden CSS import in " + sourcePath);
  }

  const urlStart = /\burl\s*\(/gi;
  for (let match = urlStart.exec(source); match; match = urlStart.exec(source)) {
    let offset = urlStart.lastIndex;
    while (/\s/.test(source[offset] || "")) {
      offset += 1;
    }

    const quote = source[offset];
    let reference;
    let end;
    if (quote === '"' || quote === "'") {
      const valueStart = offset + 1;
      end = valueStart;
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2;
          continue;
        }
        if (source[end] === quote) {
          break;
        }
        end += 1;
      }
      if (end >= source.length) {
        errors.push("Malformed CSS URL in " + sourcePath);
        break;
      }
      reference = source.slice(valueStart, end);
      end += 1;
      while (/\s/.test(source[end] || "")) {
        end += 1;
      }
      if (source[end] !== ")") {
        errors.push("Malformed CSS URL in " + sourcePath);
        urlStart.lastIndex = end;
        continue;
      }
    } else {
      end = source.indexOf(")", offset);
      if (end === -1) {
        errors.push("Malformed CSS URL in " + sourcePath);
        break;
      }
      reference = source.slice(offset, end).trim();
      if (/["'()]|\s/.test(reference)) {
        errors.push("Malformed CSS URL in " + sourcePath);
        urlStart.lastIndex = end + 1;
        continue;
      }
    }
    urlStart.lastIndex = end + 1;

    if (!reference) {
      errors.push("Empty CSS URL in " + sourcePath);
    } else if (reference.includes("\\")) {
      errors.push("Escaped CSS URL in " + sourcePath + ": " + reference);
    } else {
      references.push({
        context: sourcePath,
        kind: "css",
        sourcePath,
        value: reference,
      });
    }
  }

  return references;
}

function extractSrcsetReferences(value, sourcePath, errors) {
  const references = [];
  for (const candidate of value.split(",")) {
    const parts = candidate.trim().split(/\s+/).filter(Boolean);
    if (
      parts.length < 1 ||
      parts.length > 2 ||
      (parts[1] && !/^(?:\d+(?:\.\d+)?x|\d+w)$/.test(parts[1]))
    ) {
      errors.push("Malformed srcset in " + sourcePath);
      continue;
    }
    references.push({
      kind: "runtime",
      sourcePath,
      value: parts[0],
    });
  }
  return references;
}

function extractHtmlReferences(html, errors) {
  const references = [];

  for (const block of html.matchAll(
    /<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi,
  )) {
    if (block[1].toLowerCase() === "style" || block[2].trim()) {
      errors.push(
        `Forbidden inline ${block[1].toLowerCase()} in index.html`,
      );
    }
  }

  for (const element of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const tag = element[1].toLowerCase();
    const attributes = parseHtmlAttributes(element[2], "index.html", errors);

    for (const name of attributes.keys()) {
      if (name.startsWith("on")) {
        errors.push("Forbidden inline event handler in index.html: " + name);
      }
    }

    const style = attributes.get("style");
    if (style !== undefined && style !== null) {
      references.push(
        ...extractCssReferences(style, "index.html inline style", errors).map(
          (reference) => ({ ...reference, sourcePath: "index.html" }),
        ),
      );
    }

    for (const name of ["srcset", "imagesrcset"]) {
      const srcset = attributes.get(name);
      if (srcset !== undefined && srcset !== null) {
        references.push(
          ...extractSrcsetReferences(srcset, "index.html", errors),
        );
      }
    }

    if (attributes.has("srcdoc")) {
      errors.push("Forbidden srcdoc in index.html");
    }

    if (
      tag === "meta" &&
      attributes.get("http-equiv")?.trim().toLowerCase() === "refresh"
    ) {
      errors.push("Forbidden metadata URL in index.html");
    }
    const content = attributes.get("content");
    if (
      tag === "meta" &&
      content !== undefined &&
      content !== null &&
      containsUrl(content) &&
      !isApprovedMetadata(tag, attributes, content)
    ) {
      errors.push("Forbidden metadata URL in index.html: " + content);
    }

    for (const name of HTML_URL_ATTRIBUTES) {
      const value = attributes.get(name);
      if (value === undefined) {
        continue;
      }
      if (!value) {
        errors.push(`Empty HTML URL attribute in index.html: ${name}`);
        continue;
      }
      if (
        (name === "href" && isApprovedMetadata(tag, attributes, value)) ||
        (name === "href" && isApprovedManualShareLink(tag, attributes, value))
      ) {
        continue;
      }
      references.push({
        kind: "runtime",
        sourcePath: "index.html",
        value,
      });
    }
  }

  return references;
}

function tokenizeJavaScript(source, sourcePath, errors) {
  const tokens = [];
  let offset = 0;

  while (offset < source.length) {
    const character = source[offset];
    if (/\s/.test(character)) {
      offset += 1;
      continue;
    }
    if (source.startsWith("//", offset)) {
      const end = source.indexOf("\n", offset + 2);
      offset = end === -1 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith("/*", offset)) {
      const end = source.indexOf("*/", offset + 2);
      if (end === -1) {
        errors.push("Unterminated JavaScript comment in " + sourcePath);
        break;
      }
      offset = end + 2;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      const valueStart = offset + 1;
      let end = valueStart;
      let escaped = false;
      while (end < source.length) {
        if (source[end] === "\\") {
          escaped = true;
          end += 2;
          continue;
        }
        if (source[end] === quote) {
          break;
        }
        end += 1;
      }
      if (end >= source.length) {
        errors.push("Unterminated JavaScript string in " + sourcePath);
        break;
      }
      tokens.push({
        escaped,
        type: quote === "`" ? "template" : "string",
        value: source.slice(valueStart, end),
      });
      if (quote === "`") {
        errors.push(
          "Unsupported JavaScript template literal in " + sourcePath,
        );
      }
      offset = end + 1;
      continue;
    }

    const identifier = /^[A-Za-z_$][\w$]*/.exec(source.slice(offset));
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      offset += identifier[0].length;
      continue;
    }
    tokens.push({ type: "punctuator", value: character });
    offset += 1;
  }

  return tokens;
}

function isApprovedCanonicalDeclaration(tokens, index, sourcePath) {
  return (
    sourcePath === "script.js" &&
    tokens[index].type === "string" &&
    tokens[index].value === CANONICAL_URL &&
    tokens[index - 1]?.value === "=" &&
    tokens[index - 2]?.value === "CANONICAL_URL" &&
    tokens[index - 3]?.value === "const"
  );
}

function extractJavaScriptReferences(source, sourcePath, errors) {
  const references = [];
  const tokens = tokenizeJavaScript(source, sourcePath, errors);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const computedNetworkApi =
      token.type === "string" &&
      NETWORK_API_NAMES.has(token.value) &&
      tokens[index - 1]?.value === "[" &&
      tokens[index + 1]?.value === "]";
    if (
      (token.type === "identifier" && NETWORK_API_NAMES.has(token.value)) ||
      computedNetworkApi
    ) {
      errors.push(`Forbidden network API in ${sourcePath}: ${token.value}`);
    }

    if (
      (token.type === "string" || token.type === "template") &&
      containsUrl(token.value) &&
      !isApprovedCanonicalDeclaration(tokens, index, sourcePath)
    ) {
      errors.push(`External URL literal in ${sourcePath}: ${token.value}`);
    }

    if (token.type === "identifier" && token.value === "export") {
      if (!["{", "*"].includes(tokens[index + 1]?.value)) {
        continue;
      }
      let fromIndex = index + 1;
      while (
        fromIndex < tokens.length &&
        tokens[fromIndex].value !== ";" &&
        tokens[fromIndex].value !== "from"
      ) {
        fromIndex += 1;
      }
      if (tokens[fromIndex]?.value === "from") {
        if (tokens[fromIndex + 1]?.type !== "string") {
          errors.push("Unsupported JavaScript re-export in " + sourcePath);
        } else {
          references.push({
            kind: "runtime",
            sourcePath,
            value: tokens[fromIndex + 1].value,
          });
        }
      }
      continue;
    }

    if (token.type !== "identifier" || token.value !== "import") {
      continue;
    }
    if (tokens[index + 1]?.value === ".") {
      continue;
    }
    if (tokens[index + 1]?.value === "(") {
      errors.push("Forbidden dynamic import in " + sourcePath);
      continue;
    }
    if (tokens[index + 1]?.type === "string") {
      references.push({
        kind: "runtime",
        sourcePath,
        value: tokens[index + 1].value,
      });
      continue;
    }

    let fromIndex = index + 1;
    while (
      fromIndex < tokens.length &&
      tokens[fromIndex].value !== ";" &&
      tokens[fromIndex].value !== "from"
    ) {
      fromIndex += 1;
    }
    if (
      tokens[fromIndex]?.value !== "from" ||
      tokens[fromIndex + 1]?.type !== "string"
    ) {
      errors.push("Unsupported JavaScript import in " + sourcePath);
      continue;
    }
    references.push({
      kind: "runtime",
      sourcePath,
      value: tokens[fromIndex + 1].value,
    });
  }

  return references;
}

function validateSvg(source, sourcePath, errors) {
  const withoutXmlns = source.replace(
    'xmlns="http://www.w3.org/2000/svg"',
    "",
  );
  const activeElement =
    /<(?:[a-z][\w-]*:)?(?:script|style|foreignobject|iframe|object|embed|image|use)\b/i;
  const activeAttribute =
    /\b(?:href|xlink:href|src|style|on[a-z][\w-]*)\s*=/i;
  const activeContent =
    /@import\b|\burl\s*\(|(?:https?|wss?):\/\/|(?:data|blob):|\/\//i;
  if (
    activeElement.test(source) ||
    activeAttribute.test(source) ||
    activeContent.test(withoutXmlns) ||
    source.includes("\\")
  ) {
    errors.push("Forbidden SVG content in " + sourcePath);
  }
}

async function validateLocalReference(reference, errors) {
  const { context, sourcePath, value } = reference;
  if (isAbsolute(value)) {
    errors.push(`Disallowed local reference in ${sourcePath}: ${value}`);
    return;
  }

  const absolutePath = resolve(root, dirname(sourcePath), value);
  const repoPath = relative(root, absolutePath);
  if (
    !repoPath ||
    isAbsolute(repoPath) ||
    repoPath === ".." ||
    repoPath.startsWith(".." + sep)
  ) {
    errors.push(`Disallowed local reference in ${sourcePath}: ${value}`);
    return;
  }

  let file;
  try {
    file = await lstat(absolutePath);
  } catch {
    errors.push(
      `Broken local reference in ${context || sourcePath}: ${value}`,
    );
    return;
  }
  if (!file.isFile()) {
    errors.push(`Disallowed local reference in ${sourcePath}: ${value}`);
    return;
  }

  const deployedPath = repoPath.split(sep).join("/");
  if (!DEPLOYED_SOURCE_PATHS.has(deployedPath)) {
    errors.push("Local reference is not deployed: " + deployedPath);
  }
}

async function trackedEntries() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  const paths = stdout.split("\0").filter(Boolean);
  return Promise.all(
    paths.map(async (path) => {
      const file = await lstat(resolve(root, path));
      return {
        isRegularFile: file.isFile(),
        path,
        size: file.size,
      };
    }),
  );
}

async function main() {
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

  const references = extractHtmlReferences(
    contents.get("index.html") || "",
    errors,
  );
  references.push(
    ...extractCssReferences(
      contents.get("styles.css") || "",
      "styles.css",
      errors,
    ),
  );
  for (const [path, source] of contents) {
    if (/\.(?:m?js)$/i.test(path)) {
      references.push(...extractJavaScriptReferences(source, path, errors));
    }
  }
  validateSvg(
    contents.get("assets/favicon.svg") || "",
    "assets/favicon.svg",
    errors,
  );

  for (const referenceDetails of references) {
    const { context, kind, value: reference } = referenceDetails;
    if (/^(?:https?|wss?):\/\/|^\/\//i.test(reference)) {
      errors.push(
        kind === "css"
          ? `External CSS URL in ${context}: ${reference}`
          : "External runtime reference: " + reference,
      );
      continue;
    }
    if (/^(?:#|[a-z][a-z\d+.-]*:)/i.test(reference)) {
      errors.push(
        kind === "css"
          ? `Non-file CSS URL in ${context}: ${reference}`
          : "Non-file runtime reference: " + reference,
      );
      continue;
    }
    await validateLocalReference(referenceDetails, errors);
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

  errors.push(...validateTrackedEntries(await trackedEntries()));

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  console.log("Validated " + required.length + " runtime files.");
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  await main();
}
