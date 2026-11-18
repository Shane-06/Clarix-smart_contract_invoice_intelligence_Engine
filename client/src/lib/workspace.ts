export type ContractSummary = {
  id: string;
  title: string;
  summary: string | null;
  riskScore: number | null;
  status: string;
  isDemo: boolean;
  createdAt: string;
  _count: { milestones: number; invoices: number };
};

export type Milestone = {
  id: string;
  title: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  contractId: string;
  contract: { title: string };
};

export type Invoice = {
  id: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
  contractId: string;
  milestoneId: string | null;
  contract: { title: string };
  milestone: { title: string } | null;
  payments: { id: string; amount: number; method: string; date: string }[];
};

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const timestamp = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDate(value: string) {
  return date.format(new Date(value));
}

export function formatTimestamp(value: string) {
  return timestamp.format(new Date(value));
}
