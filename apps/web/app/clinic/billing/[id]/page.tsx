import { InvoicePage } from "@/features/billing/invoice-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoicePage invoiceId={id} />;
}
