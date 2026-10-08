# BLOCKERS / OWNER ACTIONS
1. Secrets: `.env` tracked in git. Rotate PayU salt/key, Zoho key, JWT secret if the repo was ever pushed/shared; then `git rm --cached .env`.
2. Production deploy / push needs owner go-ahead (not authorised in this run beyond local work).
3. Production data cleanup: no deletion executed; needs owner-approved scope.
4. Search Console, Vercel CLI (not installed), EAS signing credentials: not available in this session.
