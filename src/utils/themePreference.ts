export type ThemePreference = 'dark' | 'light';

type ThemeStorage = Pick<Storage, 'setItem'>;

export function persistThemePreference(
  theme: ThemePreference,
  storageFactory: () => ThemeStorage = () => window.localStorage,
): boolean {
  try {
    storageFactory().setItem('theme', theme);
    return true;
  } catch {
    return false;
  }
}
