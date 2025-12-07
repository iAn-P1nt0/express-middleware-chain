/**
 * Parse duration strings to milliseconds
 *
 * Supports: '5s', '10m', '1h', '7d'
 */

const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

export function parseDuration(input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }

  const match = input.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: "${input}". Expected format: number followed by s/m/h/d (e.g., "5m", "1h")`
    );
  }

  const value = match[1];
  const unit = match[2];

  if (!value || !unit || !(unit in UNITS)) {
    throw new Error(`Invalid duration format: "${input}"`);
  }

  const multiplier = UNITS[unit as keyof typeof UNITS];
  if (multiplier === undefined) {
    throw new Error(`Invalid duration unit: "${unit}"`);
  }

  return parseInt(value, 10) * multiplier;
}
