import { LegalLayout } from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      effectiveDate="January 1, 2026"
      accent="var(--brand-cyan)"
      intro="These Terms of Service govern your access to and use of the talak-web3 SDK, dashboard, and managed infrastructure (the Services). By creating an account or using the Services you agree to these Terms."
    >
      <h2>1. The Services</h2>
      <p>
        talak-web3 provides developer tools for building Web3 applications, including a TypeScript SDK,
        a managed RPC layer, a real-time analytics dashboard, and related developer infrastructure.
        The SDK is open source under the MIT license; the hosted infrastructure is a commercial service.
      </p>

      <h2>2. Account &amp; eligibility</h2>
      <p>
        You must be at least 18 years old or the age of majority in your jurisdiction to use the Services.
        You are responsible for maintaining the confidentiality of your account credentials and API keys
        and for all activity that occurs under your account.
      </p>

      <h2>3. Acceptable use</h2>
      <p>
        You agree not to use the Services to operate sanctioned wallets, fund terrorism, distribute
        malware, abuse rate limits, or evade KYC/AML requirements imposed by your jurisdiction.
        See our <a href="/legal/acceptable-use">Acceptable Use Policy</a> for the full list.
      </p>

      <h2>4. Plans, billing &amp; payment</h2>
      <p>
        Paid plans are billed in advance on a monthly or annual cadence. We accept credit/debit cards
        via Stripe and stablecoin payments (USDC, USDT, DAI) on Ethereum, Polygon, Arbitrum, Base, and
        Optimism. Crypto payments are non-refundable once confirmed on-chain. Fiat payments may be
        refunded on a pro-rata basis within 14 days of the most recent invoice.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The Services, including all software, dashboards, documentation, and trademarks, are owned by
        talak-web3 and its licensors. We grant you a non-exclusive, non-transferable license to use the
        Services for the duration of your subscription. The MIT-licensed SDK is governed by its license
        terms separately.
      </p>

      <h2>6. Customer data</h2>
      <p>
        You retain all rights to data you submit to the Services. You grant us a limited license to
        process that data solely to provide and improve the Services. We never sell customer data and
        never train third-party models on it.
      </p>

      <h2>7. Service-level objectives</h2>
      <p>
        The Scale tier targets 99.9% monthly availability. Enterprise customers receive a contractual
        SLA. Our public status page is the source of truth for uptime calculations.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Services are provided “as is” without warranty of any kind, express or implied, including
        merchantability, fitness for a particular purpose, and non-infringement. Web3 networks are
        adversarial environments — talak-web3 is infrastructure, not financial advice.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, talak-web3's aggregate liability for any claim arising
        out of or relating to the Services will not exceed the fees you paid for the Services in the
        12 months preceding the claim.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may cancel at any time from your dashboard. We may suspend or terminate accounts that
        violate these Terms or our Acceptable Use Policy with reasonable notice, or immediately for
        egregious violations.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated by email
        and via the dashboard at least 30 days before they take effect.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of Delaware, USA, without regard to its conflict-of-laws
        principles. Disputes will be resolved by binding arbitration in Wilmington, DE.
      </p>

      <p className="!mt-10 !text-foreground/60">
        Last updated January 1, 2026. Questions: <a href="mailto:legal@talak-web3.dev">legal@talak-web3.dev</a>.
      </p>
    </LegalLayout>
  );
}
