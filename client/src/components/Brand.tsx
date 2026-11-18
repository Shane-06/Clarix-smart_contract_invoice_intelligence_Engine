import { FileText } from 'lucide-react';
import Link from 'next/link';

export default function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex w-fit items-center gap-2.5">
      <span className="mark"><FileText size={18} strokeWidth={2} aria-hidden="true" /></span>
      <span className="text-[15px] font-bold tracking-tight text-ink">Contract Intelligence</span>
    </Link>
  );
}
