export type TransactionListRow = {
  id: number;
  accountId: number;
  accountName: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance: number | null;
  category: string;
  reference: string | null;
  edited: boolean;
};

export type TransactionListResponse = {
  rows: TransactionListRow[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
};

export type TransactionFilters = {
  page?: number;
  accountId?: number;
  category?: string;
  type?: "debit" | "credit";
  search?: string;
  from?: string;
  to?: string;
};
