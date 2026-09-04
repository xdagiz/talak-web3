import { LegalLayout } from "@/components/LegalLayout";

export default function AcceptableUse() {
  return (
    <LegalLayout
      title="Acceptable Use Policy"
      effectiveDate="January 1, 2026"
      accent="var(--brand-coral)"
      intro="This policy lists the things you may not do with the talak-web3 Services. Violations may result in suspension or termination of your account."
    >
      <h2>1. Illegal activity</h2>
      <p>
        Don't use the Services to violate any law in the jurisdictions where you operate. This
        includes money laundering, sanctions evasion, narcotics, illegal gambling, and the
        financing of terrorism.
      </p>

      <h2>2. Sanctioned addresses &amp; entities</h2>
      <p>
        We screen against OFAC SDN, EU consolidated, and UK HMT lists. You may not knowingly route
        transactions to or from sanctioned addresses.
      </p>

      <h2>3. Abuse of the platform</h2>
      <ul>
        <li>No bypassing rate limits, quotas, or abuse-detection systems.</li>
        <li>No reselling raw RPC capacity without an Enterprise agreement.</li>
        <li>No reverse-engineering of the hosted infrastructure to compete with us directly.</li>
      </ul>

      <h2>4. Security &amp; integrity</h2>
      <ul>
        <li>No probing, scanning, or testing the vulnerability of the Services without prior written consent (use the bug-bounty program instead).</li>
        <li>No uploading of malware, mining scripts, or content designed to compromise other users.</li>
        <li>No spamming, phishing, or impersonation via webhooks, emails, or notifications you send through us.</li>
      </ul>

      <h2>5. Content</h2>
      <p>
        Don't store or transmit content that is unlawful, defamatory, infringing, or that depicts
        the sexual abuse of minors. Report CSAM to <a href="mailto:abuse@talak-web3.dev">abuse@talak-web3.dev</a>.
      </p>

      <h2>6. High-risk applications</h2>
      <p>
        The Services are not certified for use in life-critical systems (medical, aviation, nuclear).
        Don't deploy them in those contexts.
      </p>

      <h2>7. Reporting abuse</h2>
      <p>
        Report suspected abuse to <a href="mailto:abuse@talak-web3.dev">abuse@talak-web3.dev</a>. We
        triage every report within one business day.
      </p>

      <h2>8. Enforcement</h2>
      <p>
        We may warn, throttle, suspend, or terminate accounts that violate this policy, depending on
        severity. Egregious violations (e.g., sanctioned-address routing, CSAM) result in immediate
        termination and, where required, reporting to the appropriate authority.
      </p>
    </LegalLayout>
  );
}
