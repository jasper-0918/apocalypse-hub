import { z } from 'zod';

// Shared password policy (mirrors lib/password.ts on the client): at least 8
// characters, one letter, one number.
export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordField,
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid or missing reset token'),
  password: passwordField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});

export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newEmail: z.string().email('Invalid email address'),
});

export const scriptUploadSchema = z.object({
  name: z.string().min(1, 'Script name is required').max(100, 'Script name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  content: z.string().min(1, 'Script content is required').max(50000, 'Script content must be at most 50,000 characters'),
});

export const keyValidateSchema = z.object({
  keyValue: z.string().min(1, 'Key is required'),
});
