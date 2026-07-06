import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const scriptUploadSchema = z.object({
  name: z.string().min(1, 'Script name is required').max(100, 'Script name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  content: z.string().min(1, 'Script content is required').max(50000, 'Script content must be at most 50,000 characters'),
});

export const keyValidateSchema = z.object({
  keyValue: z.string().min(1, 'Key is required'),
});
