import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { Transaction, UserProfile, Category } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Plus, 
  Upload, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SlipUploader from './SlipUploader';
import TransactionList from './TransactionList';
import Reports from './Reports';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import TransactionForm from './TransactionForm';
import CategoryManager from './CategoryManager';
import { Settings } from 'lucide-react';

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'dashboard' | 'reports'>('dashboard');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  useEffect(() => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('date', '>=', Timestamp.fromDate(startOfMonth)),
      where('date', '<=', Timestamp.fromDate(endOfMonth)),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(txs);
    }, (error) => {
      console.error("Firestore error:", error);
      toast.error("Failed to load transactions.");
    });

    return () => unsubscribe();
  }, [user.uid, currentMonth]);

  useEffect(() => {
    const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats: Category[] = [];
      snapshot.forEach((doc) => {
        cats.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(cats);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const handleLogout = () => auth.signOut();

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <header className="flex flex-row justify-between items-center gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-emerald-500 w-5 h-5 md:w-6 md:h-6" />
            SlipSaver
          </h1>
          <p className="text-gray-400 text-[10px] md:text-sm">Welcome back, {profile?.displayName?.split(' ')[0] || user.email?.split('@')[0]}</p>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Dialog>
            <DialogTrigger render={
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Settings />
              </Button>
            } />
            <DialogContent className="bg-[#1a1d26] border-[#2d313d] text-white">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <CategoryManager userId={user.uid} categories={categories} />
            </DialogContent>
          </Dialog>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setView(view === 'dashboard' ? 'reports' : 'dashboard')}
            className="text-gray-400 hover:text-white"
          >
            {view === 'dashboard' ? <PieChart /> : <TrendingUp />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-400">
            <LogOut />
          </Button>
        </div>
      </header>

      {/* Month Selector & Balance */}
      <div className="relative overflow-hidden bg-[#1a1d26] border border-[#2d313d] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mb-32" />
        
        <div className="flex items-center gap-4 md:gap-6 relative z-10">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => changeMonth(-1)}
            className="rounded-full border-[#2d313d] hover:bg-[#2d313d] w-8 h-8 md:w-10 md:h-10"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="text-center min-w-[140px] md:min-w-[180px]">
            <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-1">{monthName}</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-xs md:text-sm font-medium text-gray-400">฿</span>
              <p className="text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                {balance.toLocaleString()}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => changeMonth(1)}
            className="rounded-full border-[#2d313d] hover:bg-[#2d313d] w-8 h-8 md:w-10 md:h-10"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div className="flex gap-3 md:gap-4 w-full md:w-auto relative z-10">
          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger render={
              <Button className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs md:text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 gap-2">
                <Plus className="w-4 h-4 md:w-5 md:h-5" /> Add Manual
              </Button>
            } />
            <DialogContent className="bg-[#1a1d26] border-[#2d313d] text-white shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  Add Transaction
                </DialogTitle>
              </DialogHeader>
              <TransactionForm 
                userId={user.uid} 
                categories={categories} 
                onSuccess={() => setIsManualOpen(false)} 
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 rounded-2xl border-[#2d313d] hover:bg-[#2d313d] text-xs md:text-sm font-semibold transition-all hover:scale-105 active:scale-95 gap-2">
                <Upload className="w-4 h-4 md:w-5 md:h-5" /> Upload Slip
              </Button>
            } />
            <DialogContent className="bg-[#1a1d26] border-[#2d313d] text-white max-w-2xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Process Bank Slip
                </DialogTitle>
              </DialogHeader>
              <SlipUploader 
                userId={user.uid} 
                onSuccess={() => setIsUploaderOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Summary Cards */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-[#1a1d26]/50 backdrop-blur-sm border-[#2d313d] text-white overflow-hidden group">
                <div className="h-1 bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-gray-500 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Monthly Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-black text-emerald-500 tracking-tighter">฿ {totalIncome.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1d26]/50 backdrop-blur-sm border-[#2d313d] text-white overflow-hidden group">
                <div className="h-1 bg-rose-500/50 group-hover:bg-rose-500 transition-colors" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-gray-500 flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-rose-500" /> Monthly Expense
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-black text-rose-500 tracking-tighter">฿ {totalExpense.toLocaleString()}</div>
                </CardContent>
              </Card>

              <div className="hidden lg:block">
                <Reports transactions={transactions} compact />
              </div>
            </div>

            {/* Transaction List */}
            <div className="lg:col-span-2">
              <TransactionList 
                transactions={transactions} 
                userId={user.uid}
                categories={categories}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Reports transactions={transactions} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
