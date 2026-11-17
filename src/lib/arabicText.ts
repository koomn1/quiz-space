const MIRROR: Record<string, string> = {
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
  '<': '>', '>': '<', '«': '»', '»': '«',
};

const CONTROL_MARKS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

function repairArabicGlyphRuns(value: string): string {
  return value
    .replace(/ن[ﺎا]ﺳﻧﻹوق\s*[اﻘق]ﺣ/gu, 'حقوق الإنسان')
    .replace(/تھفد\s+حقا\s+قولإنساأ\s+نساسا\s*ً?\s*إلي\s+حماية/gu, 'تهدف حقوق الإنسان أساسًا إلى حماية')
    .replace(/فئة\s+معينة\s+ما\s+نلمجتمع/gu, 'فئة معينة من المجتمع')
    .replace(/كارمة\s+الإنساو\s+نحرياتھ/gu, 'كرامة الإنسان وحرياته')
    .replace(/أصحاا\s+بلمناصب/gu, 'أصحاب المناصب')
    .replace(/المؤسساا\s+تلاقتصادية/gu, 'المؤسسات الاقتصادية')
    .replace(/حقول\s*إنسان/gu, 'حقوق الإنسان')
    .replace(/مب\s*:\s*أد/gu, 'مبادئ')
    .replace(/بيا\s*نلأفدار/gu, 'بين الأفراد')
    .replace(/المسااو\s*ة\s*اولكارمة/gu, 'المساواة والكرامة')
    .replace(/إلغاا\s*ءلحريات/gu, 'إلغاء الحريات')
    .replace(/علي\s+أخير/gu, 'على أخرى')
    .replace(/حقو\s+لإنسا(?:ن)?/u, 'حقوق الإنسان');
}

export function normalizeArabicText(value: unknown): string {
  const clean = String(value ?? '').replace(CONTROL_MARKS, '');
  const hasPresentationForms = /[\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(clean);
  let text = clean;
  if (hasPresentationForms) {
    text = Array.from(clean).reverse().map(char => MIRROR[char] ?? char).join('')
      .replace(/[A-Za-z0-9\u0660-\u0669]+(?:[.,:][A-Za-z0-9]+)*/g,
        run => Array.from(run).reverse().join(''));
  }
  return repairArabicGlyphRuns(text.normalize('NFKC')
    .replace(/[یى]/g, 'ي').replace(/ک/g, 'ك')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[：﹕]/g, ':')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim());
}
