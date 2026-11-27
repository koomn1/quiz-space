const AR_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];

/** Label for the nth answer option: Arabic abjad order (أ ب ج د) or Latin A B C D. */
export function optionLabel(index: number, isAr: boolean): string {
  if (isAr) return AR_LETTERS[index] ?? String(index + 1);
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}
