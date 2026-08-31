<script lang="ts">
  import {
    RIYADH_WEATHER_LOCATION,
    buildWeatherUrl,
    describeWeatherCode,
    parseCurrentWeather,
    type CurrentWeather,
  } from '../utils/weather';

  type WeatherState = 'idle' | 'loading' | 'success' | 'error';

  let state: WeatherState = 'idle';
  let weather: CurrentWeather | null = null;
  let errorMessage = '';

  $: condition = weather ? describeWeatherCode(weather.weatherCode) : null;

  function formatObservedAt(value: string) {
    return value.replace('T', ' ');
  }

  async function loadWeather() {
    state = 'loading';
    weather = null;
    errorMessage = '';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(buildWeatherUrl(RIYADH_WEATHER_LOCATION), {
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      weather = parseCurrentWeather(await response.json());
      state = 'success';
    } catch {
      state = 'error';
      errorMessage = '暂时无法获取天气。你可以稍后重试，其他门户功能不受影响。';
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
</script>

<section
  data-weather-panel
  data-weather-state={state}
  aria-labelledby="weather-panel-title"
  class="border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#f59e0b] dark:bg-slate-800 sm:p-8"
>
  <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
    <div class="max-w-2xl">
      <p class="text-xs font-black tracking-[0.16em] text-[#0369a1]">RIYADH · ON DEMAND</p>
      <h1 id="weather-panel-title" class="mt-1 text-3xl font-black text-[#075985] dark:text-[#bae6fd]">利雅得实时天气</h1>
      <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">
        页面不会自动请求天气。点击后才会向 Open-Meteo 发送请求，对方可能看到你的 IP 地址和常规请求信息。
      </p>
      <p class="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        本站只发送固定的利雅得坐标和天气字段，不发送你的位置、邮箱或浏览内容，也不保存天气请求或设备信息。
      </p>
    </div>

    <button
      type="button"
      on:click={loadWeather}
      disabled={state === 'loading'}
      class="min-h-[48px] shrink-0 border-3 border-[#075985] bg-[#fde68a] px-5 py-2 font-black text-[#075985] shadow-[4px_4px_0_0_#075985] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 disabled:cursor-wait disabled:opacity-70"
    >
      {state === 'loading' ? '正在获取…' : state === 'success' ? '刷新天气' : '查看利雅得实时天气'}
    </button>
  </div>

  <div class="mt-6" aria-live="polite" aria-atomic="true">
    {#if state === 'idle'}
      <div class="border-3 border-dashed border-slate-400 bg-slate-50 p-5 dark:bg-slate-900">
        <p class="font-black text-slate-700 dark:text-slate-200">当前尚未向外部天气服务发送请求。</p>
      </div>
    {:else if state === 'loading'}
      <div class="border-3 border-[#0284c7] bg-sky-50 p-5 dark:bg-sky-950/30">
        <p class="font-black text-[#075985] dark:text-[#bae6fd]">正在读取最新观测数据…</p>
      </div>
    {:else if state === 'error'}
      <div role="alert" class="border-3 border-red-600 bg-red-50 p-5 text-red-800 dark:bg-red-950/30 dark:text-red-200">
        <p class="font-black">{errorMessage}</p>
      </div>
    {:else if weather && condition}
      <div class="grid gap-4 lg:grid-cols-[1.3fr_2fr]">
        <div class="border-3 border-[#075985] bg-[#e0f2fe] p-5 dark:bg-sky-950/40">
          <div class="flex items-center gap-4">
            <span class="text-5xl" aria-hidden="true">{condition.icon}</span>
            <div>
              <p class="text-4xl font-black text-[#075985] dark:text-[#bae6fd]">{weather.temperature.toFixed(1)}°C</p>
              <p class="mt-1 font-black text-slate-700 dark:text-slate-200">{condition.label} · {weather.isDay ? '白天' : '夜间'}</p>
            </div>
          </div>
          <p class="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">数据时间：{formatObservedAt(weather.observedAt)}（利雅得时间）</p>
        </div>
        <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="border-3 border-amber-600 bg-amber-50 p-4 dark:bg-amber-950/30">
            <dt class="text-xs font-black text-amber-800 dark:text-amber-200">体感温度</dt>
            <dd class="mt-2 text-xl font-black">{weather.apparentTemperature.toFixed(1)}°C</dd>
          </div>
          <div class="border-3 border-emerald-700 bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <dt class="text-xs font-black text-emerald-800 dark:text-emerald-200">相对湿度</dt>
            <dd class="mt-2 text-xl font-black">{weather.humidity.toFixed(0)}%</dd>
          </div>
          <div class="border-3 border-violet-700 bg-violet-50 p-4 dark:bg-violet-950/30">
            <dt class="text-xs font-black text-violet-800 dark:text-violet-200">10 米风速</dt>
            <dd class="mt-2 text-xl font-black">{weather.windSpeed.toFixed(1)} km/h</dd>
          </div>
          <div class="border-3 border-cyan-700 bg-cyan-50 p-4 dark:bg-cyan-950/30">
            <dt class="text-xs font-black text-cyan-800 dark:text-cyan-200">降水量</dt>
            <dd class="mt-2 text-xl font-black">{weather.precipitation.toFixed(1)} mm</dd>
          </div>
        </dl>
      </div>
    {/if}
  </div>
</section>
