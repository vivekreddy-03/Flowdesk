# Flowdesk Security Review

## Controls in the current source
- Passwords are hashed using Node.js scrypt and random salts.
- Session tokens are random; only HMAC hashes are stored in SQLite.
- Session cookies are HttpOnly and SameSite=Lax; Secure is enabled in production.
- Production startup rejects missing or weak SESSION_SECRET values.
- API records are scoped to the authenticated user.
- Request bodies are size-limited and JSON input is validated.
- Production mutating requests apply origin / Fetch Metadata checks.
- Basic security headers, content security policy and request throttles are included.
- SQLite foreign keys and amount/workspace constraints are enabled.

## Not a certification
These controls do not replace an independent penetration test. Before using real customer data, verify hosted HTTPS, secret configuration, rate limiting behind the hosting proxy, off-site backups, restore procedures, account deletion, privacy disclosures and error logging.
