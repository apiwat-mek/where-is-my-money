import * as React from 'react';
import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Category, TransactionType } from '../types';
import { toast } from 'sonner';
import { Plus, Tag } from 'lucide-react';

interface CategoryManagerProps {
  userId: string;
  categories: Category[];
}

export default function CategoryManager({ userId, categories }: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6 py-4">
      <form onSubmit={handleAddCategory} className="space-y-4 bg-[#2d313d]/50 p-6 rounded-2xl border border-[#3d414d]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Category Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="bg-[#1a1d26] border-[#1a1d26] h-11"
              placeholder="e.g. Subscriptions"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Type</Label>
            <Select value={type} onValueChange={(v: TransactionType) => setType(v)}>
              <SelectTrigger className="bg-[#1a1d26] border-[#1a1d26] h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d26] border-[#2d313d] text-white">
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
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 p-3 bg-[#2d313d]/30 rounded-xl border border-[#3d414d] hover:border-emerald-500/50 transition-colors group">
              <div className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
              <span className="text-xs font-medium">{cat.name}</span>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-8 text-center border border-dashed border-[#2d313d] rounded-2xl">
              <p className="text-xs text-gray-500">No custom categories yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
