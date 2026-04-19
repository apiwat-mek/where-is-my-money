import * as React from 'react';
import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Category, Transaction, TransactionType } from '../types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface TransactionFormProps {
  userId: string;
  categories: Category[];
  onSuccess: () => void;
  initialData?: Transaction;
}

export default function TransactionForm({ userId, categories, onSuccess, initialData }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(
    initialData?.date 
      ? initialData.date.toDate().toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const data = {
        userId,
        type,
        amount: parseFloat(amount),
        category,
        description,
        date: Timestamp.fromDate(new Date(date)),
        updatedAt: serverTimestamp(),
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'transactions', initialData.id), data);
        toast.success("Transaction updated!");
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success("Transaction added!");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(initialData ? "Failed to update transaction." : "Failed to add transaction.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);
  const defaultCategories = type === 'expense'
    ? ['Food', 'Transport', 'Shopping', 'Utilities', 'Rent', 'Health', 'Other']
    : ['Salary', 'Investment', 'Gift', 'Other'];
  const normalizeCategory = (name: string) => name.trim();
  const sortCategoriesWithOtherLast = (names: string[]) => {
    const withoutOther = names.filter((name) => name.toLowerCase() !== 'other');
    return names.some((name) => name.toLowerCase() === 'other') ? [...withoutOther, 'Other'] : withoutOther;
  };
  const categoryOptions = sortCategoriesWithOtherLast(
    Array.from(
      new Set(
        [...defaultCategories, ...filteredCategories.map((cat) => normalizeCategory(cat.name))].filter(Boolean),
      ),
    ),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-500">Type</Label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-[#2d313d]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense' 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-500">Amount (฿)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-11 text-lg font-bold"
              placeholder="0.00"
              required
            />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-500">Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value ?? '')}>
            <SelectTrigger className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-11">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
              {categoryOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-500">Date</Label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-11 scheme-light dark:scheme-dark"
              required
            />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-500">Description (Optional)</Label>
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-11"
              placeholder="What was this for?"
            />
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={loading} 
        className={`w-full h-12 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
          type === 'income' 
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
            : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
        }`}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : initialData ? 'Update Transaction' : 'Save Transaction'}
      </Button>
    </form>
  );
}
