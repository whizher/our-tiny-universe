import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("_site", { recursive: true, force: true });
await mkdir("_site/src", { recursive: true });
await mkdir("_site/assets", { recursive: true });

for (const file of ["index.html", "styles.css", "script.js"]) {
  await cp(file, "_site/" + file);
}

for (const file of ["time.mjs", "content.mjs", "audio.mjs"]) {
  await cp("src/" + file, "_site/src/" + file);
}

await cp("assets/favicon.svg", "_site/assets/favicon.svg");
await cp(
  "assets/lunar-drive.opus",
  "_site/assets/lunar-drive.opus",
);
await cp(
  "assets/social-preview.png",
  "_site/assets/social-preview.png",
);

await writeFile("_site/.nojekyll", "");
console.log("Built _site with privacy-bounded public assets.");
