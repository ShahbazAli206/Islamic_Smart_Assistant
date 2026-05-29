"""
One-click launcher for the Islamic Smart Assistant ecosystem.

What it does (in order):
  1. Verifies Docker, Node.js and npm are installed.
  2. Starts the database + redis containers (postgres, redis) from docker-compose.yml.
  3. Runs `npm install` for backend and web if node_modules is missing.
  4. Launches the NestJS backend (port 4000) in its own console window.
  5. Launches the Next.js web dashboard (port 3000) in its own console window.
  6. Waits for the web server to respond, then opens http://localhost:3000 in your browser.

Usage:
    python run_islamic_assistant.py            # start everything
    python run_islamic_assistant.py --stop     # stop the docker services
    python run_islamic_assistant.py --no-docker  # skip docker (use if you already have pg+redis running)

Tested on Windows. Works on macOS/Linux too (falls back to opening shells in the same terminal).
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT_DIR = ROOT / "islamic-smart-assistant"
BACKEND_DIR = PROJECT_DIR / "backend"
WEB_DIR = PROJECT_DIR / "web"
ASSET_DOWNLOADER = ROOT / "download_assets.py"
ASSET_MARKER = WEB_DIR / "public" / "audio" / "azan" / "makkah.mp3"

BACKEND_PORT = 4000
WEB_PORT = 3000
WEB_URL = f"http://localhost:{WEB_PORT}"

IS_WINDOWS = platform.system() == "Windows"


# ---------- pretty printing ----------

def info(msg: str) -> None:
    print(f"[ * ] {msg}")


def ok(msg: str) -> None:
    print(f"[ OK ] {msg}")


def warn(msg: str) -> None:
    print(f"[ ! ] {msg}")


def die(msg: str, code: int = 1) -> None:
    print(f"[FAIL] {msg}", file=sys.stderr)
    sys.exit(code)


# ---------- environment checks ----------

def which(cmd: str) -> str | None:
    """Resolve a command's full path. On Windows also tries .cmd / .exe."""
    found = shutil.which(cmd)
    if found:
        return found
    if IS_WINDOWS:
        for ext in (".cmd", ".exe", ".bat"):
            found = shutil.which(cmd + ext)
            if found:
                return found
    return None


def check_prereqs(skip_docker: bool) -> dict:
    paths: dict = {}

    node = which("node")
    if not node:
        die("Node.js not found. Install from https://nodejs.org/ and retry.")
    paths["node"] = node

    npm = which("npm")
    if not npm:
        die("npm not found. It ships with Node.js.")
    paths["npm"] = npm

    if not skip_docker:
        docker = which("docker")
        if not docker:
            die("Docker not found. Install Docker Desktop or pass --no-docker.")
        paths["docker"] = docker

        # docker compose v2 is a subcommand; v1 is `docker-compose`
        compose_v2_ok = subprocess.run(
            [docker, "compose", "version"],
            capture_output=True,
        ).returncode == 0
        if compose_v2_ok:
            paths["compose"] = [docker, "compose"]
        else:
            compose_v1 = which("docker-compose")
            if not compose_v1:
                die("docker compose not available. Update Docker Desktop or install docker-compose.")
            paths["compose"] = [compose_v1]

    ok("Toolchain check passed.")
    return paths


def check_paths() -> None:
    if not PROJECT_DIR.is_dir():
        die(f"Project folder not found: {PROJECT_DIR}")
    if not BACKEND_DIR.is_dir():
        die(f"Backend folder not found: {BACKEND_DIR}")
    if not WEB_DIR.is_dir():
        die(f"Web folder not found: {WEB_DIR}")
    if not (PROJECT_DIR / "docker-compose.yml").is_file():
        die(f"docker-compose.yml missing in {PROJECT_DIR}")


# ---------- docker services ----------

def start_docker_services(compose_cmd: list[str]) -> None:
    info("Starting postgres + redis containers...")
    result = subprocess.run(
        compose_cmd + ["-f", str(PROJECT_DIR / "docker-compose.yml"), "up", "-d", "postgres", "redis"],
        cwd=str(PROJECT_DIR),
    )
    if result.returncode != 0:
        die("docker compose failed to start postgres/redis.")

    info("Waiting for Postgres to become healthy...")
    deadline = time.time() + 60
    while time.time() < deadline:
        ps = subprocess.run(
            compose_cmd + ["-f", str(PROJECT_DIR / "docker-compose.yml"), "ps", "--format", "json"],
            cwd=str(PROJECT_DIR),
            capture_output=True,
            text=True,
        )
        if "healthy" in ps.stdout.lower() or _tcp_open("localhost", 5432):
            ok("Postgres reachable on :5432")
            break
        time.sleep(2)
    else:
        warn("Postgres didn't report healthy within 60s — continuing anyway.")

    if _tcp_open("localhost", 6379):
        ok("Redis reachable on :6379")
    else:
        warn("Redis not reachable on :6379 yet — backend may retry on startup.")


def stop_docker_services(compose_cmd: list[str]) -> None:
    info("Stopping docker services...")
    subprocess.run(
        compose_cmd + ["-f", str(PROJECT_DIR / "docker-compose.yml"), "down"],
        cwd=str(PROJECT_DIR),
    )
    ok("Stopped.")


# ---------- node install + dev servers ----------

def ensure_node_modules(npm_path: str, project_path: Path) -> None:
    node_modules = project_path / "node_modules"
    package_json = project_path / "package.json"
    lock_marker  = node_modules / ".package-lock.json"  # written by npm after install

    needs_install = False
    if not node_modules.is_dir():
        needs_install = True
        reason = "node_modules missing"
    elif package_json.is_file() and lock_marker.is_file():
        # If package.json was edited after the last install, refresh deps.
        if package_json.stat().st_mtime > lock_marker.stat().st_mtime:
            needs_install = True
            reason = "package.json updated since last install"
    elif not lock_marker.is_file():
        needs_install = True
        reason = "no install marker"

    if not needs_install:
        return

    info(f"Installing npm dependencies in {project_path.name} ({reason})...")
    result = subprocess.run([npm_path, "install"], cwd=str(project_path))
    if result.returncode != 0:
        die(f"npm install failed in {project_path}")
    ok(f"Dependencies installed for {project_path.name}.")


def spawn_dev_server(npm_path: str, project_path: Path, npm_script: str, title: str) -> subprocess.Popen:
    """Spawn `npm run <script>` for a project. On Windows, opens a new console window."""
    info(f"Starting {title} (npm run {npm_script}) ...")

    env = os.environ.copy()
    # Default env for backend so it can talk to the docker services.
    env.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/islamic_assistant")
    env.setdefault("REDIS_URL", "redis://localhost:6379")
    env.setdefault("PORT", str(BACKEND_PORT))
    env.setdefault("NODE_ENV", "development")
    # Web app needs to know where the API is
    env.setdefault("NEXT_PUBLIC_API_URL", f"http://localhost:{BACKEND_PORT}/v1")
    env.setdefault("NEXT_PUBLIC_WS_URL", f"ws://localhost:{BACKEND_PORT}/v1/sync")

    if IS_WINDOWS:
        # Use cmd.exe so we get a labelled window and the user can see logs.
        cmd = f'start "{title}" cmd /k "{npm_path}" run {npm_script}'
        return subprocess.Popen(
            cmd,
            cwd=str(project_path),
            env=env,
            shell=True,
        )
    else:
        # On *nix, spawn in background; logs go to a per-service file.
        log_path = project_path / f".{npm_script}.log"
        log_fh = open(log_path, "ab")
        return subprocess.Popen(
            [npm_path, "run", npm_script],
            cwd=str(project_path),
            env=env,
            stdout=log_fh,
            stderr=subprocess.STDOUT,
        )


# ---------- readiness ----------

def _tcp_open(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def wait_for_http(url: str, timeout_s: int = 180) -> bool:
    info(f"Waiting for {url} to respond (up to {timeout_s}s)...")
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status < 500:
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False


# ---------- main ----------

def main() -> None:
    parser = argparse.ArgumentParser(description="Islamic Smart Assistant launcher")
    parser.add_argument("--stop", action="store_true", help="Stop the docker services and exit.")
    parser.add_argument("--no-docker", action="store_true",
                        help="Skip docker (assume postgres+redis are already running locally).")
    parser.add_argument("--no-browser", action="store_true", help="Don't open the browser at the end.")
    parser.add_argument("--skip-install", action="store_true",
                        help="Skip checking/running npm install in backend and web.")
    parser.add_argument("--skip-assets", action="store_true",
                        help="Don't run the default-asset downloader, even on first launch.")
    parser.add_argument("--redownload-assets", action="store_true",
                        help="Force re-download of default Azan + Quran starter pack.")
    args = parser.parse_args()

    print("=" * 60)
    print(" Islamic Smart Assistant - dev launcher")
    print("=" * 60)
    check_paths()

    paths = check_prereqs(skip_docker=args.no_docker)

    if args.stop:
        if args.no_docker:
            die("--stop and --no-docker together is nonsense.")
        stop_docker_services(paths["compose"])
        return

    if not args.no_docker:
        start_docker_services(paths["compose"])

    if not args.skip_install:
        ensure_node_modules(paths["npm"], BACKEND_DIR)
        ensure_node_modules(paths["npm"], WEB_DIR)

    if not args.skip_assets and ASSET_DOWNLOADER.is_file():
        needs_download = args.redownload_assets or not ASSET_MARKER.is_file()
        if needs_download:
            info("Fetching default Azan + Quran starter pack (one-time)...")
            extra = ["--force"] if args.redownload_assets else []
            subprocess.run([sys.executable, str(ASSET_DOWNLOADER), *extra], cwd=str(ROOT))
        else:
            ok("Default audio assets already present — skipping downloader.")

    spawn_dev_server(paths["npm"], BACKEND_DIR, "start:dev", "Islamic-Assistant Backend (NestJS)")
    # small head start so the web app's first request doesn't immediately fail
    time.sleep(2)
    spawn_dev_server(paths["npm"], WEB_DIR, "dev", "Islamic-Assistant Web (Next.js)")

    if wait_for_http(WEB_URL, timeout_s=180):
        ok(f"Web dashboard is up at {WEB_URL}")
        if not args.no_browser:
            webbrowser.open(WEB_URL)
    else:
        warn(f"Web server didn't respond in time. Check the Next.js terminal window for errors.")
        warn(f"Once it's ready, open {WEB_URL} manually.")

    print()
    print("-" * 60)
    print(" Services:")
    print(f"   Backend API : http://localhost:{BACKEND_PORT}")
    print(f"   Web client  : {WEB_URL}")
    print(f"   Postgres    : localhost:5432  (user/pass: postgres/postgres)")
    print(f"   Redis       : localhost:6379")
    print()
    print(" Two new terminal windows were opened for backend + web.")
    print(" Close them (or press Ctrl+C inside) to stop those services.")
    print(f" To stop the database+redis containers later: python {Path(__file__).name} --stop")
    print("-" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(130)
