import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { IOrder, Order, OrderProduct } from "@/models/Order";
import { Product } from "@/models/Product";
import User from "@/models/User";

/**
 * Convert an order document to API-safe payload.
 * Uses schema fields: products[].priceCents and order.totalAmount (if present).
 */
function formatOrderForAPI(orderDoc: any, role: string) {
  // Products array: product may be populated or an id
  const products = (orderDoc.products || []).map((p: any) => {
    const prod = p.product || null;
    const priceCents = p.priceCents ?? p.price ?? p.price_cents ?? 0; // handle variants defensively
    return {
      productId: prod?._id ?? p.product,
      name: prod?.name ?? undefined,
      image: prod?.image ?? undefined,
      quantity: p.quantity,
      priceCents,
      price: typeof priceCents === "number" ? priceCents / 100 : null,
    };
  });

  const totalAmountCents =
    orderDoc.totalAmountCents ??
    (Number.isInteger(orderDoc.totalAmount) ? Math.round(orderDoc.totalAmount * 100) : undefined) ??
    orderDoc.totalAmount ?? // fallback
    undefined;

  const base = {
    id: orderDoc._id,
    products,
    totalAmount: totalAmountCents !== undefined ? totalAmountCents / 100 : orderDoc.totalAmount,
    totalAmountCents,
    currency: orderDoc.currency,
    status: orderDoc.status,
    createdAt: orderDoc.createdAt,
    updatedAt: orderDoc.updatedAt,
  };

  if (role === "admin") {
    // include admin-only fields
    return {
      ...base,
      paymentIntentId: orderDoc.paymentIntentId ?? null,
      checkoutSessionId: orderDoc.checkoutSessionId ?? null,
      user: orderDoc.user ?? null,
    };
  }

  
  return base;
}


