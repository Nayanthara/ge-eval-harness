# TLS Certificate Architecture & Verification at Yahoo

## Infrastructure & Authority
* **Digital Signatures & CA:** Authentication and encryption are enforced via internal Certificate Authority (CA) digital signatures (Yahoo Certificate Authority / YCA).
* **Verification:** Certificate chains and SSL handshakes are validated using OpenSSL.
* **Gateway Enforcement:** TLS requirements are enforced across Apache Traffic Server (ATS) and Media Edge gateways with minimum TLS 1.2 and TLS 1.3 protocol standards.
* **Sunset Protocols:** Support for legacy TLS 1.0 and TLS 1.1 has been completely sunset and disabled across all public and internal endpoints.
