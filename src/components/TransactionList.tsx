import * as React from 'react';
import { useState } from 'react';
import { Transaction, Category } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
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
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import TransactionForm from './TransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  userId: string;
  categories: Category[];
}

const getCategoryIcon = (category: string, type: string) => {
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

export default function TransactionList({ transactions, userId, categories }: TransactionListProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingTransactionId) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'transactions', deletingTransactionId));
      toast.success("Transaction deleted!");
      setDeletingTransactionId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <Card className="bg-[#1a1d26]/50 backdrop-blur-sm border-[#2d313d] text-white">
        <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500 space-y-4">
          <div className="w-16 h-16 bg-[#2d313d] rounded-full flex items-center justify-center">
            <DollarSign className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-sm">No transactions found for this month.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-[#1a1d26]/50 backdrop-blur-sm border-[#2d313d] text-white overflow-hidden">
        <CardHeader className="border-b border-[#2d313d] bg-[#1a1d26]/30">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#2d313d]">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-[#2d313d]/50 transition-colors group relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'} opacity-50`} />
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0f1117] flex items-center justify-center border border-[#2d313d] shadow-inner">
                    {getCategoryIcon(tx.category, tx.type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.category}</p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {tx.date.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {tx.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
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
                      className="text-gray-400 hover:text-white hover:bg-[#3d414d] w-8 h-8 md:w-9 md:h-9"
                    >
                      <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-xs" 
                      onClick={() => setDeletingTransactionId(tx.id)}
                      className="text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 w-8 h-8 md:w-9 md:h-9"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent className="bg-[#1a1d26] border-[#2d313d] text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-500" />
              Edit Transaction
            </DialogTitle>
            <DialogDescription className="text-gray-400">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTransactionId} onOpenChange={(open) => !open && setDeletingTransactionId(null)}>
        <DialogContent className="bg-[#1a1d26] border-[#2d313d] text-white shadow-2xl max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <Trash2 className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This action permanently removes the selected transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-400 leading-relaxed">Are you sure you want to delete this transaction? This action cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-[#2d313d] hover:bg-[#2d313d]" onClick={() => setDeletingTransactionId(null)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20" 
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
