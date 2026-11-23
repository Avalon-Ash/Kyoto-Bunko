import test from 'node:test';
import assert from 'node:assert/strict';
import { makieIcon, typeMotifs, type MakieMotif } from './makie-icons';
import { TYPE_KEYS } from '../data/types';

const ALL_MOTIFS: readonly MakieMotif[] = [
  'all', 'temple', 'transport', 'shop', 'modern', 'nature', 'food', 'acg', 'map', 'search', 'reset',
];

test('renders a distinct, decorative 32x32 local SVG for every registered motif', () => {
  const rendered = new Set<string>();
  for (const motif of ALL_MOTIFS) {
    const svg = makieIcon(motif);
    assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), `expected <svg> wrapper for ${motif}`);
    assert.ok(svg.includes('viewBox="0 0 32 32"'), `expected 32x32 viewBox for ${motif}`);
    assert.ok(svg.includes('aria-hidden="true"') && svg.includes('focusable="false"'), `expected decorative attributes for ${motif}`);
    assert.match(svg, /<(path|circle|rect)\b/);
    assert.ok(!svg.includes('undefined') && !svg.includes('null'));
    assert.doesNotMatch(svg, /<script|https?:\/\/|\bon\w+=/i);
    rendered.add(svg);
  }
  assert.equal(rendered.size, ALL_MOTIFS.length);
});

test('maps every concrete spot type in TYPE_KEYS to a distinct motif while leaving T_ALL to caller fallback', () => {
  assert.equal(Object.hasOwn(typeMotifs, 'T_ALL'), false);

  const concreteTypes = TYPE_KEYS.filter(id => id !== 'T_ALL');
  const mappedMotifs = new Set<MakieMotif>();
  const allIcon = makieIcon('all');

  for (const typeId of concreteTypes) {
    assert.equal(Object.hasOwn(typeMotifs, typeId), true, `missing motif mapping for ${typeId}`);
    const motif = typeMotifs[typeId];
    const svg = makieIcon(motif);
    assert.notEqual(svg, allIcon);
    mappedMotifs.add(motif);
  }

  // Each concrete spot type gets its own visual motif rather than colliding.
  assert.equal(mappedMotifs.size, concreteTypes.length);
});
