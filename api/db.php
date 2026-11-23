<?php
// api/db.php
// Cliente mínimo para la API REST de Supabase (PostgREST) usando cURL.

$cfgFile = __DIR__ . '/config.php';
if (!file_exists($cfgFile)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Falta api/config.php. Copia config.example.php y rellénalo.']);
    exit;
}
$GLOBALS['PM_CFG'] = require $cfgFile;

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ---------- Helpers generales ----------

function respond($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function current_user_id(): ?string {
    return $_SESSION['user_id'] ?? null;
}

function require_auth(): string {
    $uid = current_user_id();
    if (!$uid) respond(['error' => 'No autenticado'], 401);
    return $uid;
}

// ---------- Cliente Supabase ----------

class Supabase {
    private static ?string $url = null;
    private static ?string $key = null;

    private static function init(): void {
        if (self::$url !== null) return;
        $cfg = $GLOBALS['PM_CFG'];
        self::$url = rtrim($cfg['supabase_url'], '/') . '/rest/v1';
        self::$key = $cfg['supabase_service_key'] ?: $cfg['supabase_anon_key'];
    }

    private static function qs(array $params): string {
        if (!$params) return '';
        $qs = http_build_query($params);
        // PostgREST necesita paréntesis y comas literales en filtros tipo in.(1,2,3)
        return str_replace(['%28','%29','%2C'], ['(',')',','], $qs);
    }

    private static function request(string $method, string $path, $body = null, array $query = [], array $extraHeaders = []): array {
        self::init();
        $url = self::$url . '/' . ltrim($path, '/');
        $q = self::qs($query);
        if ($q) $url .= '?' . $q;

        $headers = array_merge([
            'apikey: ' . self::$key,
            'Authorization: Bearer ' . self::$key,
            'Content-Type: application/json',
            'Accept: application/json',
        ], $extraHeaders);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 20,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
        $resp   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($err) throw new Exception('Supabase cURL: ' . $err);

        $data = $resp ? json_decode($resp, true) : null;
        if ($status >= 400) {
            $msg = is_array($data) ? ($data['message'] ?? json_encode($data)) : (string)$resp;
            throw new Exception("Supabase error ({$status}): {$msg}");
        }
        return $data ?? [];
    }

    public static function select(string $table, array $query = []): array {
        return self::request('GET', $table, null, $query);
    }

    public static function insert(string $table, array $rows): array {
        return self::request('POST', $table, $rows, [], ['Prefer: return=representation']);
    }

    public static function upsert(string $table, array $rows, string $onConflict = ''): array {
        $query = [];
        if ($onConflict) $query['on_conflict'] = $onConflict;
        return self::request('POST', $table, $rows, $query, [
            'Prefer: resolution=merge-duplicates,return=representation',
        ]);
    }

    public static function update(string $table, array $body, array $filters): array {
        return self::request('PATCH', $table, $body, $filters, ['Prefer: return=representation']);
    }

    public static function delete(string $table, array $filters): array {
        return self::request('DELETE', $table, null, $filters, ['Prefer: return=representation']);
    }
}