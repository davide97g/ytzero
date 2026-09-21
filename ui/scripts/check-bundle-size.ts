import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const distDirectory = resolve(import.meta.dir, "../dist");
const assetsDirectory = resolve(distDirectory, "assets");
const assets = await readdir(assetsDirectory);

const budgets: Array<{ pattern: RegExp; maximumBytes: number; label: string }> = [
  { pattern: /^index-.*\.js$/, maximumBytes: 100_000, label: "entry JavaScript" },
  { pattern: /^watch-player-.*\.js$/, maximumBytes: 275_000, label: "watch player" },
  { pattern: /^watch-controller-.*\.js$/, maximumBytes: 75_000, label: "watch controller" },
  { pattern: /^SettingsPage-.*\.js$/, maximumBytes: 150_000, label: "settings route" },
  { pattern: /^WatchPage-.*\.js$/, maximumBytes: 150_000, label: "watch route" },
  { pattern: /^hls-.*\.js$/, maximumBytes: 550_000, label: "lazy HLS runtime" },
  { pattern: /^EmojiCatalog-.*\.js$/, maximumBytes: 330_000, label: "lazy emoji catalog" },
  { pattern: /^index-.*\.css$/, maximumBytes: 100_000, label: "initial CSS" },
];

// Everything the document pulls before the app renders: the entry plus every
// chunk and stylesheet it preloads. A per-chunk budget cannot see this number,
// which is the one a cold visit actually pays.
const INITIAL_PAYLOAD_MAX_BYTES = 1_040_000;

const failures: string[] = [];
for (const budget of budgets) {
  const matches = assets.filter((asset) => budget.pattern.test(asset));
  if (matches.length !== 1) {
    failures.push(`${budget.label}: expected one matching asset, found ${matches.length}`);
    continue;
  }
  const bytes = (await stat(resolve(assetsDirectory, matches[0]))).size;
  if (bytes > budget.maximumBytes) {
    failures.push(`${budget.label}: ${bytes} bytes exceeds ${budget.maximumBytes}`);
  }
}

const document = await readFile(resolve(distDirectory, "index.html"), "utf8");
const referenced = [...new Set([...document.matchAll(/(?:href|src)="\/(assets\/[^"]+)"/g)].map((match) => match[1]))];
let initialBytes = 0;
for (const reference of referenced) {
  initialBytes += (await stat(resolve(distDirectory, reference))).size;
}
if (referenced.length === 0) failures.push("initial payload: index.html references no assets");
if (initialBytes > INITIAL_PAYLOAD_MAX_BYTES) {
  failures.push(`initial payload: ${initialBytes} bytes across ${referenced.length} files exceeds ${INITIAL_PAYLOAD_MAX_BYTES}`);
}

if (failures.length > 0) {
  console.error("UI bundle budget failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`UI bundle budgets OK (initial payload ${initialBytes} bytes across ${referenced.length} files).`);
