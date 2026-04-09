# Security Policy

Talak-Web3 implements strict security invariants to protect users and developers.

## Invariants
1. **0% Private Key Leaks**: Static analysis and runtime regex checks prevent 0x-prefixed 64-character strings from being logged or sent to RPCs.
2. **Origin Validation**: Strict CORS and origin checking for all middleware requests.
3. **Secret Management**: Integrated support for environment variables and encrypted storage.

## Reporting a Vulnerability

If you find a security issue, please do not open a public issue. Send an email to security@talak-web3.io.

## Automatic Checks

The `TalakWeb3Security` plugin runs automatically in development to alert you of potential risks.
