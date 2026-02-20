import { Input } from './Input';

interface DateInputProps {
  label: string;
  /** YYYY-MM-DD string, or empty string */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Convert Unix ms to YYYY-MM-DD string for <input type="date">.
 * Utility exported for use by parent components.
 */
export function msToDateString(ms: number | null | undefined): string {
  if (!ms) return '';
  try {
    return new Date(ms).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Convert YYYY-MM-DD string to Unix ms, or null if empty/invalid.
 * Utility exported for use by parent components.
 */
export function dateStringToMs(str: string): number | null {
  if (!str) return null;
  const ms = new Date(str).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Simple controlled date input.
 * Does NOT auto-save — parent is responsible for managing state and triggering save.
 */
export function DateInput({ label, value, onChange, className }: DateInputProps) {
  return (
    <Input
      label={label}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
}
