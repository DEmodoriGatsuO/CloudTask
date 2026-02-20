export * from './user';
export * from './project';
export * from './task';
export * from './comment';
export * from './label';
export * from './notification';
export * from './activity';
export * from './attachment';
export * from './wiki';
export * from './workflow';
export * from './custom-field';
export * from './template';

// Common API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
