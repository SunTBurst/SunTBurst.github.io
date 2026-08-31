import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTransitionComment,
  canonicalCommentTarget,
  validateCommentBody,
} from '../../src/features/comments/domain';

test('comment targets normalize four local indexed detail routes', () => {
  assert.deepEqual(
    canonicalCommentTarget({ kind: 'post', path: '/posts/hello-world?x=1#top' }),
    { kind: 'post', path: '/posts/hello-world/' },
  );
  assert.deepEqual(
    canonicalCommentTarget({ kind: 'talk', path: '/talk/first-note' }),
    { kind: 'talk', path: '/talk/first-note/' },
  );
  assert.deepEqual(
    canonicalCommentTarget({ kind: 'knowledge', path: '/knowledge/portal-map/' }),
    { kind: 'knowledge', path: '/knowledge/portal-map/' },
  );
  assert.deepEqual(
    canonicalCommentTarget({ kind: 'project', path: '/projects/suntburst-portal/' }),
    { kind: 'project', path: '/projects/suntburst-portal/' },
  );
});

test('comment targets reject external, mismatched, empty, and nested routes', () => {
  for (const input of [
    { kind: 'post', path: '//evil.test/posts/a' },
    { kind: 'post', path: 'https://evil.test/posts/a' },
    { kind: 'post', path: '/talk/a' },
    { kind: 'post', path: '/posts/' },
    { kind: 'post', path: '/posts/a/nested' },
    { kind: 'page', path: '/posts/a' },
  ]) {
    assert.throws(() => canonicalCommentTarget(input), /comment target|local path/i);
  }
});

test('comment body normalizes line endings and rejects unsafe or out-of-range input', () => {
  assert.equal(validateCommentBody('  很好\r\n谢谢  '), '很好\n谢谢');
  assert.equal(validateCommentBody('👍👍'), '👍👍');
  assert.throws(() => validateCommentBody('a'), /2.*2000/);
  assert.throws(() => validateCommentBody('a'.repeat(2001)), /2.*2000/);
  assert.throws(() => validateCommentBody('安全\u0000文本'), /control character/);
});

test('AI can publish or defer but never reject or delete', () => {
  assert.equal(canTransitionComment('ai_reviewing', 'published'), true);
  assert.equal(canTransitionComment('ai_reviewing', 'manual_review'), true);
  assert.equal(canTransitionComment('ai_reviewing', 'rejected'), false);
  assert.equal(canTransitionComment('ai_reviewing', 'deleted'), false);
});

test('owners and moderators have only the declared durable state transitions', () => {
  assert.equal(canTransitionComment('pending', 'ai_reviewing'), true);
  assert.equal(canTransitionComment('pending', 'manual_review'), true);
  assert.equal(canTransitionComment('pending', 'deleted'), true);
  assert.equal(canTransitionComment('manual_review', 'published'), true);
  assert.equal(canTransitionComment('manual_review', 'rejected'), true);
  assert.equal(canTransitionComment('manual_review', 'deleted'), true);
  assert.equal(canTransitionComment('published', 'deleted'), true);
  assert.equal(canTransitionComment('deleted', 'published'), false);
});
