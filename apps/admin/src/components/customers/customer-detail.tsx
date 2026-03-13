"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
  addresses: Address[];
  recentOrders: Order[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function orderStatusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export function CustomerDetail({ customerId }: { customerId: string }) {
  const router = useRouter();

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: async () => {
      const res = await apiClient.get<CustomerData>(`/admin/customers/${customerId}`);
      if (!res.success) throw new Error("Failed to load customer");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Failed to load customer details. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/customers")}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {customer.firstName} {customer.lastName}
        </h1>
      </div>

      {/* Profile Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Profile Information</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{customer.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{customer.phone ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Member Since</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Addresses</h2>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses on file.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {customer.addresses.map((addr) => (
              <div key={addr.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">Default</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {addr.line1}
                  {addr.line2 && <>, {addr.line2}</>}
                  <br />
                  {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postalCode}
                  <br />
                  {addr.country}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Recent Orders</h2>
        {customer.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customer.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{orderStatusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">SAR {Number(order.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
