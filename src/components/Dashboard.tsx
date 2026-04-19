import { lazy, Suspense, useState, useEffect } from "react";
import { User } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Transaction, UserProfile, Category } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Plus,
  Upload,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PieChart,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Settings } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const SlipUploader = lazy(() => import("./SlipUploader"));
const TransactionList = lazy(() => import("./TransactionList"));
const Reports = lazy(() => import("./Reports"));
const TransactionForm = lazy(() => import("./TransactionForm"));
const CategoryManager = lazy(() => import("./CategoryManager"));

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"dashboard" | "reports">("dashboard");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBalanceHighlight, setIsBalanceHighlight] = useState(false);

  useEffect(() => {
    setIsTransactionsLoading(true);
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("date", ">=", Timestamp.fromDate(startOfMonth)),
      where("date", "<=", Timestamp.fromDate(endOfMonth)),
      orderBy("date", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs: Transaction[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        setTransactions(txs);
        setIsTransactionsLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        toast.error("Failed to load transactions.");
        setIsTransactionsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user.uid, currentMonth]);

  useEffect(() => {
    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
    );
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
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const balanceGlowClass =
    balance >= 0
      ? "drop-shadow-[0_0_14px_rgba(16,185,129,0.35)]"
      : "drop-shadow-[0_0_14px_rgba(244,63,94,0.35)]";

  const handleLogout = () => auth.signOut();

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const jumpToMonth = (monthIndex: number) => {
    const next = new Date(currentMonth);
    next.setFullYear(pickerYear, monthIndex, 1);
    setCurrentMonth(next);
    setIsPeriodPickerOpen(false);
  };

  const resetToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now);
    setPickerYear(now.getFullYear());
    setIsPeriodPickerOpen(false);
  };

  useEffect(() => {
    setPickerYear(currentMonth.getFullYear());
  }, [currentMonth]);

  useEffect(() => {
    setIsBalanceHighlight(true);
    const timer = window.setTimeout(() => setIsBalanceHighlight(false), 500);
    return () => window.clearTimeout(timer);
  }, [balance, currentMonth]);

  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const monthOptions = Array.from({ length: 12 }, (_, monthIndex) =>
    new Date(2000, monthIndex, 1).toLocaleString("default", { month: "short" }),
  );
  const sectionFallback = (
    <div className="flex items-center justify-center rounded-2xl border border-slate-200 dark:border-[#2d313d] bg-white/70 dark:bg-[#1a1d26]/70 p-6 text-slate-500 dark:text-gray-400">
      Loading...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 md:p-8 space-y-5 md:space-y-8">
      {/* Header */}
      <header className="flex flex-row justify-between items-center gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-emerald-500 w-5 h-5 md:w-6 md:h-6" />
            SlipSaver
          </h1>
          <p className="text-slate-600 dark:text-gray-300 text-[10px] md:text-sm">
            Welcome back,{" "}
            {profile?.displayName?.split(" ")[0] || user.email?.split("@")[0]}
          </p>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-slate-100/80 dark:hover:bg-[#2d313d]/60"
                >
                  <Settings />
                </Button>
              }
            />
            <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-gray-400">
                  Add, edit, and remove your custom income and expense
                  categories.
                </DialogDescription>
              </DialogHeader>
              <Suspense fallback={sectionFallback}>
                <CategoryManager userId={user.uid} categories={categories} />
              </Suspense>
            </DialogContent>
          </Dialog>
          <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setView(view === "dashboard" ? "reports" : "dashboard")
              }
              className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-slate-100/80 dark:hover:bg-[#2d313d]/60"
            >
              {view === "dashboard" ? <PieChart /> : <TrendingUp />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-rose-100/70 dark:hover:bg-rose-500/10"
            >
              <LogOut />
            </Button>
        </div>
      </header>

      {/* Month Selector & Balance */}
      <div className="relative overflow-hidden bg-linear-to-br from-white to-slate-100 border border-slate-200 dark:from-[#1a1d26] dark:to-[#171a22] dark:border-[#2d313d] rounded-3xl p-4 sm:p-5 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 md:gap-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mb-32" />

        <div className="flex items-center justify-between w-full md:w-auto gap-3 md:gap-6 relative z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth(-1)}
            className="rounded-full border-slate-300 text-slate-700 hover:text-slate-900 dark:border-[#2d313d] dark:text-white hover:bg-slate-100 dark:hover:bg-[#2d313d] w-8 h-8 md:w-10 md:h-10 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-black/30"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="text-center min-w-37.5 sm:min-w-45 md:min-w-55">
            <Dialog
              open={isPeriodPickerOpen}
              onOpenChange={setIsPeriodPickerOpen}
            >
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                      className="mx-auto h-auto rounded-xl px-3 py-1.5 text-[10px] md:text-[10px] text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-[0.15em] md:tracking-[0.2em] font-bold mb-1 flex items-center gap-1.5 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-[#2d313d]/50 hover:scale-[1.03] active:scale-[0.98]"
                  >
                    {monthName}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                }
              />
              <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white max-w-[calc(100%-1.5rem)] sm:max-w-sm shadow-2xl">
                <DialogHeader>
                  <DialogTitle>Select Month & Year</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-gray-400">
                    Jump directly to any month in one tap.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#2d313d] bg-slate-50 dark:bg-[#0f1117] p-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPickerYear((prev) => prev - 1)}
                      className="text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-slate-200/70 dark:hover:bg-[#2d313d]"
                      aria-label="Previous year"
                    >
                      <ChevronLeft />
                    </Button>
                    <p className="text-sm font-bold tracking-wide">{pickerYear}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPickerYear((prev) => prev + 1)}
                      className="text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-slate-200/70 dark:hover:bg-[#2d313d]"
                      aria-label="Next year"
                    >
                      <ChevronRight />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {monthOptions.map((monthLabel, monthIndex) => {
                      const isSelected =
                        currentMonth.getFullYear() === pickerYear &&
                        currentMonth.getMonth() === monthIndex;

                      return (
                        <Button
                          key={monthLabel}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={`${isSelected ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-[#2d313d] dark:text-gray-300 dark:hover:bg-[#2d313d] dark:hover:text-white"} transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]`}
                          onClick={() => jumpToMonth(monthIndex)}
                        >
                          {monthLabel}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-[#2d313d] dark:text-gray-300 dark:hover:bg-[#2d313d] dark:hover:text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                    onClick={resetToCurrentMonth}
                  >
                    Back to current month
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400">
                ฿
              </span>
                <motion.p
                  key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${balance}`}
                  initial={{ opacity: 0.7, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`text-3xl sm:text-3xl md:text-4xl font-black tracking-tighter bg-linear-to-br from-slate-900 to-slate-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent transition-all duration-300 ${isBalanceHighlight ? balanceGlowClass : ""}`}
                >
                  {balance.toLocaleString()}
                </motion.p>
             </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth(1)}
            className="rounded-full border-slate-300 text-slate-700 hover:text-slate-900 dark:border-[#2d313d] dark:text-white hover:bg-slate-100 dark:hover:bg-[#2d313d] w-8 h-8 md:w-10 md:h-10 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-black/30"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 md:gap-4 w-full md:w-auto relative z-10">
          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger
              render={
                 <Button className="w-full sm:w-auto h-11 md:h-12 px-4 md:px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs md:text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/35 active:scale-[0.98] gap-2">
                  <Plus className="w-4 h-4 md:w-5 md:h-5" /> Add Manual
                </Button>
              }
            />
            <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  Add Transaction
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-gray-400">
                  Enter transaction details manually and save them to this
                  month.
                </DialogDescription>
              </DialogHeader>
              <Suspense fallback={sectionFallback}>
                <TransactionForm
                  userId={user.uid}
                  categories={categories}
                  onSuccess={() => setIsManualOpen(false)}
                />
              </Suspense>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                   className="w-full sm:w-auto h-11 md:h-12 px-4 md:px-6 rounded-2xl border-slate-300 text-slate-900 hover:text-slate-900 dark:border-[#2d313d] dark:text-white dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2d313d] text-xs md:text-sm font-semibold transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/25 active:scale-[0.98] gap-2"
                >
                  <Upload className="w-4 h-4 md:w-5 md:h-5" /> Upload Slip
                </Button>
              }
            />
            <DialogContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#1a1d26] dark:border-[#2d313d] dark:text-white max-w-[calc(100%-2rem)] sm:max-w-2xl lg:max-w-3xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Process Bank Slip
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-gray-400">
                  Upload a slip image to extract amount, type, category, and
                  date automatically.
                </DialogDescription>
              </DialogHeader>
              <Suspense fallback={sectionFallback}>
                <SlipUploader
                  userId={user.uid}
                  categories={categories}
                  onSuccess={() => setIsUploaderOpen(false)}
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "dashboard" ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8"
          >
            {/* Summary Cards */}
             <div className="lg:col-span-1 space-y-6">
               <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-[#1a1d26]/70 dark:border-[#2d313d] text-slate-900 dark:text-white overflow-hidden group shadow-lg shadow-emerald-950/20">
                 <div className="h-1 bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors" />
                 <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-400 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-emerald-500" /> Monthly
                     Income
                   </CardTitle>
                 </CardHeader>
                <CardContent>
                   <div className="text-2xl md:text-3xl font-black text-emerald-500 tracking-tighter">
                    ฿ {totalIncome.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-[#1a1d26]/70 dark:border-[#2d313d] text-slate-900 dark:text-white overflow-hidden group shadow-lg shadow-rose-950/20">
                 <div className="h-1 bg-rose-500/50 group-hover:bg-rose-500 transition-colors" />
                 <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-gray-400 flex items-center gap-2">
                     <TrendingDown className="w-3 h-3 text-rose-500" /> Monthly
                     Expense
                   </CardTitle>
                 </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-black text-rose-500 tracking-tighter">
                    ฿ {totalExpense.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <div className="hidden lg:block">
                <Suspense fallback={sectionFallback}>
                  <Reports transactions={transactions} compact />
                </Suspense>
              </div>
            </div>

            {/* Transaction List */}
            <div className="lg:col-span-2">
              <Suspense fallback={sectionFallback}>
                <TransactionList
                  transactions={transactions}
                  userId={user.uid}
                  categories={categories}
                  isLoading={isTransactionsLoading}
                />
              </Suspense>
            </div>

            <div className="lg:hidden">
              <Suspense fallback={sectionFallback}>
                <Reports transactions={transactions} compact />
              </Suspense>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Suspense fallback={sectionFallback}>
              <Reports transactions={transactions} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
