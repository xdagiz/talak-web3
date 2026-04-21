# @talak-web3/ai

AI-powered utilities for Web3 applications.

## Installation

```bash
npm install @talak-web3/ai

yarn add @talak-web3/ai

pnpm add @talak-web3/ai
```

## Features

### Natural Language Queries

Query blockchain data using natural language.

```typescript
import { createAIClient } from '@talak-web3/ai';

const ai = createAIClient({
  openaiApiKey: process.env.OPENAI_API_KEY,
});

const result = await ai.query({
  prompt: 'What is the balance of vitalik.eth?',
  chain: 'ethereum',
});
```

### Smart Contract Analysis

Analyze smart contracts for vulnerabilities and patterns.

```typescript
const analysis = await ai.analyzeContract({
  address: '0x1111111111111111111111111111111111111111',
  chainId: 1,
});

console.log(analysis.risks);
console.log(analysis.patterns);
```

### Transaction Explanation

Explain complex transactions in plain English.

```typescript
const explanation = await ai.explainTransaction({
  hash: '0x1111111111111111111111111111111111111111',
  chainId: 1,
});

console.log(explanation.summary);
console.log(explanation.actions);
```

## License

MIT
