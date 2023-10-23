import prisma from "../db";

export default async function updateRatings(tie: boolean, winnerId: number, loserId: number, k: number = 32) {
    const winner = await prisma.user.findUnique({ where: { id: winnerId } })
    if (!winner) throw new Error("Winner not found");
    const loser = await prisma.user.findUnique({ where: { id: loserId } });
    if (!loser) throw new Error("Winner not found");

    const winnerExpected = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const loserExpected = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

    const winnerNewRating = winner.rating + k * (tie ? 0.5 : 1 - winnerExpected);
    const loserNewRating = loser.rating + k * (tie ? 0.5 : 0 - loserExpected);

    await prisma.user.update({ where: { id: winnerId }, data: { rating: winnerNewRating } })
    await prisma.user.update({ where: { id: loserId }, data: { rating: loserNewRating } })

    return [winnerNewRating, loserNewRating, winner.rating, loser.rating];
}