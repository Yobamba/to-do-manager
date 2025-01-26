import { unstable_noStore as noStore } from 'next/cache';
import {prisma} from './serverPrismaData';
import axios from 'axios';

export async function fetchFilteredProducts(category: string, minPrice: string, maxPrice: string) {
  
      const allowedCategories = ['All', 'Jewelry', 'Art', 'Clothing', 'Accessories', 'Woodworking', ''];
      if (!allowedCategories.includes(category)) {
          throw new Error('Invalid category');
      }
      if (category === 'All') {
        category = "Art", "Jewelry", "Home", "Clothing", "Accessories", "Woodworking";
      }
      const minPriceNumber = parseFloat(minPrice);
      const maxPriceNumber = parseFloat(maxPrice);
  
      if (isNaN(minPriceNumber) || isNaN(maxPriceNumber) || minPriceNumber < 0 || maxPriceNumber < 0 || minPriceNumber > maxPriceNumber) {
          throw new Error('Invalid minPrice or maxPrice');
      }
  
      noStore();
      try {
          console.log('Fetching filtered products data...');
          const data = await prisma.products.findMany({
            where: {
              category: {
                in: [category],
              },
              price: {
                gte: minPriceNumber,
                lte: maxPriceNumber,
              }
            },
            include: {
              reviews: true,
            }
          });
          console.log('Filtered data fetch completed');
          console.log(data);
          return data;
          
      } catch (error) {
          console.error('Error fetching filtered products data', error);
          throw new Error('Error fetching filtered products data');
      } finally {
        await prisma.$disconnect();
      }
}

export const fetchReviews = async () => {
  try {
    const response = await axios.get('/api/reviews');
    // setReviews(response.data);
    console.log(response.data);
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }
}

export async function fetchProductById(id: string) {
  noStore();
  const num_id = Number(id);
  try {
      console.log('Fetching product data...');
      const data = await prisma.products.findUnique({
        where: {
          id: num_id,
        },
        include: {
          reviews: true,
        }
      });
      console.log('Product data fetch completed');
      console.log(data);
      return data;
      
  } catch (error) {
      console.error('Error fetching product data', error);
      throw new Error('Error fetching product data');
  } finally {
    await prisma.$disconnect();
  }
}