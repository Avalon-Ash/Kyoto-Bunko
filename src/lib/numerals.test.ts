import test from 'node:test';
import assert from 'node:assert/strict';
import { toChineseNumerals } from './numerals';

test('converts zero and single-digit integers', () => {
  assert.equal(toChineseNumerals(0), '零');
  assert.equal(toChineseNumerals(1), '一');
  assert.equal(toChineseNumerals(5), '五');
  assert.equal(toChineseNumerals(9), '九');
});

test('formats 10 to 19 without a leading 一 and 20 to 99 with tens digits', () => {
  assert.equal(toChineseNumerals(10), '十');
  assert.equal(toChineseNumerals(11), '十一');
  assert.equal(toChineseNumerals(19), '十九');
  assert.equal(toChineseNumerals(20), '二十');
  assert.equal(toChineseNumerals(21), '二十一');
  assert.equal(toChineseNumerals(99), '九十九');
});

test('places hundred and thousand units and collapses consecutive interior zeros without trailing zeros', () => {
  assert.equal(toChineseNumerals(100), '一百');
  assert.equal(toChineseNumerals(101), '一百零一');
  assert.equal(toChineseNumerals(110), '一百一十');
  assert.equal(toChineseNumerals(215), '二百一十五');
  assert.equal(toChineseNumerals(1000), '一千');
  // 1001 has two consecutive zero digits (hundreds and tens); they collapse to a single 零.
  assert.equal(toChineseNumerals(1001), '一千零一');
  assert.equal(toChineseNumerals(1010), '一千零一十');
  assert.equal(toChineseNumerals(1200), '一千二百');
  assert.equal(toChineseNumerals(1234), '一千二百三十四');
  assert.equal(toChineseNumerals(9999), '九千九百九十九');
});

test('produces unique, well-formed numerals across the entire 0..9999 integer range', () => {
  const seen = new Set<string>();
  for (let n = 0; n <= 9999; n++) {
    const out = toChineseNumerals(n);
    assert.match(out, /^[零一二三四五六七八九十百千]+$/);
    assert.ok(!out.includes('零零'), `double zero for ${n}: ${out}`);
    if (n > 0) assert.ok(!out.endsWith('零'), `trailing zero for ${n}: ${out}`);
    seen.add(out);
  }
  // Every integer in 0..9999 must map to a distinct Chinese numeral string.
  assert.equal(seen.size, 10000);
});
