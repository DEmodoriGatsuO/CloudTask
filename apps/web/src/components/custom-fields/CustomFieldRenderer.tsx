import { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner } from '../common/Spinner';
import { useCustomFields, useCustomFieldValues, useSetCustomFieldValue } from '../../hooks/useCustomFields';
import type { CustomFieldDefinition, CustomFieldValue } from '@cloudtask/shared';

interface CustomFieldRendererProps {
  taskId: string;
  projectId: string;
}

export function CustomFieldRenderer({ taskId, projectId }: CustomFieldRendererProps) {
  const { data: fieldsRes, isLoading: fieldsLoading } = useCustomFields(projectId);
  const { data: valuesRes, isLoading: valuesLoading } = useCustomFieldValues(taskId);
  const setFieldValue = useSetCustomFieldValue();

  const fields: CustomFieldDefinition[] = fieldsRes?.data ?? [];
  const values: CustomFieldValue[] = valuesRes?.data ?? [];

  if (fieldsLoading || valuesLoading) return <Spinner size="sm" />;
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-on-surface-variant">カスタムフィールド</h3>
      <div className="space-y-3">
        {fields.map((field) => {
          const fieldValue = values.find((v) => v.fieldId === field.id);
          return (
            <FieldInput
              key={field.id}
              field={field}
              value={fieldValue?.value ?? ''}
              taskId={taskId}
              onSave={(value) =>
                setFieldValue.mutate({ taskId, fieldId: field.id, value })
              }
            />
          );
        })}
      </div>
    </div>
  );
}

interface FieldInputProps {
  field: CustomFieldDefinition;
  value: string;
  taskId: string;
  onSave: (value: string) => void;
}

function FieldInput({ field, value, onSave }: FieldInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when server value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedSave = useCallback(
    (newValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSave(newValue);
      }, 500);
    },
    [onSave],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleTextChange(newValue: string) {
    setLocalValue(newValue);
    debouncedSave(newValue);
  }

  function handleImmediateChange(newValue: string) {
    setLocalValue(newValue);
    onSave(newValue);
  }

  const label = (
    <label className="block text-sm font-medium text-on-surface-variant">
      {field.name}
      {field.required && <span className="text-error ml-1">*</span>}
    </label>
  );

  switch (field.fieldType) {
    case 'text':
      return (
        <div className="space-y-1">
          {label}
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`${field.name}を入力`}
            className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          {label}
          <input
            type="number"
            value={localValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`${field.name}を入力`}
            className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      );

    case 'date':
      return (
        <div className="space-y-1">
          {label}
          <input
            type="date"
            value={localValue}
            onChange={(e) => handleImmediateChange(e.target.value)}
            className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          {label}
          <select
            value={localValue}
            onChange={(e) => handleImmediateChange(e.target.value)}
            className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">{field.name}を選択</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    default:
      return null;
  }
}
