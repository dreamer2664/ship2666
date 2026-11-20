#!/usr/bin/env python3
"""Commit and push only this agent's branch; credentials must be in GH_TOKEN.

Scans tracked/staged project files for common credential prefixes before pushing.
No credential is ever printed or persisted by this script.
"""
import argparse
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def git(*args):
    result = subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        detail = (result.stdout + result.stderr).replace(os.environ.get('GH_TOKEN', '\0'), '[REDACTED]')
        raise SystemExit(f'Git {args[0]} failed ({result.returncode}): {detail}')
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('message')
    args = parser.parse_args()
    expected = (ROOT/'docs/agent_branch.txt').read_text().strip()
    current = git('branch', '--show-current')
    if not re.fullmatch(r'teutonic-[A-Z0-9]{8}', expected) or current != expected:
        raise SystemExit('Refusing checkpoint: not on the recorded isolated agent branch.')
    if not os.environ.get('GH_TOKEN'):
        raise SystemExit('Supply GH_TOKEN through a secure environment before checkpointing.')
    git('add', '-A')
    files = git('ls-files', '-z').split('\0')
    pattern = re.compile(rb'(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)')
    for name in files:
        p = ROOT/name
        if p.is_file() and p.stat().st_size < 100*1024**2 and pattern.search(p.read_bytes()):
            raise SystemExit(f'Refusing checkpoint: possible credential in {name}')
    if git('diff', '--cached', '--name-only'):
        print(git('commit', '-m', args.message+'\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>'))
    else:
        print('No changed files to commit.')
    print(git('push', '-u', 'origin', expected))
    remote = git('ls-remote', '--heads', 'origin', f'refs/heads/{expected}')
    local = git('rev-parse', 'HEAD')
    if not remote.startswith(local+'\t'):
        raise SystemExit('Remote verification failed.')
    print('VERIFIED', expected, local)

if __name__ == '__main__':
    main()
