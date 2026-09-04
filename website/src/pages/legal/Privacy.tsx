import { LegalLayout } from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effectiveDate="January 1, 2026"
      accent="var(--brand-green)"
      intro="This Privacy Policy explains what information we collect when you use talak-web3, why we collect it, how long we keep it, and how you can exercise the rights you have over it."
    >
      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your email, hashed password, display name, billing info, and the wallet addresses you choose to link.</li>
        <li><strong>Usage data</strong> — request volume, latency, error rates, and SDK telemetry needed to operate the Services.</li>
        <li><strong>Application data</strong> — the inputs and outputs of API calls you route through us, kept only for the retention window of your plan.</li>
        <li><strong>Cookies</strong> — strictly-necessary session cookies and an opt-in product analytics cookie. See our <a href="/legal/cookies">Cookie Policy</a>.</li>
      </ul>

      <h2>2. Why we collect it</h2>
      <p>
        We process personal data to provide the Services, secure them, bill you, support you, and
        comply with legal obligations. We do not sell personal data and we do not train third-party
        models on customer data.
      </p>

      <h2>3. Legal bases (GDPR)</h2>
      <p>
        Where GDPR applies, our legal bases are: performance of a contract (operating your account),
        legitimate interest (security and fraud prevention), legal obligation (tax and compliance),
        and consent (optional analytics cookies).
      </p>

      <h2>4. Sub-processors</h2>
      <p>
        We use a small set of vetted sub-processors, including AWS (hosting), Cloudflare (edge &amp; WAF),
        Stripe (fiat billing), Supabase (auth + DB), and Postmark (transactional email). The full list
        and current DPAs are available on request.
      </p>

      <h2>5. International transfers</h2>
      <p>
        Personal data may be processed in the United States, the European Union, and other regions
        where our sub-processors operate. We rely on Standard Contractual Clauses for transfers out of
        the EEA.
      </p>

      <h2>6. Retention</h2>
      <p>
        Account data is retained while your account is active and for 30 days after closure for
        wind-down. Application data follows the retention window of your plan (30 days, 90 days,
        1 year, or indefinite). Backups are encrypted and rotated every 35 days.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, port, or
        restrict the processing of your personal data, and to object to it. Contact{" "}
        <a href="mailto:privacy@talak-web3.dev">privacy@talak-web3.dev</a> and we'll respond within
        30 days.
      </p>

      <h2>8. Security</h2>
      <p>
        We encrypt data in transit (TLS 1.3) and at rest (AES-256), enforce SSO and 2FA on all
        internal systems, and undergo annual third-party penetration tests. See the{" "}
        <a href="/legal/security">Security page</a> for our full posture.
      </p>

      <h2>9. Children</h2>
      <p>
        The Services are not directed to children under 16, and we do not knowingly collect personal
        data from them.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions or requests: <a href="mailto:privacy@talak-web3.dev">privacy@talak-web3.dev</a>.
        EU representative on request.
      </p>
    </LegalLayout>
  );
}
