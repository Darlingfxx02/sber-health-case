// Run only when replacing the author's soundtrack. Generated chunks are committed;
// deployment does not need FFmpeg or decode the full track in the browser.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const run = (args) => {
  const result = spawnSync("ffmpeg", args, { maxBuffer: 120 * 1024 * 1024 });
  if (result.status !== 0) throw Error(result.stderr.toString());
  return result.stdout;
};
const pcm = run([
  "-v",
  "error",
  "-i",
  fileURLToPath(new URL("assets/audio/main-title.mp3", root)),
  "-f",
  "s16le",
  "-ar",
  "44100",
  "-ac",
  "2",
  "pipe:1",
]);
const sampleRate = 44100,
  channels = 2,
  chunkFrames = sampleRate * 8,
  frameBytes = channels * 2;
const output = new URL("assets/audio/chunks/", root);
await mkdir(output, { recursive: true });
const chunks = [];
for (let offset = 0; offset < pcm.length; offset += chunkFrames * frameBytes) {
  const input = pcm.subarray(
    offset,
    Math.min(pcm.length, offset + chunkFrames * frameBytes),
  );
  // Xing gapless metadata preserves the exact sample boundary after decoding.
  const temporary = new URL("chunk.tmp.mp3", output);
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-f",
      "s16le",
      "-ar",
      String(sampleRate),
      "-ac",
      String(channels),
      "-i",
      "pipe:0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      fileURLToPath(temporary),
    ],
    { input },
  );
  if (result.status !== 0) throw Error(result.stderr.toString());
  const { readFile, rename } = await import("node:fs/promises");
  const bytes = await readFile(temporary),
    hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const url = `part-${chunks.length}-${hash}.mp3`;
  await rename(temporary, new URL(url, output));
  chunks.push({ url, frames: input.length / frameBytes });
}
const manifest = { sampleRate, channels, chunks };
const data = JSON.stringify(manifest),
  hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
await writeFile(new URL(`track-${hash}.json`, output), data + "\n");
await writeFile(
  new URL("presentation/src/epilogue-audio-config.ts", root),
  `// Author-supplied soundtrack; bounded PCM chunks preserve stereo and sample rate.\nexport const epilogueAudioUrl='assets/audio/chunks/track-${hash}.json';\n`,
);
console.log(
  `Prepared ${chunks.length} chunks, ${(pcm.length / frameBytes / sampleRate).toFixed(2)} seconds`,
);
