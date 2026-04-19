# Changelog

All notable changes to this repository will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

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

## [0.1.0] - Planned

### Release Goals
- First public OSS desktop release.
- Publish Windows portable `.exe` and Linux `.AppImage` artifacts.
- Keep local-first encrypted workflow as the default desktop experience.
