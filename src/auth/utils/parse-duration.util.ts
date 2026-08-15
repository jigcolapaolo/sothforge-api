export function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);

  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}
