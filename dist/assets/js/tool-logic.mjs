/** Pure browser-compatible logic shared by the exhibition demos. */
export function cleanList(source, options = {}) {
  if (typeof source !== 'string') throw new TypeError('清單必須是文字。');
  const { trim = true, removeEmpty = true, deduplicate = true } = options;
  const input = source === '' ? [] : source.split(/\r\n|\n|\r/);
  const lines = [];
  const seen = new Set();
  let emptyRemoved = 0;
  let duplicatesRemoved = 0;
  for (const original of input) {
    const line = trim ? original.trim() : original;
    if (removeEmpty && line.trim() === '') {
      emptyRemoved += 1;
      continue;
    }
    if (deduplicate && seen.has(line)) {
      duplicatesRemoved += 1;
      continue;
    }
    lines.push(line);
    seen.add(line);
  }
  return {
    text: lines.join('\n'),
    lines,
    stats: { input: input.length, output: lines.length, emptyRemoved, duplicatesRemoved },
  };
}

export const LABEL_FIELDS = Object.freeze([
  { key: 'title', label: '作品名稱', required: true, max: 40 },
  { key: 'format', label: '作品形式', required: true, max: 30 },
  { key: 'description', label: '作品介紹', required: true, max: 160 },
  { key: 'credit', label: '署名', required: false, max: 40 },
]);

export function prepareLabel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('請提供說明牌欄位。');
  }
  const values = {};
  const errors = {};
  for (const field of LABEL_FIELDS) {
    const raw = input[field.key];
    if (raw !== undefined && raw !== null && typeof raw !== 'string') {
      values[field.key] = '';
      errors[field.key] = `${field.label}必須是文字。`;
      continue;
    }
    const value = (raw ?? '').trim();
    values[field.key] = value;
    if (field.required && value === '') {
      errors[field.key] = `請填寫${field.label}。`;
    } else if (Array.from(value).length > field.max) {
      errors[field.key] = `${field.label}請控制在 ${field.max} 字以內；原文已保留。`;
    }
  }
  // The future UI must render values with textContent, not innerHTML.
  return { valid: Object.keys(errors).length === 0, values, errors };
}
