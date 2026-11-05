export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: any }
  | ClassValue[];

function toVal(mix: ClassValue): string {
  let str = '';
  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix;
  } else if (typeof mix === 'object' && mix !== null) {
    if (Array.isArray(mix)) {
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          const y = toVal(mix[k]);
          if (y) {
            str && (str += ' ');
            str += y;
          }
        }
      }
    } else {
      for (const k in mix) {
        if (mix[k]) {
          str && (str += ' ');
          str += k;
        }
      }
    }
  }
  return str;
}

/**
 * Conditional className joiner without external dependencies.
 *
 * @example cn('ios27-btn', `ios27-btn--${variant}`, disabled && 'is-disabled', className)
 */
export function cn(...inputs: ClassValue[]): string {
  let i = 0;
  let tmp: ClassValue;
  let str = '';
  while (i < inputs.length) {
    if ((tmp = inputs[i++])) {
      const x = toVal(tmp);
      if (x) {
        str && (str += ' ');
        str += x;
      }
    }
  }
  return str;
}
