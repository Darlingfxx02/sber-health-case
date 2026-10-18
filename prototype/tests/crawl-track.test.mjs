import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrawlTrack,
  MAX_DECODED_CHUNKS,
} from "../presentation/src/crawl-track.ts";

test("preloads compressed music but decodes only a bounded neighborhood, including reverse seams", async () => {
  const originalFetch = globalThis.fetch,
    originalDocument = globalThis.document;
  let decodes = 0;
  class Buffer {
    constructor(channels, length, rate) {
      this.numberOfChannels = channels;
      this.length = length;
      this.sampleRate = rate;
      this.data = Array.from({ length: channels }, () =>
        Float32Array.from({ length }, (_, i) => i),
      );
    }
    getChannelData(c) {
      return this.data[c];
    }
    copyToChannel(data, c) {
      this.data[c].set(data);
    }
  }
  const context = {
    async decodeAudioData() {
      decodes++;
      return new Buffer(2, 8, 1);
    },
    createBuffer: (...args) => new Buffer(...args),
  };
  globalThis.document = { baseURI: "https://example.test/case/" };
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () => ({
      sampleRate: 1,
      channels: 2,
      chunks: Array.from({ length: 10 }, (_, i) => ({
        url: `${i}.mp3`,
        frames: 8,
      })),
    }),
    arrayBuffer: async () => new ArrayBuffer(8),
  });
  try {
    const track = createCrawlTrack("track.json");
    await track.preload();
    assert.equal(decodes, 0);
    assert.equal(track.duration, 80);
    const first = await track.piece(0, 1, context);
    assert.equal(first.remaining, 8);
    const reverse = await track.piece(8, -1, context);
    assert.equal(reverse.offset, 0);
    assert.equal(reverse.remaining, 8);
    assert.deepEqual(
      [...reverse.buffer.getChannelData(0)],
      [7, 6, 5, 4, 3, 2, 1, 0],
    );
    const loop = await track.piece(0, -1, context);
    assert.equal(loop.remaining, 8);
    for (let i = 0; i < 10; i++) {
      await track.piece(i * 8, 1, context);
      assert.ok(track.cachedChunks <= MAX_DECODED_CHUNKS);
    }
    track.release();
    assert.equal(track.cachedChunks, 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  }
});

test("rapid seeks cancel evicted work and never decode concurrently", async () => {
  const originalFetch = globalThis.fetch,
    originalDocument = globalThis.document;
  let decodes = 0,
    active = 0,
    peak = 0,
    unblock;
  const gate = new Promise((resolve) => (unblock = resolve));
  globalThis.document = { baseURI: "https://example.test/case/" };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      sampleRate: 1,
      chunks: Array.from({ length: 12 }, (_, i) => ({
        url: `${i}.mp3`,
        frames: 8,
      })),
    }),
    arrayBuffer: async () => new ArrayBuffer(8),
  });
  const context = {
    async decodeAudioData() {
      decodes++;
      peak = Math.max(peak, ++active);
      await gate;
      active--;
      return { numberOfChannels: 2, length: 8, sampleRate: 1 };
    },
  };
  try {
    const track = createCrawlTrack("track.json");
    await track.prepare();
    const settled = Promise.allSettled(
      Array.from({ length: 12 }, (_, i) => track.piece(i * 8, 1, context)),
    );
    for (let i = 0; i < 20; i++) await Promise.resolve();
    unblock();
    const result = await settled;
    assert.equal(peak, 1);
    assert.equal(decodes, MAX_DECODED_CHUNKS);
    assert.equal(
      result.filter((item) => item.status === "fulfilled").length,
      MAX_DECODED_CHUNKS,
    );
    assert.ok(
      result
        .filter((item) => item.status === "rejected")
        .every((item) => item.reason.name === "AbortError"),
    );
    track.release();
    assert.equal(track.cachedChunks, 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  }
});
