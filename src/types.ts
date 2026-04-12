export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: any; // Firestore Timestamp
  slipUrl?: string;
  createdAt: any;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
}
