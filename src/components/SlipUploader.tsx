import * as React from "react";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { processSlip, SlipData } from "../lib/gemini";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Upload, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Category } from "../types";

interface SlipUploaderProps {
  userId: string;
  categories: Category[];
  onSuccess: () => void;
}

const MAX_IMAGE_SIDE = 1400;
const COMPRESSED_MIME_TYPE = "image/jpeg";
const COMPRESSED_QUALITY = 0.75;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = dataUrl;
  });
}

async function optimizeImageForAnalysis(
  file: File,
): Promise<{ previewDataUrl: string; base64: string; mimeType: string }> {
  const previewDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(previewDataUrl);

  const scale = Math.min(
    1,
    MAX_IMAGE_SIDE / Math.max(image.width, image.height),
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return {
      previewDataUrl,
      base64: previewDataUrl.split(",")[1],
      mimeType: file.type,
    };
  }

  context.drawImage(image, 0, 0, width, height);
  const optimizedDataUrl = canvas.toDataURL(
    COMPRESSED_MIME_TYPE,
    COMPRESSED_QUALITY,
  );

  return {
    previewDataUrl,
    base64: optimizedDataUrl.split(",")[1],
    mimeType: COMPRESSED_MIME_TYPE,
  };
}

export default function SlipUploader({
  userId,
  categories,
  onSuccess,
}: SlipUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<SlipData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const defaultCategories = {
    expense: [
      "Food",
      "Transport",
      "Shopping",
      "Utilities",
      "Rent",
      "Health",
      "Other",
    ],
    income: ["Salary", "Investment", "Gift", "Other"],
  };

  const acceptedCategories = {
    expense: [
      ...defaultCategories.expense,
      ...categories
        .filter((cat) => cat.type === "expense")
        .map((cat) => cat.name),
    ],
    income: [
      ...defaultCategories.income,
      ...categories
        .filter((cat) => cat.type === "income")
        .map((cat) => cat.name),
    ],
  };

  const availableCategories = extractedData
    ? acceptedCategories[extractedData.type]
    : [];

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setExtractedData(null);
      setSelectedCategory("");

      try {
        const optimized = await optimizeImageForAnalysis(file);
        setPreview(optimized.previewDataUrl);

        const data = await processSlip(
          optimized.base64,
          optimized.mimeType,
          acceptedCategories,
        );
        if (data) {
          setExtractedData(data);
          setSelectedCategory(
            data.requiresCategorySelection ? "" : data.category,
          );

          if (data.requiresCategorySelection) {
            toast.warning(
              "AI category did not match your list. Please choose a category before saving.",
            );
          } else {
            toast.success("Slip processed successfully!");
          }
        } else {
          toast.error("Could not extract data from slip.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Error processing slip.");
      } finally {
        setIsProcessing(false);
      }
    },
    [acceptedCategories],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    multiple: false,
  } as any);

  const handleConfirm = async () => {
    if (!extractedData) return;

    if (extractedData.requiresCategorySelection && !selectedCategory) {
      toast.error("Please select a category before saving.");
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        userId,
        amount: extractedData.amount,
        type: extractedData.type,
        category: selectedCategory || extractedData.category,
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
            ${isDragActive ? "border-emerald-500 bg-emerald-500/10" : "border-slate-200 dark:border-[#2d313d] hover:border-gray-500"}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-200 dark:bg-[#2d313d] rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 md:w-8 md:h-8 text-slate-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-base md:text-lg font-medium">
                Drop your bank slip here
              </p>
              <p className="text-xs md:text-sm text-slate-500 dark:text-gray-500">
                Support PNG, JPG, WEBP
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
              Slip Preview
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#2d313d] bg-black/5 dark:bg-black/20 aspect-4/5 lg:aspect-3/4 flex items-center justify-center max-w-40 md:max-w-60 lg:max-w-none mx-auto">
              <img
                src={preview}
                alt="Slip"
                className="max-h-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-3 md:space-y-6 flex flex-col h-full">
            <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
              Extracted Information
            </p>

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
                  <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400">
                    AI is analyzing your slip...
                  </p>
                </motion.div>
              ) : extractedData ? (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col h-full"
                >
                  <div className="space-y-2 md:space-y-4 max-h-55 md:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      <div className="bg-slate-100 dark:bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                        <p className="text-[8px] md:text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold">
                          Amount
                        </p>
                        <p className="text-base md:text-xl font-bold truncate">
                          ฿ {extractedData.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-100 dark:bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                        <p className="text-[8px] md:text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold">
                          Type
                        </p>
                        <p
                          className={`text-base md:text-xl font-bold capitalize truncate ${extractedData.type === "income" ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {extractedData.type}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                      <p className="text-[8px] md:text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold">
                        Category
                      </p>
                      {extractedData.requiresCategorySelection ? (
                        <div className="space-y-2">
                          <p className="text-[11px] md:text-sm text-amber-300 wrap-break-word">
                            AI suggested "
                            {extractedData.originalCategory ||
                              extractedData.category}
                            ". Choose one from your category list.
                          </p>
                          <Select
                            value={selectedCategory}
                            onValueChange={(value) => {
                              if (value !== null) setSelectedCategory(value);
                            }}
                          >
                            <SelectTrigger className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#3d414d] h-9 md:h-10 text-xs md:text-sm">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
                              {availableCategories.map((categoryName) => (
                                <SelectItem
                                  key={categoryName}
                                  value={categoryName}
                                >
                                  {categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className="text-xs md:text-base font-medium truncate">
                          {selectedCategory || extractedData.category}
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-100 dark:bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                      <p className="text-[8px] md:text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold">
                        Description
                      </p>
                      <p className="text-[11px] md:text-sm text-slate-600 dark:text-gray-300 wrap-break-word line-clamp-2">
                        {extractedData.description || "No description"}
                      </p>
                    </div>

                    <div className="bg-slate-100 dark:bg-[#2d313d] p-2 md:p-3 rounded-xl overflow-hidden">
                      <p className="text-[8px] md:text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold">
                        Date
                      </p>
                      <p className="text-[11px] md:text-sm truncate">
                        {new Date(extractedData.date).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 md:gap-3 pt-3 md:pt-4 mt-auto">
                    <Button
                      variant="outline"
                      className="flex-1 border-slate-300 dark:border-[#2d313d] hover:bg-slate-100 dark:hover:bg-[#2d313d] h-9 md:h-11 text-xs md:text-sm"
                      onClick={() => setPreview(null)}
                    >
                      Retry
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-9 md:h-11 text-xs md:text-sm"
                      onClick={handleConfirm}
                    >
                      Confirm
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 md:h-64 gap-3 md:gap-4 text-rose-400">
                  <XCircle className="w-6 h-6 md:w-8 md:h-8" />
                  <p className="text-xs md:text-sm">Failed to extract data.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreview(null)}
                  >
                    Try Another
                  </Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
