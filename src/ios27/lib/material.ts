/**
 * Liquid Glass / material className helpers.
 *
 * The class names resolve against the foundation CSS (materials.css):
 *   material:  `.material-{chrome|thick|regular|thin|ultrathin}`
 *   glass:     `.liquid-glass-{large|medium|small|primary|clear}`
 */

export type Material = 'chrome' | 'thick' | 'regular' | 'thin' | 'ultrathin'
export type Glass = 'large' | 'medium' | 'small' | 'primary' | 'clear'

/** Background frosted-glass blur material, e.g. `material('thick')` → `material-thick`. */
export function material(name: Material): string {
  return `material-${name}`
}

/** Liquid Glass surface, e.g. `glass('large')` → `liquid-glass-large`. */
export function glass(name: Glass): string {
  return `liquid-glass-${name}`
}
