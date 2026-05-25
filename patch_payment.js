const fs = require('fs');
const file = '/Users/apple/Documents/NetReward/src/pages/PaymentAuthorize.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
`type FlowStep =
  | 'loading'      // fetching session from DB
  | 'login_required' // user not signed in
  | 'review'       // show payment details, await confirmation
  | 'authenticating' // calling RPC
  | 'success'
  | 'failed'
  | 'expired'
  | 'not_found';`,
`type FlowStep =
  | 'loading'
  | 'login_required'
  | 'interception_choice'
  | 'waiting_for_app'
  | 'review'
  | 'authenticating'
  | 'success'
  | 'failed'
  | 'expired'
  | 'not_found';`
);

content = content.replace(
`import {
  CheckCircle2, XCircle, Loader2, AlertCircle,
  ShoppingCart, ArrowRight, Fingerprint, ChevronLeft,
  ExternalLink, Shield,
} from 'lucide-react';`,
`import {
  CheckCircle2, XCircle, Loader2, AlertCircle,
  ShoppingCart, ArrowRight, Fingerprint, ChevronLeft,
  ExternalLink, Shield, Monitor, Puzzle, Globe, Smartphone
} from 'lucide-react';`
);

content = content.replace(
`      setSession({
        id: data.id,
        merchantId: data.merchant_id,
        merchantName: profile?.display_name || 'Merchant',
        amountNrt: data.amount_nrt,
        description: data.description,
        status: data.status,
        expiresAt: data.expires_at,
        successUrl: returnTo || data.success_url || undefined,
        cancelUrl: data.cancel_url || undefined,
      });
      setStep('review');`,
`      setSession({
        id: data.id,
        merchantId: data.merchant_id,
        merchantName: profile?.display_name || 'Merchant',
        amountNrt: data.amount_nrt,
        description: data.description,
        status: data.status,
        expiresAt: data.expires_at,
        successUrl: returnTo || data.success_url || undefined,
        cancelUrl: data.cancel_url || undefined,
      });
      setStep('interception_choice');`
);

fs.writeFileSync(file, content);
console.log("Patched basic types");
