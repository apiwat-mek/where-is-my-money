import * as React from 'react';
import { useState } from 'react';
import { Transaction, Category } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  ShoppingBag, 
  Utensils, 
  Car, 
  Zap, 
  Home, 
  Heart, 
  MoreHorizontal, 
  DollarSign,
  Edit2,
  Trash2,
  Loader2,
  FileText,
  BusFront,
  Briefcase,
  Gift,
  Wrench,
  HandCoins,
  Upload,
  RotateCcw,
  Sparkles,
  Search,
  Tag,
  Clock3,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { deleteDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import TransactionForm from './TransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  userId: string;
  categories: Category[];
  isLoading?: boolean;
}

type IconPreset = {
  key: string;
  label: string;
  icon: LucideIcon;
  className: string;
};

const ICON_PRESETS: IconPreset[] = [
  { key: 'food', label: 'Food', icon: Utensils, className: 'text-orange-400' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, className: 'text-blue-400' },
  { key: 'transport', label: 'Transport', icon: BusFront, className: 'text-purple-400' },
  { key: 'home', label: 'Home', icon: Home, className: 'text-indigo-400' },
  { key: 'health', label: 'Health', icon: Heart, className: 'text-rose-400' },
  { key: 'work', label: 'Work', icon: Briefcase, className: 'text-cyan-400' },
  { key: 'salary', label: 'Salary', icon: HandCoins, className: 'text-emerald-500' },
  { key: 'utilities', label: 'Utilities', icon: Wrench, className: 'text-yellow-400' },
  { key: 'gift', label: 'Gift', icon: Gift, className: 'text-fuchsia-400' },
  { key: 'more', label: 'More', icon: MoreHorizontal, className: 'text-slate-400' },
];

const getDefaultCategoryIcon = (category: string, type: string) => {
  const cat = category.toLowerCase();
  if (type === 'income') return <DollarSign className="w-5 h-5 text-emerald-500" />;
  
  if (cat.includes('food') || cat.includes('eat')) return <Utensils className="w-5 h-5 text-orange-400" />;
  if (cat.includes('shop')) return <ShoppingBag className="w-5 h-5 text-blue-400" />;
  if (cat.includes('transport') || cat.includes('car')) return <Car className="w-5 h-5 text-purple-400" />;
  if (cat.includes('util') || cat.includes('bill')) return <Zap className="w-5 h-5 text-yellow-400" />;
  if (cat.includes('rent') || cat.includes('home')) return <Home className="w-5 h-5 text-indigo-400" />;
  if (cat.includes('health')) return <Heart className="w-5 h-5 text-rose-400" />;
  
  return <MoreHorizontal className="w-5 h-5 text-gray-400" />;
};

type PendingDeletion = {
  timeoutId: ReturnType<typeof setTimeout>;
  transaction: Transaction;
};

const DELETE_UNDO_MS = 5000;

export default function TransactionList({ transactions, userId, categories, isLoading = false }: TransactionListProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [pendingDeletions, setPendingDeletions] = useState<Record<string, PendingDeletion>>({});
  const [iconEditingTransaction, setIconEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingIcon, setIsUpdatingIcon] = useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingDeletionsRef = React.useRef<Record<string, PendingDeletion>>({});

  const currentPresetKey =
    iconEditingTransaction?.iconImage
      ? null
      : iconEditingTransaction?.iconKey ?? 'default';

  const minAmountValue = minAmount.trim() === '' ? null : Number(minAmount);
  const maxAmountValue = maxAmount.trim() === '' ? null : Number(maxAmount);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizeCategory = (name: string) => name.trim();
  const sortCategoriesWithOtherLast = (names: string[]) => {
    const withoutOther = names
      .filter((name) => name.toLowerCase() !== 'other')
      .sort((a, b) => a.localeCompare(b));
    return names.some((name) => name.toLowerCase() === 'other') ? [...withoutOther, 'Other'] : withoutOther;
  };

  const availableCategoryFilters = sortCategoriesWithOtherLast(
    Array.from(
      new Set(
        [
          ...categories
            .filter((cat) => typeFilter === 'all' || cat.type === typeFilter)
            .map((cat) => normalizeCategory(cat.name))
            .filter(Boolean),
          ...transactions
            .filter((tx) => typeFilter === 'all' || tx.type === typeFilter)
            .map((tx) => normalizeCategory(tx.category))
            .filter(Boolean),
        ],
      ),
    ),
  );
  const categoryFilterLabel = categoryFilter === 'all' ? 'All categories' : categoryFilter;

  React.useEffect(() => {
    if (categoryFilter !== 'all' && !availableCategoryFilters.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [availableCategoryFilters, categoryFilter]);

  const filteredTransactions = transactions.filter((tx) => {
    if (tx.id && pendingDeletions[tx.id]) return false;
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

    if (normalizedSearch) {
      const haystack = `${tx.category} ${tx.description || ''}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (minAmountValue !== null && !Number.isNaN(minAmountValue) && tx.amount < minAmountValue) {
      return false;
    }

    if (maxAmountValue !== null && !Number.isNaN(maxAmountValue) && tx.amount > maxAmountValue) {
      return false;
    }

    return true;
  });

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchTerm.trim() !== '' ||
    minAmount.trim() !== '' ||
    maxAmount.trim() !== '';

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
  };

  const handleDelete = async () => {
    if (!deletingTransactionId) return;

    const transactionToDelete = transactions.find((tx) => tx.id === deletingTransactionId);
    if (!transactionToDelete?.id) {
      toast.error('Unable to queue deletion for this transaction.');
      setDeletingTransactionId(null);
      return;
    }

    setIsDeleting(true);
    const txId = transactionToDelete.id;
    const timeoutId = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, 'transactions', txId));
        toast.success('Transaction deleted.');
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete transaction.');
      } finally {
        setPendingDeletions((prev) => {
          const next = { ...prev };
          delete next[txId];
          return next;
        });
      }
    }, DELETE_UNDO_MS);

    setPendingDeletions((prev) => ({
      ...prev,
      [txId]: {
        timeoutId,
        transaction: transactionToDelete,
      },
    }));

    toast('Transaction queued for deletion.', {
      duration: DELETE_UNDO_MS,
      description: 'You can undo within 5 seconds.',
      action: {
        label: 'Undo',
        onClick: () => {
          setPendingDeletions((prev) => {
            const entry = prev[txId];
            if (!entry) return prev;
            clearTimeout(entry.timeoutId);
            const next = { ...prev };
            delete next[txId];
            return next;
          });
          toast.success('Deletion canceled.');
        },
      },
    });

    setDeletingTransactionId(null);
    setIsDeleting(false);
  };

  React.useEffect(() => {
    pendingDeletionsRef.current = pendingDeletions;
  }, [pendingDeletions]);

  React.useEffect(() => {
    return () => {
      Object.values(pendingDeletionsRef.current).forEach((entry) => {
        clearTimeout(entry.timeoutId);
      });
    };
  }, []);

  const handleChoosePreset = async (presetKey: string) => {
    if (!iconEditingTransaction?.id) return;

    setIsUpdatingIcon(true);
    try {
      await updateDoc(doc(db, 'transactions', iconEditingTransaction.id), {
        iconKey: presetKey,
        iconImage: deleteField(),
      });
      toast.success('Icon updated!');
      setIconEditingTransaction(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update icon.');
    } finally {
      setIsUpdatingIcon(false);
    }
  };

  const handleResetToAutoIcon = async () => {
    if (!iconEditingTransaction?.id) return;

    setIsUpdatingIcon(true);
    try {
      await updateDoc(doc(db, 'transactions', iconEditingTransaction.id), {
        iconKey: deleteField(),
        iconImage: deleteField(),
      });
      toast.success('Icon reset to automatic.');
      setIconEditingTransaction(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to reset icon.');
    } finally {
      setIsUpdatingIcon(false);
    }
  };

  const fileToIconDataUrl = async (file: File): Promise<string> => {
    const readAsDataUrl = () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    const dataUrl = await readAsDataUrl();
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    if (!context) return dataUrl;

    context.clearRect(0, 0, size, size);
    const scale = Math.max(size / image.width, size / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const offsetX = (size - drawWidth) / 2;
    const offsetY = (size - drawHeight) / 2;
    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleUploadCustomIcon = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !iconEditingTransaction?.id) return;

    setIsUpdatingIcon(true);
    try {
      const iconDataUrl = await fileToIconDataUrl(file);
      await updateDoc(doc(db, 'transactions', iconEditingTransaction.id), {
        iconImage: iconDataUrl,
        iconKey: deleteField(),
      });
      toast.success('Custom icon updated!');
      setIconEditingTransaction(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload icon.');
    } finally {
      setIsUpdatingIcon(false);
      event.target.value = '';
    }
  };

  const renderIcon = (tx: Transaction) => {
    if (tx.iconImage) {
      return (
        <img
          src={tx.iconImage}
          alt={`${tx.category} icon`}
          className="w-5 h-5 rounded object-cover"
        />
      );
    }

    const preset = ICON_PRESETS.find((item) => item.key === tx.iconKey);
    if (preset) {
      const Icon = preset.icon;
      return <Icon className={`w-5 h-5 ${preset.className}`} />;
    }

    return getDefaultCategoryIcon(tx.category, tx.type);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-[#1a1d26]/50 dark:border-[#2d313d] text-slate-900 dark:text-white overflow-hidden">
        <CardHeader className="border-b border-slate-200 dark:border-[#2d313d] bg-slate-50/80 dark:bg-[#1a1d26]/30">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200 dark:divide-[#2d313d]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200 dark:bg-[#2d313d]" />
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="h-3.5 rounded bg-slate-200 dark:bg-[#2d313d] w-28" />
                      <div className="h-2.5 rounded bg-slate-200 dark:bg-[#2d313d] w-44" />
                    </div>
                  </div>
                  <div className="h-4 rounded bg-slate-200 dark:bg-[#2d313d] w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-[#1a1d26]/50 dark:border-[#2d313d] text-slate-900 dark:text-white overflow-hidden">
        <CardHeader className="border-b border-slate-200 dark:border-[#2d313d] bg-slate-50/80 dark:bg-[#1a1d26]/30">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-14 text-slate-500 dark:text-gray-400 space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-[#1b2c28] dark:to-[#1c2a37] rounded-2xl flex items-center justify-center border border-slate-200 dark:border-[#2d313d]">
            <PartyPopper className="w-7 h-7 text-emerald-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">All clear for this month ✨</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">Add your first transaction or upload a slip to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-[#1a1d26]/50 dark:border-[#2d313d] text-slate-900 dark:text-white overflow-hidden transition-shadow duration-300 hover:shadow-xl hover:shadow-emerald-950/10">
        <CardHeader className="border-b border-slate-200 dark:border-[#2d313d] bg-slate-50/80 dark:bg-[#1a1d26]/30">
          <div className="space-y-3">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              Recent Transactions
            </CardTitle>

            <div className="rounded-2xl border border-slate-200 dark:border-[#2d313d] bg-white/70 dark:bg-[#0f1117]/60 p-2 sm:p-3 space-y-2 transition-all duration-300 hover:border-emerald-200 dark:hover:border-emerald-500/20">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search category or description"
                    className="pl-9 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-9 sm:h-10 text-sm transition-all duration-200 focus-visible:ring-emerald-500/20"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 dark:border-[#2d313d] bg-slate-100/80 dark:bg-[#0f1117] p-1 sm:w-[300px]">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 active:scale-[0.97] ${
                      typeFilter === 'all'
                        ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#171a22]'
                    }`}
                    onClick={() => setTypeFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 active:scale-[0.97] ${
                      typeFilter === 'income'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#171a22]'
                    }`}
                    onClick={() => setTypeFilter('income')}
                  >
                    Income
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 active:scale-[0.97] ${
                      typeFilter === 'expense'
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#171a22]'
                    }`}
                    onClick={() => setTypeFilter('expense')}
                  >
                    Expense
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-9 sm:h-10 px-3 transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-500/40">
                    <span className="flex items-center gap-2 min-w-0">
                      <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0" />
                      <span
                        className={`text-xs sm:text-sm truncate ${
                          categoryFilter === 'all'
                            ? 'text-slate-500 dark:text-gray-400'
                            : 'text-slate-700 dark:text-gray-200 font-medium'
                        }`}
                      >
                        {categoryFilterLabel}
                      </span>
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
                    <SelectItem value="all">All categories</SelectItem>
                    {availableCategoryFilters.map((categoryName) => (
                      <SelectItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minAmount}
                  onChange={(event) => setMinAmount(event.target.value)}
                  placeholder="Min ฿"
                  className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-9 sm:h-10 text-sm transition-all duration-200 focus-visible:ring-emerald-500/20"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxAmount}
                  onChange={(event) => setMaxAmount(event.target.value)}
                  placeholder="Max ฿"
                  className="bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2d313d] h-9 sm:h-10 text-sm transition-all duration-200 focus-visible:ring-emerald-500/20"
                />
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-300 dark:border-[#2d313d] h-9 sm:h-10 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <div className="hidden lg:block" />
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-gray-400">
                {filteredTransactions.length} / {transactions.length} shown
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200 dark:divide-[#2d313d]">
            {filteredTransactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start sm:items-center justify-between p-3 sm:p-4 hover:bg-slate-100 dark:hover:bg-[#2d313d]/50 transition-all duration-200 group relative overflow-hidden gap-2 sm:hover:translate-x-0.5"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'} opacity-50`} />
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIconEditingTransaction(tx)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-[#0f1117] flex items-center justify-center border border-slate-200 dark:border-[#2d313d] shadow-inner hover:border-emerald-500/60 hover:bg-slate-200 dark:hover:bg-[#171c28] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35)] dark:hover:shadow-[0_0_0_1px_rgba(16,185,129,0.55)] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
                    aria-label={`Change icon for ${tx.category}`}
                    title="Change icon"
                  >
                    {renderIcon(tx)}
                  </button>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.category}</p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-500 font-mono md:hidden">
                      {tx.date.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-500 truncate max-w-[180px] sm:max-w-[300px] md:hidden">
                      {tx.description || 'No description'}
                    </p>
                    <p className="hidden md:block text-[11px] text-slate-500 dark:text-gray-500 truncate max-w-[380px]">
                      {tx.date.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {tx.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2 md:gap-4 shrink-0">
                  <div className="text-right">
                    <p className={`font-bold text-sm md:text-base ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'} ฿ {tx.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform translate-x-0 lg:translate-x-2 lg:group-hover:translate-x-0">
                    <Button 
                      variant="ghost" 
                      size="icon-xs" 
                      onClick={() => setEditingTransaction(tx)}
                      className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#3d414d] w-8 h-8 md:w-9 md:h-9 transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-xs" 
                      onClick={() => setDeletingTransactionId(tx.id)}
                      className="text-slate-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-400/10 w-8 h-8 md:w-9 md:h-9 transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="py-12 px-4 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#202433] border border-slate-200 dark:border-[#2d313d] flex items-center justify-center mb-3">
                  <Clock3 className="w-6 h-6 text-slate-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">No matching transactions</p>
                <p className="text-xs mt-1 text-slate-500 dark:text-gray-400">Try widening your filters a little.</p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-slate-300 dark:border-[#2d313d]"
                    onClick={clearFilters}
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-500" />
              Edit Transaction
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-gray-400">
              Update the selected transaction details and save your changes.
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <TransactionForm 
              userId={userId} 
              categories={categories} 
              onSuccess={() => setEditingTransaction(null)}
              initialData={editingTransaction}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Icon Customization Dialog */}
      <Dialog open={!!iconEditingTransaction} onOpenChange={(open) => !open && setIconEditingTransaction(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white shadow-2xl max-w-[calc(100%-1.5rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Customize Icon
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-gray-400">
              Choose a preset icon or upload your own image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-[#2d313d] bg-slate-50 dark:bg-[#0f1117] p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#171a22] border border-slate-200 dark:border-[#2d313d] flex items-center justify-center">
                {iconEditingTransaction ? renderIcon(iconEditingTransaction) : null}
              </div>
              <div>
                <p className="text-sm font-semibold">{iconEditingTransaction?.category}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">Pick what this transaction should look like.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={currentPresetKey === 'default' ? 'default' : 'outline'}
                className={currentPresetKey === 'default' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'border-slate-300 dark:border-[#2d313d]'}
                onClick={handleResetToAutoIcon}
                disabled={isUpdatingIcon}
              >
                Auto
              </Button>
              {ICON_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = currentPresetKey === preset.key;
                return (
                  <Button
                    key={preset.key}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    className={
                      isSelected
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-700 dark:border-[#2d313d] dark:text-gray-300'
                    }
                    onClick={() => handleChoosePreset(preset.key)}
                    disabled={isUpdatingIcon}
                    title={preset.label}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : preset.className}`} />
                  </Button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-slate-300 dark:border-[#2d313d]"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUpdatingIcon}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload image
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-slate-600 dark:text-gray-300"
                onClick={handleResetToAutoIcon}
                disabled={isUpdatingIcon}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadCustomIcon}
            />

            {isUpdatingIcon && (
              <div className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving icon...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTransactionId} onOpenChange={(open) => !open && setDeletingTransactionId(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white shadow-2xl max-w-[calc(100%-1.5rem)] sm:max-w-xs p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 space-y-2">
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <span className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </span>
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-gray-400 leading-relaxed">
              This action permanently removes the selected transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 px-3 py-2.5">
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                Are you sure you want to delete this transaction?
                <br />
                <span className="font-medium text-rose-500 dark:text-rose-400">This action cannot be undone.</span>
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-[#2d313d] flex gap-2.5">
            <Button variant="outline" className="flex-1 border-slate-300 dark:border-[#2d313d] hover:bg-slate-100 dark:hover:bg-[#2d313d] h-10" onClick={() => setDeletingTransactionId(null)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 h-10" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
