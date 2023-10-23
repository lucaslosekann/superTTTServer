import prisma from "../db";

export default async function updateRatings(winnerId: number | null, player1Id: number, player2Id: number, k: number = 32) {
    const player1 = await prisma.user.findUnique({ where: { id: player1Id } })
    if (!player1) throw new Error("Winner not found");
    const player2 = await prisma.user.findUnique({ where: { id: player2Id } });
    if (!player2) throw new Error("Winner not found");

    const player1Expected = 1 / (1 + Math.pow(10, (player2.rating - player1.rating) / 400));
    const loserExpected = 1 / (1 + Math.pow(10, (player1.rating - player2.rating) / 400));


    const player1Winner = winnerId == player1Id;
    const player1NewRating = player1.rating + k * ((!winnerId ? 0.5 : player1Winner  ? 1 : 0) - player1Expected);
    const player2NewRating = player2.rating + k * ((!winnerId ? 0.5 : !player1Winner ? 1 : 0) - loserExpected);

    await prisma.user.update({ where: { id: player1Id }, data: { rating: player1NewRating } })
    await prisma.user.update({ where: { id: player2Id }, data: { rating: player2NewRating } })

    return [player1NewRating, player2NewRating, player1.rating, player2.rating];
}