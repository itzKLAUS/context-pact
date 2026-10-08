# Security

Use GitHub private vulnerability reporting on this repository. Do not post real prompts, keys or private tenant data in a public issue.

Input metadata and scores must come from trusted application code. This package does not authenticate users, sandbox tools, verify sources or prevent prompt injection. Trust labels are data, not a security boundary. Reports contain selected evidence; protect them with filesystem permissions and retention rules. CLI output inherits directory ACLs on Windows. The workbench binds only to loopback and is not designed as a remotely hosted service.

The static server has a small fixed route allowlist and a restrictive CSP. It never accepts context input over HTTP; the worker processes it locally. Do not expose it through a public tunnel with real data. Neither tests nor the small proof artifact constitute an independent security audit.
