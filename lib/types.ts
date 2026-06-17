export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Travel"
  | "Other";

export type TransactionType = "expense" | "income" | "transfer";

export type TransactionSource =
  | "manual"
  | "plaid"
  | "schwab"
  | "bofa"
  | "gmail"
  | "receipt";

export type ReviewStatus = "accepted" | "needs_review" | "duplicate" | "ignored";

export interface Transaction {
  id: string;
  amount: number; // positive number, in dollars
  date: string; // ISO yyyy-mm-dd
  postedAt?: string;
  category: Category;
  description: string;
  merchant: string;
  type: TransactionType;
  source: TransactionSource;
  sourceId?: string;
  sourceAccountId?: string;
  rawDescription?: string;
  pending?: boolean;
  reviewStatus: ReviewStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface TransactionInput {
  amount: number;
  date: string;
  category: Category;
  description: string;
  merchant: string;
  type: TransactionType;
}

export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  id: string;
  name: string;
  amount: number; // positive number, in dollars
  billingCycle: BillingCycle;
  nextBillingDate: string; // ISO yyyy-mm-dd
  category: Category;
  merchant: string;
  notes: string;
  createdAt: string; // ISO timestamp
}

/** Fields the user supplies; everything else is filled in on create. */
export type SubscriptionInput = Omit<Subscription, "id" | "createdAt">;

export interface ImportTransactionInput extends TransactionInput {
  source: TransactionSource;
  sourceId?: string;
  sourceAccountId?: string;
  rawDescription?: string;
  pending?: boolean;
  postedAt?: string;
  reviewStatus?: ReviewStatus;
}

export interface ConnectedAccount {
  id: string;
  provider: "plaid" | "gmail" | "receipt";
  institutionName: string;
  accountName?: string;
  accountMask?: string;
  accountType?: string;
  accountSubtype?: string;
  sourceAccountId?: string;
  itemId?: string;
  encryptedAccessToken?: string;
  syncCursor?: string | null;
  status: "connected" | "needs_reauth" | "error";
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDraft {
  id: string;
  source: "gmail" | "receipt";
  fileName?: string;
  messageId?: string;
  merchant: string;
  amount: number;
  date: string;
  rawText?: string;
  confidence: number;
  transactionId?: string;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceData {
  transactions: Transaction[];
  connectedAccounts: ConnectedAccount[];
  importDrafts: ImportDraft[];
}

export interface TransactionStore {
  list(): Promise<Transaction[]>;
  create(input: ImportTransactionInput): Promise<Transaction>;
  update(id: string, input: TransactionInput): Promise<Transaction | null>;
  delete(id: string): Promise<boolean>;
  importMany(inputs: ImportTransactionInput[]): Promise<Transaction[]>;
}

// Compatibility aliases keep the current component filenames usable while the
// domain model moves from expenses to transactions.
export type Expense = Transaction;
export type ExpenseInput = Omit<TransactionInput, "type">;
export type ExpenseSource = TransactionSource;
export type ExpenseStore = {
  load(): Expense[];
  save(expenses: Expense[]): void;
};

export interface SubscriptionStore {
  load(): Subscription[];
  save(subscriptions: Subscription[]): void;
}
