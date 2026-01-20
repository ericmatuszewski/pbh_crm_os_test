import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getInitials,
  truncate,
} from '@/lib/utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('should handle object notation', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('should handle array notation', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });
});

describe('formatCurrency', () => {
  it('should format USD currency by default', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
  });

  it('should format large numbers', () => {
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should format negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('should format EUR currency', () => {
    expect(formatCurrency(1000, 'EUR')).toContain('1,000');
  });

  it('should format GBP currency', () => {
    expect(formatCurrency(1000, 'GBP')).toContain('1,000');
  });

  it('should handle small amounts', () => {
    expect(formatCurrency(5)).toBe('$5');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('should format ISO date string', () => {
    const result = formatDate('2024-06-20');
    expect(result).toMatch(/Jun 20, 2024/);
  });

  it('should format full ISO datetime string', () => {
    const result = formatDate('2024-12-25T10:30:00Z');
    expect(result).toMatch(/Dec 25, 2024/);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Mock current date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-20T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "just now" for very recent times', () => {
    const date = new Date('2024-01-20T11:59:30Z');
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('should return minutes ago for recent times', () => {
    const date = new Date('2024-01-20T11:50:00Z');
    expect(formatRelativeTime(date)).toBe('10m ago');
  });

  it('should return hours ago', () => {
    const date = new Date('2024-01-20T09:00:00Z');
    expect(formatRelativeTime(date)).toBe('3h ago');
  });

  it('should return days ago', () => {
    const date = new Date('2024-01-18T12:00:00Z');
    expect(formatRelativeTime(date)).toBe('2d ago');
  });

  it('should return formatted date for older times', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = formatRelativeTime(date);
    expect(result).toMatch(/Jan 1, 2024/);
  });
});

describe('getInitials', () => {
  it('should get initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('should get initials from single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('should limit to 2 characters', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });

  it('should handle lowercase names', () => {
    expect(getInitials('jane smith')).toBe('JS');
  });

  it('should handle names with extra spaces', () => {
    expect(getInitials('John   Doe')).toBe('JD');
  });

  it('should handle hyphenated names', () => {
    expect(getInitials('Mary-Jane Watson')).toBe('MW');
  });
});

describe('truncate', () => {
  it('should return original string if shorter than length', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should return original string if equal to length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should truncate and add ellipsis if longer than length', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('should handle single character', () => {
    expect(truncate('A', 1)).toBe('A');
  });

  it('should handle truncating to 0 length', () => {
    expect(truncate('Hello', 0)).toBe('...');
  });

  it('should truncate long text', () => {
    const longText = 'This is a very long piece of text that should be truncated';
    const result = truncate(longText, 20);
    expect(result).toBe('This is a very long ...');
    expect(result.length).toBe(23); // 20 chars + '...'
  });
});
