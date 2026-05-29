/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Sliders,
  Settings,
  Flame,
  Award,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Clock,
  LogOut,
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  Moon,
  Trash2,
  RefreshCw,
  Plus,
  Compass,
  CheckCircle,
  Eye,
  Scissors,
  MoreVertical
} from 'lucide-react';

import { RawQuestion, PlayableQuestion, MistakeCollection, ActiveSession, FileData } from './types';
import { prepareSessionQuestions, serializeToCustomFormat } from './utils';

import ThemeToggle from './components/ThemeToggle';
import UploadSection from './components/UploadSection';
import SimulationSetup from './components/SimulationSetup';
import MistakesHistory from './components/MistakesHistory';
import QuestionCard from './components/QuestionCard';
import ResultsView from './components/ResultsView';

export default function App() {
  // Global persistence states
  const [files, setFiles] = useState<FileData[]>(() => {
    const saved = localStorage.getItem('med_quiz_files');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<MistakeCollection[]>(() => {
    const saved = localStorage.getItem('med_quiz_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [flaggedIds, setFlaggedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('med_quiz_flagged');
    return saved ? JSON.parse(saved) : [];
  });

  // Active UI Navigation Tab
  // 'all' = Main Test Config, 'simulation' = Multi-file Simulator, 'history' = My Mistakes Collections
  const [activeTab, setActiveTab] = useState<'all' | 'simulation' | 'history'>('all');

  // Active Practicing Session state (When null, user is in configuration workspace)
  const [session, setSession] = useState<ActiveSession | null>(null);

  // Elapsed session duration stopwatch matching medcore-pro layout
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [sessionDurationSecs, setSessionDurationSecs] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (session && session.currentIndex < session.questions.length) {
      const start = Date.now() - sessionDurationSecs * 1000;
      interval = setInterval(() => {
        const diff = Date.now() - start;
        const totalSecs = Math.floor(diff / 1000);
        setSessionDurationSecs(totalSecs);
        
        const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSecs % 60).padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, session === null ? null : session.currentIndex >= session.questions.length]);

  // Active Single File Configuration state
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Slicing Range states
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');

  // Cutting Range states
  const [cutStart, setCutStart] = useState<string>('');
  const [cutEnd, setCutEnd] = useState<string>('');

  // Starting position pointer index
  const [continueFromIdx, setContinueFromIdx] = useState<string>('');

  // Double Shuffle states
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);

  // Auto Advance (Automatic mode vs Manual mode)
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);

  // Question Options validation locks
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Custom portaled confirm overlay states
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showDeleteModalId, setShowDeleteModalId] = useState<string | null>(null);
  
  // Custom dashboard error messages
  const [globalConfigError, setGlobalConfigError] = useState<string | null>(null);

  // Collapsible active file config accordion state
  const [expandedFileName, setExpandedFileName] = useState<string | null>(null);

  // Show active session top-right settings dropdown
  const [showSessionSettings, setShowSessionSettings] = useState<boolean>(false);

  // Dynamic on-the-fly parameters adjustment during active test
  const handleUpdateActiveSessionParamsOnTheFly = (
    newShuffleQ: boolean,
    newShuffleO: boolean,
    newAutoAdv: boolean,
    newRangeS: string,
    newRangeE: string,
    newCutS: string,
    newCutE: string
  ) => {
    // Keep parameters in sync
    setShuffleQuestions(newShuffleQ);
    setShuffleOptions(newShuffleO);
    setAutoAdvance(newAutoAdv);
    setRangeStart(newRangeS);
    setRangeEnd(newRangeE);
    setCutStart(newCutS);
    setCutEnd(newCutE);

    if (!session) return;

    const currentQ = session.questions[session.currentIndex];

    // Find the original questions pool representing this session
    let pool: RawQuestion[] = [];
    if (session.type === 'simulation') {
      pool = [...session.originalQuestions];
    } else {
      const sourceFile = files.find(f => session.sourceFiles.includes(f.name));
      if (sourceFile) {
        pool = [...sourceFile.questions];
      } else {
        pool = [...session.originalQuestions];
      }
    }

    const totalCount = pool.length;

    // Apply numerical range slice if set
    if (newRangeS || newRangeE) {
      const s = parseInt(newRangeS) || 1;
      const e = parseInt(newRangeE) || totalCount;
      const validS = Math.max(1, Math.min(s, totalCount));
      const validE = Math.max(validS, Math.min(e, totalCount));
      pool = pool.slice(validS - 1, validE);
    }

    // Apply cuts if set
    if (newCutS && newCutE) {
      const cutS = parseInt(newCutS) || 0;
      const cutE = parseInt(newCutE) || 0;
      if (cutS > 0 && cutE >= cutS) {
        pool = pool.filter(q => q.originalIndex < cutS || q.originalIndex > cutE);
      }
    }

    if (pool.length === 0) {
      alert('ამ პარამეტრებში კითხვები არ მოიძებნა!');
      return;
    }

    // Prepare playable scrambled questions
    const playable = prepareSessionQuestions(pool, newShuffleQ, newShuffleO);

    // Try to preserve current question index
    let newIdx = 0;
    if (currentQ) {
      const foundIdx = playable.findIndex(q => q.id === currentQ.id);
      if (foundIdx !== -1) {
        newIdx = foundIdx;
      }
    }

    setSession({
      ...session,
      questions: playable,
      currentIndex: Math.min(newIdx, Math.max(0, playable.length - 1)),
    });
  };

  // Clock Bedtime Awareness state
  const [isLateNight, setIsLateNight] = useState(false);

  // Synchronize storage
  useEffect(() => {
    localStorage.setItem('med_quiz_files', JSON.stringify(files));
    if (files.length > 0 && !selectedFileName) {
      setSelectedFileName(files[0].name);
    }
  }, [files]);

  useEffect(() => {
    localStorage.setItem('med_quiz_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('med_quiz_flagged', JSON.stringify(flaggedIds));
  }, [flaggedIds]);

  // Update bedtime indicator
  useEffect(() => {
    const checkTime = () => {
      const hrs = new Date().getHours();
      // Midnight (00:00) to 5:00 AM is considered sleep time
      setIsLateNight(hrs === 0 || (hrs > 0 && hrs < 5));
    };
    checkTime();
    const t = setInterval(checkTime, 60000);
    return () => clearInterval(t);
  }, []);

  // Sync selected file fallback when files list is modified
  useEffect(() => {
    if (files.length > 0 && (!selectedFileName || !files.some(f => f.name === selectedFileName))) {
      setSelectedFileName(files[0].name);
    }
  }, [files, selectedFileName]);

  // Derived current loaded file data
  const currentFile = useMemo(() => {
    return files.find((f) => f.name === selectedFileName) || null;
  }, [files, selectedFileName]);

  // Toggle flags
  const handleToggleFlag = (id: string) => {
    setFlaggedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  /**
   * Action: Start practicing a single file with custom ranges, shuffles, cuts, and starting indices.
   */
  const handleStartPractice = (customFileName?: string) => {
    const targetFile = customFileName
      ? (files.find((f) => f.name === customFileName) || null)
      : currentFile;

    if (!targetFile || targetFile.questions.length === 0) return;

    let pool = [...targetFile.questions];
    const totalCount = pool.length;

    // 1. Dynamic range slicing (e.g. "Only questions 50 to 100")
    if (rangeStart || rangeEnd) {
      const start = parseInt(rangeStart) || 1;
      const end = parseInt(rangeEnd) || totalCount;
      const validStart = Math.max(1, Math.min(start, totalCount));
      const validEnd = Math.max(validStart, Math.min(end, totalCount));
      
      // Slices inclusion coordinates (e.g. index 49 to 99 for 50-100)
      pool = pool.slice(validStart - 1, validEnd);
    }

    // 2. Question cut-out cutting (e.g. "Cut out 50 to 60")
    if (cutStart && cutEnd) {
      const cutS = parseInt(cutStart) || 0;
      const cutE = parseInt(cutEnd) || 0;
      if (cutS > 0 && cutE >= cutS) {
        // Exclude questions that fit in original index bounds
        pool = pool.filter((q) => q.originalIndex < cutS || q.originalIndex > cutE);
      }
    }

    if (pool.length === 0) {
      setGlobalConfigError('არჩეული ფილტრაციის პირობებში კითხვები ვერ მოიძებნა. გთხოვთ დააზუსტოთ დიაპაზონები.');
      return;
    }
    setGlobalConfigError(null);

    // Prepare playable scrambled questions
    const playable = prepareSessionQuestions(pool, shuffleQuestions, shuffleOptions);

    // 3. Continue from specific question index
    let startPointer = 0;
    if (continueFromIdx) {
      const targetOriginalIdx = parseInt(continueFromIdx) || 0;
      if (targetOriginalIdx > 0) {
        const foundIndexInPlayable = playable.findIndex((q) => q.originalIndex === targetOriginalIdx);
        if (foundIndexInPlayable !== -1) {
          startPointer = foundIndexInPlayable;
        } else {
          // Fallback, find the closest original index remaining
          const sorted = [...playable].sort((a,b) => Math.abs(a.originalIndex - targetOriginalIdx) - Math.abs(b.originalIndex - targetOriginalIdx));
          if (sorted.length > 0) {
            startPointer = playable.indexOf(sorted[0]);
          }
        }
      }
    }

    setSession({
      type: 'main',
      sourceFiles: [targetFile.name],
      originalQuestions: targetFile.questions,
      questions: playable,
      currentIndex: startPointer,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Action: Start Multi-file mixed simulator exams.
   */
  const handleStartSimulation = (selectedQuestions: RawQuestion[], sourceNames: string[]) => {
    const playable = prepareSessionQuestions(selectedQuestions, true, shuffleOptions);

    setSession({
      type: 'simulation',
      sourceFiles: sourceNames,
      originalQuestions: selectedQuestions,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Action: Practice a saved mistake collection from the mistakes tab.
   */
  const handleStartCollectionPractice = (col: MistakeCollection) => {
    const playable = prepareSessionQuestions(col.questions, true, true);

    setSession({
      type: 'mistakes_only',
      sourceFiles: [col.sourceFile],
      originalQuestions: col.questions,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Action: Practice interim mistakes immediately ("შეცდომების გავლა ახლავე")
   */
  const handlePracticeInterimMistakesNow = () => {
    if (!session) return;

    // Collect all incorrect answers from current session
    const mistakenPlayable: PlayableQuestion[] = [];
    const rawMatches: RawQuestion[] = [];

    session.questions.forEach((q) => {
      const record = session.answers[q.id];
      if (record && !record.isCorrect) {
        mistakenPlayable.push(q);
        const match = session.originalQuestions.find(oq => oq.id === q.id);
        if (match) {
          rawMatches.push(match);
        }
      }
    });

    if (mistakenPlayable.length === 0) return;

    // Scramble the mistakes list so they don't solve it in the same order
    const reshuffledMistakes = prepareSessionQuestions(rawMatches, true, shuffleOptions);

    // Swap session to temporary interim errors practicing mode, storing the main progress index
    setSession({
      ...session,
      type: 'mistakes_interim',
      pausedIndex: session.currentIndex, // Remember main quiz current spot
      questions: reshuffledMistakes,
      currentIndex: 0,
    });

    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Handling answer submissions
   */
  const handleAnswerSelected = (selected: string) => {
    if (!session || selectedAnswer !== null) return;

    const currentQ = session.questions[session.currentIndex];
    const correct = currentQ.correctAnswer === selected;

    setSelectedAnswer(selected);
    setIsCorrect(correct);

    // Save transaction state
    setSession((prev) => {
      if (!prev) return null;
      const updatedAnswers = {
        ...prev.answers,
        [currentQ.id]: { selected, isCorrect: correct },
      };
      return {
        ...prev,
        answers: updatedAnswers,
      };
    });

    // Automatic mode logic:
    // If the answer is correct, immediately move to next question with a brief 600ms delay.
    // If incorrect, auto-advance is disabled, requiring the student to review and click "Next".
    if (correct && autoAdvance) {
      setTimeout(() => {
        advanceNextQuestion();
      }, 650);
    }
  };

  const advanceNextQuestion = () => {
    setSession((prev) => {
      if (!prev) return null;

      const nextIndex = prev.currentIndex + 1;

      if (nextIndex < prev.questions.length) {
        return {
          ...prev,
          currentIndex: nextIndex,
        };
      } else {
        // Finished the current pool
        if (prev.type === 'mistakes_interim') {
          // If finished interim errors branch, automatically return to the saved main spot in the quiz
          return {
            ...prev,
            type: 'main',
            currentIndex: prev.pausedIndex || 0,
            pausedIndex: undefined,
          };
        } else {
          // Terminate full session, routes to results summaries
          return {
            ...prev,
            currentIndex: prev.questions.length, // Triggers finished state
          };
        }
      }
    });

    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleJumpToQuestion = (targetIdx: number) => {
    if (!session) return;
    if (targetIdx >= 0 && targetIdx < session.questions.length) {
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: targetIdx,
        };
      });

      // Clear/Retrieve answer states for the jumped question
      const targetQ = session.questions[targetIdx];
      const answerRecord = session.answers[targetQ.id];
      if (answerRecord) {
        setSelectedAnswer(answerRecord.selected);
        setIsCorrect(answerRecord.isCorrect);
      } else {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }
    }
  };

  /**
   * Re-routing loops
   */
  const handleResultsPracticeMistakes = () => {
    if (!session) return;

    // Filter only mistaken questions from the finished quiz session
    const mistakenRaw: RawQuestion[] = [];
    session.questions.forEach((q) => {
      const record = session.answers[q.id];
      if (record && !record.isCorrect) {
        const rawMatch = session.originalQuestions.find((oq) => oq.id === q.id);
        if (rawMatch) {
          mistakenRaw.push(rawMatch);
        }
      }
    });

    if (mistakenRaw.length === 0) return;

    const playable = prepareSessionQuestions(mistakenRaw, true, shuffleOptions);

    setSession({
      type: 'mistakes_only',
      sourceFiles: session.sourceFiles,
      originalQuestions: mistakenRaw,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleResultsReviewFlagged = () => {
    if (!session) return;

    // Filter questions that the user starred during the quiz or already has starred
    const flaggedRaw: RawQuestion[] = [];
    session.questions.forEach((q) => {
      if (flaggedIds.includes(q.id)) {
        const rawMatch = session.originalQuestions.find((oq) => oq.id === q.id);
        if (rawMatch) {
          flaggedRaw.push(rawMatch);
        }
      }
    });

    if (flaggedRaw.length === 0) {
      return;
    }

    const playable = prepareSessionQuestions(flaggedRaw, true, shuffleOptions);

    setSession({
      type: 'flagged_only',
      sourceFiles: session.sourceFiles,
      originalQuestions: flaggedRaw,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleSaveMistakesToHistory = (customName: string, subset: RawQuestion[]) => {
    const freshCollection: MistakeCollection = {
      id: `mistake-col-${Date.now()}`,
      name: customName,
      timestamp: new Date().toLocaleDateString('ka-GE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sourceFile: session?.sourceFiles.join(', ') || 'ბაზა',
      questions: subset,
      completedCount: subset.length,
      successRate: session ? Math.round(((session.questions.length - subset.length) / session.questions.length) * 100) : 0,
    };

    setHistory([freshCollection, ...history]);
  };

  const handleDeleteHistoryCollection = (id: string) => {
    setShowDeleteModalId(id);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0C10] font-sans transition-colors duration-200">
      
      {/* Late bedtime system-wide alert warning */}
      {isLateNight && (
        <div id="bedtime-warning-banner" className="bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <Moon className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
          <span>შეხედე საათს! ძილის დროა. 🌙 გამეორება ხვალაც შეიძლება!</span>
        </div>
      )}

      {/* Modern High-End Nav Header bar - Styled à la Medcore Bento Grid */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] gap-4 transition-all">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSession(null)}>
            <div className="w-10 h-10 bg-teal-600 dark:bg-teal-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(13,148,136,0.2)] dark:shadow-[0_0_15px_rgba(45,212,191,0.4)] text-white select-none">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                MEDCORE
                <span className="text-teal-600 dark:text-teal-400 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 border border-teal-200 dark:border-teal-800 rounded-full bg-teal-50 dark:bg-teal-950/30">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-450 dark:text-slate-500 font-semibold">
                ინტელექტუალური სამედიცინო სიმულატორი
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <ThemeToggle />
          </div>
        </header>
      </div>

      {/* Main Container Workspace */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Practicing State View OR Configuration tab Dashboard */}
        {session ? (
          <div id="practicing-session-view" className="space-y-6">
            
            {/* Header bar back arrow to return to files config with parameter modifications on the fly */}
            <div className="flex items-center justify-between max-w-2xl mx-auto relative px-1">
              <button
                onClick={() => {
                  setShowCancelModal(true);
                }}
                className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1.5 focus:outline-none bg-slate-100 dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-lg hover:shadow-sm transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                ტესტირების შეწყვეტა
              </button>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    {session.type === 'mistakes_interim' ? 'შეცდომების მინი-გავლა' : session.type === 'simulation' ? 'გამოცდის სიმულაცია' : 'აქტიური რეჟიმი'}
                  </span>
                </div>

                {/* Vertical Ellipsis Three-Dots Button Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowSessionSettings(!showSessionSettings)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205 focus:outline-none transition-all cursor-pointer hover:shadow-sm flex items-center justify-center"
                    title="პარამეტრების სწრაფი მორგება ტესტის დროს"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {showSessionSettings && (
                      <>
                        {/* Overlay backdrop to dismiss dropdown on outer click */}
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setShowSessionSettings(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl z-30 p-4 space-y-4 font-sans text-left"
                        >
                          <div className="border-b border-slate-105 dark:border-slate-800 pb-2 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-450 tracking-wider">
                              პარამეტრების მორგება
                            </span>
                          </div>

                          <div className="space-y-3 font-sans">
                            {/* Toggle Auto Advance */}
                            <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 dark:text-slate-350 select-none">
                              <span className="font-bold">ავტომატური რეჟიმი</span>
                              <input
                                type="checkbox"
                                checked={autoAdvance}
                                onChange={(e) => setAutoAdvance(e.target.checked)}
                                className="rounded text-teal-600 border-slate-200 dark:border-slate-700 h-4 w-4 accent-teal-500 cursor-pointer"
                              />
                            </label>

                            {/* Toggle Shuffle Questions */}
                            <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 dark:text-slate-350 select-none">
                              <span className="font-bold">კითხვების არევა (Shuffle)</span>
                              <input
                                type="checkbox"
                                checked={shuffleQuestions}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  handleUpdateActiveSessionParamsOnTheFly(
                                    val,
                                    shuffleOptions,
                                    autoAdvance,
                                    rangeStart,
                                    rangeEnd,
                                    cutStart,
                                    cutEnd
                                  );
                                }}
                                className="rounded text-teal-600 border-slate-200 dark:border-slate-700 h-4 w-4 accent-teal-500 cursor-pointer"
                              />
                            </label>

                            {/* Toggle Shuffle Options */}
                            <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 dark:text-slate-350 select-none">
                              <span className="font-bold">პასუხების არევა (Options)</span>
                              <input
                                type="checkbox"
                                checked={shuffleOptions}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  handleUpdateActiveSessionParamsOnTheFly(
                                    shuffleQuestions,
                                    val,
                                    autoAdvance,
                                    rangeStart,
                                    rangeEnd,
                                    cutStart,
                                    cutEnd
                                  );
                                }}
                                className="rounded text-teal-600 border-slate-200 dark:border-slate-700 h-4 w-4 accent-teal-500 cursor-pointer"
                              />
                            </label>

                            {/* Range Slices Selection */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                                დიაპაზონის მორგება
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] text-slate-400 font-bold block mb-0.5 uppercase">დან</label>
                                  <input
                                    type="number"
                                    value={rangeStart}
                                    placeholder="მაგ: 1"
                                    onChange={(e) => setRangeStart(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] text-slate-400 font-bold block mb-0.5 uppercase">მდე</label>
                                  <input
                                    type="number"
                                    value={rangeEnd}
                                    placeholder="მაგ: 200"
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Disabling Ranges / Cuts Exclusion */}
                            <div className="pt-2">
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                                კითხვების ამოჭრა (გამოკლება)
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] text-slate-400 font-bold block mb-0.5 uppercase">დასაწყისი</label>
                                  <input
                                    type="number"
                                    value={cutStart}
                                    placeholder="მაგ: 20"
                                    onChange={(e) => setCutStart(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] text-slate-400 font-bold block mb-0.5 uppercase">დასასრული</label>
                                  <input
                                    type="number"
                                    value={cutEnd}
                                    placeholder="მაგ: 35"
                                    onChange={(e) => setCutEnd(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Action apply triggers */}
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateActiveSessionParamsOnTheFly(
                                  shuffleQuestions,
                                  shuffleOptions,
                                  autoAdvance,
                                  rangeStart,
                                  rangeEnd,
                                  cutStart,
                                  cutEnd
                                );
                                setShowSessionSettings(false);
                              }}
                              className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer text-center mt-2"
                            >
                              ✓ ცვლილებების შენახვა
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* If there's an active session index, render single playable question card */}
            {session.currentIndex < session.questions.length ? (
              <QuestionCard
                question={session.questions[session.currentIndex]}
                currentIndex={session.currentIndex}
                totalQuestions={session.questions.length}
                autoAdvance={autoAdvance}
                onAnswerSelected={handleAnswerSelected}
                selectedAnswer={selectedAnswer}
                isCorrect={isCorrect}
                onNext={() => advanceNextQuestion()}
                flagged={flaggedIds.includes(session.questions[session.currentIndex].id)}
                onToggleFlag={() => handleToggleFlag(session.questions[session.currentIndex].id)}
                onPracticeMistakesNow={handlePracticeInterimMistakesNow}
                mistakesCountSoFar={
                  session.questions.filter((q) => {
                    const ans = session.answers[q.id];
                    return ans && !ans.isCorrect;
                  }).length
                }
                isMistakesSession={session.type === 'mistakes_interim'}
                onJumpToQuestion={handleJumpToQuestion}
              />
            ) : (
              // Else, we completed the active session, route to summaries
              <ResultsView
                questions={session.questions}
                answers={session.answers}
                originalQuestions={session.originalQuestions}
                onRestart={() => setSession(null)}
                onPracticeMistakes={handleResultsPracticeMistakes}
                onReviewFlagged={handleResultsReviewFlagged}
                onSaveMistakesToHistory={handleSaveMistakesToHistory}
                flaggedQuestionIds={new Set(flaggedIds)}
                elapsedTime={elapsedTime}
              />
            )}

          </div>
        ) : (
          // Main Dashboard Configuration Hub
          <div id="config-hub-view" className="space-y-8 animate-fade-in">
            
            {/* Banner welcome greeting info */}
            <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.5)] relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              
              <div className="max-w-xl space-y-3 relative z-10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-800/80">
                  სამედიცინო საგამოცდო ასისტენტი
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  სწრაფი და სტრატეგიული მომზადება ლიცენზირებისთვის
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  პლატფორმა შექმნილია მედიცინის სტუდენტებისთვის და რეზიდენტებისთვის დიდი საგამოცდო ბაზების სწრაფი და ეფექტური ათვისებისთვის. შეცდომებზე ორიენტირებული ადაპტური სწავლებით.
                </p>
              </div>
            </div>

            {/* App Nav Workspace Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              {[
                { id: 'all', label: 'ტესტის პარამეტრები', icon: Sliders },
                { id: 'simulation', label: 'საგამოცდო სიმულატორი', icon: Flame },
                { id: 'history', label: 'ჩემი შეცდომები', icon: BookOpen },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'all' | 'simulation' | 'history')}
                    className={`flex-1 py-3 px-2 text-center text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                      isActive
                        ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 font-bold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-teal-500 dark:text-teal-400" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Workspace View switch */}
            <div className="space-y-6">
              
              {/* TAB 1: Config and range filtration setup */}
              {activeTab === 'all' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* File uploader dropzone */}
                  <div className="animate-fade-in">
                    <UploadSection files={files} onFilesChanged={setFiles} />
                  </div>

                  {/* List of active prepared bases with integrated collapsers */}
                  <AnimatePresence mode="popLayout">
                    {files.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-805 pb-3">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-150 flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-teal-500 animate-pulse" />
                            აქტიური საგამოცდო ბაზები ({files.length})
                          </h3>
                          <span className="text-[11px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-bold">
                            ჯამური კითხვები: {files.reduce((a, b) => a + b.questions.length, 0)}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {files.map((file, fileIdx) => {
                            const isExpanded = expandedFileName === file.name;
                            return (
                              <motion.div
                                key={file.name + fileIdx}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="bg-white dark:bg-[#161B22] border border-slate-205 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden hover:border-slate-355 dark:hover:border-slate-755 transition-all duration-300"
                              >
                                {/* File Info Header Row */}
                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-3 bg-teal-55/10 dark:bg-teal-950/20 text-teal-610 dark:text-teal-400 rounded-xl">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                      <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-150 leading-snug">
                                        {file.name}
                                      </h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        ზომა: {file.sizeStr} • <span className="text-teal-600 dark:text-teal-400 font-bold">{file.questions.length} კითხვა</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick Action triggers */}
                                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                    {/* Quick launch button */}
                                    <button
                                      onClick={() => {
                                        setSelectedFileName(file.name);
                                        setRangeStart('');
                                        setRangeEnd('');
                                        setCutStart('');
                                        setCutEnd('');
                                        setContinueFromIdx('');
                                        handleStartPractice(file.name);
                                      }}
                                      className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-500 hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400 text-[#0A0C10] font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none"
                                      title="ტესტის დაწყება"
                                    >
                                      <span>ტესტის დაწყება</span>
                                      <ArrowRight className="h-3.5 w-3.5 text-[#0A0C10]" />
                                    </button>

                                    {/* Parameters / Expand settings panel */}
                                    <button
                                      onClick={() => {
                                        setSelectedFileName(file.name);
                                        setExpandedFileName(isExpanded ? null : file.name);
                                      }}
                                      className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 cursor-pointer outline-none focus:outline-none ${
                                        isExpanded
                                          ? 'border-teal-500/20 bg-teal-50 dark:bg-teal-950/25 text-teal-600 dark:text-teal-400'
                                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-[#64748b] dark:text-[#8b949e]'
                                      }`}
                                    >
                                      <Sliders className="h-3.5 w-3.5 text-teal-555 dark:text-teal-400" />
                                      <span className="hidden md:inline">მორგება</span>
                                      <motion.div
                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="shrink-0"
                                      >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      </motion.div>
                                    </button>

                                    {/* Delete bases */}
                                    <button
                                      onClick={() => {
                                        const updated = files.filter((f) => f.name !== file.name);
                                        setFiles(updated);
                                      }}
                                      className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40"
                                      title="წაშლა"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Collapsible Config settings panel */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                                      className="border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-[#0A0C10]/40 overflow-hidden text-left"
                                    >
                                      <div className="p-4 sm:p-5 space-y-5">
                                        
                                        <div className="flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2">
                                          <Settings className="h-4 w-4 text-teal-500" />
                                          <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            პარამეტრების მორგება — {file.name}
                                          </h5>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                                          {/* Left side options */}
                                          <div className="space-y-4">
                                            {/* Coordinate Slicing fields */}
                                            <div className="space-y-2 rounded-xl p-3.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-sm">
                                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-705 dark:text-slate-300">
                                                <Compass className="h-4 w-4 text-teal-500" />
                                                <span>დიაპაზონის ფილტრაცია</span>
                                              </div>
                                              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed">
                                                დაყავით დიდი ბაზა პატარა მონაკვეთებად და იმუშავეთ მხოლოდ მასზე.
                                              </p>
                                              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                                                <div>
                                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">დან (-დან)</span>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={rangeStart}
                                                    onChange={(e) => setRangeStart(e.target.value)}
                                                    placeholder="მაგ: 50"
                                                    className="w-full mt-1 px-2.5 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-200 text-xs font-mono text-center rounded-lg focus:border-teal-500 outline-none"
                                                  />
                                                </div>
                                                <div>
                                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">მდე (-მდე)</span>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={rangeEnd}
                                                    onChange={(e) => setRangeEnd(e.target.value)}
                                                    placeholder={file.questions.length.toString()}
                                                    className="w-full mt-1 px-2.5 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-200 text-xs font-mono text-center rounded-lg focus:border-teal-500 outline-none"
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Questions cutting segment */}
                                            <div className="space-y-2 rounded-xl p-3.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-sm">
                                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-705 dark:text-slate-300">
                                                <Scissors className="h-4 w-4 text-teal-555" />
                                                <span>კითხვების ამოჭრა ბაზიდან</span>
                                              </div>
                                              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed font-sans">
                                                ამოჭერით უკვე კარგად ნასწავლი ან არასასურველი მონაკვეთები ბაზიდან.
                                              </p>
                                              <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div>
                                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">დაწყება (ამოჭრა)</span>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={cutStart}
                                                    onChange={(e) => setCutStart(e.target.value)}
                                                    placeholder="50"
                                                    className="w-full mt-1 px-2.5 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-200 text-xs font-mono text-center rounded-lg focus:border-teal-500 outline-none"
                                                  />
                                                </div>
                                                <div>
                                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">დასასრული (ამოჭრა)</span>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={cutEnd}
                                                    onChange={(e) => setCutEnd(e.target.value)}
                                                    placeholder="60"
                                                    className="w-full mt-1 px-2.5 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-200 text-xs font-mono text-center rounded-lg focus:border-teal-500 outline-none"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Right side options */}
                                          <div className="space-y-4">
                                            {/* Continuation offset */}
                                            <div className="space-y-2 rounded-xl p-3.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-sm">
                                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <ArrowRight className="h-4 w-4 text-teal-500" />
                                                <span>გაგრძელება კონკრეტული კითხვიდან</span>
                                              </div>
                                              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed">
                                                მიუთითეთ პროგრესის დასაწყისი კითხვის ნომერი.
                                              </p>
                                              <input
                                                type="number"
                                                min="1"
                                                value={continueFromIdx}
                                                onChange={(e) => setContinueFromIdx(e.target.value)}
                                                placeholder="მაგ: 100"
                                                className="w-full mt-1.5 px-3 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-200 text-xs font-mono rounded-lg focus:border-teal-500 outline-none"
                                              />
                                            </div>

                                            {/* Shuffling parameters */}
                                            <div className="space-y-2.5 rounded-xl p-3.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-sm">
                                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Sliders className="h-4 w-4 text-teal-500" />
                                                <span>ორმაგი არევა (Double Shuffle)</span>
                                              </div>
                                              <div className="space-y-2 pt-1 text-left">
                                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                                  <input
                                                    type="checkbox"
                                                    checked={shuffleQuestions}
                                                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                                                    className="rounded text-teal-600 focus:ring-teal-550 border-slate-200 dark:border-slate-750 h-4 w-4 accent-teal-500 cursor-pointer"
                                                  />
                                                  <span>კითხვების არევა (Shuffle Questions)</span>
                                                </label>
                                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                                  <input
                                                    type="checkbox"
                                                    checked={shuffleOptions}
                                                    onChange={(e) => setShuffleOptions(e.target.checked)}
                                                    className="rounded text-teal-600 focus:ring-teal-555 border-slate-200 dark:border-slate-755 h-4 w-4 accent-teal-500 cursor-pointer"
                                                  />
                                                  <span>პასუხების არევა (Shuffle Options)</span>
                                                </label>
                                              </div>
                                            </div>

                                            {/* Auto Advance select mode */}
                                            <div className="space-y-2 rounded-xl p-3.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-sm animate-fade-in">
                                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <span>ტესტირების რეჟიმი</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                                                <button
                                                  type="button"
                                                  onClick={() => setAutoAdvance(true)}
                                                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold focus:outline-none transition-all cursor-pointer ${
                                                    autoAdvance
                                                      ? 'bg-teal-500 text-[#0A0C10] font-black shadow-sm border-transparent'
                                                      : 'bg-slate-50 dark:bg-[#0A0C10] text-[#64748b] dark:text-[#8b949e] border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                  }`}
                                                >
                                                  ავტომატური რეჟიმი
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setAutoAdvance(false)}
                                                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold focus:outline-none transition-all cursor-pointer ${
                                                    !autoAdvance
                                                      ? 'bg-teal-500 text-[#0A0C10] font-black shadow-sm border-transparent'
                                                      : 'bg-slate-50 dark:bg-[#0A0C10] text-[#64748b] dark:text-[#8b949e] border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                  }`}
                                                >
                                                  მექანიკური რეჟიმი
                                                </button>
                                              </div>
                                              <p className="text-[9px] text-[#64748b] dark:text-[#8b949e] leading-snug mt-1 font-sans">
                                                {autoAdvance
                                                  ? 'სწორი პასუხის მონიშვნისთანავე იწყება შემდეგი კითხვა ავტომატურად.'
                                                  : 'მორგებულია მშვიდ ტემპზე — შემდეგ კითხვაზე გადასასვლელად ელოდება "შემდეგი" ღილაკს.'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Action Start Submit & Custom Errors inside settings */}
                                        {globalConfigError && selectedFileName === file.name && (
                                          <div className="p-3 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex items-start gap-2 animate-fade-in font-sans">
                                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500 animate-bounce" />
                                            <span>{globalConfigError}</span>
                                          </div>
                                        )}

                                        <div className="flex justify-end pt-1">
                                          <button
                                            type="button"
                                            onClick={() => handleStartPractice(file.name)}
                                            className="w-full px-5 py-3.5 bg-teal-500 hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400 text-[#0A0C10] dark:text-[#0A0C10] font-black rounded-xl text-xs shadow-md shadow-teal-500/10 hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-transparent outline-none"
                                          >
                                            <span>მორგებული ტესტირების დაწყება</span>
                                            <ArrowRight className="h-4 w-4 text-[#0A0C10]" />
                                          </button>
                                        </div>

                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Empty state prompting upload */}
                  {files.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white dark:bg-[#161B22] border border-slate-205 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm max-w-md mx-auto space-y-4"
                    >
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-55/10 dark:bg-teal-950/20 text-[#008080] dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/20 animate-pulse">
                        <FolderOpen className="h-8 w-8" />
                      </div>
                      <div className="space-y-1.5 font-sans">
                        <h3 className="text-sm font-extrabold text-slate-855 dark:text-slate-100">საგამოცდო ბაზები ცარიელია</h3>
                        <p className="text-xs text-slate-500 dark:text-[#8b949e] leading-relaxed">
                          დესკტოპიდან ან მობილურიდან ჩააგდეთ ტექსტური ფაილი, რომელიც მოიცავს ტესტებს მონიშნული სწორი და არასწორი პასუხებით.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Purged old form properties block */}
                  <div className="hidden" />
                </div>
              )}

              {/* TAB 2: Multi-file simulation setups */}
              {activeTab === 'simulation' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {files.length < 1 ? (
                    <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 dark:bg-[#0A0C10] flex items-center justify-center text-slate-400 mb-3">
                        <Sliders className="h-6 w-6 text-teal-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">საგამოცდო ბაზები ცარიელია</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                        საგამოცდო სიმულატორის გამოსაყენებლად გთხოვთ ჯერ ატვირთოთ მინიმუმ 1 ბაზა გვერდზე "ტესტის პარამეტრები".
                      </p>
                    </div>
                  ) : (
                    <SimulationSetup files={files} onStartSimulation={handleStartSimulation} />
                  )}
                </div>
              )}

              {/* TAB 3: Saved mistakes practice history collections */}
              {activeTab === 'history' && (
                <div className="max-w-2xl mx-auto">
                  <MistakesHistory
                    collections={history}
                    onStartCollectionPractice={handleStartCollectionPractice}
                    onDeleteCollection={handleDeleteHistoryCollection}
                  />
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* Elegant minimal footer bar */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800 bg-transparent py-10 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            © 2026 MEDCORE — სპეციალიზებული სამედიცინო ტესტირების სისტემა.
          </p>
          <p className="text-[10px] text-slate-450 dark:text-slate-600 font-sans">
            შექმნილია მედიცინის სტუდენტებისა და ლიცენზირებისთვის მომზადებული რეზიდენტებისთვის.
          </p>
        </div>
      </footer>

      {/* Dynamic Portaled Confirm Cancel Dialog Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 max-w-sm w-full space-y-4 font-sans text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-2 border border-rose-100 dark:border-rose-900/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ტესტირების შეწყვეტა</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  დარწმუნებული ხართ, რომ გსურთ მიმდინარე ტესტირების შეწყვეტა? თქვენი მიმდინარე პროგრესი და პასუხების სტატისტიკა დაიკარგება.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  დაბრუნება
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSession(null);
                    setShowCancelModal(false);
                  }}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
                >
                  შეწყვეტა
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portaled Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteModalId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModalId(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 max-w-sm w-full space-y-4 font-sans text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-2 border border-rose-100 dark:border-rose-900/30">
                <Trash2 className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ნაკრების წაშლა</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ნამდვილად გსურთ ამ შეცდომების ნაკრების წაშლა? მოქმედების გაუქმება შეუძლებელია.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteModalId(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showDeleteModalId) {
                      setHistory(history.filter((h) => h.id !== showDeleteModalId));
                    }
                    setShowDeleteModalId(null);
                  }}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
                >
                  წაშლა
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
