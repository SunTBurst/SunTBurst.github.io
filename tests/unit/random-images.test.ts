import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCuratedImages, selectRandomImage } from '../../src/utils/randomImages';

const fixtures = [
  {
    id: 'desert-path',
    src: '/images/random/desert-path.jpg',
    width: 1200,
    height: 800,
    alt: '沙漠中通向远方城市的小路',
    license: '本站自有使用权（AI 生成素材）',
    credit: 'SunTBurst × OpenAI 图像生成',
    sourceUrl: '/changelog#2026-08-31-random-images-live',
  },
  {
    id: 'knowledge-map',
    src: '/images/random/knowledge-map.jpg',
    width: 1200,
    height: 800,
    alt: '书架、道路与星空构成的知识地图',
    license: '本站自有使用权（AI 生成素材）',
    credit: 'SunTBurst × OpenAI 图像生成',
    sourceUrl: '/changelog#2026-08-31-random-images-live',
  },
];

test('curated image manifest accepts only complete local licensed assets', () => {
  assert.deepEqual(parseCuratedImages(fixtures), fixtures);
  assert.throws(() => parseCuratedImages([{ ...fixtures[0], src: 'https://images.example/a.jpg' }]), /本地图片/);
  assert.throws(() => parseCuratedImages([{ ...fixtures[0], license: '' }]), /授权信息/);
  assert.throws(() => parseCuratedImages([{ ...fixtures[0], width: 0 }]), /尺寸/);
  assert.throws(() => parseCuratedImages([{ ...fixtures[0], alt: '' }]), /替代文本/);
});

test('random image selection avoids the current image when alternatives exist', () => {
  const images = parseCuratedImages(fixtures);

  assert.equal(selectRandomImage(images, 'desert-path', 0).id, 'knowledge-map');
  assert.equal(selectRandomImage(images, 'knowledge-map', 0.999).id, 'desert-path');
  assert.equal(selectRandomImage([images[0]], 'desert-path', 0.5).id, 'desert-path');
});

test('random image selection clamps invalid random values and rejects an empty pool', () => {
  const images = parseCuratedImages(fixtures);

  assert.equal(selectRandomImage(images, undefined, -10).id, 'desert-path');
  assert.equal(selectRandomImage(images, undefined, 10).id, 'knowledge-map');
  assert.throws(() => selectRandomImage([], undefined, 0.5), /没有可用的精选图片/);
});
