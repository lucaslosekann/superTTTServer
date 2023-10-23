import { z } from 'zod';

export const LoginSchema = z.object({
    body: z.object({
        email: z.string(),
        password: z.string()
    })
});

export const RegisterSchema = z.object({
    body: z.object({
        name: z.string(),
        email: z.string(),
        password: z.string(),
        confirmPassword: z.string()
    })
});