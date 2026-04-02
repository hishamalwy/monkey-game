// Normalize arabic text to ignore variations of Alef, etc.
export const normalizeArabic = (text) => {
  if (!text) return '';
  return text.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى');
};
