import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be between 2 and 60 characters.').max(60, 'Name must be between 2 and 60 characters.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password is too long.'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const projectSchema = z.object({
  title: z.string().trim().min(3, 'Title must be between 3 and 80 characters.').max(80, 'Title must be between 3 and 80 characters.'),
  description: z.string().trim().max(500, 'Description must be under 500 characters.').optional().or(z.literal('')),
});

export const taskSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be between 3 and 120 characters.').max(120, 'Title must be between 3 and 120 characters.'),
    description: z.string().trim().max(1000, 'Description must be under 1000 characters.').optional().or(z.literal('')),
    status: z.enum(['todo', 'in-progress', 'done']),
    priority: z.enum(['low', 'medium', 'high']),
    dueDate: z.string().optional().or(z.literal('')),
    assigneeId: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate) {
      const d = new Date(data.dueDate);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDate'], message: 'Due date must be a valid date.' });
      }
    }
  });
