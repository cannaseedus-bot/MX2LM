#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Dict, Iterable, List


def read_plan(path: str) -> List[str]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"PLAN file not found: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read().splitlines()


def save_plan(path: str, lines: Iterable[str]) -> None:
    content = "\n".join(lines) + "\n"
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


def parse_tasks(lines: Iterable[str]) -> List[Dict[str, str]]:
    tasks: List[Dict[str, str]] = []
    in_todo = False
    for line in lines:
        if line.strip() == "## TODO":
            in_todo = True
            continue
        if in_todo and line.startswith("## "):
            in_todo = False
        if in_todo and line.startswith("- ["):
            if line.startswith("- [x] "):
                tasks.append({"status": "complete", "title": line[6:]})
            elif line.startswith("- [ ] "):
                tasks.append({"status": "incomplete", "title": line[6:]})
    return tasks


def mark_complete(lines: List[str], task: str) -> List[str]:
    needle = f"- [ ] {task}"
    updated = False
    for idx, line in enumerate(lines):
        if line == needle:
            lines[idx] = f"- [x] {task}"
            updated = True
            break
    if not updated:
        raise ValueError(f"Task not found or already complete: {task}")
    return lines


def mark_first_complete(lines: List[str]) -> str:
    for idx, line in enumerate(lines):
        if line.startswith("- [ ] "):
            lines[idx] = line.replace("- [ ] ", "- [x] ", 1)
            return line[6:]
    raise ValueError("No incomplete tasks found")


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def write_event(out_dir: str, event: Dict[str, object]) -> None:
    ensure_dir(out_dir)
    path = os.path.join(out_dir, "agent.events.jsonl")
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")


def load_events(path: str) -> List[Dict[str, object]]:
    events: List[Dict[str, object]] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                events.append(json.loads(line))
    return events


def render_svg(events: List[Dict[str, object]], out_path: str) -> None:
    header = """<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"480\" viewBox=\"0 0 800 480\">\n"""
    body = ["  <rect width=\"100%\" height=\"100%\" fill=\"#070b12\" />\n"]
    body.append("  <text x=\"40\" y=\"60\" fill=\"#e6f7ff\" font-size=\"24\" font-family=\"Inter, Arial, sans-serif\">Event Replay</text>\n")
    y = 110
    for event in events[:12]:
        line = json.dumps(event, ensure_ascii=False)
        body.append(
            "  <text x=\"40\" y=\"{}\" fill=\"#9fb3c8\" font-size=\"12\" font-family=\"Inter, Arial, sans-serif\">{}</text>\n".format(
                y,
                line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
            )
        )
        y += 20
    footer = "</svg>\n"
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(header)
        handle.writelines(body)
        handle.write(footer)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="KUHUL π task runner (deterministic)")
    parser.add_argument("--plan", default="PLAN.md", help="Path to PLAN.md")
    parser.add_argument("--out", default="output", help="Output directory for event logs")
    parser.add_argument("--list", action="store_true", help="List TODO tasks")
    parser.add_argument("--complete", help="Mark the named task complete")
    parser.add_argument("--complete-first", action="store_true", help="Mark the first incomplete task complete")
    parser.add_argument("--replay", help="Replay an event log JSONL file")
    parser.add_argument("--svg", help="Output SVG for replay")
    return parser


def main(argv: List[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.replay:
        svg_path = args.svg or "output/agent.replay.svg"
        events = load_events(args.replay)
        render_svg(events, svg_path)
        print(f"Replayed {len(events)} events to {svg_path}")
        return 0

    lines = read_plan(args.plan)
    tasks = parse_tasks(lines)

    if args.list:
        for task in tasks:
            box = "[x]" if task["status"] == "complete" else "[ ]"
            print(f"{box} {task['title']}")
        return 0

    completed_task = None
    if args.complete:
        completed_task = args.complete
        lines = mark_complete(lines, completed_task)
    elif args.complete_first:
        completed_task = mark_first_complete(lines)
    else:
        parser.print_help()
        return 0

    save_plan(args.plan, lines)

    if completed_task:
        write_event(
            args.out,
            {
                "@type": "kuhul.event",
                "@v": "1.0.0",
                "ts_ms": int(time.time() * 1000),
                "op": "complete_task",
                "task": completed_task,
                "plan": args.plan,
            },
        )
        print(f"Completed: {completed_task}")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
