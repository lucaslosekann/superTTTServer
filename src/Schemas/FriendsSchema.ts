import { z } from "zod";

export const SendRequestSchema = z.object({
    email: z.string()
});

export const SendRequestByMatchId = z.object({
    matchId: z.number()
});

export const RemoveFriendSchema = z.object({
    userId: z.string(),
});

export const AcceptRequestSchema = z.object({
    userId: z.string(),
});