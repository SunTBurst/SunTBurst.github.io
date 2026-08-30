type PortalToolClick = Pick<
  MouseEvent,
  'altKey' | 'button' | 'ctrlKey' | 'defaultPrevented' | 'metaKey' | 'preventDefault' | 'shiftKey'
>;

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
