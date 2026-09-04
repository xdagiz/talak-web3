import { cn } from "@/lib/utils";

import stripeLogo from "@/assets/logos/stripe.png";

export function StripeIcon({ className = "" }: { className?: string }) {
  return <img src={stripeLogo} alt="Stripe" className={cn("object-contain", className)} />;
}