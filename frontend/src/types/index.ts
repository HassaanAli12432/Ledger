// Shared TypeScript types for the frontend

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  currency?: string;
  phoneNumber?: string;
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'HOME' | 'TRIP' | 'COUPLE' | 'OTHER';
  currency: string;
  createdById: string;
  isArchived: boolean;
  createdAt: string;
  members: GroupMember[];
  _count?: { expenses: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: User;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: string | number;
  currency: string;
  category: ExpenseCategory;
  receiptUrl?: string;
  payerId: string;
  groupId?: string;
  splitType: SplitType;
  date: string;
  createdAt: string;
  isDeleted: boolean;
  payer: User;
  splits: ExpenseSplit[];
  group?: { id: string; name: string };
  _count?: { comments: number };
}

export type ExpenseCategory =
  | 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ENTERTAINMENT'
  | 'UTILITIES' | 'HEALTHCARE' | 'SHOPPING' | 'EDUCATION' | 'TRAVEL' | 'OTHER';

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  owedAmount: string | number;
  paidAmount: string | number;
  isPaid: boolean;
  user: User;
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: string | number;
  currency: string;
  groupId?: string;
  note?: string;
  method: string;
  status: string;
  createdAt: string;
  from: User;
  to: User;
  group?: { id: string; name: string };
}

export interface Balances {
  youOwe: number;
  youAreOwed: number;
  netBalance: number;
}

export interface Activity {
  id: string;
  type: string;
  userId: string;
  groupId?: string;
  expenseId?: string;
  settlementId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  group?: { id: string; name: string };
  expense?: { id: string; title: string; amount: string | number };
  settlement?: { id: string; amount: string | number };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
