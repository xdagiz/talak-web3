import { LegalLayout } from "@/components/LegalLayout";

export default function Cookies() {
  return (
    <LegalLayout
      title="Cookie Policy"
      effectiveDate="January 1, 2026"
      accent="var(--brand-yellow)"
      intro="This page explains the cookies and similar technologies we use, what they do, and how you can control them."
    >
      <h2>1. What is a cookie?</h2>
      <p>
        A cookie is a small text file your browser stores when you visit a website. We also use
        localStorage (a browser-native key/value store) for session persistence.
      </p>

      <h2>2. Cookies we use</h2>
      <table className="!my-6">
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Purpose</th>
            <th align="left">Lifetime</th>
            <th align="left">Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-access-token</code></td>
            <td>Keeps you signed in to your talak-web3 account (Supabase session).</td>
            <td>Session</td>
            <td>Strictly necessary</td>
          </tr>
          <tr>
            <td><code>sb-refresh-token</code></td>
            <td>Refreshes your session without re-asking for credentials.</td>
            <td>30 days</td>
            <td>Strictly necessary</td>
          </tr>
          <tr>
            <td><code>talak-theme</code></td>
            <td>Remembers your dark/light theme preference.</td>
            <td>1 year</td>
            <td>Functional</td>
          </tr>
          <tr>
            <td><code>talak-analytics</code></td>
            <td>Anonymous product analytics — opt-in only.</td>
            <td>13 months</td>
            <td>Analytics</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Choices &amp; controls</h2>
      <p>
        Strictly-necessary cookies cannot be disabled — they are required to keep you signed in.
        You can opt out of analytics cookies at any time from <a href="/settings">Settings → Privacy</a>.
        Most browsers also let you block or delete cookies entirely.
      </p>

      <h2>4. Do Not Track</h2>
      <p>
        We honour the <code>Sec-GPC</code> Global Privacy Control header. When set, our analytics cookie
        is suppressed regardless of your preference.
      </p>

      <h2>5. Updates</h2>
      <p>
        We may update this policy as we add or remove tooling. Material changes will be announced via
        the dashboard.
      </p>
    </LegalLayout>
  );
}
