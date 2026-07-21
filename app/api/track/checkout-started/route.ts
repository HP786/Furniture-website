import { NextResponse } from "next/server";

// First-party "reached checkout" signal: logged directly when the visitor
// clicks Checkout, instead of depending on Shopify's client-side checkout
// pixel (confirmed unreliable for this store's headless setup).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  console.log("[analytics] checkout_started", {
    timestamp: new Date().toISOString(),
    cartId: body.cartId,
    totalAmount: body.totalAmount,
    currencyCode: body.currencyCode,
    lineCount: body.lineCount,
  });

  return NextResponse.json({ ok: true });
}
