# Security policy

## Supported version

Only the live deployment ([watchnext-films.vercel.app](https://watchnext-films.vercel.app)), built from `main`, is supported. There are no versioned releases.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue.

Include what you found, the steps to reproduce it, and the impact you expect. You should get a first answer within a week.

Of particular interest:

- access to another member's library, messages or profile beyond what the friendship and visibility rules allow
- weaknesses in sign-in, password reset or sessions
- ways to exhaust the TMDB quota or to bypass the rate limits
- anything that could leak the TMDB API key or other server-side secrets

Please don't run automated scans or load tests against the live site, and only use accounts you created yourself.
