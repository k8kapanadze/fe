/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToggleLeft, Sliders, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { FileData, RawQuestion } from '../types';

interface SimulationSetupProps {
  files: FileData[];
  onStartSimulation: (selectedQuestions: RawQuestion[], sourceNames: string[]) => void;
}

export default function SimulationSetup({ files, onStartSimulation }: SimulationSetupProps) {
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [allocations, setAllocations] = useState<{ [fileName: string]: number }>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize allocations evenly
  useEffect(() => {
    if (files.length === 0) return;

    const baseCount = Math.floor(totalQuestions / files.length);
    const newAllocations: { [fileName: string]: number } = {};
    let remainder = totalQuestions - baseCount * files.length;

    files.forEach((file, idx) => {
      newAllocations[file.name] = baseCount + (idx < remainder ? 1 : 0);
    });

    setAllocations(newAllocations);
  }, [files, totalQuestions]);

  const handleAllocationChange = (fileName: string, val: string) => {
    const numeric = parseInt(val) || 0;
    const updated = { ...allocations, [fileName]: numeric };
    setAllocations(updated);

    // Re-calculate the grand total based on allocations
    const newTotal = Object.values(updated).reduce((sum: number, v: number) => sum + v, 0);
    setTotalQuestions(newTotal);
  };

  const autoBalance = () => {
    if (files.length === 0) return;
    const baseCount = Math.floor(totalQuestions / files.length);
    const newAllocations: { [fileName: string]: number } = {};
    let remainder = totalQuestions - baseCount * files.length;

    files.forEach((file, idx) => {
      newAllocations[file.name] = baseCount + (idx < remainder ? 1 : 0);
    });
    setAllocations(newAllocations);
  };

  const handleStart = () => {
    const activeErrors: string[] = [];
    const sourceNames: string[] = [];
    const finalQuestions: RawQuestion[] = [];

    files.forEach((file) => {
      const requested = allocations[file.name] || 0;
      if (requested < 0) {
        activeErrors.push(`ფაილისთვის "${file.name}" კითხვების რაოდენობა არ შეიძლება იყოს უარყოფითი.`);
      } else if (requested > file.questions.length) {
        activeErrors.push(
          `ფაილში "${file.name}" არ არის საკმარისი კითხვები (მოთხოვნილია: ${requested}, ხელმისაწვდომია: ${file.questions.length}).`
        );
      } else if (requested > 0) {
        // Collect exact number of unique random questions from this file
        sourceNames.push(file.name);
        const shuffled = [...file.questions].sort(() => 0.5 - Math.random());
        finalQuestions.push(...shuffled.slice(0, requested));
      }
    });

    if (finalQuestions.length === 0 && activeErrors.length === 0) {
      activeErrors.push('გთხოვთ მიუთითოთ კითხვების რაოდენობა მაინც ერთ-ერთი ფაილიდან.');
    }

    if (activeErrors.length > 0) {
      setErrors(activeErrors);
      return;
    }

    setErrors([]);
    onStartSimulation(finalQuestions, sourceNames);
  };

  return (
    <div id="sim-setup-container" className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between font-sans">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sliders className="h-5 w-5 text-teal-500" />
          Multi-File საგამოცდო სიმულატორი
        </h2>
        <button
          onClick={autoBalance}
          className="text-xs text-teal-650 dark:text-teal-400 hover:underline flex items-center gap-1.5 font-bold focus:outline-none cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          თანაბარი გადანაწილება
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
        აირჩიეთ და მიუთითეთ, რომელი საგნის ან თემის ფაილიდან რამდენი კითხვა გსურთ მოვიდეს საერთო გამოცდაზე. სისტემა აირჩევს მათ და გააკეთებს გლობალურ არევას.
      </p>

      {/* Inputs per file */}
      <div className="space-y-4">
        {files.map((file) => {
          const currentAlloc = allocations[file.name] || 0;
          const exceedsLimit = currentAlloc > file.questions.length;

          return (
            <div
              key={file.name}
              className={`p-4 rounded-xl border transition-all ${
                exceedsLimit
                  ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/25 dark:bg-rose-950/10'
                  : 'border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-[#0A0C10]/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                <div>
                  <h4 className="text-sm font-bold text-slate-805 dark:text-slate-200 break-all">
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    ხელმისაწვდომია: <span className="font-bold text-slate-600 dark:text-slate-400">{file.questions.length} კითხვა</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={file.questions.length}
                    value={allocations[file.name] !== undefined ? allocations[file.name] : ''}
                    onChange={(e) => handleAllocationChange(file.name, e.target.value)}
                    className="w-24 text-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0C10] text-slate-800 dark:text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-xs text-slate-450">კითხვა</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Total Count summary */}
      <div className="flex items-center justify-between bg-teal-50/10 dark:bg-teal-950/10 p-4 rounded-xl border border-teal-100/30 dark:border-teal-900/10">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold font-sans">სიმულატორის საერთო კითხვების რაოდენობა:</div>
        <div className="font-mono text-lg font-bold text-teal-600 dark:text-teal-400">{totalQuestions}</div>
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 space-y-1 font-sans">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action triggers */}
      <div className="pt-2 animate-fade-in font-sans">
        <button
          onClick={handleStart}
          className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <Play className="h-4 w-4 fill-current text-slate-950" />
          საგამოცდო სიმულაციის დაწყება
        </button>
      </div>
    </div>
  );
}
