# How To Use Python At Yahoo (Confluence HOWTO Space)

**Document Reference:** `https://ouryahoo.atlassian.net/wiki/spaces/HOWTO/pages/342203653/How+To+Use+Python+At+Yahoo`

## Standard Modern Python Environment
* **Core Requirement:** Modern Yahoo services standardize on virtual environments using `uv` (or `venv`), internal Artifactory packages (`artifactory.yahoo.com`), and `ruff` for linting.
* **Python Version:** All modern Yahoo services must use Python 3.12+ (or newer).
* **Package Management:** Standardize on `uv` (recommended) or `python3 -m venv`.
* **Internal Mirror:** Configure `.pip/pip.conf` to use Yahoo's internal Artifactory mirror (`artifactory.yahoo.com`).
* **Code Quality:** Use `pytest` for test execution and `ruff` for fast linting and formatting.

## Obsolete & Prohibited Configurations
* **Python 2.7 Deprecation:** Python 2.7 reached end-of-life and was deprecated. Modern Yahoo services must NOT use Python 2.7.
* **Legacy Tooling:** Do not use `virtualenv-1.11` or `pip install --user` for modern service development. Instead, use `uv` with internal Artifactory packages and `ruff`.
