/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ArrowRight, Play, AlertCircle, HelpCircle, CheckCircle, RotateCw, Sliders } from 'lucide-react';
import { PlayableQuestion } from '../types';

interface QuestionCardProps {
  question: PlayableQuestion;
  currentIndex: number;
  totalQuestions: number;
  autoAdvance: boolean;
  onAnswerSelected: (selectedOption: string) => void;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  onNext: () => void;
  flagged: boolean;
  onToggleFlag: () => void;
  onPracticeMistakesNow?: () => void;
  mistakesCountSoFar: number;
  isMistakesSession: boolean;
  onJumpToQuestion?: (index: number) => void;
}

export default function QuestionCard({
  question,
  currentIndex,
  totalQuestions,
  autoAdvance,
  onAnswerSelected,
  selectedAnswer,
  isCorrect,
  onNext,
  flagged,
  onToggleFlag,
  onPracticeMistakesNow,
  mistakesCountSoFar,
  isMistakesSession,
  onJumpToQuestion,
}: QuestionCardProps) {
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [jumpTarget, setJumpTarget] = useState((currentIndex + 1).toString());

  useEffect(() => {
    setJumpTarget((currentIndex + 1).toString());
  }, [currentIndex]);

  // Monitor keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent running if user was focused on inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      // Keyboard choices: 1-5 or a-e
      const isNumberKey = ['1', '2', '3', '4', '5'].includes(key);
      const isLetterKey = ['a', 'b', 'c', 'd', 'e'].includes(key);

      if (isNumberKey || isLetterKey) {
        let index = -1;
        if (isNumberKey) index = parseInt(key) - 1;
        if (isLetterKey) index = key.charCodeAt(0) - 97;

        if (index >= 0 && index < question.options.length && selectedAnswer === null) {
          onAnswerSelected(question.options[index]);
          setPressedIndex(index);
          setTimeout(() => setPressedIndex(null), 150);
        }
      }

      // Space or Enter for Next Question
      if ((key === ' ' || key === 'enter') && selectedAnswer !== null) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [question, selectedAnswer, onAnswerSelected, onNext]);

  const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const progressPercent = Math.min(((currentIndex + 1) / totalQuestions) * 100, 100);

  return (
    <div id="question-card-wrapper" className="space-y-5 max-w-2xl mx-auto">
      {/* Top micro progress indicators */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">კითხვა:</span>
          <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Informative index placement markers */}
        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#0A0C10] border border-slate-100 dark:border-slate-850 truncate max-w-[180px] inline-block">
            {question.sourceFile} (კითხვა #{question.originalIndex})
          </span>
        </div>
      </div>

      {/* Actual Progress Bar */}
      <div className="w-full bg-slate-150 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner font-sans">
        <motion.div
          className="bg-teal-500 dark:bg-teal-400 h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Dynamic Jump Navigator Input Bar */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 font-sans transition-all">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Sliders className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="font-semibold">გადასვლა კითხვაზე</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0A0C10] font-bold text-slate-600 dark:text-slate-400">
            დიაპაზონი: 1 - {totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input
            type="number"
            min="1"
            max={totalQuestions}
            value={jumpTarget}
            onChange={(e) => setJumpTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt(jumpTarget);
                if (val >= 1 && val <= totalQuestions && onJumpToQuestion) {
                  onJumpToQuestion(val - 1);
                }
              }
            }}
            placeholder="მაგ: 15"
            className="w-20 px-2 py-1.5 text-center text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0C10] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
          />
          <button
            type="button"
            onClick={() => {
              const val = parseInt(jumpTarget);
              if (val >= 1 && val <= totalQuestions && onJumpToQuestion) {
                onJumpToQuestion(val - 1);
              }
            }}
            disabled={!jumpTarget || parseInt(jumpTarget) < 1 || parseInt(jumpTarget) > totalQuestions}
            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            გადასვლა კითხვაზე
          </button>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative">
        
        {/* Toggle Flag floating widget */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            id="toggle-flag-btn"
            onClick={onToggleFlag}
            className={`p-2 rounded-xl transition-all border outline-none focus:outline-none ${
              flagged
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500 border-amber-200 dark:border-amber-900/50 scale-105'
                : 'bg-slate-50 dark:bg-[#0A0C10] text-slate-400 border-slate-150 dark:border-slate-850 hover:text-amber-500 hover:scale-105'
            }`}
            title={flagged ? 'მონიშნულია (ფავორიტიდან მოხსნა)' : 'მონიშვნა (მოგვიანებით გადაკითხვა)'}
          >
            <Star className={`h-5 w-5 ${flagged ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Question Text */}
        <div className="pr-12">
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-900/50">
            სამედიცინო კითხვა
          </span>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-sans mt-3 whitespace-pre-wrap leading-relaxed">
            {question.text}
          </h1>
        </div>

        {/* Answer Options list */}
        <div className="space-y-3.5 pt-2">
          {question.options.map((option, idx) => {
            const letter = letterLabels[idx] || '';
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === question.correctAnswer;
            
            let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A0C10]/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200';
            let circleStyle = 'bg-slate-200/80 dark:bg-[#0A0C10] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-805';

            if (selectedAnswer !== null) {
              if (isCorrectOption) {
                // Correct highlights Green
                btnStyle = 'border-emerald-500 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20';
                circleStyle = 'bg-emerald-500 text-white border-transparent';
              } else if (isSelected && !isCorrect) {
                // Wrong selected highlights Red
                btnStyle = 'border-rose-500 dark:border-rose-600 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20';
                circleStyle = 'bg-rose-500 text-white border-transparent';
              } else {
                // Non-selected remains neutral/opaque
                btnStyle = 'opacity-40 border-slate-200 dark:border-[#30363D] bg-slate-50/50 dark:bg-[#0A0C10]/40 text-slate-400 dark:text-slate-550';
                circleStyle = 'bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500';
              }
            } else if (pressedIndex === idx) {
              btnStyle = 'border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300';
              circleStyle = 'bg-teal-600 text-white border-transparent';
            }

            return (
              <button
                key={option + idx}
                disabled={selectedAnswer !== null}
                onClick={() => onAnswerSelected(option)}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-150 cursor-pointer focus:outline-none ${btnStyle}`}
              >
                <span className={`w-7 h-7 rounded-lg font-mono text-sm font-semibold flex items-center justify-center shrink-0 mt-0.5 ${circleStyle}`}>
                  {letter}
                </span>
                <span className="text-sm md:text-base font-sans font-medium leading-relaxed pt-0.5">
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom feedback section */}
        <AnimatePresence>
          {selectedAnswer !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 text-rose-800 dark:text-rose-450'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {isCorrect
                    ? 'სწორია! შესანიშნავი ნაბიჯია.'
                    : 'არასწორია! დაიმახსოვრეთ სწორი პასუხი (მონიშნულია მწვანედ).'}
                </span>
              </div>

              <button
                onClick={onNext}
                className="py-2.5 px-4 bg-teal-500 hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 focus:outline-none transition-all shadow-sm"
              >
                {currentIndex + 1 === totalQuestions ? 'შედეგების ნახვა' : 'შემდეგი კითხვა'}
                <ArrowRight className="h-3.5 w-3.5 text-slate-950" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pause/Branch into Interim Mistakes Mode */}
      {mistakesCountSoFar > 0 && !isMistakesSession && onPracticeMistakesNow && (
        <div className="bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans font-medium">
            ნახეთ შეცდომები? შეგიძლიათ ნებისმიერ დროს გაიაროთ ისინი ახლავე, ძირითადი ტესტის პაუზით.
          </div>
          <button
            onClick={onPracticeMistakesNow}
            className="px-3 py-2 bg-teal-50/60 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/80 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 focus:outline-none transition-all"
          >
            <RotateCw className="h-3.5 w-3.5" />
            შეცდომების გავლა ახლავე ({mistakesCountSoFar})
          </button>
        </div>
      )}

      {/* Keyboard guide overlay bar */}
      <div className="text-center">
        <span className="text-[10px] text-slate-450 dark:text-slate-550 font-mono tracking-wide">
          კლავიატურა: [1-4] ან [A-D] პასუხის ასარჩევად • [Space/Enter] შემდეგ კითხვაზე გადასასვლელად
        </span>
      </div>
    </div>
  );
}
