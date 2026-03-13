"use client";

import { use } from "react";
import { CustomerDetail } from "@/components/customers/customer-detail";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = use(params);
  return <CustomerDetail customerId={id} />;
}
