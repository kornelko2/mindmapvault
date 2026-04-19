# GitHub Copilot / Contributor Instructions (OSS workspace)

Purpose
-------
This file documents how contributors and Copilot-style agents should work with the `crypt-min-oss` repository. It explains the repository scope, where major pieces live, how to run the project/tests locally, versioning rules (including OSS-specific numbering), release guidance, and security/data-safety constraints. Keep this file up to date alongside project changes.

Repository scope (OSS)
----------------------
- This workspace is the OSS variant of the Crypt Mind app. It focuses on the frontend app and desktop Tauri host and intentionally omits closed-source backend infrastructure.
- Important top-level folders:
  - `frontend_app/` — main React + Vite app (user-facing client, editor, vault UI, crypto helpers).
  - `desktop/src-tauri/` — Tauri host crate and native build configuration.
  - `scripts/` — local helper scripts (build/test workflow emulation and developer helpers).
  - `.github/` — CI workflows and this Copilot instructions file.
  - `OSS_VERSION` — repository-level OSS version string (must differ from main release version).

High-level rules for Copilot/Automation
--------------------------------------
- Preserve client-side encryption behaviour: do not add code that decrypts or sends plaintext vault content to the server or to logs. Titles, notes, and map payloads MUST remain encrypted before leaving the client.
- Be conservative about changes that affect auth, crypto, or storage flows. If a change touches these areas, add tests and a short security rationale in the PR description.
- Avoid large, unrelated refactors in PRs that address a small bug. Keep changes minimal and focused.
- When proposing UI styling changes, provide screenshots for both dark and light modes and confirm accessibility (contrast) for labels and badges.
- Do not add telemetry or analytics without an explicit design doc and opt-in consent flow.

Versioning and OSS numbering
----------------------------
- Main release version is read from `frontend_app/package.json` and expected to match `desktop/src-tauri/tauri.conf.json` and `desktop/src-tauri/Cargo.toml` for the main product.
- The latest release base version MUST come from `CHANGELOG.md` (the first non-`Unreleased`, non-`Planned` header like `## [0.1.1] - YYYY-MM-DD`).
- The OSS variant uses `OSS_VERSION` (plain text file at repo root) and MUST follow `<latest changelog release>-oss` (for example `0.1.1-oss`).
- `desktop/src-tauri/tauri.conf.json` `version` MUST match `OSS_VERSION` in this OSS repository.
- The local version-check script enforces these rules and also ensures OSS and main product versions are intentionally different.
- To check versions locally, run:
  - `node scripts/version-check.js`

Changelog generation & versioning guidance for Copilot
----------------------------------------------------

- Whenever code changes are made that affect user-visible behavior, APIs, infrastructure, or security, Copilot-generated suggestions (and human edits) SHOULD include a draft changelog entry in `CHANGELOG.md` and a short summary for `CUSTOMER_CHANGELOG.md` when customer-visible.
- Changelog entry template (use this as the default draft format):

```
## [Unreleased] - YYYY-MM-DD

- **Scope:** (frontend|backend|desktop|infra)
- **Summary:** One-line summary of the change.
- **Details:** A concise bulleted list describing what changed and why.
- **Files:** list of the primary files modified (relative paths).
- **Risk / Notes:** Any migration steps, data migrations, or security considerations.
- **Author / PR:** @github-username / PR #123

```

- When preparing a release PR, update the `Unreleased` heading to the new version header `## [X.Y.Z] - YYYY-MM-DD` and follow the versioning guidance below.
- For non-customer-visible or internal developer changes, include a short `CHANGELOG.md` bullet under `Unreleased` describing the change; skip `CUSTOMER_CHANGELOG.md` unless customer impact exists.

Versioning rules (what Copilot should follow when suggesting version changes):

- The primary release version is stored in `frontend_app/package.json` and must match `desktop/src-tauri/tauri.conf.json` and `desktop/src-tauri/Cargo.toml` for main product releases. When Copilot suggests a bump to `frontend_app/package.json`, it should also suggest corresponding updates to the other two files.
- The latest released version in `CHANGELOG.md` is the source of truth for OSS release base versioning.
- The OSS variant uses `OSS_VERSION` (plain text at repo root) and must be set to `<latest changelog release>-oss`.
- In OSS repo state, `desktop/src-tauri/tauri.conf.json` `version` should equal `OSS_VERSION`.
- `OSS_VERSION` must be intentionally different from the main product version in `frontend_app/package.json`. Copilot should never make OSS and main versions identical — `scripts/version-check.js` enforces this.
- Version bump guidance:
  - PATCH: backwards-compatible bug fixes. Bump `patch` (X.Y.Z -> X.Y.Z+1).
  - MINOR: new features in a backwards-compatible manner. Bump `minor` (X.Y.Z -> X.Y+1.0).
  - MAJOR: incompatible API changes or significant platform changes. Bump `major` (X+1.0.0) and include migration notes.
- For OSS-only releases, update `OSS_VERSION` and add a terse changelog note referencing the OSS tag. Do NOT alter main `frontend_app/package.json` or native crate versions for OSS-only bumps unless preparing a main release.

- Changelog automation checklist for Copilot-generated PRs:
  - Add or update `CHANGELOG.md` under `Unreleased` with a clear entry.
  - If user-visible, add a short `CUSTOMER_CHANGELOG.md` bullet.
  - When cutting a release entry in `CHANGELOG.md`, set `OSS_VERSION` to `<that release>-oss` and keep `desktop/src-tauri/tauri.conf.json` `version` in sync.
  - If bumping the main version, update `frontend_app/package.json`, `desktop/src-tauri/tauri.conf.json`, and `desktop/src-tauri/Cargo.toml` consistently.
  - If the change is OSS-only, update `OSS_VERSION` and ensure it differs from the main version.
  - Add a brief `Risk / Notes` section for security, migration, or data-impacting changes.

If Copilot proposes a changelog or version bump, always present the proposed changelog snippet and exact file diffs in the PR description so reviewers can quickly approve or modify.
Local developer workflow (quick)
--------------------------------
On Windows (PowerShell):

```powershell
.\scripts\test-workflow.ps1 -SkipTauri    # runs JS install, audits, build (skip tauri if you don't have Rust toolchain)
.\scripts\test-workflow.ps1               # run everything including tauri build (requires Rust and toolchain)
```

On WSL/macOS/Linux:

```bash
./scripts/test-workflow.sh --skip-tauri
./scripts/test-workflow.sh
```

Notes:
- The PowerShell script attempts to enable pnpm via `corepack` if pnpm is not available. If that fails, install pnpm manually: `npm i -g pnpm@10.17.1` or `corepack prepare pnpm@10.17.1 --activate`.
- The scripts perform `pnpm install`, `pnpm audit` (frontend), `cargo audit` (desktop crate), and build steps. Use `--skip-build` or `-SkipBuild` where appropriate.

Testing
-------
- The repo includes unit/test helpers within the `frontend_app` package. Use `pnpm --dir frontend_app test` where present.
- The `scripts/test-workflow.*` scripts emulate the CI verification steps (dependency audits and builds) — useful for catching CI-specific issues locally.
- **WSL Linux testing note:** The `linuxdeploy` utility (required for AppImage bundling) is not available in standard Ubuntu repositories. For local WSL development:
  - Use `./scripts/test-workflow.sh --skip-bundle` to build and test the binary without AppImage bundling.
  - The compiled binary will be at `desktop/src-tauri/target/release/MindMapVault` and can be run directly in WSL.
  - To test the GUI in WSL, use an X11 server (e.g., VcXsrv or WSLg) and set `DISPLAY` accordingly, then run `./desktop/src-tauri/target/release/MindMapVault`.
  - For CI and release builds on Linux runners, `linuxdeploy` and bundling will be handled by the GitHub Actions environment (which has the required system packages).

CI and release notes
--------------------
- GitHub Actions workflows live in `.github/workflows/` and include desktop release workflows. The release workflow uses an exact `pnpm` version (see `packageManager` in `frontend_app/package.json`) — if you update `packageManager`, update the workflow accordingly.
- The desktop release action uploads build artifacts (EXE, AppImage) to a `latest` GitHub Release. For OSS releases we follow the same artifact publishing approach but use OSS-specific tags only when appropriate.

Code style & conventions
------------------------
- JavaScript/TypeScript: follow the existing lint config and formatting. Keep imports grouped: external packages, local helpers, components.
- React: prefer functional components with hooks. Keep components small and extract repeated UI bits to shared components under `frontend_app/src/components/`.
- CSS: Tailwind utility classes used widely. For color constants, prefer using CSS variables (e.g. `--accent`) rather than hardcoded hex values. For theme-aware logic, use the `useThemeStore` helper present in `frontend_app/src/store/theme.ts`.

Security & data-safety rules (critical)
-------------------------------------
- Never log secrets, passphrases, decrypted vault contents, or DEKs to console or telemetry.
- When adding diagnostics, make sure sensitive data is redacted. Prefer to export safe diagnostics that contain counts, sizes, and non-sensitive metadata.
- When touching storage or upload flows, ensure preview generation does not leak plaintext to the server. Previews should be generated client-side and stored as encrypted attachments or pre-rasterized theme-aware previews (as the codebase already does).

Where to find things (quick map)
-------------------------------
- Frontend app entry: `frontend_app/src/main.tsx`
- Theme store: `frontend_app/src/store/theme.ts`
- Vault preview utilities: `frontend_app/src/utils/vaultPreview.ts`
- Vaults UI and editing: `frontend_app/src/pages/VaultsPage.tsx`
- Desktop crate: `desktop/src-tauri/` (Rust crate and `tauri.conf.json`)
- Local developer scripts: `scripts/` (test-workflow.sh, test-workflow.ps1, version-check.js)
- OSS version file: `OSS_VERSION`

How to contribute
-----------------
1. Branch from `main` or create a feature branch with a descriptive name.
2. Keep PRs focused; one logical change per PR.
3. Include tests where applicable and run `./scripts/test-workflow.sh` locally before opening a PR.
4. Use conventional commit-style messages where reasonable (e.g., `fix:`, `feat:`, `chore:`).
5. For any change affecting encryption, auth, or storage, add a short security rationale in the PR description and request a security review.

Automations and Copilot guidance
--------------------------------
- Copilot suggestions are welcome; treat them as drafts that must be reviewed for security and product fit.
- When using Copilot or AI assistance, ensure that the generated code adheres to the project rules above, does not add telemetry, and preserves client-side encryption properties.
- For large generated changes, split into smaller PRs and include human-written summaries and tests.

Maintainers & contacts
----------------------
- The main maintainers and contacts are listed in the repository `README.md` and project metadata. For security-sensitive changes, ping the security owner(s) in the PR.

FAQs
----
- Q: Where should I update OSS version?
  - A: Edit the `OSS_VERSION` file at the repository root. Keep it intentionally different from the main product version.

- Q: How do I run only the frontend build locally?
  - A: `pnpm --dir frontend_app build`

- Q: How do I run only the tauri build locally?
  - A: From project root: `cd desktop/src-tauri && npx --prefix ../../frontend_app tauri build --config tauri.conf.json` (requires Rust toolchain installed).

Acknowledgements
----------------
This file is adapted for the OSS workspace from internal engineering guidance. Keep it updated and ask maintainers if you need clarifications.
