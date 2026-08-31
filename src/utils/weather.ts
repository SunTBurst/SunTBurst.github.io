export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CurrentWeather {
  observedAt: string;
  temperature: number;
  humidity: number;
  apparentTemperature: number;
  isDay: boolean;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
}

export const RIYADH_WEATHER_LOCATION: WeatherLocation = {
  name: '利雅得',
  latitude: 24.7136,
  longitude: 46.6753,
  timezone: 'Asia/Riyadh',
};

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
] as const;

export function buildWeatherUrl(location: WeatherLocation): string {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_FIELDS.join(','),
    timezone: location.timezone,
    forecast_days: '1',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  }).toString();
  return url.toString();
}

export function describeWeatherCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: '晴朗', icon: '☀️' };
  if ([1, 2].includes(code)) return { label: '晴间多云', icon: '🌤️' };
  if (code === 3) return { label: '阴天', icon: '☁️' };
  if ([45, 48].includes(code)) return { label: '有雾', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: '毛毛雨', icon: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: '有雨', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '有雪', icon: '🌨️' };
  if ([95, 96, 99].includes(code)) return { label: '雷暴', icon: '⛈️' };
  return { label: '天气状况待确认', icon: '🌡️' };
}

const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function parseCurrentWeather(payload: unknown): CurrentWeather {
  const current = payload && typeof payload === 'object' && 'current' in payload
    ? (payload as { current?: unknown }).current
    : null;
  if (!current || typeof current !== 'object') throw new Error('天气数据不完整');

  const value = current as Record<string, unknown>;
  const numbers = [
    value.temperature_2m,
    value.relative_humidity_2m,
    value.apparent_temperature,
    value.is_day,
    value.precipitation,
    value.weather_code,
    value.wind_speed_10m,
  ];
  if (typeof value.time !== 'string' || value.time.length === 0 || !numbers.every(finiteNumber)) {
    throw new Error('天气数据不完整');
  }

  return {
    observedAt: value.time,
    temperature: value.temperature_2m as number,
    humidity: value.relative_humidity_2m as number,
    apparentTemperature: value.apparent_temperature as number,
    isDay: value.is_day === 1,
    precipitation: value.precipitation as number,
    weatherCode: value.weather_code as number,
    windSpeed: value.wind_speed_10m as number,
  };
}
