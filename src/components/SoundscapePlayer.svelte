<script lang="ts">
  import { onMount } from 'svelte';
  import {
    clampSoundscapeVolume,
    soundscapeNoteAt,
    soundscapePresets,
    type SoundscapePreset,
  } from '../utils/soundscapes';

  type PlayerState = 'idle' | 'starting' | 'playing' | 'error';
  type AudioContextConstructor = typeof AudioContext;

  let selectedId: SoundscapePreset['id'] = soundscapePresets[0].id;
  let state: PlayerState = 'idle';
  let volume = 0.3;
  let errorMessage = '';
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let drones: OscillatorNode[] = [];
  let pulseTimer: number | null = null;
  let pulseStep = 0;

  $: selectedPreset = soundscapePresets.find(({ id }) => id === selectedId) ?? soundscapePresets[0];
  $: statusMessage = state === 'playing'
    ? `正在播放“${selectedPreset.title}”。声音仅在这个页面本地生成。`
    : state === 'starting'
      ? '正在启动本地声音引擎…'
      : state === 'error'
        ? errorMessage
        : `已选择“${selectedPreset.title}”，尚未播放。`;

  function outputLevel(value = volume) {
    return clampSoundscapeVolume(value) * 0.28;
  }

  function stopSoundscape(nextState: PlayerState = 'idle') {
    if (pulseTimer !== null) window.clearInterval(pulseTimer);
    pulseTimer = null;
    for (const drone of drones) {
      try { drone.stop(); } catch { /* It may already be stopped. */ }
    }
    drones = [];
    masterGain = null;

    const closingContext = context;
    context = null;
    if (closingContext && closingContext.state !== 'closed') void closingContext.close();
    state = nextState;
  }

  function schedulePulse(preset: SoundscapePreset) {
    if (!context || !masterGain) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = preset.waveform;
    oscillator.frequency.setValueAtTime(soundscapeNoteAt(preset, pulseStep), now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.075, now + preset.attackMs / 1000);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + preset.releaseMs / 1000);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + preset.releaseMs / 1000 + 0.1);
    pulseStep += 1;
  }

  async function startSoundscape() {
    if (state === 'starting' || state === 'playing') return;
    state = 'starting';
    errorMessage = '';

    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!AudioContextClass) {
      errorMessage = '当前浏览器不支持本地声音合成。你仍可以继续浏览其他内容。';
      state = 'error';
      return;
    }

    try {
      context = new AudioContextClass();
      if (context.state === 'suspended') await context.resume();
      masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.0001, context.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, outputLevel()), context.currentTime + 0.8);
      masterGain.connect(context.destination);

      drones = selectedPreset.baseFrequencies.map((frequency, index) => {
        const oscillator = context!.createOscillator();
        const level = context!.createGain();
        oscillator.type = index % 2 === 0 ? selectedPreset.waveform : 'sine';
        oscillator.frequency.setValueAtTime(frequency, context!.currentTime);
        oscillator.detune.setValueAtTime(index === 0 ? -4 : 4, context!.currentTime);
        level.gain.setValueAtTime(index === 0 ? 0.12 : 0.075, context!.currentTime);
        oscillator.connect(level);
        level.connect(masterGain!);
        oscillator.start();
        return oscillator;
      });

      pulseStep = 0;
      schedulePulse(selectedPreset);
      pulseTimer = window.setInterval(() => schedulePulse(selectedPreset), selectedPreset.stepMs);
      state = 'playing';
    } catch {
      stopSoundscape('error');
      errorMessage = '声音引擎未能启动。你可以检查浏览器是否允许播放声音后再试。';
    }
  }

  function selectPreset(id: SoundscapePreset['id']) {
    if (selectedId === id) return;
    if (state === 'playing' || state === 'starting') stopSoundscape();
    selectedId = id;
    errorMessage = '';
    state = 'idle';
  }

  function changeVolume(event: Event) {
    volume = clampSoundscapeVolume(Number((event.currentTarget as HTMLInputElement).value));
    if (context && masterGain) {
      masterGain.gain.setTargetAtTime(Math.max(0.0001, outputLevel()), context.currentTime, 0.08);
    }
  }

  onMount(() => {
    const cleanup = () => stopSoundscape();
    window.addEventListener('pagehide', cleanup);
    return () => {
      window.removeEventListener('pagehide', cleanup);
      cleanup();
    };
  });
</script>

<section
  data-soundscape-player
  data-soundscape-state={state}
  aria-labelledby="soundscape-title"
  class="border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#f59e0b] dark:bg-slate-800 sm:p-8"
>
  <div class="max-w-3xl">
    <p class="text-xs font-black tracking-[0.16em] text-[#0369a1]">LOCAL · ORIGINAL · ON DEMAND</p>
    <h1 id="soundscape-title" class="mt-1 text-3xl font-black text-[#075985] dark:text-[#bae6fd]">声音空间</h1>
    <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">
      选择一个原创声音场景，留在本站慢慢阅读。所有声音都由浏览器本地合成，不加载音频文件，也不会自动播放。
    </p>
  </div>

  <fieldset class="mt-6">
    <legend class="text-sm font-black text-slate-800 dark:text-slate-100">选择声音场景</legend>
    <div class="mt-3 grid gap-3 md:grid-cols-3">
      {#each soundscapePresets as preset}
        <button
          type="button"
          data-soundscape-preset={preset.id}
          aria-pressed={selectedId === preset.id}
          on:click={() => selectPreset(preset.id)}
          class:border-[#075985]={selectedId === preset.id}
          class:bg-[#e0f2fe]={selectedId === preset.id}
          class:shadow-[4px_4px_0_0_#075985]={selectedId === preset.id}
          class="min-h-[132px] border-3 border-slate-400 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-900"
        >
          <span class="text-xs font-black tracking-wide text-[#0369a1] dark:text-[#7dd3fc]">{preset.eyebrow}</span>
          <strong class="mt-1 block text-xl font-black text-slate-900 dark:text-white">{preset.title}</strong>
          <span class="mt-2 block text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{preset.description}</span>
        </button>
      {/each}
    </div>
  </fieldset>

  <div class="mt-6 grid gap-4 border-3 border-[#075985] bg-sky-50 p-4 dark:bg-sky-950/30 sm:grid-cols-[auto_auto_1fr] sm:items-end">
    <button
      type="button"
      on:click={startSoundscape}
      disabled={state === 'starting' || state === 'playing'}
      class="min-h-[48px] border-3 border-[#075985] bg-[#fde68a] px-5 py-2 font-black text-[#075985] shadow-[4px_4px_0_0_#075985] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {state === 'starting' ? '正在启动…' : state === 'playing' ? '正在播放' : '开始播放'}
    </button>
    <button
      type="button"
      on:click={() => stopSoundscape()}
      disabled={state !== 'playing' && state !== 'starting'}
      class="min-h-[48px] border-3 border-slate-700 bg-white px-5 py-2 font-black text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100"
    >
      停止播放
    </button>
    <div class="min-w-0">
      <label for="soundscape-volume" class="flex min-h-[44px] items-center justify-between gap-3 text-sm font-black text-slate-800 dark:text-slate-100">
        <span>音量</span><span aria-hidden="true">{Math.round(volume * 100)}%</span>
      </label>
      <input
        id="soundscape-volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        on:input={changeVolume}
        aria-describedby="soundscape-volume-help"
        class="h-11 w-full cursor-pointer accent-[#075985]"
      />
      <p id="soundscape-volume-help" class="sr-only">调节当前页面本地合成声音的音量</p>
    </div>
  </div>

  <p class="mt-4 min-h-[48px] border-2 border-dashed border-slate-400 bg-slate-50 p-3 text-sm font-black leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-live="polite" aria-atomic="true">
    {statusMessage}
  </p>
</section>
