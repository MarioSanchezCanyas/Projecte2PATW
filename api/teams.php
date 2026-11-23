<?php
// api/teams.php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

// ---------- Validaciones y cálculos ----------

function validate_member_payload(array $b): void {
    $level = (int)($b['level'] ?? 50);
    if ($level < 1 || $level > 100) throw new Exception('Nivell fora de rang (1-100)');

    $sumEv = 0;
    foreach (['hp','atk','def','spa','spd','spe'] as $s) {
        $iv = (int)($b["iv_$s"] ?? 31);
        $ev = (int)($b["ev_$s"] ?? 0);
        if ($iv < 0 || $iv > 31) throw new Exception("IV $s fora de rang (0-31)");
        if ($ev < 0 || $ev > 252) throw new Exception("EV $s fora de rang (0-252)");
        $sumEv += $ev;
    }
    if ($sumEv > 510) throw new Exception('La suma total d\'EVs supera 510');
}

function compute_stats(array $m, array $p, array $nature): array {
    $level = (int)$m['level'];
    $mult = ['atk'=>1.0,'def'=>1.0,'spa'=>1.0,'spd'=>1.0,'spe'=>1.0];
    $map  = ['attack'=>'atk','defense'=>'def','special-attack'=>'spa','special-defense'=>'spd','speed'=>'spe'];
    if (!empty($nature['increased_stat']) && isset($map[$nature['increased_stat']])) $mult[$map[$nature['increased_stat']]] = 1.1;
    if (!empty($nature['decreased_stat']) && isset($map[$nature['decreased_stat']])) $mult[$map[$nature['decreased_stat']]] = 0.9;

    $calc = function (int $base, int $iv, int $ev, float $mul, bool $isHp = false) use ($level): int {
        $inner = floor((2 * $base + $iv + floor($ev / 4)) * $level / 100);
        if ($isHp) return (int)($inner + $level + 10);
        return (int)floor(($inner + 5) * $mul);
    };

    return [
        'hp'  => $calc((int)$p['base_hp'],  (int)$m['iv_hp'],  (int)$m['ev_hp'],  1.0, true),
        'atk' => $calc((int)$p['base_atk'], (int)$m['iv_atk'], (int)$m['ev_atk'], $mult['atk']),
        'def' => $calc((int)$p['base_def'], (int)$m['iv_def'], (int)$m['ev_def'], $mult['def']),
        'spa' => $calc((int)$p['base_spa'], (int)$m['iv_spa'], (int)$m['ev_spa'], $mult['spa']),
        'spd' => $calc((int)$p['base_spd'], (int)$m['iv_spd'], (int)$m['ev_spd'], $mult['spd']),
        'spe' => $calc((int)$p['base_spe'], (int)$m['iv_spe'], (int)$m['ev_spe'], $mult['spe']),
    ];
}

function team_with_members(string $uid, string $teamId): array {
    $team = Supabase::select('teams', [
        'id'      => 'eq.' . $teamId,
        'user_id' => 'eq.' . $uid,
    ]);
    if (!$team) throw new Exception('Equip no trobat', 404);
    $team = $team[0];

    $members = Supabase::select('team_pokemon', [
        'team_id' => 'eq.' . $teamId,
        'select'  => '*,pokemon_cache(*),natures(*),items_cache(*)',
        'order'   => 'slot.asc',
    ]);

    foreach ($members as &$m) {
        if (!empty($m['pokemon_cache'])) {
            $m['final_stats'] = compute_stats($m, $m['pokemon_cache'], $m['natures'] ?? []);
        } else {
            $m['final_stats'] = null;
        }
    }
    unset($m);

    $team['members'] = $members;
    return $team;
}

// ---------- Router ----------

try {
    $uid = require_auth();
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // LIST
    if ($action === 'list' && $method === 'GET') {
        $teams = Supabase::select('teams', [
            'user_id' => 'eq.' . $uid,
            'order'   => 'created_at.desc',
        ]);
        // Cuenta miembros
        foreach ($teams as &$t) {
            $members = Supabase::select('team_pokemon', [
                'team_id' => 'eq.' . $t['id'],
                'select'  => 'id,pokemon_id,slot,is_shiny,pokemon_cache(name,sprite_default,sprite_shiny,types)',
                'order'   => 'slot.asc',
            ]);
            $t['members'] = $members;
        }
        unset($t);
        respond($teams);
    }

    // CREATE
    if ($action === 'create' && $method === 'POST') {
        $b = json_body();
        $name    = trim($b['name'] ?? '');
        $maxSize = (int)($b['max_size'] ?? 6);
        if ($name === '') throw new Exception('Nom obligatori');
        if ($maxSize < 1 || $maxSize > 6) throw new Exception('max_size ha d\'estar entre 1 i 6');

        $rows = Supabase::insert('teams', [[
            'user_id'  => $uid,
            'name'     => $name,
            'max_size' => $maxSize,
        ]]);
        respond($rows[0] ?? [], 201);
    }

    // GET detalle con miembros + stats
    if ($action === 'get' && $method === 'GET') {
        $teamId = $_GET['id'] ?? '';
        if (!$teamId) throw new Exception('Falta id');
        respond(team_with_members($uid, $teamId));
    }

    // UPDATE (nombre y/o max_size)
    if ($action === 'update' && $method === 'POST') {
        $b = json_body();
        $teamId  = $b['id'] ?? '';
        $name    = $b['name'] ?? null;
        $maxSize = $b['max_size'] ?? null;
        if (!$teamId) throw new Exception('Falta id');

        $patch = [];
        if ($name !== null)    $patch['name']     = trim($name);
        if ($maxSize !== null) {
            $maxSize = (int)$maxSize;
            if ($maxSize < 1 || $maxSize > 6) throw new Exception('max_size ha d\'estar entre 1 i 6');
            $patch['max_size'] = $maxSize;
        }
        if (!$patch) throw new Exception('Res a actualitzar');

        Supabase::update('teams', $patch, ['id' => 'eq.' . $teamId, 'user_id' => 'eq.' . $uid]);
        respond(['ok' => true]);
    }

    // DELETE
    if ($action === 'delete' && $method === 'DELETE') {
        $b = json_body();
        $teamId = $b['id'] ?? ($_GET['id'] ?? '');
        if (!$teamId) throw new Exception('Falta id');
        Supabase::delete('teams', ['id' => 'eq.' . $teamId, 'user_id' => 'eq.' . $uid]);
        respond(['ok' => true]);
    }

    // ADD MEMBER
    if ($action === 'add_member' && $method === 'POST') {
        $b = json_body();
        $teamId    = $b['team_id']    ?? '';
        $pokemonId = (int)($b['pokemon_id'] ?? 0);
        $slot      = (int)($b['slot'] ?? 0);
        $natureId  = (int)($b['nature_id'] ?? 0);
        if (!$teamId || !$pokemonId || !$slot || !$natureId) {
            throw new Exception('Falten camps obligatoris (team_id, pokemon_id, slot, nature_id)');
        }

        $teamRows = Supabase::select('teams', ['id' => 'eq.' . $teamId, 'user_id' => 'eq.' . $uid]);
        if (!$teamRows) throw new Exception('Equip no trobat', 404);
        $team = $teamRows[0];

        if ($slot < 1 || $slot > (int)$team['max_size']) {
            throw new Exception("Slot fora de rang (1-" . $team['max_size'] . ")");
        }

        $pokemonRows = Supabase::select('pokemon_cache', ['pokemon_id' => 'eq.' . $pokemonId]);
        if (!$pokemonRows) throw new Exception('Pokémon no existeix a la caché', 404);

        $natureRows = Supabase::select('natures', ['id' => 'eq.' . $natureId]);
        if (!$natureRows) throw new Exception('Natura no existeix', 404);

        validate_member_payload($b);

        $row = [
            'team_id'       => $teamId,
            'pokemon_id'    => $pokemonId,
            'slot'          => $slot,
            'level'         => (int)($b['level'] ?? 50),
            'nature_id'     => $natureId,
            'held_item_id'  => !empty($b['held_item_id']) ? (int)$b['held_item_id'] : null,
            'is_shiny'      => !empty($b['is_shiny']),
            'iv_hp'  => (int)($b['iv_hp']  ?? 31), 'iv_atk' => (int)($b['iv_atk'] ?? 31),
            'iv_def' => (int)($b['iv_def'] ?? 31), 'iv_spa' => (int)($b['iv_spa'] ?? 31),
            'iv_spd' => (int)($b['iv_spd'] ?? 31), 'iv_spe' => (int)($b['iv_spe'] ?? 31),
            'ev_hp'  => (int)($b['ev_hp']  ?? 0),  'ev_atk' => (int)($b['ev_atk'] ?? 0),
            'ev_def' => (int)($b['ev_def'] ?? 0),  'ev_spa' => (int)($b['ev_spa'] ?? 0),
            'ev_spd' => (int)($b['ev_spd'] ?? 0),  'ev_spe' => (int)($b['ev_spe'] ?? 0),
        ];

        $inserted = Supabase::insert('team_pokemon', [$row]);
        respond($inserted[0] ?? [], 201);
    }

    // UPDATE MEMBER
    if ($action === 'update_member' && $method === 'POST') {
        $b = json_body();
        $memberId = $b['id'] ?? '';
        if (!$memberId) throw new Exception('Falta id');

        // Verifica propiedad
        $rows = Supabase::select('team_pokemon', [
            'id'     => 'eq.' . $memberId,
            'select' => '*,teams!inner(user_id)',
        ]);
        if (!$rows) throw new Exception('Membre no trobat', 404);
        if (($rows[0]['teams']['user_id'] ?? null) !== $uid) throw new Exception('No autoritzat', 403);

        validate_member_payload($b);

        $patch = [];
        foreach (['level','nature_id','held_item_id','is_shiny'] as $k) {
            if (array_key_exists($k, $b)) $patch[$k] = $b[$k];
        }
        foreach (['iv','ev'] as $prefix) {
            foreach (['hp','atk','def','spa','spd','spe'] as $s) {
                $k = "{$prefix}_{$s}";
                if (array_key_exists($k, $b)) $patch[$k] = (int)$b[$k];
            }
        }
        if (!$patch) throw new Exception('Res a actualitzar');

        Supabase::update('team_pokemon', $patch, ['id' => 'eq.' . $memberId]);
        respond(['ok' => true]);
    }

    // REMOVE MEMBER
    if ($action === 'remove_member' && $method === 'DELETE') {
        $b = json_body();
        $memberId = $b['id'] ?? ($_GET['id'] ?? '');
        if (!$memberId) throw new Exception('Falta id');

        $rows = Supabase::select('team_pokemon', [
            'id'     => 'eq.' . $memberId,
            'select' => 'id,teams!inner(user_id)',
        ]);
        if (!$rows) throw new Exception('Membre no trobat', 404);
        if (($rows[0]['teams']['user_id'] ?? null) !== $uid) throw new Exception('No autoritzat', 403);

        Supabase::delete('team_pokemon', ['id' => 'eq.' . $memberId]);
        respond(['ok' => true]);
    }

    respond(['error' => 'Acció desconeguda'], 400);

} catch (Throwable $e) {
    $status = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    respond(['error' => $e->getMessage()], $status);
}