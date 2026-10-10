"""Read-only deployment checks that never print secret values."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def command_version(command: str) -> str | None:
    executable = shutil.which(command)
    if not executable:
        return None
    try:
        result = subprocess.run(
            [executable, "--version"],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return None
    return (result.stdout or result.stderr).strip() or "available"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", default="ap-southeast-2")
    parser.add_argument("--branch", default="sathwik_branch")
    parser.add_argument(
        "--profile",
        default=os.getenv("AWS_PROFILE"),
        help="AWS CLI profile used for the read-only identity check",
    )
    args = parser.parse_args()

    failures: list[str] = []
    required = {
        "node": command_version("node"),
        "npm": command_version("npm"),
        "uv": command_version("uv"),
        "aws": command_version("aws"),
    }
    for name, version in required.items():
        if version is None:
            failures.append(f"missing required executable: {name}")

    if required["aws"] is not None:
        identity_command = ["aws", "sts", "get-caller-identity", "--region", args.region]
        if args.profile:
            identity_command.extend(["--profile", args.profile])
        identity = subprocess.run(
            identity_command,
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        if identity.returncode != 0:
            failures.append(
                "AWS identity check failed; configure a profile and permissions before deployment"
            )

    if args.region != "ap-southeast-2":
        failures.append(
            f"unexpected region {args.region!r}; pass --region ap-southeast-2 "
            "or intentionally update the deployment target"
        )

    cdk_path = ROOT / "infrastructure" / "cdk.json"
    cdk = json.loads(cdk_path.read_text())
    configured_region = cdk.get("context", {}).get("region")
    if configured_region != args.region:
        failures.append(
            f"infrastructure/cdk.json configures {configured_region!r}, "
            f"expected {args.region!r}"
        )
    configured_branch = cdk.get("context", {}).get("branch")
    if configured_branch != args.branch:
        failures.append(
            f"infrastructure/cdk.json configures branch {configured_branch!r}, "
            f"expected {args.branch!r}"
        )

    unsafe_env = ROOT / "backend" / ".env"
    if unsafe_env.exists():
        failures.append("backend/.env exists; revoke any contained key and remove the file")

    placeholder = ROOT / "backend" / ".env.example"
    if not placeholder.exists():
        failures.append("backend/.env.example is missing")

    payload = {
        "region": args.region,
        "branch": args.branch,
        "profile": args.profile,
        "checks": required,
        "failures": failures,
    }
    print(json.dumps(payload, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
