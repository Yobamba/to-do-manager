'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { Review } from '@/app/lib/definitions';

interface FormProps {
  id: string;
}

const FormSchema = z.object({
  review: z.string({ invalid_type_error: 'Please enter a review.' }),
  rating: z.coerce.number().int().min(1).max(5, 'Enter a rating between 1 and 5'),
});

const Form: React.FC<FormProps> = ({ id }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fetch values from form
    const reviewText = (document.getElementById('review') as HTMLInputElement).value;
    const rating = parseInt((document.getElementById('rating') as HTMLInputElement).value, 10);
    const productListingId = 1;

    // Validate using Zod
    const formData = { review: reviewText, rating: rating, user: 1 };
    const validationResult = FormSchema.safeParse(formData);
    const userId = 1

    if (validationResult.success) {
      try {

        const { data } = await axios.post('/api/reviews', {
          reviewText,
          rating,
          productListingId,
          userId,
        }) 

        // Function to submit a review
        // ...
        const fetchReviews = async () => {
          try {
            const response = await axios.get('/api/reviews', {
              headers: {
                'Accept': 'application/json',
              },
            });

            if (response.data) {
              const data = JSON.parse(response.data);
              setReviews(data);
              console.log(data);
            }
          
          } catch (error) {
            console.error('Error fetching reviews:', error);
          }
        }
    
        fetchReviews();

        // After submitting, fetch updated reviews
        const response = await axios.get('/api/reviews');
        setReviews(response.data);
      } catch (error) {
        console.error('Error submitting or fetching reviews:', error);
      }
    } else {
      console.error('Validation failed:', validationResult.error.errors);
      // Handle validation errors if needed
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="rating">Rating (1-5):</label>
      <input type="number" id="rating" name="rating" min="1" max="5" required />

      <label htmlFor="review">Review:</label>
      <textarea id="review" name="review" required></textarea>

      <button type="submit">Submit Review</button>
    </form>
  );
};

export default Form;
