export interface SearchKeyboardInput {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
}

export type SearchKeyboardDecision = {
  action: 'none' | 'focus' | 'navigate';
  index: number;
};

export function decideUnifiedSearchKey(
  keyboard: SearchKeyboardInput,
  activeIndex: number,
  resultCount: number,
): SearchKeyboardDecision {
  const currentIndex = resultCount > 0 && activeIndex >= 0
    ? Math.min(activeIndex, resultCount - 1)
    : -1;

  if (keyboard.isComposing || keyboard.keyCode === 229 || resultCount === 0) {
    return { action: 'none', index: currentIndex };
  }

  if (keyboard.key === 'ArrowDown') {
    return { action: 'focus', index: currentIndex < 0 ? 0 : (currentIndex + 1) % resultCount };
  }
  if (keyboard.key === 'ArrowUp') {
    return { action: 'focus', index: currentIndex < 0 ? resultCount - 1 : (currentIndex - 1 + resultCount) % resultCount };
  }
  if (keyboard.key === 'Enter') {
    return { action: 'navigate', index: currentIndex < 0 ? 0 : currentIndex };
  }
  return { action: 'none', index: currentIndex };
}
