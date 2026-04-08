from pathlib import Path

import pytest

from mcp_server.tools.implementations import git_tools


def test_derive_repo_name_strips_git_suffix():
    assert git_tools.derive_repo_name("https://github.com/openai/opspilot.git") == "opspilot"


def test_resolve_repo_path_stays_in_managed_root(tmp_path, monkeypatch):
    monkeypatch.setattr(git_tools, "REPO_ROOT", tmp_path / "repos")
    resolved = git_tools._resolve_repo_path("sample-repo")
    assert resolved == (tmp_path / "repos" / "sample-repo").resolve()


def test_resolve_repo_path_rejects_escape(tmp_path, monkeypatch):
    monkeypatch.setattr(git_tools, "REPO_ROOT", tmp_path / "repos")
    with pytest.raises(ValueError, match="managed repo workspace"):
        git_tools._resolve_repo_path("..\\outside")


@pytest.mark.asyncio
async def test_list_managed_repos(tmp_path, monkeypatch):
    repo_root = tmp_path / "repos"
    (repo_root / "alpha" / ".git").mkdir(parents=True)
    (repo_root / "beta" / ".git").mkdir(parents=True)
    monkeypatch.setattr(git_tools, "REPO_ROOT", repo_root)

    result = await git_tools.github_list_managed_repos()
    assert result == "alpha\nbeta"


@pytest.mark.asyncio
async def test_git_repo_status_reports_branch_and_clean_state(tmp_path, monkeypatch):
    repo_root = tmp_path / "repos"
    repo_path = repo_root / "sample"
    (repo_path / ".git").mkdir(parents=True)
    monkeypatch.setattr(git_tools, "REPO_ROOT", repo_root)

    async def fake_run_git(*args, cwd=None, timeout_s=git_tools.TIMEOUT):
        assert cwd == repo_path
        if args[:2] == ("branch", "--show-current"):
            return "main"
        if args[:2] == ("status", "--short"):
            return ""
        return "(ok)"

    monkeypatch.setattr(git_tools, "_run_git", fake_run_git)

    result = await git_tools.git_repo_status("sample")
    assert "Repo: sample" in result
    assert "Branch: main" in result
    assert "(clean)" in result


@pytest.mark.asyncio
async def test_git_checkout_branch_tracks_remote_branch(tmp_path, monkeypatch):
    repo_root = tmp_path / "repos"
    repo_path = repo_root / "sample"
    (repo_path / ".git").mkdir(parents=True)
    monkeypatch.setattr(git_tools, "REPO_ROOT", repo_root)

    calls: list[tuple[str, ...]] = []

    async def fake_run_git(*args, cwd=None, timeout_s=git_tools.TIMEOUT):
        calls.append(args)
        assert cwd == repo_path
        if args[:2] == ("fetch", "origin"):
            return "(ok)"
        if args[:3] == ("show-ref", "--verify", "refs/heads/feature/test"):
            return "Error: not found"
        if args[:3] == ("show-ref", "--verify", "refs/remotes/origin/feature/test"):
            return "abc123"
        if args[:3] == ("checkout", "-B", "feature/test"):
            return "Switched"
        if args[:2] == ("status", "--short"):
            return ""
        return "(ok)"

    monkeypatch.setattr(git_tools, "_run_git", fake_run_git)

    result = await git_tools.git_checkout_branch("sample", "feature/test")
    assert "Checked out branch: feature/test" in result
    assert "(clean)" in result
    assert ("checkout", "-B", "feature/test", "origin/feature/test") in calls
