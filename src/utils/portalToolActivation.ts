type PortalToolClick = Pick<
  MouseEvent,
  'altKey' | 'button' | 'ctrlKey' | 'defaultPrevented' | 'metaKey' | 'preventDefault' | 'shiftKey'
>;

type FocusTarget = { focus: () => void };

export function shouldLayoutConsumePortalSearch(pathname: string): boolean {
  return pathname !== '/search' && pathname !== '/search/';
}

export function tryFocusPortalSearch(
  input: FocusTarget | null | undefined,
  readActiveElement: () => unknown,
): boolean {
  if (!input) return false;
  try {
    input.focus();
    return readActiveElement() === input;
  } catch {
    return false;
  }
}

export function activatePortalTool(
  click: PortalToolClick,
  eventName: 'portal:open-search' | 'portal:random-explore',
  dispatch: (event: Event) => boolean,
): boolean {
  if (
    click.defaultPrevented
    || click.button !== 0
    || click.altKey
    || click.ctrlKey
    || click.metaKey
    || click.shiftKey
  ) {
    return false;
  }

  const handled = dispatch(new CustomEvent(eventName, { cancelable: true })) === false;
  if (handled) click.preventDefault();
  return handled;
}
