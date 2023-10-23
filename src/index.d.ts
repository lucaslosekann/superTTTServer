export {}

declare global {
    namespace Express {
        export interface Request {
            decoded?: {
                id: number;
                email: string;
                name: string;
                exp: number;
                iat: number;
            };
        }
    }
}