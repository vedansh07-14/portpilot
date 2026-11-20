# PortPilot

**Know what's running. Take control of your ports.**

PortPilot is a cross‑platform, production‑ready CLI tool that helps developers discover, inspect, and safely manage processes listening on TCP ports. It eliminates the tedious manual steps involved when you encounter `EADDRINUSE` errors during local development.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Example Output](#example-output)
- [Screenshots](#screenshots)
- [Supported Platforms](#supported-platforms)
- [Architecture Overview](#architecture-overview)
- [How It Works (User‑Facing Explanation)](#how-it-works-userfacing-explanation)
- [Security & Reliability](#security--reliability)
- [Public Use](#public-use)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

PortPilot provides a unified, interactive experience for:

- Scanning active listening ports.
- Inspecting detailed process metadata.
- Gracefully freeing or force‑killing processes.
- Watching ports in real‑time.
- Searching processes by name.
- Diagnosing common port‑conflict scenarios.

It is built with **Node.js ≥ 20**, **ESM**, and a minimal dependency set (`commander`, `chalk`, `@inquirer/prompts`, `ora`).

---

## Problem Statement

Developers often hit `EADDRINUSE` when a previously‑started server hasn't been stopped or when a system service (e.g., macOS AirPlay Receiver) occupies a standard development port. The typical workflow—manually running `lsof`/`netstat`, locating a PID, then issuing `kill`—is error‑prone and non‑portable across macOS, Linux, and Windows.

PortPilot automates this workflow while keeping safety and transparency at the forefront.

---

## Features

- **Cross‑platform:** macOS (`lsof`), Linux (`ss` with `lsof` fallback), Windows (`netstat` + PowerShell).
- **Human‑friendly tables** with colorized output via `chalk`.
- **JSON mode** for scripting and CI pipelines.
- **Interactive prompts** (`@inquirer/prompts`) for confirmation before termination.
- **Graceful termination** (`SIGTERM`) with optional forced kill (`SIGKILL`).
- **Live watch mode** (`portpilot watch`) to monitor port changes in real time.
- **Search** processes by name and list associated ports.
- **Doctor** command that diagnoses common conflicts (e.g., macOS AirPlay ports).
- **Extensive test suite** (Vitest) with platform‑specific adapters.
- **ESLint‑configured codebase** and GitHub Actions CI for macOS, Linux, Windows.

---

## Installation

Install globally from npm:

```bash
npm install -g portpilot-cli
```

Or run directly without installing using `npx`:

```bash
npx portpilot-cli scan
```

Both `portpilot` and `portpilot-cli` command aliases are registered in your `$PATH`.

From source:

```bash
# Clone the repository
git clone https://github.com/vedansh07-14/portpilot.git
cd portpilot

# Install dependencies and link executable globally
npm ci
npm link
```

> **Note:** The package requires **Node.js ≥ 20.0.0**.

---

## Quick Start

```bash
# Scan all listening ports
portpilot scan

# Scan a specific port
portpilot scan --port 3000

# Inspect detailed process info on a port
portpilot inspect 3000

# Gracefully free a port (skip confirmation prompt with --yes)
portpilot free 3000 --yes

# Force‑kill a port (use with caution)
portpilot kill 3000 --yes --force

# Search for processes using a specific name
portpilot search node

# Diagnose port conflicts (e.g., macOS AirPlay receiver)
portpilot doctor

# Watch ports in real‑time (Ctrl+C to stop)
portpilot watch --interval 1500
```

*(You can also invoke commands using `portpilot-cli <command>`)*

---

## CLI Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `scan` | List all active listening TCP ports. | `--port <num>` filter, `--json` output |
| `inspect <port>` | Show detailed process info for a specific port. | `--json` |
| `free <port>` | Gracefully terminate the process on a port after confirmation. | `--yes` skip prompt |
| `kill <port>` | Terminate a process with explicit confirmation; optional `--force` for SIGKILL. | `--yes`, `--force` |
| `watch` | Continuously monitor ports; shows newly occupied and released ports. | `--interval <ms>` |
| `search <process‑name>` | Find ports used by processes matching the name. | `--json` |
| `doctor` | Diagnose common port‑conflict situations and offer remediation steps. | — |

---

## Example Output

### Terminal Table Output

```text
PORTPILOT - Port Scanner
- Scanning occupied ports...

PORT     PID       PROCESS       STATUS
3000     18452     node          LISTENING
5173     19021     vite          LISTENING
5432     1022      postgres      LISTENING

3 active ports detected.
```

### JSON Output (`--json`)

```json
[
  {
    "port": 3000,
    "protocol": "TCP",
    "pid": 18452,
    "processName": "node",
    "command": "node",
    "status": "LISTENING",
    "addresses": ["::1", "127.0.0.1"],
    "user": "501"
  }
]
```

---

## Screenshots

Below are examples of PortPilot in action:

### 1. Port Scanning (`portpilot scan`)
![PortPilot scan output](docs/screenshots/scan.png)

### 2. Process Inspection (`portpilot inspect <port>`)
![PortPilot inspect output](docs/screenshots/inspect.png)

### 3. Graceful Freeing (`portpilot free <port>`)
![PortPilot free output](docs/screenshots/free.png)

### 4. Real-time Watch Mode (`portpilot watch`)
![PortPilot watch output](docs/screenshots/watch.png)

### 5. System Diagnosis (`portpilot doctor`)
![PortPilot doctor output](docs/screenshots/doctor.png)

---

## Supported Platforms

| OS | Primary utility | Fallback |
|----|------------------|----------|
| macOS (`darwin`) | `lsof -F pcufn` | — |
| Linux (`linux`) | `ss -tlpn` | `lsof -F pcufn` |
| Windows (`win32`) | `netstat -ano -p tcp` | PowerShell `Get‑CimInstance` for process details |

The tool abstracts these differences behind a clean JavaScript API.

---

## Architecture Overview

PortPilot follows a clean, layered architecture that separates concerns and makes the code easy to test and extend:

```
portpilot/
├── bin/
│   └── portpilot.js          # executable entry point
├── src/
│   ├── cli/                  # Commander command definitions
│   │   └── commands/         # scan, inspect, free, kill, watch, search, doctor
│   ├── core/                 # Business logic (scanning, inspection, termination)
│   │   ├── scanner.js        # orchestrates a scan via a platform adapter
│   │   ├── process-manager.js# high‑level inspect / free / kill workflow
│   │   ├── safety.js         # guards against killing system processes
│   │   └── normalizer.js     # normalises raw OS data into a common shape
│   ├── platform/             # OS‑specific adapters (macos, linux, windows)
│   │   ├── macos.js          # uses `lsof`
│   │   ├── linux.js          # prefers `ss`, falls back to `lsof`
│   │   └── windows.js        # uses `netstat` + PowerShell for details
│   ├── reporters/            # table, JSON, and error rendering
│   └── utils/                # exec wrapper, validation, logger
├── tests/                    # Vitest test suite (unit + integration)
├── .github/workflows/ci.yml  # CI for macOS, Linux, Windows
├── package.json
└── README.md
```

### Data Flow for a Typical Command

1. **CLI entry** – `portpilot <cmd>` parses arguments via *commander* and calls the corresponding command module.
2. **Command module** – prepares UI (spinners, prompts) and delegates to the core.
3. **Core layer** – e.g., `scanPorts()` asks the **platform adapter** for raw socket information.
4. **Platform adapter** – runs a safe subprocess (`safeExec`) of the native utility (`lsof`, `ss`, `netstat`). The output is parsed into a normalized record.
5. **Normalizer** – merges duplicate entries (IPv4/IPv6) and yields a consistent object `{port, pid, processName, ...}`.
6. **Reporter** – prints a colored table (`printPortTable`) or JSON (`outputJson`).
7. For *free/kill* commands, the core also calls `inspectProcess()` → gathers extra metadata via `ps` (macOS/Linux) or PowerShell (Windows) → passes the data through **safety** checks → finally sends `SIGTERM`/`SIGKILL` via `process.kill` (POSIX) or `taskkill` (Windows).

---

## How It Works (User‑Facing Explanation)

PortPilot works by asking the operating system which processes are listening on TCP ports, then giving you a friendly view and safe ways to stop them.

### Step‑by‑Step Workflow

1. **Scanning** – The tool runs an OS‑specific command:
   * macOS → `lsof -iTCP -sTCP:LISTEN -n -P -F pcufn`
   * Linux → `ss -tlpn` (fallback `lsof`)
   * Windows → `netstat -ano -p tcp`
   The raw output is parsed into a list of *records* containing `port`, `pid`, `processName`, `status`, etc.
2. **Normalization** – Duplicates (e.g., a process listening on both IPv4 and IPv6) are merged, and fields are capitalized so every platform yields the same shape.
3. **Display** – The CLI prints a tidy table with colors (port number in green, PID dimmed, process name bright). With `--json` you get a machine‑readable JSON array.
4. **Inspection** – When you ask `inspect <port>`, PortPilot looks up the record, then calls `ps` (or PowerShell) to fetch:
   * executable path
   * full command line
   * parent PID
   * owner user
   If the current user lacks permission, PortPilot reports that and suggests `sudo`/run as Administrator.
5. **Free / Kill** –
   * **Free** – sends a graceful `SIGTERM` (or *Terminate* on Windows) and waits up to a configurable timeout (default 2.5 s) to see if the process exits.
   * **Kill** – works exactly like *Free* but, if you pass `--force`, it sends `SIGKILL` (or `taskkill /F`).
   Before any termination, **Safety** checks ensure the PID is not a critical system PID (0/1) and that the process name is not on the protected list (e.g., `systemd`, `launchd`, `svchost.exe`).
6. **Watch** – A loop periodically calls the scanner (default every 1.5 s) and prints changes: new ports in green, released ports in red. Press **Ctrl+C** to stop.
7. **Search** – Scans all ports, then filters the normalized list by the supplied process name (case‑insensitive) and displays matches.
8. **Doctor** – Runs an analysis of the current listening ports, looks for common culprits (e.g., macOS AirPlay using ports 5000/7000), and prints actionable advice.

---

## Security & Reliability

- **Input validation** for ports (1‑65535) and PIDs.
- **Safe subprocess execution** (`execFile`) – no shell interpolation.
- **Protected system processes** (e.g., `systemd`, `launchd`, `svchost.exe`) cannot be terminated.
- **Graceful termination first**; force kill requires an explicit `--force` flag.
- **Timeouts** and polling ensure the process has actually exited.
- **Permission‑error hints** guide users to run with `sudo`/Administrator when needed.
- **No telemetry** – nothing is sent outside the host.

---

## Public Use

PortPilot is publicly published on the npm registry under the package name [`portpilot-cli`](https://www.npmjs.com/package/portpilot-cli).

Anyone can install and run it with no authentication or configuration required:

```bash
# Global install
npm install -g portpilot-cli

# Run commands
portpilot --help
portpilot scan
portpilot doctor
```

---

## Contributing

1. Fork the repository on GitHub: [https://github.com/vedansh07-14/portpilot](https://github.com/vedansh07-14/portpilot)
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Run `npm ci` and `npm test` to ensure all 58 tests pass.
4. Run `npm run lint` to verify code style.
5. Commit and submit a Pull Request.

---

## License

PortPilot is released under the **MIT License**. See the [LICENSE](LICENSE) file for details.
