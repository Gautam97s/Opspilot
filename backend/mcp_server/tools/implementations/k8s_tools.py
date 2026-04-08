import asyncio
import shutil
from typing import Optional, List

from mcp_server.tools.base import tool
from mcp_server.tools.registry import registry


TIMEOUT = 15.0


async def _run(cmd: List[str], timeout_s: float = TIMEOUT) -> str:
    if not cmd:
        return "Error: empty command"

    exe = cmd[0]
    if shutil.which(exe) is None:
        return f"Error: '{exe}' not found in PATH"

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_s)
        except asyncio.TimeoutError:
            proc.kill()
            return f"Error: command timed out after {timeout_s:.0f}s"

        out = stdout.decode(errors="replace").strip()
        err = stderr.decode(errors="replace").strip()

        if proc.returncode != 0:
            return f"Error: {err or out or f'kubectl exited with {proc.returncode}'}"

        return out
    except Exception as e:
        return f"Error: {str(e)}"


@tool(
    name="k8s_current_context",
    description="Get current kubectl context (kubectl config current-context)",
    risk="read",
)
async def k8s_current_context():
    return await _run(["kubectl", "config", "current-context"])


@tool(
    name="k8s_get_namespaces",
    description="List Kubernetes namespaces (kubectl get ns)",
    risk="read",
)
async def k8s_get_namespaces():
    return await _run(["kubectl", "get", "namespaces", "-o", "wide"])


@tool(
    name="k8s_get_pods",
    description="List pods in a namespace (kubectl get pods -o wide)",
    risk="read",
)
async def k8s_get_pods(namespace: str = "default"):
    return await _run(["kubectl", "get", "pods", "-n", namespace, "-o", "wide"])


@tool(
    name="k8s_describe_pod",
    description="Describe a pod (kubectl describe pod)",
    risk="read",
)
async def k8s_describe_pod(namespace: str, pod: str):
    return await _run(["kubectl", "describe", "pod", pod, "-n", namespace])


@tool(
    name="k8s_pod_logs",
    description="Get pod logs (kubectl logs --tail=N)",
    risk="read",
)
async def k8s_pod_logs(namespace: str, pod: str, container: Optional[str] = None, tail_lines: int = 200):
    cmd = ["kubectl", "logs", pod, "-n", namespace, "--tail", str(tail_lines)]
    if container:
        cmd.extend(["-c", container])
    return await _run(cmd)

@tool(
    name="k8s_pod_logs_previous",
    description="Get previous container logs (kubectl logs --previous --tail=N)",
    risk="read",
)
async def k8s_pod_logs_previous(namespace: str, pod: str, container: Optional[str] = None, tail_lines: int = 200):
    cmd = ["kubectl", "logs", pod, "-n", namespace, "--previous", "--tail", str(tail_lines)]
    if container:
        cmd.extend(["-c", container])
    return await _run(cmd)


@tool(
    name="k8s_pod_logs_follow",
    description="Follow pod logs for a bounded duration (kubectl logs --follow). Returns output captured during the time window.",
    risk="read",
)
async def k8s_pod_logs_follow(
    namespace: str,
    pod: str,
    container: Optional[str] = None,
    duration_seconds: int = 10,
    tail_lines: int = 50,
):
    duration = max(1, min(int(duration_seconds), 60))
    cmd = ["kubectl", "logs", pod, "-n", namespace, "--follow", "--tail", str(tail_lines)]
    if container:
        cmd.extend(["-c", container])
    # Allow follow to run for the requested duration plus a small buffer.
    return await _run(cmd, timeout_s=float(duration) + 2.0)


@tool(
    name="k8s_get_deployments",
    description="List deployments in a namespace (kubectl get deploy -o wide)",
    risk="read",
)
async def k8s_get_deployments(namespace: str = "default"):
    return await _run(["kubectl", "get", "deployments", "-n", namespace, "-o", "wide"])


@tool(
    name="k8s_describe_deployment",
    description="Describe a deployment (kubectl describe deployment)",
    risk="read",
)
async def k8s_describe_deployment(namespace: str, deployment: str):
    return await _run(["kubectl", "describe", "deployment", deployment, "-n", namespace])


@tool(
    name="k8s_get_services",
    description="List services in a namespace (kubectl get svc -o wide)",
    risk="read",
)
async def k8s_get_services(namespace: str = "default"):
    return await _run(["kubectl", "get", "services", "-n", namespace, "-o", "wide"])


@tool(
    name="k8s_describe_service",
    description="Describe a service (kubectl describe service)",
    risk="read",
)
async def k8s_describe_service(namespace: str, service: str):
    return await _run(["kubectl", "describe", "service", service, "-n", namespace])


@tool(
    name="k8s_get_ingress",
    description="List ingress resources in a namespace (kubectl get ingress -o wide)",
    risk="read",
)
async def k8s_get_ingress(namespace: str = "default"):
    return await _run(["kubectl", "get", "ingress", "-n", namespace, "-o", "wide"])


@tool(
    name="k8s_describe_ingress",
    description="Describe an ingress resource (kubectl describe ingress)",
    risk="read",
)
async def k8s_describe_ingress(namespace: str, ingress: str):
    return await _run(["kubectl", "describe", "ingress", ingress, "-n", namespace])


@tool(
    name="k8s_get_events",
    description="List events in a namespace (kubectl get events --sort-by=...)",
    risk="read",
)
async def k8s_get_events(namespace: str = "default"):
    return await _run(["kubectl", "get", "events", "-n", namespace, "--sort-by=.metadata.creationTimestamp"])


# Register tools
registry.register_tool(k8s_current_context)
registry.register_tool(k8s_get_namespaces)
registry.register_tool(k8s_get_pods)
registry.register_tool(k8s_describe_pod)
registry.register_tool(k8s_pod_logs)
registry.register_tool(k8s_pod_logs_previous)
registry.register_tool(k8s_pod_logs_follow)
registry.register_tool(k8s_get_events)
registry.register_tool(k8s_get_deployments)
registry.register_tool(k8s_describe_deployment)
registry.register_tool(k8s_get_services)
registry.register_tool(k8s_describe_service)
registry.register_tool(k8s_get_ingress)
registry.register_tool(k8s_describe_ingress)

