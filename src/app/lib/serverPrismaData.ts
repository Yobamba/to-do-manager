import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export async function  createReview (reviewText: string, rating: number, productListingId: number, userId: number) {
  try {
    const newReview = await prisma.review.create({
      data: {
        review: reviewText,
        rating: rating,
        productListingId: productListingId,
        userId: userId,
      },
    });
    return newReview;
  } catch (error) {
    console.error('Error creating review', error);
    throw error;
  }
};

export { prisma };