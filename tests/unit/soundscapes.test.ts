import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampSoundscapeVolume,
  soundscapeNoteAt,
  soundscapePresets,
} from '../../src/utils/soundscapes';

test('soundscape presets are three complete, distinct local compositions', () => {
  assert.equal(soundscapePresets.length, 3);
  assert.equal(new Set(soundscapePresets.map(({ id }) => id)).size, 3);
  assert.equal(new Set(soundscapePresets.map(({ title }) => title)).size, 3);

  for (const preset of soundscapePresets) {
    assert.match(preset.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(preset.description.length >= 16);
    assert.ok(preset.baseFrequencies.length >= 2);
    assert.ok(preset.notes.length >= 4);
    assert.ok([...preset.baseFrequencies, ...preset.notes].every((frequency) => frequency >= 40 && frequency <= 2000));
    assert.ok(preset.stepMs >= 1200);
    assert.ok(preset.releaseMs > preset.attackMs);
  }
});

test('soundscape note selection is deterministic and wraps safely', () => {
  const preset = soundscapePresets[0];
  assert.equal(soundscapeNoteAt(preset, 0), preset.notes[0]);
  assert.equal(soundscapeNoteAt(preset, preset.notes.length), preset.notes[0]);
  assert.equal(soundscapeNoteAt(preset, -1), preset.notes.at(-1));
});

test('soundscape volume stays inside the safe master-gain range', () => {
  assert.equal(clampSoundscapeVolume(-1), 0);
  assert.equal(clampSoundscapeVolume(0.35), 0.35);
  assert.equal(clampSoundscapeVolume(2), 1);
  assert.equal(clampSoundscapeVolume(Number.NaN), 0.3);
});
