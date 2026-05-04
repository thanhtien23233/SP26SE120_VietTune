export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  expertise?: string[];
  phoneNumber?: string;
  isActive?: boolean;
  isEmailConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'Admin',
  MODERATOR = 'Moderator',
  RESEARCHER = 'Researcher',
  CONTRIBUTOR = 'Contributor',
  EXPERT = 'Expert',
  USER = 'User',
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
}

export interface RegisterResearcherForm {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

export interface ConfirmAccountForm {
  otp: string;
}
