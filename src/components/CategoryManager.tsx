import * as React from 'react';
import { useState } from 'react';
import { db } from '../lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Category, TransactionType } from '../types';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface CategoryManagerProps {
  userId: string;
  categories: Category[];
}

export default function CategoryManager({ userId, categories }: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [loading, setLoading] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'categories'), {
        userId,
        name,
        type,
        createdAt: new Date(),
      });
      setName('');
      toast.success("Category added!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add category.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory?.id) {
      toast.error('Cannot delete category: missing category ID.');
      return;
    }

    setIsDeleting(true);
    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('type', '==', deletingCategory.type),
        where('category', '==', deletingCategory.name),
      );

      const snapshot = await getDocs(transactionsQuery);

      for (let i = 0; i < snapshot.docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + 500);
        chunk.forEach((txDoc) => {
          batch.update(txDoc.ref, { category: 'Other' });
        });
        await batch.commit();
      }

      await deleteDoc(doc(db, 'categories', deletingCategory.id));

      if (snapshot.size > 0) {
        toast.success(
          `Category deleted. ${snapshot.size} transaction${snapshot.size > 1 ? 's were' : ' was'} reassigned to Other.`,
        );
      } else {
        toast.success('Category deleted!');
      }

      setDeletingCategory(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 py-4">
        <form onSubmit={handleAddCategory} className="space-y-4 bg-slate-100/70 dark:bg-[#2d313d]/50 p-6 rounded-2xl border border-slate-200 dark:border-[#3d414d]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Category Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-slate-200 dark:bg-[#1a1d26] dark:border-[#1a1d26] h-11"
                placeholder="e.g. Subscriptions"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Type</Label>
              <Select value={type} onValueChange={(v: TransactionType) => setType(v)}>
                <SelectTrigger className="bg-white border-slate-200 dark:bg-[#1a1d26] dark:border-[#1a1d26] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </form>

        <div className="space-y-3">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Your Custom Categories</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-[#2d313d]/30 rounded-xl border border-slate-200 dark:border-[#3d414d] hover:border-emerald-500/50 transition-colors group">
                <div className="flex min-w-0 items-center gap-2">
                  <div className={`w-2 h-2 shrink-0 rounded-full ${cat.type === 'income' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                  <span className="text-xs font-medium truncate">{cat.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-slate-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-400/10"
                  onClick={() => setDeletingCategory(cat)}
                  disabled={isDeleting}
                  aria-label={`Delete ${cat.name} category`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="col-span-full py-8 text-center border border-dashed border-slate-200 dark:border-[#2d313d] rounded-2xl">
                <p className="text-xs text-slate-500 dark:text-gray-500">No custom categories yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && !isDeleting && setDeletingCategory(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white shadow-2xl max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <Trash2 className="w-5 h-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-gray-400">
              This will remove the category and reassign matching transactions to
              &nbsp;<span className="font-semibold text-slate-900 dark:text-white">Other</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600 dark:text-gray-300">
              Delete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {deletingCategory?.name}
              </span>
              ?
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-300 dark:border-[#2d313d] hover:bg-slate-100 dark:hover:bg-[#2d313d]"
              onClick={() => setDeletingCategory(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
              onClick={handleDeleteCategory}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
