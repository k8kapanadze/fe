/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { FileData } from '../types';
import { parseQuestionFile, formatBytes } from '../utils';

interface UploadSectionProps {
  files: FileData[];
  onFilesChanged: (files: FileData[]) => void;
}

export default function UploadSection({ files, onFilesChanged }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextProcessing = (text: string, name: string) => {
    try {
      const parsed = parseQuestionFile(text, name);
      if (parsed.length === 0) {
        setErrorMsg(`ფაილში "${name}" კითხვები ვერ მოიძებნა. გთხოვთ შეამოწმოთ ფორმატი: (////, //, ///)`);
        setSuccessMsg(null);
        return;
      }

      // Check if file with same name already exists
      if (files.some(f => f.name === name)) {
        setErrorMsg(`ფაილი სახელით "${name}" უკვე ატვირთულია.`);
        setSuccessMsg(null);
        return;
      }

      const newFileData: FileData = {
        name,
        questions: parsed,
        sizeStr: formatBytes(text.length),
      };

      onFilesChanged([...files, newFileData]);
      setSuccessMsg(`ფაილი წარმატებით ჩაიტვირთა — ნაპოვნია ${parsed.length} კითხვა!`);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(`ფაილის დამუშავებისას მოხდა შეცდომა.`);
      setSuccessMsg(null);
    }
  };

  const handleFiles = (fileList: FileList) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
        setErrorMsg('მხოლოდ ტექსტური (.txt) ფაილების ატვირთვაა მხარდაჭერილი.');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        handleTextProcessing(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (idx: number) => {
    const updated = files.filter((_, i) => i !== idx);
    onFilesChanged(updated);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  return (
    <div id="upload-section-container" className="space-y-6">
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Upload className="h-5 w-5 text-teal-500" />
          საბაზო ფაილის იმპორტი
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          ატვირთეთ სამედიცინო ტესტების ბაზა <span className="font-mono text-xs bg-slate-50 dark:bg-[#0A0C10] px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-850">.txt</span> ფორმატში, რომელიც მიყვება ქვემოთ მოცემულ სტრუქტურას.
        </p>

        {/* Format Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-[#0A0C10]/60 p-4 rounded-xl border border-slate-150 dark:border-slate-850 font-sans text-xs">
          <div className="flex gap-2">
            <span className="font-mono text-teal-600 dark:text-teal-400 font-bold text-sm">////</span>
            <div className="text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-300">კითხვის დასაწყისი</strong>
              <div className="mt-0.5 text-[11px]">ყოველი ახალი კითხვა უნდა იწყებოდეს 4 დახრილი ხაზით.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">//</span>
            <div className="text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-300">სწორი პასუხი</strong>
              <div className="mt-0.5 text-[11px]">სწორ პასუხს წინ უნდა უძღოდეს ზუსტად 2 დახრილი ხაზი.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="font-mono text-rose-600 dark:text-rose-450 font-bold text-sm">///</span>
            <div className="text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-300">არასწორი პასუხები</strong>
              <div className="mt-0.5 text-[11px]">არასწორ პასუხებს წინ უნდა უძღოდეთ 3 დახრილი ხაზი.</div>
            </div>
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          id="dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-950/10'
              : 'border-slate-200 dark:border-slate-850 hover:border-teal-500 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#0A0C10]/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.json"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm text-teal-605 dark:text-teal-400">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                ჩააგდეთ ტექსტური ფაილი აქ ან <span className="text-teal-600 dark:text-teal-400 hover:underline">აირჩიეთ ფაილი</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                მხარდაჭერილია მრავალი ფაილის ერთდროული ჩატვირთვაც კროს-ფაილური სიმულაციისთვის
              </p>
            </div>
          </div>
        </div>

        {/* Notification Status alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
