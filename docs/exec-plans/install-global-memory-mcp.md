# Install a global persistent Memory MCP server

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This document is maintained in accordance with `C:\Users\aidar\.codex\PLANS.md`.

## Purpose / Big Picture

After this change, new local Codex projects can use one shared MCP knowledge graph to retain explicitly recorded project facts across tasks. The server will run locally, store its data under the user's Codex home directory, and require no access to arbitrary project files. Success is visible when Codex lists the `memory` MCP server and the server completes an MCP initialization request.

## Progress

- [x] (2026-08-09 20:22Z) Reviewed the global ExecPlan requirements, the existing Codex configuration, the available runtimes, and the upstream Memory server documentation.
- [x] (2026-08-09 20:24Z) Installed `@modelcontextprotocol/server-memory@2026.7.4` under the Codex home directory with a generated pnpm lockfile.
- [x] (2026-08-09 20:24Z) Backed up the global configuration and added an enabled `memory` STDIO server while retaining the existing `node_repl` server.
- [x] (2026-08-09 20:26Z) Completed MCP initialization, tool discovery, a sequential create-search-delete round trip, cleanup verification, and `codex mcp list` validation.
- [x] (2026-08-09 20:27Z) Added and verified a global policy for safe Memory MCP retrieval and retention in future projects.

## Surprises & Discoveries

- Observation: Node.js, npm, and npx are not available on the normal shell `PATH`, but Codex provides a bundled Node.js and pnpm runtime.
  Evidence: shell discovery reported the commands missing, while the workspace dependency loader returned explicit executable paths under `C:\Users\aidar\.cache\codex-runtimes\codex-primary-runtime\dependencies`.

- Observation: The upstream repository is a reference collection rather than a production bundle, so installing every included server would duplicate existing Codex capabilities.
  Evidence: the repository README labels the servers as reference implementations; the current Codex host already provides filesystem, shell, Git, browser, web, and time-related capabilities.

- Observation: A sandboxed direct launch could not follow pnpm's package link under the global `.codex` directory, while the same executable worked normally with host-level access.
  Evidence: the sandbox returned `EPERM` opening the resolved `.pnpm` entry point; the approved host smoke test completed with exit code 0.

- Observation: Sending dependent MCP tool calls without awaiting each response is invalid for a causal smoke test because the server may process them concurrently.
  Evidence: the first batch returned responses out of order and both searches ran before the create result. A sequential client that awaited each request verified the intended round trip.

## Decision Log

- Decision: Install only the upstream Memory reference server.
  Rationale: It adds durable local knowledge-graph storage, while the other reference servers duplicate existing capabilities or exist only for protocol testing.
  Date/Author: 2026-08-09 / Codex

- Decision: Install the package locally and pin its resolved version instead of using `npx -y` on every startup.
  Rationale: A local pinned installation avoids downloading executable code whenever a new Codex task starts and makes behavior reproducible.
  Date/Author: 2026-08-09 / Codex

- Decision: Store graph data at `C:\Users\aidar\.codex\mcp-data\memory.jsonl`.
  Rationale: The data remains global across projects but isolated from repository files and source control.
  Date/Author: 2026-08-09 / Codex

- Decision: Add a conservative global usage policy to `~/.codex/AGENTS.md`.
  Rationale: Installation alone makes tools available but does not ensure future agents retrieve useful context. The policy enables retrieval and durable project memory while prohibiting secrets and requiring verification against current source files and instructions.
  Date/Author: 2026-08-09 / Codex

## Outcomes & Retrospective

The global Memory MCP server is installed, enabled, and validated. Codex CLI lists both `memory` and the pre-existing `node_repl` as enabled. The server negotiated MCP protocol `2025-06-18`, identified itself as `memory-server` version `0.6.3`, advertised all nine expected knowledge-graph tools, and passed a sequential create-search-delete test. The temporary entity was removed, leaving no test record. Global agent guidance now tells future tasks to retrieve relevant durable context, retain only useful non-secret facts, verify memory against current files, and honor current instructions over stored context. New desktop tasks can use the server after Codex restarts and reloads its MCP configuration.

## Context and Orientation

Codex reads global configuration from `C:\Users\aidar\.codex\config.toml`. An MCP server using STDIO is a local process that exchanges protocol messages through standard input and standard output. The existing configuration contains a bundled `node_repl` MCP server and must be preserved. The new package will live at `C:\Users\aidar\.codex\mcp-servers\memory`; its executable JavaScript entry point will be launched with the bundled Node.js executable. The persistent graph is a JSON Lines file, meaning one JSON record is stored per line, at `C:\Users\aidar\.codex\mcp-data\memory.jsonl`.

## Plan of Work

Query the npm registry for the current published Memory server version, create the isolated installation directory, and install that exact version with the bundled pnpm executable. Add a `[mcp_servers.memory]` table and its environment table to the existing global TOML configuration, using absolute executable and data paths. Preserve every existing setting. Start the installed server and send MCP `initialize` and `tools/list` requests to prove it launches and exposes its tools. Finally, verify configuration text and update this living plan with the exact version and observed results.

## Concrete Steps

Run all commands from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`. Use the bundled pnpm executable to resolve and install `@modelcontextprotocol/server-memory`. Create only the two scoped directories under `C:\Users\aidar\.codex`. Update `C:\Users\aidar\.codex\config.toml` additively. Run a bounded protocol smoke test through the bundled Node.js executable and expect an initialization response containing server information plus a tool list containing `create_entities`, `search_nodes`, and `read_graph`.

## Validation and Acceptance

Acceptance requires all of the following observable behavior: the pinned package exists locally; the global TOML configuration retains the existing `node_repl` entry and contains one enabled `memory` entry; the configured data path points outside all repositories; the server responds to MCP initialization; and its tool list contains both read and write knowledge-graph operations. A new Codex task may require restarting the desktop client before the newly configured server appears.

## Idempotence and Recovery

Re-running package installation with the same pinned version is safe. Configuration must be added only if a `memory` table does not already exist. Before editing global configuration, save a timestamped backup next to it. If validation fails, restore that backup and leave the isolated package directory in place for diagnosis; it contains no project data. The memory data file may not exist until the first write and must not be treated as an installation failure.

## Artifacts and Notes

The installed npm package version is `2026.7.4`. The server reports its internal version as `0.6.3`. The original global configuration backup is `C:\Users\aidar\.codex\config.toml.backup-20260809-202417`. The concise sequential validation result was:

    {"protocolVersion":"2025-06-18","server":{"name":"memory-server","version":"0.6.3"},"createSearchDeleteVerified":true,"testEntityRemoved":true}

The final Codex CLI check listed `memory` with status `enabled` and retained `node_repl` with status `enabled`.

## Interfaces and Dependencies

The sole new dependency is the pinned npm package `@modelcontextprotocol/server-memory`. Codex will launch its JavaScript entry point with the bundled Node.js executable. The environment variable `MEMORY_FILE_PATH` must equal `C:\Users\aidar\.codex\mcp-data\memory.jsonl`. The MCP interface must expose the upstream knowledge-graph tools, including `create_entities`, `create_relations`, `add_observations`, `delete_entities`, `delete_observations`, `delete_relations`, `read_graph`, `search_nodes`, and `open_nodes`.

Revision note (2026-08-09): Created the initial self-contained installation plan after inspecting the host and upstream server documentation.

Revision note (2026-08-09): Marked installation complete, recorded the pinned version and backup path, documented sandbox and concurrency discoveries, and added protocol and round-trip validation evidence.

Revision note (2026-08-09): Added the global safe-use policy and documented why availability alone was insufficient for future-project adoption.
