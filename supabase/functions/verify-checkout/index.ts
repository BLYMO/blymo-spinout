import "@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@^14.18.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

interface CheckoutRequest {
  session_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Respond to CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json() as CheckoutRequest;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "No session_id provided." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 1. Verify the session with Stripe (expand line items to check the price/plan)
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items'],
    });

    // Normally you check session.payment_status === 'paid', but in trial links it might be 'no_payment_required' depending on the setup. We verify it's not open.
    if (session.status === 'open' || session.status === 'expired') {
      return new Response(JSON.stringify({ error: "Session is not completed successfully." }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. Determine the Plan Tier from line items or amount
    const lineItems = session.line_items?.data;
    const priceId = lineItems?.[0]?.price?.id;
    const amountTotal = session.amount_total; // in cents
    
    console.log(`Verifying session: ${session_id}`);
    console.log(`Found Price ID: ${priceId}`);
    console.log(`Found Amount Total: ${amountTotal}`);
    
    let planTier = 'unspecified';
    
    // Map of valid Price IDs to Tiers (Supports both Test and Live IDs)
    const tierMapping: Record<string, string> = {
      'price_1TMlobEHpeHcrS6wjUfDuzqH': 'starter', // Test 
      'price_1TMlovEHpeHcrS6wjeYGfvt3': 'pro',     // Test 
      'price_1TOae8CzIbOFC7IFcvJzaSNw': 'starter', // Live 
      'price_1TOaZ7CzIbOFC7IF09VN6Diz': 'pro',     // Live  
    };

    if (priceId && tierMapping[priceId]) {
      planTier = tierMapping[priceId];
      console.log(`Matched Plan Tier: ${planTier}`);
    } 
    // Secondary check: Amount Fallback ($19.00 or $79.00)
    else if (amountTotal === 1900) {
      console.log('Falling back to amount-based matching: Starter');
      planTier = 'starter';
    } else if (amountTotal === 7900) {
      console.log('Falling back to amount-based matching: Pro');
      planTier = 'pro';
    } else {
      console.warn(`Could not determine plan. PriceID: ${priceId}, Amount: ${amountTotal}`);
    }

    // 3. Identify the user (passed from the frontend billing helper!)
    const userId = session.client_reference_id;
    if (!userId) {
      console.error('Missing client_reference_id in Stripe session');
      return new Response(JSON.stringify({ error: "No client_reference_id in session to link the user." }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 4. Initialize Supabase Admin Client (Service Role bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 5. Create Workspace Record
    const { data: workspace, error } = await supabaseClient
      .from('workspaces')
      .insert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        session_id: session_id,
        plan_tier: planTier,
        status: 'unprovisioned'
      })
      .select()
      .single();

    if (error) {
       // Catch unique constraint violations if the user refreshes the page
       if (error.code === '23505') {
          return new Response(JSON.stringify({ message: "Session already processed", workspace: null }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
       }
       throw error;
    }

    return new Response(
      JSON.stringify({ success: true, workspace }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
