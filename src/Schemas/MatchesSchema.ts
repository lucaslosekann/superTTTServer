import { z } from "zod";

export const GetMatchSchema = z.object({
    id: z.string()
});