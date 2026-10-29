const reviewsCount = (n: number) => `${n} ревʼю`;

export const peopleStrings = {
  people: {
    reviewsCount,
    noReviews: "Ще немає ревʼю",
    notFound: "Людину не знайдено",
    byType: "Середня за типом",
    reviews: "Ревʼю",
  },
} as const;
