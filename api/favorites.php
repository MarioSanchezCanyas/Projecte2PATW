<?php
// api/favorites.php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $uid    = require_auth();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $rows = Supabase::select('favorites', [
            'user_id' => 'eq.' . $uid,
            'select'  => 'id,pokemon_id,is_shiny,created_at,pokemon_cache(name,sprite_default,sprite_shiny,types)',
            'order'   => 'created_at.desc',
        ]);
        respond($rows);
    }

    if ($method === 'POST') {
        $b = json_body();
        $pokemonId = (int)($b['pokemon_id'] ?? 0);
        $isShiny   = !empty($b['is_shiny']);
        if ($pokemonId <= 0) respond(['error' => 'pokemon_id obligatori'], 400);

        // Asegura que el Pokémon existe en caché
        $cached = Supabase::select('pokemon_cache', ['pokemon_id' => 'eq.' . $pokemonId]);
        if (!$cached) respond(['error' => 'Pokémon no existeix a la caché'], 404);

        $row = [
            'user_id'    => $uid,
            'pokemon_id' => $pokemonId,
            'is_shiny'   => $isShiny,
        ];
        Supabase::upsert('favorites', [$row], 'user_id,pokemon_id');
        respond(['ok' => true]);
    }

    if ($method === 'DELETE') {
        $b = json_body();
        $pokemonId = (int)($b['pokemon_id'] ?? ($_GET['pokemon_id'] ?? 0));
        if ($pokemonId <= 0) respond(['error' => 'pokemon_id obligatori'], 400);

        Supabase::delete('favorites', [
            'user_id'    => 'eq.' . $uid,
            'pokemon_id' => 'eq.' . $pokemonId,
        ]);
        respond(['ok' => true]);
    }

    respond(['error' => 'Mètode no suportat'], 405);
} catch (Throwable $e) {
    respond(['error' => $e->getMessage()], 500);
}