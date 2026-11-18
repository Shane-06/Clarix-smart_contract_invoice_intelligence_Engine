import { Prisma } from '@prisma/client';

type InvoiceAmounts = {
  amount: Prisma.Decimal;
  dueDate: Date;
  status: string;
  payments: { amount: Prisma.Decimal }[];
};

export function invoiceBalance(invoice: InvoiceAmounts) {
  const { amount, dueDate, status, payments } = invoice;
  const paid = payments.length === 0 && status === 'PAID'
    ? amount
    : payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  const balance = Prisma.Decimal.max(amount.minus(paid), 0);
  const overdue = dueDate.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);
  return { paid, balance, status: balance.isZero() ? 'PAID' : overdue ? 'OVERDUE' : 'UNPAID' };
}

export function presentInvoice<T extends InvoiceAmounts & { payments: { amount: Prisma.Decimal }[] }>(invoice: T) {
  const { paid, balance, status } = invoiceBalance(invoice);
  return {
    ...invoice,
    amount: invoice.amount.toNumber(),
    status,
    paidAmount: paid.toNumber(),
    balance: balance.toNumber(),
    payments: invoice.payments.map(payment => ({ ...payment, amount: payment.amount.toNumber() })),
  };
}
