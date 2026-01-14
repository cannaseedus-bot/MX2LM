<?php
$pythonBin = 'python3';

$data = [
    'name' => 'Alice',
    'age' => 30,
];

$jsonData = escapeshellarg(json_encode($data));
$command = $pythonBin . ' ' . escapeshellarg(__DIR__ . '/process_data.py') . ' ' . $jsonData;

$output = shell_exec($command);

if ($output === null) {
    echo 'Error running Python script.';
    exit(1);
}

$result = json_decode($output, true);

if ($result === null) {
    echo 'Error decoding Python response.';
    exit(1);
}

print_r($result);
