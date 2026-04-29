# Changelog

All notable changes to this repository will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Next Version
- Target OSS version for upcoming work: `0.1.4-oss`.

### Added
- Public OSS credits page at `frontend_app/public/CREDITS.md` summarizing the main OSS components used by the app, what they are used for, and the main upstream license terms.

### Changed
- OSS landing footer now includes a `Credits` entry and raw markdown link so acknowledgements and licensing notes are visible from the public landing experience.

### Fixed
- GitHub Actions: updated Node.js version from 20 to 24 to resolve deprecation warning on GitHub Actions runners.

### Known Issues
- Stripe billing integration in Windows desktop app may show customer mismatch errors if `VITE_STRIPE_PUBLISHABLE_KEY` GitHub Actions secret is not configured. Ensure the repository secret is set to the public Stripe publishable key matching your backend configuration.

### Added
- Initial OSS repository extraction for desktop/local edition.
- OSS governance docs: README, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, OSS_SCOPE, RELEASE_PROCESS.
- GitHub Actions release workflow for desktop artifacts at .github/workflows/release-desktop.yml.
- MIT license.
- GitHub Actions security + release gating job (`security-and-version-checks`) that runs before desktop packaging.
- CI Rust dependency audit via `cargo-audit`.
- CI frontend production dependency audit via `pnpm --dir frontend_app audit --prod`.
- CI version consistency verification across:
  - `frontend_app/package.json`
  - `desktop/src-tauri/tauri.conf.json`
  - `desktop/src-tauri/Cargo.toml`

### Changed
- Workspace reduced to desktop/local scope (`frontend_app` + `desktop/src-tauri`).
- Tauri desktop configuration aligned for extracted OSS layout.
- Release target policy set to:
  - Windows portable executable (`MindMapVault.exe`)
  - Linux AppImage (`*.AppImage`)
- Cloud hooks kept visible in UI.
- Desktop local store clippy cleanup:
  - Replaced `std::io::Error::new(ErrorKind::Other, ...)` with `std::io::Error::other(...)` in path helper error mapping.
  - Marked the Tauri metadata update command with `#[allow(clippy::too_many_arguments)]` to preserve command contract while keeping lint output clean.

### Build Validation
- Frontend build verified in OSS folder.
- Windows desktop binary build verified at desktop/src-tauri/target/release/MindMapVault.exe.
- Windows installer bundle verified at desktop/src-tauri/target/release/bundle/nsis/MindMapVault_0.3.12_x64-setup.exe.

### Security Validation
- Frontend production dependency audit (`npm audit --omit=dev`) returned 0 vulnerabilities.
- Rust lint (`cargo clippy --all-targets`) completed with no blocking diagnostics after local_store cleanup.

### Changed
- Use `tauri build --no-bundle` by default in `scripts/test-workflow.sh` and related workflows so the Tauri CLI embeds frontend assets correctly (avoids passing raw `--no-bundle` to `cargo`).
- Consolidated Lucide icon imports into a single `lucide-icons` chunk via `frontend_app/vite.config.ts` `manualChunks` (reduces hundreds of tiny JS chunks).
- Added `beforeDevCommand` to `desktop/src-tauri/tauri.conf.json` so `tauri dev` starts the frontend dev server automatically via the workspace `pnpm dev:app` script.
- Added `scripts/sync-to-wsl-home-and-run.sh` and improved `test-workflow.sh` to simplify syncing the Windows checkout into WSL and running builds/dev in the native WSL workspace.
- Documented and applied WSL/VM rendering workarounds: `WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1` for WebKit input issues, and `LIBGL_ALWAYS_SOFTWARE=1` or adding the user to the `render`/`video` groups for GPU device access on Linux.
- Updated the light-mode contrast for the "Available only in Cloud mode" infobox in `frontend_app/src/pages/VaultsPage.tsx` (now uses slate colors matching the encryption infobox).

### Files
- `scripts/test-workflow.sh` — default to `tauri build --no-bundle` (opt-in bundle path retained).
- `scripts/sync-to-wsl-home-and-run.sh` — helper to rsync repo into WSL workspace and run build/dev flows there.
- `frontend_app/vite.config.ts` — `manualChunks` to bundle lucide icons into `lucide-icons`.
- `frontend_app/src/pages/VaultsPage.tsx` — UI contrast fix for cloud-only infobox.
- `desktop/src-tauri/tauri.conf.json` — added `beforeDevCommand` and updated version in this change set.


## [0.1.3] - 2026-04-19

### Fixed
- Desktop login/local unlock footer badge now uses theme-aware colors so the `Tauri` label is readable in dark mode.
- Added dark/light theme toggle on the desktop local unlock/login screen (`/local-unlock`) to match the hosted login UX.
- CI workflow version-check step no longer fails due to shell interpolation of JavaScript template literals (replaced inline `node -e` with quoted heredoc script block).

### Changed
- Release workflow build jobs continue to inject `VITE_STRIPE_PUBLISHABLE_KEY` from GitHub repository secrets during desktop packaging.

### Files
- `.github/workflows/release-desktop.yml`
- `frontend_app/src/components/DesktopTauriBadge.tsx`
- `frontend_app/src/pages/LocalUnlockPage.tsx`
- `OSS_VERSION`
- `desktop/src-tauri/tauri.conf.json`


## [0.1.2] - 2026-04-19

### Added
- `beforeDevCommand` in `desktop/src-tauri/tauri.conf.json` to enable `tauri dev` to start the frontend dev server automatically.

### Changed
- Default build flow uses `tauri build --no-bundle` to ensure frontend assets are embedded when running a headless build in CI/WSL.
- Consolidated Lucide icons into a single `lucide-icons` chunk via `frontend_app/vite.config.ts` for faster dev tooling and fewer network requests.
- Improved WSL/VM dev experience: added `scripts/sync-to-wsl-home-and-run.sh` and documented WebKit/GPU workarounds (`WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS`, `LIBGL_ALWAYS_SOFTWARE`, and `render`/`video` group permissions).
- UI: mark cloud-only features (Encrypted attachments, Shares, Version history) with explicit "Cloud only" tooltips and toasts when used in local/offline mode.
- Export options remain available in local mode (JSON/Markdown/PNG/PDF and encrypted `.crypt` download).
- Subscription dialog: make Stripe error/alert styling readable in light mode and preserve dark-mode appearance.

### Security / Ops
- Allow a local frontend override for the Stripe publishable key via `VITE_STRIPE_PUBLISHABLE_KEY` for development (public-only key; do NOT add secret keys to the client).

### Files
- `CHANGELOG.md` — new release notes for `0.1.2`.
- `OSS_VERSION` — bumped to `0.1.2-oss`.
- `desktop/src-tauri/tauri.conf.json` — version bumped to `0.1.2-oss` and `beforeDevCommand` added.
- `frontend_app/src/api/subscription.ts` — reads `VITE_STRIPE_PUBLISHABLE_KEY` as a publishable-key override if present.
- `frontend_app/src/components/SubscriptionDialog.tsx` — improved light-mode styling for error messages.

## [0.1.1] - 2026-04-19

### Fixed
- GitHub Actions workflow: resolve CI failures and version mismatches by:
  - aligning the `pnpm` version used by `pnpm/action-setup@v4` with the workspace `package.json` (`pnpm@10.17.1`) to avoid ERR_PNPM_BAD_PM_VERSION.
  - removing forwarded `tauri build` args that were passed through to Cargo (`--no-bundle`, `--bundles`) which caused unexpected-argument errors during native builds.
  - running `cargo audit` from the crate directory instead of using an unsupported `--manifest-path` flag in the runner.
  - opt-ing into Node.js 24 for JavaScript actions by setting `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` at workflow level to avoid deprecation issues.
  - adding `release` trigger and publishing artifacts to a persistent `latest` release so built `MindMapVault.exe` and AppImage are available via stable URLs.

### Notes
- These workflow updates are contained in `.github/workflows/release-desktop.yml` and are intended to improve CI stability and make the latest desktop artifacts easy to download from Releases.

## [0.1.0] - Planned

### Release Goals
- First public OSS desktop release.
- Publish Windows portable `.exe` and Linux `.AppImage` artifacts.
- Keep local-first encrypted workflow as the default desktop experience.
