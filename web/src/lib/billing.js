import { supabase } from './supabaseClient';

const TRIAL_LINKS = {
  starter: 'https://buy.stripe.com/9B63cuaxG4Ygb2L2WAdEs02',
  pro: 'https://buy.stripe.com/00wfZg5dm76ob2L40EdEs01',
};

/**
 * Redirects to Stripe Checkout, or to the Auth page if not logged in.
 */
export const redirectToCheckout = async (planId) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // If no session, send to auth (Sign Up mode) with a directive to come back to this plan
    window.location.href = `/auth?mode=signup&redirect=stripe_${planId}`;
    return;
  }

  const link = TRIAL_LINKS[planId];
  if (link) {
    const url = new URL(link);
    if (session.user?.email) {
      url.searchParams.set('prefilled_email', session.user.email);
    }
    if (session.user?.id) {
      url.searchParams.set('client_reference_id', session.user.id);
    }
    window.location.href = url.toString();
  } else {
    console.error(`No checkout link configured for plan: ${planId}`);
  }
};
