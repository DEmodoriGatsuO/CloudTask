export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  createdAt: number;
  updatedAt: number;
}

export interface UserCreate {
  email: string;
  password: string;
  displayName: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserUpdate {
  displayName?: string;
  avatarUrl?: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}
