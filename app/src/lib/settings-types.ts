export type CategoryRule = {
  id: number;
  keyword: string;
  category: string;
  priority: number;
};

export type ImportHistoryItem = {
  id: number;
  accountId: number;
  accountName: string;
  filename: string;
  originalFilename: string;
  storedPath: string;
  importedAt: string;
  rowsNew: number;
  rowsDupes: number;
  periodFrom: string | null;
  periodTo: string | null;
};
