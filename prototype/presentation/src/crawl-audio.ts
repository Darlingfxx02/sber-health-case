import {
  loopOffset,
  NORMAL_VOLUME,
  REVERSE_VOLUME,
  playbackAdvance,
} from "./crawl-playback.mjs";
import type { CrawlTrack } from "./crawl-track";

type AudioState = {
  status: "empty" | "loading" | "ready" | "error";
  playing: boolean;
  muted: boolean;
  direction: number;
  volume: number;
};
type Transport = {
  at: number;
  direction: number;
  ramp: number;
  started: number;
  distance: number;
  gain: GainNode;
  sources: Set<AudioBufferSourceNode>;
  pumping: boolean;
};
// Inverse of playbackAdvance: schedule chunk boundaries on the AudioContext clock,
// including the gradual restart from zero speed.
export function playbackTime(distance: number, ramp = 0) {
  return ramp && distance < ramp / 2
    ? Math.sqrt(2 * ramp * distance)
    : distance + ramp / 2;
}
export function createCrawlAudio(
  onState: (state: AudioState) => void,
  track: CrawlTrack,
) {
  let context: AudioContext | null = null,
    output: GainNode | null = null,
    voice: Transport | null = null;
  let status: AudioState["status"] = "empty",
    muted = false,
    volume = 0.05,
    lastVolume = 0.05,
    version = 0,
    timer = 0;
  let desired: {
    at: number;
    direction: number;
    quiet: boolean;
    ramp: number;
  } | null = null;
  const emit = () =>
    onState({
      status,
      playing: !!voice && context?.state === "running" && !muted && volume > 0,
      muted,
      direction: voice?.direction ?? 0,
      volume,
    });
  function retire(old: Transport | null) {
    if (!old || !context) return;
    old.gain.gain.cancelScheduledValues(context.currentTime);
    old.gain.gain.setTargetAtTime(0, context.currentTime, 0.018);
    for (const source of old.sources) source.stop(context.currentTime + 0.08);
    // The final source's onended disconnects the common gain.
    if (!old.sources.size) old.gain.disconnect();
  }
  function stop() {
    version++;
    desired = null;
    clearTimeout(timer);
    const old = voice;
    voice = null;
    retire(old);
    emit();
  }
  async function load() {
    const token = ++version;
    status = "loading";
    try {
      context ??= new AudioContext();
      if (!output) {
        output = context.createGain();
        output.connect(context.destination);
      }
      output.gain.setValueAtTime(muted ? 0 : volume, context.currentTime);
      const resumed = context.resume();
      emit();
      await Promise.all([resumed, track.piece(0, 1, context)]);
      if (token !== version) return;
      status = "ready";
      emit();
    } catch {
      if (token === version) {
        status = "error";
        emit();
      }
    }
  }
  function append(
    current: Transport,
    piece: Awaited<ReturnType<CrawlTrack["piece"]>>,
  ) {
    if (!context) return;
    const source = context.createBufferSource();
    source.buffer = piece.buffer;
    source.connect(current.gain);
    const elapsed = playbackTime(current.distance, current.ramp);
    const when = current.started + elapsed,
      end =
        current.started +
        playbackTime(current.distance + piece.remaining, current.ramp);
    const rate = current.ramp ? Math.min(1, elapsed / current.ramp) : 1;
    source.playbackRate.setValueAtTime(rate, when);
    if (rate < 1)
      source.playbackRate.linearRampToValueAtTime(
        1,
        current.started + current.ramp,
      );
    current.sources.add(source);
    source.onended = () => {
      source.disconnect();
      current.sources.delete(source);
      if (current !== voice && !current.sources.size) current.gain.disconnect();
    };
    source.start(when, piece.offset);
    source.stop(end);
    current.distance += piece.remaining;
  }
  async function pump(current: Transport) {
    if (!context || voice !== current || current.pumping) return;
    current.pumping = true;
    try {
      // At most two playing/scheduled chunks. Decoded LRU is bounded separately.
      while (voice === current && current.sources.size < 2) {
        const piece = await track.piece(
          current.at + current.distance * current.direction,
          current.direction,
          context,
        );
        if (voice !== current) return;
        const nextTime =
          current.started + playbackTime(current.distance, current.ramp);
        if (nextTime < context.currentTime - 0.08) {
          // A stalled download must resume at the current timeline, not replay old audio.
          const at =
            current.at +
            playbackAdvance(
              context.currentTime - current.started,
              current.ramp,
            ) *
              current.direction;
          stop();
          play(at, current.direction, current.direction < 0);
          return;
        }
        append(current, piece);
      }
    } catch (error) {
      // Rapid scrubbing can evict a queued look-ahead decode. That cancellation
      // is expected; the next pump or newer seek will supply the current chunk.
      if (
        voice === current &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        stop();
        status = "error";
        emit();
      }
    } finally {
      current.pumping = false;
      if (voice === current)
        timer = window.setTimeout(() => void pump(current), 100);
    }
  }
  function play(at: number, direction = 1, quiet = false, ramp = 0) {
    if (!context || !output || status !== "ready") return;
    const target = loopOffset(at, track.duration),
      now = context.currentTime;
    const current = voice
      ? loopOffset(
          voice.at +
            playbackAdvance(Math.max(0, now - voice.started), voice.ramp) *
              voice.direction,
          track.duration,
        )
      : 0;
    const difference = Math.abs(current - target),
      drift = Math.min(difference, track.duration - difference);
    if (voice && voice.direction === direction && drift < 0.3 && !ramp) {
      if (desired) {
        version++;
        desired = null;
      }
      return;
    }
    desired = { at: target, direction, quiet, ramp };
    const token = ++version;
    // Decode only the requested neighborhood. A newer seek/stop invalidates this one.
    void track
      .piece(target, direction, context)
      .then((piece) => {
        if (token !== version || !desired || !context || !output) return;
        desired = null;
        clearTimeout(timer);
        retire(voice);
        const gain = context.createGain(),
          started = context.currentTime + 0.02;
        gain.connect(output);
        gain.gain.setValueAtTime(0, started);
        gain.gain.linearRampToValueAtTime(
          quiet ? REVERSE_VOLUME : NORMAL_VOLUME,
          started + Math.max(0.04, ramp),
        );
        voice = {
          at: target,
          direction,
          ramp,
          started,
          distance: 0,
          gain,
          sources: new Set(),
          pumping: false,
        };
        append(voice, piece);
        void pump(voice);
        emit();
      })
      .catch(() => {
        if (token === version) {
          stop();
          status = "error";
          emit();
        }
      });
  }
  return {
    load,
    play,
    stop,
    resume() {
      if (context)
        void context
          .resume()
          .then(emit)
          .catch(() => {
            status = "error";
            emit();
          });
    },
    suspend() {
      stop();
      track.release();
      if (context) void context.suspend();
    },
    toggleMuted() {
      if (volume === 0) {
        volume = lastVolume;
        muted = false;
      } else muted = !muted;
      if (context && output)
        output.gain.setTargetAtTime(
          muted ? 0 : volume,
          context.currentTime,
          0.04,
        );
      emit();
    },
    setVolume(value: number) {
      volume = Math.max(0, Math.min(1, value));
      if (volume > 0) {
        muted = false;
        lastVolume = volume;
      }
      if (context && output)
        output.gain.setTargetAtTime(
          muted ? 0 : volume,
          context.currentTime,
          0.04,
        );
      emit();
    },
    get ready() {
      return status === "ready";
    },
  };
}
