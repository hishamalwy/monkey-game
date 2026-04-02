// Normalize arabic text to ignore variations of Alef, etc.
export const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ى')
    .replace(/[ةه]/g, 'ه')
    .replace(/ئ/g, 'ى')
    .replace(/ؤ/g, 'و')
    .trim();
};
