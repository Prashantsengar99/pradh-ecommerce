// Reviews service — filhaal localStorage use kar raha hai
// Jab server ready ho, API calls se replace kar denge

const getReviews = (productId) => {
  try {
    const all = JSON.parse(localStorage.getItem('reviews') || '{}');
    return all[productId] || [];
  } catch {
    return [];
  }
};

const saveReview = (productId, review) => {
  try {
    const all = JSON.parse(localStorage.getItem('reviews') || '{}');
    if (!all[productId]) all[productId] = [];
    all[productId].push(review);
    localStorage.setItem('reviews', JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
};

// Sample reviews for demo
const getSampleReviews = () => [
  {
    rating: 5,
    userName: 'Vikram Singh',
    comment: "Best organic supplement I've ever used! Energy levels solid all day.",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    rating: 5,
    userName: 'Dr. Rohan Mehta',
    comment: 'The best part is no refined sugar. Clean, pure, authentic taste.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    rating: 4,
    userName: 'Priya Sharma',
    comment: 'Great product! My husband loves it. Will order again.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export const reviewService = {
  getReviews,
  saveReview,
  getSampleReviews,
};