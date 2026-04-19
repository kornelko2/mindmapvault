# MindMapVault OSS — Roadmap

This document describes the planned development direction for the open-source desktop edition of MindMapVault.

The features below are derived from internal research and analysis of the competitive landscape (Obsidian, Logseq, MindMeister, XMind) and from user feedback on the hosted product at [www.mindmapvault.com](https://www.mindmapvault.com).

**Contributors and ideas are welcomed.** See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.

---

## Guiding Principles

- **Local-first always.** Desktop users must never require a network connection for core functionality.
- **Zero-knowledge by default.** Plaintext map content and encryption keys must never be sent to any server, including AI APIs, without explicit user opt-in.
- **No heavy dependencies.** Avoid large graph libraries. The app should stay fast and the binary size should stay reasonable.
- **Backward compatibility.** New node fields and storage changes must not break existing local vault files.

---

## Phase 1 — Core parity with knowledge worker tools

These features are the gap between the current app and what users coming from Obsidian or Logseq expect on day one.

### 1.1 Command palette

- `Cmd/Ctrl+P` overlay with fuzzy search over open maps and editor actions.
- Enables keyboard-first workflows without learning all shortcuts.
- Reusable component shared across the editor and the map list view.

### 1.2 Full-text search

- Index the `text` and `notes` fields of all map nodes.
- Global search across all local vaults.
- Results navigate directly to the matching node in the editor.

### 1.3 Markdown export and import

The current format is a JSON tree. Markdown is added as a secondary interchange layer only.

**Export** — render the node tree as a nested markdown list with `notes` as blockquotes:

```markdown
---
title: "Project Brainstorm"
created: 2026-04-18
---

# Project Brainstorm
- Root idea
  - Sub-idea A
    - Detail 1
  - Sub-idea B
    > Extended notes for Sub-idea B
```

**Import** — parse an indented markdown list or a fenced `mindmap` block (Mermaid-compatible) into the internal JSON tree.

The JSON tree format is preserved as the runtime and storage format. Markdown is for export, import, and human-readable archives.

### 1.4 Version history browser

The backend and local storage layer already track versions. The missing piece is a UI panel to browse, preview, and restore prior versions of a vault.

### 1.5 Map tags and labels

- Add `tags: string[]` to map metadata.
- Filter and search the map list by tag.
- No backend change required for local mode; tags are stored in local profile metadata.

---

## Phase 2 — Productivity and differentiation

Features that make MindMapVault meaningfully better than competitors for active users.

### 2.1 AI node expansion (opt-in, local-only safe)

- Right-click a node to expand it into sub-ideas using an AI API.
- The client sends the decrypted node text to the AI API directly — the server never sees plaintext.
- Requires explicit user opt-in with their own API key or a paid plan credit.
- Free tier: small monthly request budget.
- Message shown to users: *"AI is optional and never exposes your encrypted vault."*

### 2.2 Export to PNG and SVG

- Export the visible canvas as a PNG or SVG image.
- Useful for sharing or embedding maps in documents without exposing the source file.

### 2.3 Sync status badge per map

- Per-map indicator in the list view: `Local only` / `Synced` / `Pending sync` / `Conflict`.
- Cloud upgrade banners are never shown for maps that are purely local.

### 2.4 Map templates

Starter templates for common use cases:
- Brainstorm session
- SWOT analysis
- Project plan
- Weekly review
- Decision tree

### 2.5 Focus mode

- Dim inactive subtrees during deep-work sessions.
- Keep the active branch and its immediate siblings visible.
- Verify and align parity with the hosted frontend_app implementation.

---

## Phase 3 — Open source strategy

This phase covers the process improvements for maintaining a healthy open-source project alongside the private monorepo.

### 3.1 Current approach (active)

The OSS desktop edition is maintained as a curated export from the private monorepo:
- Only the `desktop/src-tauri` and `frontend_app` local-mode layers are published here.
- The cloud backend, admin surfaces, and SaaS billing code remain private.
- Each release is a manually reviewed and synced cut with a fresh history.

See [OSS_SCOPE.md](OSS_SCOPE.md) and [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for the current sync and release workflow.

### 3.2 Planned: automated split/mirror pipeline

Once 2–3 manual release cycles have been completed successfully, the goal is to automate the path-filtered sync from the private monorepo to this repository via CI.

Benefits:
- reduces manual sync overhead per release
- predictable cadence
- enforces the path allowlist automatically

Prerequisites before switching:
- path mapping file is stable and documented
- CI secret scan gate is confirmed reliable
- at least one external contributor has successfully built from source

### 3.3 Community and contribution goals

- Issue templates for feature requests, bug reports, and security disclosures.
- First-contributor guide: how to build locally on Windows and Linux.
- Contributor recognition in release notes.
- Public discussion channel (to be decided — GitHub Discussions or Matrix).

---

## What is explicitly out of scope for this OSS edition

The following will remain in the private hosted product and are not planned for this repository:

- Cloud encrypted sync backend
- Managed real-time collaboration infrastructure
- Billing, subscription, and tenant management
- Production deployment and hosted control plane
- Admin and analytics surfaces

---

## How to Contribute

Ideas, bug reports, and pull requests are welcome.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.
- For security issues, follow the responsible disclosure process in [SECURITY.md](SECURITY.md).
- For feature ideas not listed here, open a GitHub Discussion or an issue tagged `idea`.

If you are working on one of the features above, please comment on the relevant issue first so we can coordinate and avoid duplicate effort.

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v0.1.x | current OSS launch | local mode, basic editor, Tauri build, CI security gates |
| v0.2.x | planned | command palette, markdown export/import, version history browser |
| v0.3.x | planned | full-text search, map tags, focus mode parity |
| v0.4.x | planned | AI opt-in node expansion, PNG/SVG export, map templates |
| v1.0.0 | future | stable API contracts, automated OSS mirror pipeline, first external contributor release |
