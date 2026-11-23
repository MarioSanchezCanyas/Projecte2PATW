<?php
// api/pokeapi.php
// Integración con PokéAPI + caché en Supabase.

require_once __DIR__ . '/db.php';

// ---------- Helpers ----------

function pokeapi_get(string $path): ?array {
    $cfg = $GLOBALS['PM_CFG'];
    $url = rtrim($cfg['pokeapi_base'], '/') . '/' . ltrim($path, '/');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_USERAGENT      => 'PokeManager/1.0 (educational)',
    ]);
    $resp   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resp === false || $status >= 400) return null;
    return json_decode($resp, true);
}

function map_pokemon_to_cache(array $raw): array {
    $stats = [];
    foreach ($raw['stats'] ?? [] as $s) {
        $stats[$s['stat']['name']] = (int)$s['base_stat'];
    }
    return [
        'pokemon_id'     => (int)$raw['id'],
        'name'           => $raw['name'],
        'sprite_default' => $raw['sprites']['front_default'] ?? null,
        'sprite_shiny'   => $raw['sprites']['front_shiny']   ?? null,
        'types'          => $raw['types']     ?? [],
        'abilities'      => $raw['abilities'] ?? [],
        'base_hp'        => $stats['hp']              ?? 0,
        'base_atk'       => $stats['attack']          ?? 0,
        'base_def'       => $stats['defense']         ?? 0,
        'base_spa'       => $stats['special-attack']  ?? 0,
        'base_spd'       => $stats['special-defense'] ?? 0,
        'base_spe'       => $stats['speed']           ?? 0,
    ];
}

// ---------- Lógica de negocio ----------

function list_pokemons(int $limit = 20, int $offset = 0): array {
    $page = pokeapi_get("pokemon?limit={$limit}&offset={$offset}");
    if (empty($page['results'])) return [];

    $ids = [];
    foreach ($page['results'] as $r) {
        if (preg_match('#/pokemon/(\d+)/?$#', $r['url'], $m)) {
            $ids[] = (int)$m[1];
        }
    }
    if (!$ids) return [];

    $fields = 'pokemon_id,name,sprite_default,sprite_shiny,types';
    $cached = Supabase::select('pokemon_cache', [
        'pokemon_id' => 'in.(' . implode(',', $ids) . ')',
        'select'     => $fields,
    ]);
    $cachedData = $cached;
    $cachedIds  = array_map(fn($r) => (int)$r['pokemon_id'], $cachedData);

    $missing = array_diff($ids, $cachedIds);
    if ($missing) {
        $rows = [];
        foreach ($missing as $id) {
            $raw = pokeapi_get("pokemon/{$id}");
            if ($raw) $rows[] = map_pokemon_to_cache($raw);
        }
        if ($rows) Supabase::upsert('pokemon_cache', $rows, 'pokemon_id');

        $cached = Supabase::select('pokemon_cache', [
            'pokemon_id' => 'in.(' . implode(',', $ids) . ')',
            'select'     => $fields,
        ]);
        $cachedData = $cached;
    }

    // Reordena según el orden pedido
    $byId = [];
    foreach ($cachedData as $r) $byId[(int)$r['pokemon_id']] = $r;
    $ordered = [];
    foreach ($ids as $id) if (isset($byId[$id])) $ordered[] = $byId[$id];
    return $ordered;
}

function get_pokemon($idOrName): array {
    if (is_numeric($idOrName)) {
        $cached = Supabase::select('pokemon_cache', ['pokemon_id' => 'eq.' . (int)$idOrName]);
        if ($cached) return $cached[0];
    }

    $raw = pokeapi_get('pokemon/' . urlencode((string)$idOrName));
    if (empty($raw['id'])) throw new Exception('Pokémon no trobat');

    $row = map_pokemon_to_cache($raw);
    Supabase::upsert('pokemon_cache', [$row], 'pokemon_id');
    return $row;
}

function list_natures(): array {
    $cached = Supabase::select('natures', [
        'select' => 'id,name,increased_stat,decreased_stat',
        'order'  => 'id.asc',
    ]);
    if (count($cached) >= 20) return $cached;

    $page = pokeapi_get('nature?limit=50');
    if (empty($page['results'])) return $cached;

    $rows = [];
    foreach ($page['results'] as $r) {
        $slug = basename($r['url']);
        $detail = pokeapi_get('nature/' . $slug);
        if (!$detail) continue;
        $rows[] = [
            'id'             => (int)$detail['id'],
            'name'           => $detail['name'],
            'increased_stat' => $detail['increased_stat']['name'] ?? null,
            'decreased_stat' => $detail['decreased_stat']['name'] ?? null,
        ];
    }
    if ($rows) Supabase::upsert('natures', $rows, 'id');

    return Supabase::select('natures', [
        'select' => 'id,name,increased_stat,decreased_stat',
        'order'  => 'id.asc',
    ]);
}

function list_items(): array {
    $cached = Supabase::select('items_cache', [
        'select' => 'item_id,name',
        'order'  => 'name.asc',
        'limit'  => 1000,
    ]);
    if (count($cached) >= 50) return $cached;

    $attr = pokeapi_get('item-attribute/held-items');
    if (empty($attr['items'])) return $cached;

    $rows = [];
    foreach ($attr['items'] as $it) {
        if (preg_match('#/item/(\d+)/?$#', $it['url'], $m)) {
            $rows[] = [
                'item_id'  => (int)$m[1],
                'name'     => $it['name'],
                'category' => null,
            ];
        }
    }
    if ($rows) Supabase::upsert('items_cache', $rows, 'item_id');

    return Supabase::select('items_cache', [
        'select' => 'item_id,name',
        'order'  => 'name.asc',
        'limit'  => 1000,
    ]);
}

// ---------- Router ----------

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    $action = $_GET['action'] ?? '';
    try {
        switch ($action) {
            case 'list':
                respond(list_pokemons(
                    max(1, min(100, (int)($_GET['limit']  ?? 20))),
                    max(0, (int)($_GET['offset'] ?? 0))
                ));

            case 'detail':
                respond(get_pokemon($_GET['id'] ?? ''));

            case 'natures':
                respond(list_natures());

            case 'items':
                respond(list_items());

            default:
                respond(['error' => 'Acció desconeguda. Usa ?action=list|detail|natures|items'], 400);
        }
    } catch (Throwable $e) {
        respond(['error' => $e->getMessage()], 500);
    }
}