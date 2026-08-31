import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RIYADH_WEATHER_LOCATION,
  buildWeatherUrl,
  describeWeatherCode,
  parseCurrentWeather,
} from '../../src/utils/weather';

test('weather request is limited to the approved Open-Meteo current-weather endpoint', () => {
  const url = new URL(buildWeatherUrl(RIYADH_WEATHER_LOCATION));

  assert.equal(url.origin, 'https://api.open-meteo.com');
  assert.equal(url.pathname, '/v1/forecast');
  assert.equal(url.searchParams.get('latitude'), '24.7136');
  assert.equal(url.searchParams.get('longitude'), '46.6753');
  assert.equal(url.searchParams.get('timezone'), 'Asia/Riyadh');
  assert.deepEqual(url.searchParams.get('current')?.split(','), [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'is_day',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
  ]);
  assert.equal(url.searchParams.get('forecast_days'), '1');
  assert.equal(url.searchParams.get('temperature_unit'), 'celsius');
  assert.equal(url.searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(url.searchParams.get('precipitation_unit'), 'mm');
});

test('weather codes are translated locally and unknown codes stay honest', () => {
  assert.deepEqual(describeWeatherCode(0), { label: '晴朗', icon: '☀️' });
  assert.deepEqual(describeWeatherCode(45), { label: '有雾', icon: '🌫️' });
  assert.deepEqual(describeWeatherCode(95), { label: '雷暴', icon: '⛈️' });
  assert.deepEqual(describeWeatherCode(999), { label: '天气状况待确认', icon: '🌡️' });
});

test('valid current-weather payload is normalized into a small display model', () => {
  const weather = parseCurrentWeather({
    current: {
      time: '2026-08-31T15:00',
      temperature_2m: 39.2,
      relative_humidity_2m: 18,
      apparent_temperature: 38.6,
      is_day: 1,
      precipitation: 0,
      weather_code: 0,
      wind_speed_10m: 14.4,
    },
  });

  assert.deepEqual(weather, {
    observedAt: '2026-08-31T15:00',
    temperature: 39.2,
    humidity: 18,
    apparentTemperature: 38.6,
    isDay: true,
    precipitation: 0,
    weatherCode: 0,
    windSpeed: 14.4,
  });
});

test('malformed or non-finite weather payload is rejected before rendering', () => {
  assert.throws(() => parseCurrentWeather({}), /天气数据不完整/);
  assert.throws(
    () => parseCurrentWeather({
      current: {
        time: '2026-08-31T15:00',
        temperature_2m: Number.NaN,
        relative_humidity_2m: 18,
        apparent_temperature: 38.6,
        is_day: 1,
        precipitation: 0,
        weather_code: 0,
        wind_speed_10m: 14.4,
      },
    }),
    /天气数据不完整/,
  );
});
