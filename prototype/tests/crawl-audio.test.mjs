import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrawlAudio,
  playbackTime,
} from "../presentation/src/crawl-audio.ts";
import { playbackAdvance } from "../presentation/src/crawl-playback.mjs";

const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
test("chunk boundaries share the acceleration clock in both directions", () => {
  for (const ramp of [0, 1.4])
    for (const distance of [0, 0.1, 0.7, 8, 16])
      assert.ok(
        Math.abs(
          playbackAdvance(playbackTime(distance, ramp), ramp) - distance,
        ) < 1e-8,
      );
});
test("transport schedules ahead, reverses, cancels late seeks and releases PCM on close", async () => {
  const sources = [],
    gains = [],
    timers = new Map();
  let state,
    context,
    hold = null,
    released = 0;
  const param = () => ({
    value: 0,
    events: [],
    setValueAtTime(value, time) {
      this.value = value;
      this.events.push(["set", value, time]);
    },
    setTargetAtTime(value) {
      this.value = value;
    },
    linearRampToValueAtTime(value, time) {
      this.value = value;
      this.events.push(["ramp", value, time]);
    },
    cancelScheduledValues() {},
  });
  class Context {
    currentTime = 0;
    state = "running";
    destination = {};
    constructor() {
      context = this;
    }
    createGain() {
      const gain = { gain: param(), connect() {}, disconnect() {} };
      gains.push(gain);
      return gain;
    }
    createBufferSource() {
      const source = {
        playbackRate: param(),
        connect() {},
        disconnect() {},
        start(time, offset) {
          this.when = time;
          this.offset = offset;
        },
        stop(time) {
          this.stopAt = time;
        },
      };
      sources.push(source);
      return source;
    }
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
  }
  const original = globalThis.AudioContext,
    originalWindow = globalThis.window;
  globalThis.AudioContext = Context;
  globalThis.window = {
    setTimeout(fn) {
      timers.set(1, fn);
      return 1;
    },
  };
  const track = {
    duration: 24,
    async prepare() {},
    release() {
      released++;
    },
    async piece(at, direction) {
      if (hold) await hold;
      return {
        buffer: { direction },
        offset: ((at % 8) + 8) % 8,
        remaining: 8 - (((at % 8) + 8) % 8),
      };
    },
  };
  try {
    const audio = createCrawlAudio((next) => (state = next), track);
    await audio.load();
    audio.play(0);
    await flush();
    assert.equal(state.volume, 0.05);
    assert.equal(state.playing, true);
    assert.equal(sources.length, 2);
    assert.equal(sources[0].stopAt, sources[1].when);
    audio.play(4, -1, true);
    await flush();
    assert.equal(state.direction, -1);
    assert.equal(sources.at(-1).buffer.direction, -1);
    audio.toggleMuted();
    assert.equal(state.playing, false);
    audio.setVolume(0.2);
    assert.equal(state.playing, true);
    audio.play(12, 1, false, 1.4);
    await flush();
    assert.equal(sources.at(-2).playbackRate.events[0][1], 0);
    let resolve;
    hold = new Promise((done) => (resolve = done));
    audio.play(20, -1);
    audio.suspend();
    const count = sources.length;
    resolve();
    await flush();
    assert.equal(sources.length, count);
    assert.equal(state.playing, false);
    assert.equal(released, 1);
    assert.equal(context.state, "suspended");
  } finally {
    globalThis.AudioContext = original;
    globalThis.window = originalWindow;
  }
});
