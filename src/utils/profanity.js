const PROFANITY_RAW = [
  'كس امك', 'كس أمك', 'كسومك', 'كسمك', 'كسم', 'كوس', 'كسس',
  'نيك', 'نك', 'ينك', 'منيوك', 'منيك', 'نياك',
  'زب', 'زبر', 'زبيري', 'زبي', 'زبك',
  'شرموطة', 'شراميط', 'شرومطه', 'شرموط',
  'عاهرة', 'عاهرات', 'عاهره',
  'قحبة', 'قحبه', 'قحاب',
  'طز', 'طزز',
  'خرا', 'خرة', 'خره', 'خراي', 'خراوي',
  'كلب', 'كلاب', 'كلبه', 'كلبة',
  'حمار', 'حمير', 'حماره', 'حمارة',
  'حيوان', 'حيوانات',
  'انيكك', 'فشخ', 'فشخك', 'طيز', 'طيزك', 'طيزي',
  'سكس', 'sex',
  'عرص', 'عرصه', 'عرصة',
  'متناك', 'متناكة', 'متناكه',
  'لوطي', 'لوطيه', 'لوطية',
  'خول', 'خولات', 'خوله',
  'ابن شرموطة', 'يا ابن', 'يلعن', 'يلعنك', 'يلعن ابوك',
  'ابوك', 'ابوكم', 'امك', 'أمك', 'اختك', 'أختك',
  'سفلة', 'سفله', 'سافل',
  'حقير', 'حقيرة', 'حقيره',
  'وسخ', 'وسخة', 'وسخه',
  'عاهر', 'فاجر', 'فاجرة', 'فاجره',
  'crap', 'shit', 'fuck', 'damn', 'ass', 'bitch', 'bastard', 'dick', 'pussy', 'whore',
];

import { normalizeArabic } from './textUtils';

const PROFANITY_NORMALIZED = PROFANITY_RAW.map(w => normalizeArabic(w.toLowerCase()));

export function containsProfanity(text) {
  if (!text) return false;
  const normalized = normalizeArabic(text.toLowerCase());
  return PROFANITY_NORMALIZED.some(word => normalized.includes(word));
}

export function censorText(text) {
  if (!text) return text;
  let result = text;
  for (const word of PROFANITY_RAW) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, word[0] + '*'.repeat(word.length - 1));
  }
  return result;
}
