import { sql } from '@vercel/postgres';
import { 
    Product,
} from './definitions';

import { unstable_noStore as noStore } from 'next/cache';

export async function fetchProducts() {
    noStore();
    try {
        console.log('Fetching products data...');
        const data = await sql<Product>`SELECT * FROM Products`;
        console.log('Data fetch completed');
        return data.rows;
    } catch (error) {
        console.error('Error fetching products data', error);
        throw new Error('Error fetching products data');
    }
}



export async function fetchFilteredProducts(category: string, minPrice: string, maxPrice: string) {

    const allowedCategories = ['All', 'Jewelry', 'Art', 'Home', 'Clothing', 'Accessories', ''];
    if (!allowedCategories.includes(category)) {
        throw new Error('Invalid category');
    }
    const minPriceNumber = parseFloat(minPrice);
    const maxPriceNumber = parseFloat(maxPrice);

    if (isNaN(minPriceNumber) || isNaN(maxPriceNumber) || minPriceNumber < 0 || maxPriceNumber < 0 || minPriceNumber > maxPriceNumber) {
        throw new Error('Invalid minPrice or maxPrice');
    }

    noStore();
    try {
        console.log('Fetching filtered products data...');
        const data = await sql<Product>`SELECT * FROM Products WHERE category = ${category} and price >= ${minPrice} and price <= ${maxPrice}`;
        console.log('Filtered data fetch completed');
        return data.rows;
    } catch (error) {
        console.error('Error fetching filtered products data', error);
        throw new Error('Error fetching filtered products data');
    }
}