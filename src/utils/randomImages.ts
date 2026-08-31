export interface CuratedImage {
  id: string;
  src: `/images/random/${string}`;
  width: number;
  height: number;
  alt: string;
  license: string;
  credit: string;
  sourceUrl: `/${string}`;
}

const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function parseCuratedImages(input: unknown): CuratedImage[] {
  if (!Array.isArray(input)) throw new Error('精选图片清单格式无效');

  const images = input.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`第 ${index + 1} 张精选图片格式无效`);
    const value = item as Record<string, unknown>;
    if (!nonEmptyString(value.id)) throw new Error(`第 ${index + 1} 张精选图片缺少标识`);
    if (!nonEmptyString(value.src) || !/^\/images\/random\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/i.test(value.src)) {
      throw new Error(`第 ${index + 1} 张必须使用本地图片`);
    }
    if (!Number.isInteger(value.width) || !Number.isInteger(value.height) || (value.width as number) <= 0 || (value.height as number) <= 0) {
      throw new Error(`第 ${index + 1} 张精选图片尺寸无效`);
    }
    if (!nonEmptyString(value.alt)) throw new Error(`第 ${index + 1} 张精选图片缺少替代文本`);
    if (!nonEmptyString(value.license)) throw new Error(`第 ${index + 1} 张精选图片缺少授权信息`);
    if (!nonEmptyString(value.credit)) throw new Error(`第 ${index + 1} 张精选图片缺少来源署名`);
    if (!nonEmptyString(value.sourceUrl) || !/^\/(?!\/)/.test(value.sourceUrl)) {
      throw new Error(`第 ${index + 1} 张精选图片来源链接无效`);
    }

    return {
      id: value.id,
      src: value.src,
      width: value.width,
      height: value.height,
      alt: value.alt,
      license: value.license,
      credit: value.credit,
      sourceUrl: value.sourceUrl,
    } as CuratedImage;
  });

  if (new Set(images.map(({ id }) => id)).size !== images.length) throw new Error('精选图片标识不能重复');
  if (new Set(images.map(({ src }) => src)).size !== images.length) throw new Error('精选图片路径不能重复');
  return images;
}

export function selectRandomImage(images: CuratedImage[], currentId: string | undefined, randomValue: number): CuratedImage {
  if (images.length === 0) throw new Error('没有可用的精选图片');
  const candidates = images.length > 1 && currentId ? images.filter(({ id }) => id !== currentId) : images;
  const normalized = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999999) : 0;
  return candidates[Math.floor(normalized * candidates.length)] ?? candidates[0];
}
