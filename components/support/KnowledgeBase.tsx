'use client';

import { knowledgeArticles } from '@/data/support';

export default function KnowledgeBase() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Knowledge Base</h2>

          <p className="mt-1 text-sm text-slate-500">
            Help articles available for customers and support agents.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          New Article
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        {knowledgeArticles.map((article) => (
          <div
            key={article.id}
            className="rounded-xl border border-slate-200 p-5 transition hover:shadow-md"
          >
            <h3 className="font-semibold text-slate-900">{article.title}</h3>

            <p className="mt-3 text-sm text-slate-600">{article.category}</p>

            <div className="mt-5 flex items-center justify-between">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Published
              </span>

              <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
