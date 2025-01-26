

export type Product = {
    id: number;
    name: string;
    category: string;
    description: string;
    price: number;
    image_url: string;
    seller_id: number;
    reviews: Review[];
};

export type Review = {
    id: number;
    productListingId: number;
    userId: number;
    rating: number;
    review: string;
};