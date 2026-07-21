import { NextResponse } from "next/server";

// "Completed checkout" signal via Shopify's orders/create webhook — fires
// server-side whenever an order is created, independent of the client-side
// checkout pixel (confirmed unreliable for this store's headless setup).
//
// Note: this does not verify the webhook's HMAC signature — that requires
// the signing app's client secret, which isn't available to this project.
// Acceptable here since this route only logs data for internal analytics
// and doesn't perform any write/side-effecting action.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  console.log("[analytics] checkout_completed (orders/create)", {
    timestamp: new Date().toISOString(),
    orderId: body.id,
    orderName: body.name,
    totalPrice: body.total_price,
    currency: body.currency,
    email: body.email ? "[present]" : null,
  });

  return NextResponse.json({ ok: true });
}
