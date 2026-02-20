// Helper to convert snake_case DB rows to camelCase objects
export function toCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = row[key];
  }
  return result as T;
}

// Helper to convert camelCase to snake_case for DB writes
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// Convert multiple rows
export function rowsToCamelCase<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => toCamelCase<T>(row));
}

// Build SET clause for updates
export function buildSetClause(data: Record<string, unknown>): {
  clause: string;
  values: unknown[];
} {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  const snakeEntries = entries.map(([k, v]) => {
    const snakeKey = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    return [snakeKey, v] as [string, unknown];
  });
  const clause = snakeEntries.map(([k]) => `${k} = ?`).join(', ');
  const values = snakeEntries.map(([, v]) => v === null ? null : v);
  return { clause, values };
}
