// Wrapper de todas las llamadas al backend PHP
const API = (() => {
  const BASE = 'api';

  async function request(path, options = {}) {
    const res = await fetch(BASE + '/' + path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : `Error ${res.status}`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return data;
  }

  return {
    // Auth
    login:    (email, password) => request('auth.php?action=login',    { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (username, email, password) => request('auth.php?action=register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
    logout:   () => request('auth.php?action=logout', { method: 'POST' }),
    me:       () => request('auth.php?action=me'),

    // PokéAPI (caché vía backend)
    listPokemons: (limit = 20, offset = 0) => request(`pokeapi.php?action=list&limit=${limit}&offset=${offset}`),
    getPokemon:   (id)                     => request(`pokeapi.php?action=detail&id=${encodeURIComponent(id)}`),
    natures:      ()                       => request('pokeapi.php?action=natures'),
    items:        ()                       => request('pokeapi.php?action=items'),

    // Favoritos
    listFavorites: ()               => request('favorites.php'),
    addFavorite:   (pokemon_id, is_shiny = false) =>
      request('favorites.php', { method: 'POST', body: JSON.stringify({ pokemon_id, is_shiny }) }),
    removeFavorite: (pokemon_id) =>
      request('favorites.php', { method: 'DELETE', body: JSON.stringify({ pokemon_id }) }),

    // Equipos
    listTeams:  ()          => request('teams.php?action=list'),
    getTeam:    (id)        => request(`teams.php?action=get&id=${id}`),
    createTeam: (name, max_size) => request('teams.php?action=create', { method: 'POST', body: JSON.stringify({ name, max_size }) }),
    updateTeam: (payload)   => request('teams.php?action=update', { method: 'POST', body: JSON.stringify(payload) }),
    deleteTeam: (id)        => request('teams.php?action=delete', { method: 'DELETE', body: JSON.stringify({ id }) }),
    addMember:  (payload)   => request('teams.php?action=add_member', { method: 'POST', body: JSON.stringify(payload) }),
    updateMember: (payload) => request('teams.php?action=update_member', { method: 'POST', body: JSON.stringify(payload) }),
    removeMember: (id)      => request('teams.php?action=remove_member', { method: 'DELETE', body: JSON.stringify({ id }) }),
  };
})();