# Zero Trust Architecture Specification
**Document Owner**: Marcus Vance, Lead Security Architect
**Last Modified**: September 28, 2026 14:15 UTC

## Executive Summary
Contoso enforces a strict Zero Trust Security Framework across all corporate and production environments. Explicit verification, least-privilege access, and assumed breach principles are mandatory for all connected systems.

## Network Segmentation & Firewall Rules
All VPC subnets must enforce micro-segmentation with default-deny ingress rules, require TLS 1.3 mutual authentication (mTLS) for east-west microservice traffic, and block all direct public IPv4 ingress to production database clusters. Bastion hosts or identity-aware proxies (IAP) with hardware FIDO2 authentication must be used for administrative shell access.
