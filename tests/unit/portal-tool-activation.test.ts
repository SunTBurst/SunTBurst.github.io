import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activatePortalTool,
  shouldLayoutConsumePortalSearch,
  tryFocusPortalSearch,
} from '../../src/utils/portalToolActivation';

function click(overrides: Partial<{
  button: number;
  defaultPrevented: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}> = {}) {
  let prevented = false;
  return {
    event: {
      button: 0,
      defaultPrevented: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      preventDefault: () => { prevented = true; },
      ...overrides,
    },
    wasPrevented: () => prevented,
  };
}

test('portal tool enhancement prevents a plain primary activation only when a consumer cancels its event', () => {
  const handled = click();
  let dispatchedEvent: Event | undefined;

  assert.equal(activatePortalTool(handled.event, 'portal:open-search', (event) => {
    dispatchedEvent = event;
    event.preventDefault();
    return !event.defaultPrevented;
  }), true);

  assert.equal(dispatchedEvent?.type, 'portal:open-search');
  assert.equal(dispatchedEvent?.cancelable, true);
  assert.equal(handled.wasPrevented(), true);

  const unhandled = click();
  assert.equal(activatePortalTool(unhandled.event, 'portal:open-search', () => true), false);
  assert.equal(unhandled.wasPrevented(), false);
});

test('portal tool enhancement leaves modified, non-primary, and already-cancelled activations to the native anchor', () => {
  const cases = [
    click({ ctrlKey: true }),
    click({ metaKey: true }),
    click({ shiftKey: true }),
    click({ altKey: true }),
    click({ button: 1 }),
    click({ defaultPrevented: true }),
  ];

  for (const activation of cases) {
    let dispatches = 0;
    assert.equal(activatePortalTool(activation.event, 'portal:random-explore', () => {
      dispatches += 1;
      return false;
    }), false);
    assert.equal(dispatches, 0);
    assert.equal(activation.wasPrevented(), false);
  }
});

test('layout consumes search only when it can perform a route transition', () => {
  assert.equal(shouldLayoutConsumePortalSearch('/posts'), true);
  assert.equal(shouldLayoutConsumePortalSearch('/search'), false);
  assert.equal(shouldLayoutConsumePortalSearch('/search/'), false);
});

test('search focus consumes the event only after the input really owns focus', () => {
  assert.equal(tryFocusPortalSearch(null, () => null), false);

  const unfocused = { focus() {} };
  assert.equal(tryFocusPortalSearch(unfocused, () => null), false);

  const throwing = { focus() { throw new Error('focus unavailable'); } };
  assert.equal(tryFocusPortalSearch(throwing, () => throwing), false);

  const focused = { focus() {} };
  assert.equal(tryFocusPortalSearch(focused, () => focused), true);
});
