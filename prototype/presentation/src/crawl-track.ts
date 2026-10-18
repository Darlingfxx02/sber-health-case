import { loopOffset, reverseSamples } from "./crawl-playback.mjs";

type Manifest = {
  sampleRate: number;
  channels: number;
  chunks: { url: string; frames: number }[];
};
type Chunk = { url: string; start: number; end: number };
type Decoded = { forward: AudioBuffer; backward?: AudioBuffer };
export type TrackPiece = {
  buffer: AudioBuffer;
  offset: number;
  remaining: number;
};
export const MAX_DECODED_CHUNKS = 3;

/** Compressed bytes may preload with the page; PCM has a strict, small LRU budget. */
export function createCrawlTrack(url: string) {
  let chunks: Chunk[] = [],
    duration = 0,
    generation = 0;
  const bytes = new Map<number, Promise<ArrayBuffer>>();
  const decoded = new Map<number, Promise<Decoded>>();
  let decodeQueue = Promise.resolve();
  let metadata: Promise<void> | null = null;
  function prepare() {
    metadata ??= fetch(url)
      .then(async (response) => {
        if (!response.ok) throw Error("Audio manifest unavailable");
        const manifest: Manifest = await response.json();
        if (
          !manifest.chunks?.length ||
          !Number.isFinite(manifest.sampleRate) ||
          manifest.sampleRate <= 0
        )
          throw Error("Invalid soundtrack");
        let end = 0;
        chunks = manifest.chunks.map((chunk) => {
          if (!Number.isInteger(chunk.frames) || chunk.frames <= 0)
            throw Error("Invalid audio chunk");
          const start = end;
          end += chunk.frames / manifest.sampleRate;
          return {
            url: new URL(chunk.url, new URL(url, document.baseURI)).href,
            start,
            end,
          };
        });
        duration = end;
      })
      .catch((error) => {
        metadata = null;
        throw error;
      });
    return metadata;
  }
  function compressed(index: number) {
    let data = bytes.get(index);
    if (!data) {
      data = fetch(chunks[index].url)
        .then((response) => {
          if (!response.ok) throw Error("Audio chunk unavailable");
          return response.arrayBuffer();
        })
        .catch((error) => {
          bytes.delete(index);
          throw error;
        });
      bytes.set(index, data);
    }
    return data;
  }
  async function preload() {
    await prepare();
    let cursor = 0;
    // Keep downloads bounded and leave bandwidth for the actual page/iframe.
    await Promise.all(
      [0, 1].map(async () => {
        while (cursor < chunks.length) await compressed(cursor++);
      }),
    );
  }
  async function get(index: number, context: AudioContext) {
    let pending = decoded.get(index);
    if (!pending) {
      const token = generation;
      pending = decodeQueue
        .then(async () => {
          const assertCurrent = () => {
            if (token !== generation || decoded.get(index) !== pending)
              throw new DOMException("Superseded audio decode", "AbortError");
          };
          assertCurrent();
          const data = await compressed(index);
          assertCurrent();
          const buffer = await context.decodeAudioData(data.slice(0));
          // Gapless MP3 metadata is respected by browsers; normalize the resampled
          // length so scheduling cannot accumulate fractional-frame drift.
          const length = Math.round(
            (chunks[index].end - chunks[index].start) * buffer.sampleRate,
          );
          let forward = buffer;
          if (buffer.length !== length) {
            forward = context.createBuffer(
              buffer.numberOfChannels,
              length,
              buffer.sampleRate,
            );
            for (let c = 0; c < buffer.numberOfChannels; c++)
              forward.copyToChannel(
                buffer.getChannelData(c).subarray(0, length),
                c,
              );
          }
          return { forward };
        })
        .catch((error) => {
          if (decoded.get(index) === pending) decoded.delete(index);
          throw error;
        });
      decodeQueue = pending.then(
        () => {},
        () => {},
      );
    }
    decoded.delete(index);
    decoded.set(index, pending);
    while (decoded.size > MAX_DECODED_CHUNKS)
      decoded.delete(decoded.keys().next().value!);
    return pending;
  }
  return {
    prepare,
    preload,
    get duration() {
      return duration;
    },
    get cachedChunks() {
      return decoded.size;
    },
    release() {
      generation++;
      decoded.clear();
    },
    async piece(
      at: number,
      direction: number,
      context: AudioContext,
    ): Promise<TrackPiece> {
      await prepare();
      let position = loopOffset(at, duration);
      if (direction < 0 && position < 1e-7) position = duration;
      const index = chunks.findIndex((chunk) =>
        direction < 0
          ? position > chunk.start + 1e-7 && position <= chunk.end + 1e-7
          : position >= chunk.start - 1e-7 && position < chunk.end - 1e-7,
      );
      if (index < 0) throw Error("Audio position outside track");
      const chunk = chunks[index],
        data = await get(index, context);
      if (direction < 0 && !data.backward) {
        const source = data.forward;
        data.backward = context.createBuffer(
          source.numberOfChannels,
          source.length,
          source.sampleRate,
        );
        for (let c = 0; c < source.numberOfChannels; c++)
          data.backward.copyToChannel(
            reverseSamples(source.getChannelData(c)),
            c,
          );
      }
      const offset =
        direction < 0 ? chunk.end - position : position - chunk.start;
      return {
        buffer: direction < 0 ? data.backward! : data.forward,
        offset: Math.max(0, offset),
        remaining:
          direction < 0 ? position - chunk.start : chunk.end - position,
      };
    },
  };
}
export type CrawlTrack = ReturnType<typeof createCrawlTrack>;
