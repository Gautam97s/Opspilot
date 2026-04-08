import asyncio
import os
import re
import subprocess
import shutil
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from mcp_server.tools.base import tool
from mcp_server.tools.registry import registry


TIMEOUT = 60.0
REPO_ROOT = Path(__file__).resolve().parents[3] / "repos"
PROXY_ENV_KEYS = ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy")


def _ensure_repo_root() -> Path:
    REPO_ROOT.mkdir(parents=True, exist_ok=True)
    return REPO_ROOT


def _sanitized_env() -> dict[str, str]:
    env = os.environ.copy()
    for key in PROXY_ENV_KEYS:
        value = env.get(key)
        if not value:
            continue
        normalized = value.strip().lower()
        if normalized in {"http://127.0.0.1:9", "http://localhost:9"}:
            env.pop(key, None)
    return env


def _git_command(*args: str) -> list[str]:
    return ["git", "-c", "http.sslbackend=openssl", *args]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._")
    return slug or "repo"


def derive_repo_name(repo_url: str) -> str:
    parsed = urlparse(repo_url)
    raw_path = parsed.path or repo_url
    name = Path(raw_path.rstrip("/")).name
    if name.endswith(".git"):
        name = name[:-4]
    return _slugify(name)


def _resolve_repo_path(repo: str) -> Path:
    repo_root = _ensure_repo_root().resolve()
    candidate = Path(repo)
    if not candidate.is_absolute():
        candidate = repo_root / repo

    resolved = candidate.resolve()
    try:
        resolved.relative_to(repo_root)
    except ValueError as exc:
        raise ValueError("Repository path must stay inside the managed repo workspace") from exc

    return resolved


async def _run_git(*args: str, cwd: Optional[Path] = None, timeout_s: float = TIMEOUT) -> str:
    if shutil.which("git") is None:
        return "Error: 'git' not found in PATH"

    cmd = _git_command(*args)
    def run_sync() -> str:
        try:
            completed = subprocess.run(
                cmd,
                cwd=str(cwd) if cwd else None,
                env=_sanitized_env(),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_s,
                shell=False,
            )
        except subprocess.TimeoutExpired:
            return f"Error: command timed out after {timeout_s:.0f}s"
        except Exception as exc:
            return f"Error: {str(exc)}"

        out = (completed.stdout or "").strip()
        err = (completed.stderr or "").strip()
        if completed.returncode != 0:
            return f"Error: {err or out or f'git exited with {completed.returncode}'}"
        return out or "(ok)"

    return await asyncio.to_thread(run_sync)


@tool(
    name="github_connect_repo",
    description="Clone or refresh a managed GitHub repository into the local workspace",
    risk="operational",
)
async def github_connect_repo(repo_url: str, branch: Optional[str] = None):
    repo_name = derive_repo_name(repo_url)
    repo_path = _resolve_repo_path(repo_name)

    if repo_path.exists() and not (repo_path / ".git").exists():
        return f"Error: target path exists but is not a git repository: {repo_path}"

    if not repo_path.exists():
        clone_args = ["clone", "--depth", "1"]
        if branch:
            clone_args.extend(["--branch", branch])
        clone_args.extend([repo_url, str(repo_path)])
        clone_result = await _run_git(*clone_args)
        if clone_result.startswith("Error:"):
            return clone_result
    else:
        remote_url = await _run_git("remote", "get-url", "origin", cwd=repo_path)
        if remote_url.startswith("Error:"):
            return remote_url
        if remote_url.strip() != repo_url.strip():
            return (
                f"Error: managed repo '{repo_name}' already exists with a different origin.\n"
                f"Existing: {remote_url}\nRequested: {repo_url}"
            )
        fetch_result = await _run_git("fetch", "--all", "--prune", cwd=repo_path)
        if fetch_result.startswith("Error:"):
            return fetch_result

    fetch_all_result = await _run_git("fetch", "origin", "+refs/heads/*:refs/remotes/origin/*", "--prune", cwd=repo_path)
    if fetch_all_result.startswith("Error:"):
        return fetch_all_result

    if branch:
        checkout_result = await _run_git("checkout", branch, cwd=repo_path)
        if checkout_result.startswith("Error:"):
            remote_branch_check = await _run_git("show-ref", "--verify", f"refs/remotes/origin/{branch}", cwd=repo_path)
            if remote_branch_check.startswith("Error:"):
                return checkout_result
            checkout_result = await _run_git("checkout", "-B", branch, f"origin/{branch}", cwd=repo_path)
            if checkout_result.startswith("Error:"):
                return checkout_result
        pull_result = await _run_git("pull", "--ff-only", "origin", branch, cwd=repo_path)
        if pull_result.startswith("Error:"):
            return pull_result

    current_branch = await _run_git("branch", "--show-current", cwd=repo_path)
    status = await _run_git("status", "--short", cwd=repo_path)

    return "\n".join(
        [
            f"Connected repo: {repo_name}",
            f"Path: {repo_path}",
            f"Branch: {current_branch}",
            "Status:",
            status or "(clean)",
        ]
    )


@tool(
    name="github_list_managed_repos",
    description="List repositories that have been connected into the local managed workspace",
    risk="read",
)
async def github_list_managed_repos():
    repo_root = _ensure_repo_root()
    repos = sorted(
        path.name for path in repo_root.iterdir()
        if path.is_dir() and (path / ".git").exists()
    )
    if not repos:
        return "No managed repositories connected yet."
    return "\n".join(repos)


@tool(
    name="git_repo_status",
    description="Show git status for a managed repository",
    risk="read",
)
async def git_repo_status(repo: str):
    repo_path = _resolve_repo_path(repo)
    if not (repo_path / ".git").exists():
        return f"Error: repository not found: {repo_path}"
    branch = await _run_git("branch", "--show-current", cwd=repo_path)
    status = await _run_git("status", "--short", cwd=repo_path)
    return "\n".join(
        [
            f"Repo: {repo_path.name}",
            f"Path: {repo_path}",
            f"Branch: {branch}",
            "Status:",
            status or "(clean)",
        ]
    )


@tool(
    name="git_repo_branches",
    description="List local and remote branches for a managed repository",
    risk="read",
)
async def git_repo_branches(repo: str):
    repo_path = _resolve_repo_path(repo)
    if not (repo_path / ".git").exists():
        return f"Error: repository not found: {repo_path}"
    fetch_result = await _run_git("fetch", "origin", "+refs/heads/*:refs/remotes/origin/*", "--prune", cwd=repo_path)
    if fetch_result.startswith("Error:"):
        return fetch_result
    return await _run_git("branch", "-a", cwd=repo_path)


@tool(
    name="git_recent_commits",
    description="Show recent commits for a managed repository",
    risk="read",
)
async def git_recent_commits(repo: str, limit: int = 10):
    repo_path = _resolve_repo_path(repo)
    if not (repo_path / ".git").exists():
        return f"Error: repository not found: {repo_path}"
    capped_limit = max(1, min(int(limit), 50))
    return await _run_git(
        "log",
        f"-n{capped_limit}",
        "--pretty=format:%h %ad %an %s",
        "--date=short",
        cwd=repo_path,
    )


@tool(
    name="git_checkout_branch",
    description="Checkout a branch in a managed repository, creating a local tracking branch if needed",
    risk="operational",
)
async def git_checkout_branch(repo: str, branch: str):
    repo_path = _resolve_repo_path(repo)
    if not (repo_path / ".git").exists():
        return f"Error: repository not found: {repo_path}"

    fetch_result = await _run_git("fetch", "origin", "+refs/heads/*:refs/remotes/origin/*", "--prune", cwd=repo_path)
    if fetch_result.startswith("Error:"):
        return fetch_result

    local_branch_check = await _run_git("show-ref", "--verify", f"refs/heads/{branch}", cwd=repo_path)
    if not local_branch_check.startswith("Error:"):
        checkout_result = await _run_git("checkout", branch, cwd=repo_path)
    else:
        remote_branch_check = await _run_git("show-ref", "--verify", f"refs/remotes/origin/{branch}", cwd=repo_path)
        if remote_branch_check.startswith("Error:"):
            return f"Error: branch not found locally or on origin: {branch}"
        checkout_result = await _run_git("checkout", "-B", branch, f"origin/{branch}", cwd=repo_path)

    if checkout_result.startswith("Error:"):
        return checkout_result

    status = await _run_git("status", "--short", cwd=repo_path)
    return "\n".join(
        [
            f"Repo: {repo_path.name}",
            f"Checked out branch: {branch}",
            "Status:",
            status or "(clean)",
        ]
    )


registry.register_tool(github_connect_repo)
registry.register_tool(github_list_managed_repos)
registry.register_tool(git_repo_status)
registry.register_tool(git_repo_branches)
registry.register_tool(git_recent_commits)
registry.register_tool(git_checkout_branch)
