<?php

declare(strict_types=1);

function usage(): void
{
    $msg = <<<TXT
KUHUL AI Agent Scaffold (PHP-first, cPanel-ready)

Usage:
  php ai_agent.php [--plan docs/plans/PLAN.md] [--out output] [--list]
  php ai_agent.php [--plan docs/plans/PLAN.md] [--out output] --complete "Task name"
  php ai_agent.php [--plan docs/plans/PLAN.md] [--out output] --complete-first
  php ai_agent.php --replay output/agent.events.jsonl --svg output/agent.replay.svg

Options:
  --plan            Path to PLAN.md (default: docs/plans/PLAN.md)
  --out             Output directory for event logs (default: output)
  --list            Print TODO tasks
  --complete        Mark the named task complete
  --complete-first  Mark the first incomplete task complete
  --replay          Replay an event log JSONL file
  --svg             Output SVG for replay
TXT;
    fwrite(STDOUT, $msg . "\n");
}

function read_plan(string $path): array
{
    if (!file_exists($path)) {
        throw new RuntimeException("PLAN file not found: {$path}");
    }
    $content = file_get_contents($path);
    if ($content === false) {
        throw new RuntimeException("Failed to read PLAN file: {$path}");
    }
    return preg_split('/\R/', $content);
}

function parse_tasks(array $lines): array
{
    $tasks = [];
    $in_todo = false;
    foreach ($lines as $line) {
        if (preg_match('/^##\s+TODO\s*$/', $line)) {
            $in_todo = true;
            continue;
        }
        if ($in_todo && preg_match('/^##\s+/', $line)) {
            $in_todo = false;
        }
        if ($in_todo && preg_match('/^- \[( |x)\] (.+)$/', $line, $matches)) {
            $tasks[] = [
                'status' => $matches[1] === 'x' ? 'complete' : 'incomplete',
                'title' => $matches[2],
            ];
        }
    }
    return $tasks;
}

function ensure_dir(string $path): void
{
    if (!is_dir($path)) {
        if (!mkdir($path, 0777, true) && !is_dir($path)) {
            throw new RuntimeException("Failed to create output directory: {$path}");
        }
    }
}

function write_event(string $outDir, array $event): void
{
    ensure_dir($outDir);
    $path = rtrim($outDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'agent.events.jsonl';
    $line = json_encode($event, JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        throw new RuntimeException('Failed to encode event payload');
    }
    file_put_contents($path, $line . "\n", FILE_APPEND);
}

function mark_complete(array $lines, string $task): array
{
    $updated = false;
    $needle = "- [ ] {$task}";
    foreach ($lines as $i => $line) {
        if ($line === $needle) {
            $lines[$i] = "- [x] {$task}";
            $updated = true;
            break;
        }
    }
    if (!$updated) {
        throw new RuntimeException("Task not found or already complete: {$task}");
    }
    return $lines;
}

function mark_first_complete(array $lines): array
{
    foreach ($lines as $i => $line) {
        if (preg_match('/^- \[ \] (.+)$/', $line)) {
            $lines[$i] = preg_replace('/^- \[ \] /', '- [x] ', $line);
            return $lines;
        }
    }
    throw new RuntimeException('No incomplete tasks found');
}

function save_plan(string $path, array $lines): void
{
    $content = implode("\n", $lines) . "\n";
    if (file_put_contents($path, $content) === false) {
        throw new RuntimeException("Failed to write PLAN file: {$path}");
    }
}

function load_events(string $path): array
{
    if (!file_exists($path)) {
        throw new RuntimeException("Event log not found: {$path}");
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        throw new RuntimeException("Failed to read event log: {$path}");
    }
    $events = [];
    foreach ($lines as $line) {
        $decoded = json_decode($line, true);
        if (is_array($decoded)) {
            $events[] = $decoded;
        }
    }
    return $events;
}

function render_svg(array $events, string $outPath): void
{
    $lines = [];
    $lines[] = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">';
    $lines[] = '  <rect width="100%" height="100%" fill="#070b12" />';
    $lines[] = '  <text x="40" y="60" fill="#e6f7ff" font-size="24" font-family="Inter, Arial, sans-serif">Event Replay</text>';
    $y = 110;
    foreach (array_slice($events, 0, 12) as $event) {
        $payload = json_encode($event, JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            continue;
        }
        $safe = htmlspecialchars($payload, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $lines[] = sprintf(
            '  <text x="40" y="%d" fill="#9fb3c8" font-size="12" font-family="Inter, Arial, sans-serif">%s</text>',
            $y,
            $safe
        );
        $y += 20;
    }
    $lines[] = '</svg>';
    $content = implode("\n", $lines) . "\n";
    if (file_put_contents($outPath, $content) === false) {
        throw new RuntimeException("Failed to write SVG: {$outPath}");
    }
}

$options = getopt('', ['plan::', 'out::', 'list', 'complete:', 'complete-first', 'replay:', 'svg:', 'help']);
if (isset($options['help'])) {
    usage();
    exit(0);
}

if (isset($options['replay'])) {
    $replayPath = $options['replay'];
    $svgPath = $options['svg'] ?? 'output/agent.replay.svg';
    $events = load_events($replayPath);
    render_svg($events, $svgPath);
    fwrite(STDOUT, "Replayed " . count($events) . " events to {$svgPath}\n");
    exit(0);
}

$planPath = $options['plan'] ?? 'docs/plans/PLAN.md';
$outDir = $options['out'] ?? 'output';
$lines = read_plan($planPath);
$tasks = parse_tasks($lines);

if (isset($options['list'])) {
    foreach ($tasks as $task) {
        $box = $task['status'] === 'complete' ? '[x]' : '[ ]';
        fwrite(STDOUT, "{$box} {$task['title']}\n");
    }
    exit(0);
}

$completedTask = null;
if (isset($options['complete'])) {
    $completedTask = $options['complete'];
    $lines = mark_complete($lines, $completedTask);
} elseif (isset($options['complete-first'])) {
    $lines = mark_first_complete($lines);
    $tasks = parse_tasks($lines);
    foreach ($tasks as $task) {
        if ($task['status'] === 'complete') {
            $completedTask = $task['title'];
            break;
        }
    }
} else {
    usage();
    exit(0);
}

save_plan($planPath, $lines);

if ($completedTask !== null) {
    write_event($outDir, [
        '@type' => 'kuhul.event',
        '@v' => '1.0.0',
        'ts_ms' => (int) round(microtime(true) * 1000),
        'op' => 'complete_task',
        'task' => $completedTask,
        'plan' => $planPath,
    ]);
}

fwrite(STDOUT, "Completed: {$completedTask}\n");
