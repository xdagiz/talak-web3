import { LegalLayout } from "@/components/LegalLayout";

export default function Security() {
  return (
    <LegalLayout
      title="Security"
      effectiveDate="January 1, 2026"
      accent="var(--brand-purple)"
      intro="Security is a feature, not a department. Here is the technical and organizational picture of how we protect your data and your customers' funds."
    >
      <h2>1. Infrastructure</h2>
      <ul>
        <li>Hosted on AWS in <strong>us-east</strong>, <strong>eu-west</strong>, and <strong>ap-southeast</strong> with VPC isolation and private subnets.</li>
        <li>All traffic terminated at Cloudflare with WAF, bot management, and DDoS L3/L4/L7 mitigation.</li>
        <li>Production access is gated by SSO + hardware-key 2FA and audited every 24 hours.</li>
      </ul>

      <h2>2. Encryption</h2>
      <ul>
        <li><strong>In transit:</strong> TLS 1.3 with HSTS preload.</li>
        <li><strong>At rest:</strong> AES-256 (KMS-managed keys) for databases, object storage, and backups.</li>
        <li><strong>Secrets:</strong> AWS Secrets Manager with rotation; never written to logs.</li>
      </ul>

      <h2>3. Application security</h2>
      <ul>
        <li>SAST and dependency scanning on every PR; weekly dynamic scans against staging.</li>
        <li>Annual third-party penetration test by a CREST-accredited firm; last report available under NDA.</li>
        <li>Public bug-bounty program at <a href="https://hackerone.com/talakweb3" target="_blank" rel="noreferrer">hackerone.com/talakweb3</a> with a 24-hour triage SLO.</li>
      </ul>

      <h2>4. Identity &amp; access</h2>
      <ul>
        <li>Customer auth via SIWE, email/password, Google OAuth, and SSO (Enterprise).</li>
        <li>Per-key API quotas and IP allowlists.</li>
        <li>Role-based access control with least-privilege defaults.</li>
      </ul>

      <h2>5. Monitoring &amp; incident response</h2>
      <p>
        24/7 paging, p99 alerting on every customer-facing surface, and a published incident
        response runbook. Customers are notified within 72 hours of any confirmed breach affecting
        their data, in line with GDPR Article 33.
      </p>

      <h2>6. Compliance</h2>
      <ul>
        <li>SOC 2 Type II report (refreshed annually).</li>
        <li>GDPR &amp; UK GDPR compliant; DPA available on request.</li>
        <li>HIPAA Business Associate Agreements available for Enterprise.</li>
      </ul>

      <h2>7. Reporting a vulnerability</h2>
      <p>
        Email <a href="mailto:security@talak-web3.dev">security@talak-web3.dev</a> with a description,
        proof of concept, and your contact info. Our PGP key is available at{" "}
        <a href="https://talak-web3.dev/.well-known/pgp.txt" target="_blank" rel="noreferrer">/.well-known/pgp.txt</a>.
      </p>
    </LegalLayout>
  );
}
