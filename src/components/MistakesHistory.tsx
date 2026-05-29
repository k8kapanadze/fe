/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Calendar, Trash2, LayoutList, PlayCircle, BarChart3 } from 'lucide-react';
import { MistakeCollection } from '../types';

interface MistakesHistoryProps {
  collections: MistakeCollection[];
  onStartCollectionPractice: (collection: MistakeCollection) => void;
  onDeleteCollection: (id: string) => void;
}

export default function MistakesHistory({
  collections,
  onStartCollectionPractice,
  onDeleteCollection,
}: MistakesHistoryProps) {
  if (collections.length === 0) {
    return (
      <div id="mistakes-history-empty" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
          <BookOpen className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">შენახული შეცდომები ვერ მოიძებნა</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
          ტესტის დასრულების შემდეგ "შეცდომების შენახვა" ღილაკზე დაჭერით შექმნით სუსტი თემების პირად ბაზას, რომელზეც მუშაობას ნებისმიერ დღეს შეძლებთ.
        </p>
      </div>
    );
  }

  return (
    <div id="mistakes-history-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-indigo-500" />
        ჩემი შეცდომები ({collections.length})
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        ეს არის თქვენს მიერ შენახული შეცდომების ნაკრებები. შეგიძლიათ ნებისმიერ დროს განაახლოთ ტესტირება და მხოლოდ ამ შეცდომების გამეორებაზე ივარჯიშოთ.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {collections.map((coll) => (
          <div
            key={coll.id}
            className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 hover:border-indigo-400/50 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-mono py-0.5 px-2 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold break-all">
                  {coll.name}
                </span>

                <button
                  onClick={() => onDeleteCollection(coll.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus:outline-none"
                  title="წაშლა"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>კითხვების რაოდენობა: <strong className="text-slate-700 dark:text-slate-300">{coll.questions.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>შენახვის თარიღი: <strong>{coll.timestamp}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>პირვანდელი შედეგი: <strong className="text-emerald-600 dark:text-emerald-400">{coll.successRate}% სწორი</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onStartCollectionPractice(coll)}
              className="w-full mt-2 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200 dark:border-slate-700 dark:group-hover:border-indigo-600 hover:border-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white transition-colors rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <PlayCircle className="h-4 w-4" />
              გამეორების დაწყება
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
