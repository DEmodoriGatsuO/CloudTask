import { describe, it, expect } from 'vitest';
import { generateId } from '../utils/id';
import { nowUnix, formatDate, isOverdue, daysUntil } from '../utils/date';
import { getOffset, createPaginatedResult, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/pagination';

describe('generateId', () => {
  it('generates an id with prefix', () => {
    const id = generateId('usr');
    expect(id).toMatch(/^usr_/);
    expect(id.length).toBeGreaterThan(4);
  });

  it('generates an id with different prefix', () => {
    const id = generateId('proj');
    expect(id).toMatch(/^proj_/);
  });

  it('generates an id without prefix', () => {
    const id = generateId();
    expect(id).not.toContain('_');
    expect(id.length).toBe(21);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('task')));
    expect(ids.size).toBe(100);
  });
});

describe('nowUnix', () => {
  it('returns a number', () => {
    expect(typeof nowUnix()).toBe('number');
  });

  it('returns current time in milliseconds', () => {
    const before = Date.now();
    const now = nowUnix();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe('formatDate', () => {
  it('formats timestamp as Japanese date', () => {
    // 2024-01-15 in ms
    const ts = new Date('2024-01-15T00:00:00Z').getTime();
    const result = formatDate(ts);
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });
});

describe('isOverdue', () => {
  it('returns true for past date', () => {
    const pastDate = Date.now() - 86400000; // yesterday
    expect(isOverdue(pastDate)).toBe(true);
  });

  it('returns false for future date', () => {
    const futureDate = Date.now() + 86400000; // tomorrow
    expect(isOverdue(futureDate)).toBe(false);
  });
});

describe('daysUntil', () => {
  it('returns positive for future date', () => {
    const futureDate = Date.now() + 3 * 86400000;
    expect(daysUntil(futureDate)).toBeGreaterThanOrEqual(2);
    expect(daysUntil(futureDate)).toBeLessThanOrEqual(3);
  });

  it('returns negative for past date', () => {
    const pastDate = Date.now() - 3 * 86400000;
    expect(daysUntil(pastDate)).toBeLessThan(0);
  });
});

describe('getOffset', () => {
  it('calculates offset for page 1', () => {
    expect(getOffset({ page: 1, pageSize: 20 })).toBe(0);
  });

  it('calculates offset for page 2', () => {
    expect(getOffset({ page: 2, pageSize: 20 })).toBe(20);
  });

  it('calculates offset for page 3 with pageSize 10', () => {
    expect(getOffset({ page: 3, pageSize: 10 })).toBe(20);
  });
});

describe('createPaginatedResult', () => {
  it('creates paginated result', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = createPaginatedResult(data, 50, { page: 1, pageSize: 20 });
    expect(result).toEqual({
      data,
      total: 50,
      page: 1,
      pageSize: 20,
      totalPages: 3,
    });
  });

  it('calculates totalPages correctly with exact division', () => {
    const result = createPaginatedResult([], 40, { page: 1, pageSize: 20 });
    expect(result.totalPages).toBe(2);
  });

  it('calculates totalPages correctly with remainder', () => {
    const result = createPaginatedResult([], 41, { page: 1, pageSize: 20 });
    expect(result.totalPages).toBe(3);
  });
});

describe('constants', () => {
  it('DEFAULT_PAGE_SIZE is 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('MAX_PAGE_SIZE is 100', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});
