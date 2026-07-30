'use client';

import { feedbackItems } from '@/data/support';

export default function FeedbackCenter() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Customer Feedback
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Ratings and reviews collected after completed bookings.
        </p>
      </div>

      <div className="space-y-5 p-6">
        {feedbackItems.map((feedback) => (
          <div
            key={feedback.id}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {feedback.customer}
                </h3>

                <p className="text-sm text-slate-500">
                  Feedback #{feedback.id}
                </p>
              </div>

              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                ⭐ {feedback.rating}/5
              </span>
            </div>

            <p className="mt-4 text-slate-600">{feedback.comment}</p>

            <div className="mt-5 flex justify-end">
              <button className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}