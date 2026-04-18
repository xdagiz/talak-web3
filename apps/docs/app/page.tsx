import { Card, Cards } from "fumadocs-ui/components/card";
import { Steps, Step } from "fumadocs-ui/components/steps";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center py-20 px-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Talak Web3</h1>
          <p className="text-lg text-fd-muted-foreground">
            Web3 backend toolkit for server-side SIWE sessions, RPC failover, and account
            abstraction.
          </p>
        </div>

        <Steps>
          <Step>### Install ```bash npm install talak-web3 ```</Step>
          <Step>### Configure Set up your environment variables and create a Talak instance.</Step>
          <Step>### Run Add the API handler to your server and start building.</Step>
        </Steps>

        <Cards>
          <Card
            href="/docs/introduction"
            title="Get Started"
            description="Learn the basics of Talak Web3"
          />
          <Card
            href="/docs/installation"
            title="Installation"
            description="Step-by-step setup guide"
          />
          <Card
            href="/docs/authentication"
            title="Authentication"
            description="Set up SIWE authentication"
          />
        </Cards>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 text-fd-muted-foreground">
            <li>• Server-authenticated SIWE sessions</li>
            <li>• Resilient RPC routing with multi-provider failover</li>
            <li>• Replay-resistant authentication flows</li>
            <li>• TypeScript-first API design</li>
            <li>• Support for Next.js, Hono, Express, and more</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
