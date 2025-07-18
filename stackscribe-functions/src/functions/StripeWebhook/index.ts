import { app, HttpRequest, InvocationContext } from "@azure/functions";
import Stripe from "stripe";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil", // update to latest apiVersion
  typescript: true,
});

export async function stripeWebhook(req: HttpRequest, context: InvocationContext) {
  const sig = req.headers.get("stripe-signature") as string;
  let event: Stripe.Event;

  try {
    // `req.rawBody` is available only if you enable rawBody in function settings
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    context.error(`❌ Webhook signature verification failed: ${err.message}`);
    return { status: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle event types you care about
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      const subscription = event.data.object as Stripe.Subscription;
      context.info(`✅ Subscription event: ${event.type} for ${subscription.customer}`);
      // TODO: Update your database or call your backend
      break;

    case "invoice.payment_failed":
      context.info(`⚠️ Payment failed for ${event.data.object['customer']}`);
      // TODO: Flag account or notify user
      break;

    default:
      context.info(`ℹ️ Unhandled event type: ${event.type}`);
  }

  return { status: 200 };
}

// Register the function
app.http('stripeWebhook', {
  methods: ['POST'],
  authLevel: 'function',
  handler: stripeWebhook
});
