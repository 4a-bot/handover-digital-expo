import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanList, prepareLabel } from '../dist/assets/js/tool-logic.mjs';

test('混合換行、空白、重複項目：保留第一次出現及原順序', () => {
  const result = cleanList(' 延長線 \r\nHDMI 線\r延長線\n\n筆電');
  assert.equal(result.text, '延長線\nHDMI 線\n筆電');
  assert.deepEqual(result.stats, { input: 5, output: 3, emptyRemoved: 1, duplicatesRemoved: 1 });
});

test('不以大小寫、全半形或內部空白模糊合併項目', () => {
  const result = cleanList('A\na\nＡ\nHDMI 線\nHDMI線\nA');
  assert.deepEqual(result.lines, ['A', 'a', 'Ａ', 'HDMI 線', 'HDMI線']);
});

test('關閉去重時保留重複項目，空輸入計數為零', () => {
  assert.deepEqual(cleanList('筆電\n筆電', { deduplicate: false }).lines, ['筆電', '筆電']);
  assert.deepEqual(cleanList('').stats, { input: 0, output: 0, emptyRemoved: 0, duplicatesRemoved: 0 });
});

test('空白輸入移除後沒有假資料，關閉清理時保留原文', () => {
  assert.equal(cleanList(' \n　\n\t').text, '');
  assert.equal(cleanList(' A \n\n A ', { trim: false, removeEmpty: false, deduplicate: false }).text, ' A \n\n A ');
});

test('說明牌逐一指出必填缺漏，不自動補造署名', () => {
  const result = prepareLabel({ title: ' ', format: '', description: '' });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors), ['title', 'format', 'description']);
  assert.equal(result.values.credit, '');
});

test('過長說明保留全文並回報錯誤', () => {
  const description = '展'.repeat(161);
  const result = prepareLabel({ title: '清單整理器', format: '網頁工具', description });
  assert.equal(result.valid, false);
  assert.equal(result.values.description, description);
  assert.ok(result.errors.description);
});

test('合法的中英文與特殊符號以原始文字保留，方便介面安全顯示', () => {
  const result = prepareLabel({ title: 'A < B & C', format: '網頁工具', description: '將 <tag> 當成文字閱讀。', credit: ' AI 協作示範 ' });
  assert.equal(result.valid, true);
  assert.equal(result.values.title, 'A < B & C');
  assert.equal(result.values.credit, 'AI 協作示範');
});

test('不把錯誤資料型別悄悄轉成說明牌文字', () => {
  const result = prepareLabel({ title: 42, format: '網頁', description: '示範' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.title);
});
