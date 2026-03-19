import { prisma } from "../lib/prisma.js";
import { notFound } from "../middleware/error-handler.js";
import type { Prisma } from "../generated/prisma/client.js";

export async function listCustomers(filters: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}) {
  const { search, dateFrom, dateTo, cursor, limit = 20 } = filters;

  const where: Prisma.UserWhereInput = {
    // Only buyers (users without admin roles)
    userRoles: { none: {} },
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const users = await prisma.user.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, limit) : users;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}

export async function getCustomerById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      preferredLanguage: true,
      status: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      addresses: true,
      _count: { select: { orders: true } },
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) throw notFound("Customer not found");
  return user;
}
