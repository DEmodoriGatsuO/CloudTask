export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  projectId: string;
  name: string;
  fieldType: CustomFieldType;
  options?: string[];
  required: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface CustomFieldDefinitionCreate {
  name: string;
  fieldType: CustomFieldType;
  options?: string[];
  required?: boolean;
}

export interface CustomFieldValue {
  id: string;
  taskId: string;
  fieldId: string;
  value?: string;
}
