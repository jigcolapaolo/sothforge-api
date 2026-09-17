import { parseDurationToMs } from 'src/auth/utils/parse-duration.util';

describe('parseDurationToMs', () => {
  it('should convert seconds to milliseconds', () => {
    expect(parseDurationToMs('30s')).toBe(30_000);
  });

  it('should convert minutes to milliseconds', () => {
    expect(parseDurationToMs('5m')).toBe(5 * 60 * 1000);
  });

  it('should convert hours to milliseconds', () => {
    expect(parseDurationToMs('2h')).toBe(2 * 60 * 60 * 1000);
  });

  it('should convert days to milliseconds', () => {
    expect(parseDurationToMs('3d')).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('should throw an error for an invalid duration', () => {
    expect(() => parseDurationToMs('10x')).toThrow('Invalid duration: 10x');
  });
});
