'use client';

const reviews = [
  {
    id: 1,
    customer: 'Rahul Sharma',
    booking: 'BK102451',
    rating: 5,
    category: 'Driver',
    review: 'Excellent service and professional driver.',
  },
  {
    id: 2,
    customer: 'Priya Patel',
    booking: 'BK102455',
    rating: 4,
    category: 'Vehicle',
    review: 'Clean vehicle but arrived slightly late.',
  },
  {
    id: 3,
    customer: 'Amit Verma',
    booking: 'BK102460',
    rating: 2,
    category: 'Support',
    review: 'Support response took longer than expected.',
  },
];

export default function RatingsReview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Ratings & Reviews
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor customer satisfaction across bookings.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{review.customer}</h3>
                <p className="text-sm text-slate-500">{review.booking}</p>
              </div>

              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                ⭐ {review.rating}/5
              </span>
            </div>

            <div className="mt-3 text-sm text-indigo-600">
              {review.category}
            </div>

            <p className="mt-3 text-slate-600">{review.review}</p>

            <div className="mt-5 flex gap-3">
              <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
                Reply
              </button>

              <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
                View Booking
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
