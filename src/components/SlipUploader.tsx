import * as React from 'react';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { processSlip, SlipData } from '../lib/gemini';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface SlipUploaderProps {
  userId: string;
  onSuccess: () => void;
}

export default function SlipUploader({ userId, onSuccess }: SlipUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<SlipData | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setPreview(reader.result as string);
      setIsProcessing(true);
      
      try {
        const data = await processSlip(base64, file.type);
        if (data) {
          setExtractedData(data);
          toast.success("Slip processed successfully!");
        } else {
          toast.error("Could not extract data from slip.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Error processing slip.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    multiple: false
  } as any);

  const handleConfirm = async () => {
    if (!extractedData) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        userId,
        amount: extractedData.amount,
        type: extractedData.type,
        category: extractedData.category,
        description: extractedData.description,
        date: Timestamp.fromDate(new Date(extractedData.date)),
        createdAt: serverTimestamp(),
      });
      toast.success("Transaction saved!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save transaction.");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 py-2 md:py-4">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all
            ${isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2d313d] hover:border-gray-500'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-[#2d313d] rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-base md:text-lg font-medium">Drop your bank slip here</p>
              <p className="text-xs md:text-sm text-gray-500">Support PNG, JPG, WEBP</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <p className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Slip Preview</p>
            <div className="rounded-xl overflow-hidden border border-[#2d313d] bg-black/20 aspect-[4/5] lg:aspect-[3/4] flex items-center justify-center max-w-[160px] md:max-w-[240px] lg:max-w-none mx-auto">
              <img src={preview} alt="Slip" className="max-h-full object-contain" />
            </div>
          </div>

          <div className="space-y-3 md:space-y-6 flex flex-col h-full">
            <p className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Extracted Information</p>
            
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-40 md:h-64 gap-3 md:gap-4"
                >
                  <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-500 animate-spin" />
                  <p className="text-xs md:text-sm text-gray-400">AI is analyzing your slip...</p>
                </motion.div>
              ) : extractedData ? (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col h-full"
                >
                  <div className="space-y-2 md:space-y-4 max-h-[220px] md:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      <div className="bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                        <p className="text-[8px] md:text-[10px] uppercase text-gray-500 font-bold">Amount</p>
                        <p className="text-base md:text-xl font-bold truncate">฿ {extractedData.amount.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                        <p className="text-[8px] md:text-[10px] uppercase text-gray-500 font-bold">Type</p>
                        <p className={`text-base md:text-xl font-bold capitalize truncate ${extractedData.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {extractedData.type}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                      <p className="text-[8px] md:text-[10px] uppercase text-gray-500 font-bold">Category</p>
                      <p className="text-xs md:text-base font-medium truncate">{extractedData.category}</p>
                    </div>

                    <div className="bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                      <p className="text-[8px] md:text-[10px] uppercase text-gray-500 font-bold">Description</p>
                      <p className="text-[11px] md:text-sm text-gray-300 break-words line-clamp-2">{extractedData.description || 'No description'}</p>
                    </div>

                    <div className="bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                      <p className="text-[8px] md:text-[10px] uppercase text-gray-500 font-bold">Date</p>
                      <p className="text-[11px] md:text-sm truncate">{new Date(extractedData.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 md:gap-3 pt-3 md:pt-4 mt-auto">
                    <Button variant="outline" className="flex-1 border-[#2d313d] h-9 md:h-11 text-xs md:text-sm" onClick={() => setPreview(null)}>
                      Retry
                    </Button>
                    <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-9 md:h-11 text-xs md:text-sm" onClick={handleConfirm}>
                      Confirm
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 md:h-64 gap-3 md:gap-4 text-rose-400">
                  <XCircle className="w-6 h-6 md:w-8 md:h-8" />
                  <p className="text-xs md:text-sm">Failed to extract data.</p>
                  <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Try Another</Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
