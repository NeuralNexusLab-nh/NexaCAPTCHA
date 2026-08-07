# Contributing

NexaCAPTCHA is currently maintained through direct, intentional commits to `main`. The project is not using a pull-request workflow at this stage.

Before proposing a large change, open a public issue describing the problem, user impact, protocol impact, resource cost, and security considerations. Do not use public issues for exploitable vulnerabilities; follow [SECURITY.md](SECURITY.md).

Every implementation change should:

1. Preserve the zero-configuration integration unless a versioned protocol change is intentional.
2. Keep CSP, iframe boundaries, Origin validation, and `OPTIONS` handling explicit.
3. Remain within the 0.25 vCPU, 100 MB RAM, and 10 GB storage release budget.
4. Avoid logging answers or full tokens.
5. Add or update relevant tests.
6. Pass `npm run check`.
7. Keep README and homepage examples aligned with the implementation.

Commits should be small, focused, and written in clear imperative language.
