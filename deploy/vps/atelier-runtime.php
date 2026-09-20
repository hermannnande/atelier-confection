<?php
// Restart only our fixed application; never execute request parameters.
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
function atelierReady() {
    $socket = @fsockopen('127.0.0.1', 15818, $errno, $message, 0.2);
    if (!$socket) return false;
    fclose($socket);
    return true;
}
$ready = atelierReady();
if (!$ready) {
    $base = dirname(__DIR__) . '/private/atelier-runtime';
    $lock = @fopen($base . '/bootstrap.lock', 'c');
    if ($lock && flock($lock, LOCK_EX | LOCK_NB)) {
        // A lock and short cooldown prevent concurrent requests spawning many processes.
        $stamp = $base . '/bootstrap.attempt';
        if (!is_file($stamp) || time() - filemtime($stamp) >= 5) {
            touch($stamp);
            $command = 'LD_LIBRARY_PATH=' . escapeshellarg($base) . ' ' .
                escapeshellarg($base . '/node-v22.23.2-linux-x64/bin/node') . ' ' .
                escapeshellarg($base . '/ensure-running.mjs');
            $process = proc_open($command, [
                0 => ['file', $base . '/empty', 'r'],
                1 => ['file', $base . '/bootstrap.log', 'a'],
                2 => ['file', $base . '/bootstrap.log', 'a'],
            ], $pipes, $base);
            if (is_resource($process)) proc_close($process);
        }
        flock($lock, LOCK_UN);
    }
    if ($lock) fclose($lock);
    for ($i = 0; $i < 30 && !($ready = atelierReady()); $i++) usleep(100000);
}
if (($_SERVER['REDIRECT_STATUS'] ?? '') === '503') {
    // Never replay a customer order after an upstream error.
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Retry-After: 2');
    echo json_encode(['message' => 'Service en redémarrage. Réessayez dans quelques secondes.']);
} else {
    http_response_code($ready ? 200 : 503);
    header('Content-Type: application/javascript; charset=utf-8');
    echo $ready ? '/* Atelier API ready */' : '/* Atelier API temporarily unavailable */';
}
