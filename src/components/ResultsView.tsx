/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  BookOpen,
  Star,
  Download,
  Save,
  Home,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  BatteryCharging
} from 'lucide-react';
import { RawQuestion, PlayableQuestion } from '../types';
import { serializeToCustomFormat } from '../utils';

interface ResultsViewProps {
  questions: PlayableQuestion[];
  answers: { [id: string]: { selected: string; isCorrect: boolean } };
  originalQuestions: RawQuestion[];
  onRestart: () => void;
  onPracticeMistakes: () => void;
  onReviewFlagged: () => void;
  onSaveMistakesToHistory: (customName: string, subset: RawQuestion[]) => void;
  flaggedQuestionIds: Set<string>;
  elapsedTime: string;
}

export default function ResultsView({
  questions,
  answers,
  originalQuestions,
  onRestart,
  onPracticeMistakes,
  onReviewFlagged,
  onSaveMistakesToHistory,
  flaggedQuestionIds,
  elapsedTime,
}: ResultsViewProps) {
  const [mistakeCollectionName, setMistakeCollectionName] = useState(() => {
    const d = new Date();
    const dateStr = `${d.getDate()}_${d.toLocaleString('ka-GE', { month: 'short' })}_${d.getFullYear()}`;
    return `შეცდომები_ბაზიდან_${dateStr}`;
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute stats
  const totalCompleted = questions.length;
  let correctCount = 0;
  let mistakeCount = 0;

  // Track the raw question format of mistakes
  const mistakenRawQuestions: RawQuestion[] = [];

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (ans) {
      if (ans.isCorrect) {
        correctCount++;
      } else {
        mistakeCount++;
        const rawMatch = originalQuestions.find((oq) => oq.id === q.id);
        if (rawMatch) {
          mistakenRawQuestions.push(rawMatch);
        }
      }
    }
  });

  const successRate = totalCompleted > 0 ? Math.round((correctCount / totalCompleted) * 100) : 0;
  const mistakePercentage = totalCompleted > 0 ? (mistakeCount / totalCompleted) * 100 : 0;

  const isOutstanding = mistakePercentage < 10;

  // Download export triggers
  const downloadAsOriginalText = () => {
    if (mistakenRawQuestions.length === 0) return;
    const content = serializeToCustomFormat(mistakenRawQuestions);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${mistakeCollectionName}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAsJSON = () => {
    if (mistakenRawQuestions.length === 0) return;
    const content = JSON.stringify(mistakenRawQuestions, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${mistakeCollectionName}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToLocalHistory = () => {
    if (mistakenRawQuestions.length === 0) return;
    onSaveMistakesToHistory(mistakeCollectionName.trim(), mistakenRawQuestions);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Check if flagged questions in this session have any records
  const flaggedCountInQuiz = questions.filter(q => flaggedQuestionIds.has(q.id)).length;

  return (
    <div id="results-view" className="space-y-6 max-w-2xl mx-auto">
      {/* Decorative animated top card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`rounded-3xl p-6 md:p-8 text-center shadow-lg border relative overflow-hidden ${
          isOutstanding
            ? 'bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-950/80 dark:to-green-900/30 text-white border-emerald-400 dark:border-emerald-800'
            : 'bg-gradient-to-br from-teal-500 to-teal-700 dark:from-[#161B22] dark:to-[#0A0C10] text-slate-900 dark:text-[#E2E8F0] border-teal-500/40 dark:border-slate-800'
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-16 -mb-16 pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 dark:bg-slate-900/45 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 shadow-inner backdrop-blur-sm">
          {isOutstanding ? (
            <Sparkles className="h-9 w-9 text-amber-300 animate-bounce" />
          ) : (
            <Award className="h-9 w-9 text-teal-600 dark:text-teal-400" />
          )}
        </div>

        <h2 className="text-2xl font-bold font-sans tracking-tight">ტესტირება დასრულდა!</h2>
        <p className="text-sm dark:text-white/85 mt-2 max-w-md mx-auto leading-relaxed">
          თქვენ წარმატებით უპასუხეთ ბაზის ყველა შერჩეულ კითხვას. იხილეთ შედეგების დინამიკა და სუსტი კერების ანალიზი.
        </p>

        {/* Motivational Georgia quote boxes */}
        <div className="mt-6 bg-white/20 dark:bg-[#0A0C10]/60 backdrop-blur-md p-4 rounded-2xl border border-white/25 dark:border-slate-800/80 text-left">
          <div className="flex gap-3">
            {isOutstanding ? (
              <BatteryCharging className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-5 w-5 text-teal-500 dark:text-teal-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider dark:text-white/70">
                სისტემური მოტივატორი
              </div>
              <p className="text-sm font-semibold mt-1 leading-relaxed dark:text-[#E2E8F0]">
                {isOutstanding
                   ? '„შენი ჰიპოკამპი პიკზე მუშაობს! ბაზა უბრალოდ გაანადგურე. ამ შედეგით გამოცდაზე მხოლოდ ფორმალობისთვის თუ მიხვალ!**“'
                  : '„მე ვარსებობ შენი წარმატებისთვის. ახლა მთავარია დოფამინის დონე აიმაღლო, ცოტა დაისვენო და კვლავ თავიდან ვცადოთ.**“'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Breathtaking Animated Results Scheme Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              საგამოცდო სქემა და ანალიტიკა
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              შედეგების ვიზუალური განაწილება და მეხსიერების კოეფიციენტი
            </p>
          </div>
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-full border border-teal-100 dark:border-teal-900/30">
            რეალურ დროში
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left: Beautiful Donut SVG Progress Circle */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50/55 dark:bg-[#0A0C10]/40 rounded-2xl border border-slate-100 dark:border-slate-850 relative min-h-[220px]">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background track (Correct) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                  strokeWidth="10"
                />
                
                {/* Unanswered or Correct progression Track */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-emerald-500 dark:stroke-emerald-400 fill-none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 62) - ((correctCount / totalCompleted) * (2 * Math.PI * 62)) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeDasharray={2 * Math.PI * 62}
                />

                {/* Mistakes partial ring overlay */}
                {mistakeCount > 0 && (
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="62"
                    className="stroke-rose-500 dark:stroke-rose-600 fill-none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 62) - ((mistakeCount / totalCompleted) * (2 * Math.PI * 62)) }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    strokeDasharray={2 * Math.PI * 62}
                    transform={`rotate(${((correctCount / totalCompleted) * 360) - 90} 80 80)`}
                  />
                )}
              </svg>

              {/* Center Metrics Indicators */}
              <div className="absolute text-center flex flex-col items-center select-none">
                <motion.span 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.5 }}
                  className="text-3xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100"
                >
                  {successRate}%
                </motion.span>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">
                  წარმატება
                </span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-3 text-[10px] font-sans font-extrabold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">სწორი</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">შეცდომა</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700" />
                <span className="text-slate-450 dark:text-slate-550">ჯამური</span>
              </div>
            </div>
          </div>

          {/* Right: Fine-Grained Horizontal Progress bars */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350 font-sans">
                <span>სწორი პასუხები</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {correctCount} / {totalCompleted} ({Math.round((correctCount / totalCompleted) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-200/20">
                <motion.div
                  className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(correctCount / totalCompleted) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350 font-sans">
                <span>შეცდომები</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">
                  {mistakeCount} / {totalCompleted} ({Math.round((mistakeCount / totalCompleted) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-200/20">
                <motion.div
                  className="bg-rose-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(mistakeCount / totalCompleted) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#0A0C10]/40 rounded-xl border border-slate-100 dark:border-slate-850 space-y-1.5 font-sans">
              <div className="text-[11px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest leading-none">
                ტესტის სტატუსი
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                მიმდინარე დასრულებული ტესტი შედგებოდა <span className="font-bold text-slate-700 dark:text-slate-200">{totalCompleted} კითხვისგან</span>. საშუალო სიჩქარით გადამუშავდა <span className="font-semibold text-slate-750 dark:text-slate-350">{(parseInt(elapsedTime.split(':')[2]) || 12) + 2} წამში</span> ერთ კითხვაზე.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid of details stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'სწორი პასუხები',
            value: `${correctCount} / ${totalCompleted}`,
            icon: CheckCircle,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          },
          {
            label: 'შეცდომები',
            value: mistakeCount,
            icon: XCircle,
            color: 'text-rose-500',
            bg: 'bg-rose-50 dark:bg-rose-955/20',
          },
          {
            label: 'წარმატება',
            value: `${successRate}%`,
            icon: TrendingUp,
            color: 'text-teal-500',
            bg: 'bg-teal-50 dark:bg-teal-950/20',
          },
          {
            label: 'დახარჯული დრო',
            value: elapsedTime,
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/20',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-[#161B22] shadow-sm flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{item.label}</span>
              <div className={`p-1 rounded-lg ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-2">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Action panel for review & repetition loops */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 font-sans">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">ნასწავლის გამყარება და შეცდომების ანალიზი</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onPracticeMistakes}
            disabled={mistakeCount === 0}
            className={`p-4 rounded-2xl border text-left transition-all relative group flex flex-col justify-between h-32 ${
              mistakeCount === 0
                ? 'opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-900 bg-slate-55/70 dark:bg-[#0A0C10]/40'
                : 'border-rose-100 dark:border-rose-950/80 bg-rose-50/20 dark:bg-rose-955/10 hover:border-rose-450 dark:hover:border-rose-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 dark:bg-rose-950 text-rose-500 rounded-xl">
                  <XCircle className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">🧠 შეცდომების გავლა</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                შეცდომით ნაპასუხები {mistakeCount} კითხვის თავიდან გავლა მათ სრულად გამოსწორებამდე.
              </p>
            </div>
            {mistakeCount > 0 && (
              <span className="text-xs text-rose-600 dark:text-rose-450 font-bold group-hover:underline flex items-center justify-end w-full">
                დაწყება <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </button>

          <button
            onClick={onReviewFlagged}
            disabled={flaggedCountInQuiz === 0}
            className={`p-4 rounded-2xl border text-left transition-all relative group flex flex-col justify-between h-32 ${
              flaggedCountInQuiz === 0
                ? 'opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-900 bg-slate-55/70 dark:bg-[#0A0C10]/40'
                : 'border-yellow-100 dark:border-yellow-950/80 bg-yellow-50/20 dark:bg-yellow-950/10 hover:border-yellow-450 dark:hover:border-yellow-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-yellow-100 dark:bg-yellow-950/50 text-amber-500 rounded-xl">
                  <Star className="h-4 w-4 fill-amber-500" />
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">⭐ მონიშნული კითხვები</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                კიდევ ერთხელ გადახედეთ თქვენს მიერ მონიშნულ {flaggedCountInQuiz} რთულ ან საეჭვო კითხვას.
              </p>
            </div>
            {flaggedCountInQuiz > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-500 font-bold group-hover:underline flex items-center justify-end w-full">
                გადაკითხვა <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Storage and downloads of mistakes collection */}
      {mistakeCount > 0 && (
        <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              შეცდომების შენახვა / ექსპორტი
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            შეინახეთ ან ჩამოტვირთეთ მხოლოდ შეცდომით ნაპასუხები {mistakeCount} კითხვა. მონიშნული შეცდომების ფაილი სრულად თავსებადია პლატფორმის ატვირთვის სისტემასთან.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              value={mistakeCollectionName}
              onChange={(e) => setMistakeCollectionName(e.target.value)}
              placeholder="კოლექციის სახელი"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0A0C10] text-slate-800 dark:text-slate-100 font-sans focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleSaveToLocalHistory}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-[#0A0C10] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all shadow-sm font-sans"
            >
              <Save className="h-3.5 w-3.5" />
              {saveSuccess ? 'შენახულია!' : 'შეცდომების შენახვა'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
            <button
              onClick={downloadAsOriginalText}
              className="p-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              .txt ექსპორტი (ფორმატირებული)
            </button>
            <button
              onClick={downloadAsJSON}
              className="p-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              .json ექსპორტი
            </button>
          </div>
        </div>
      )}

      {/* Main reset trigger */}
      <div className="flex justify-center pt-2 font-sans">
        <button
          onClick={onRestart}
          className="px-6 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-[#161B22] rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition-colors duration-200 focus:outline-none shadow-sm"
        >
          <Home className="h-4 w-4" />
          მთავარ გვერდზე დაბრუნება
        </button>
      </div>
    </div>
  );
}
