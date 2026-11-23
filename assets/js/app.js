// Estado global
const State = {
  user: null,
  favorites: new Set(),
  favoritesRaw: [],
};

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
}

async function refreshFavorites() {
  try {
    const favs = await API.listFavorites();
    State.favoritesRaw = favs || [];
    State.favorites = new Set((favs || []).map(f => f.pokemon_id));
    const n = State.favorites.size;
    const b1 = document.getElementById('fav-badge');
    const b2 = document.getElementById('fav-badge-m');
    [b1, b2].forEach(b => {
      if (!b) return;
      b.textContent = n;
      b.classList.toggle('hidden', n === 0);
    });
  } catch { /* sin sesión */ }
}

// Router
Router.register('login',     renderLogin);
Router.register('pokedex',   renderPokedex);
Router.register('favorites', renderFavorites);
Router.register('teams',     renderTeams);

document.addEventListener('DOMContentLoaded', async () => {
  try {
    State.user = await API.me();
  } catch { State.user = null; }

  if (!State.user && !location.hash.startsWith('#/login')) {
    location.hash = '#/login';
  }

  if (State.user) await refreshFavorites();

  // Búsqueda global redirige a pokedex
  document.getElementById('global-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      Router.go('pokedex', q ? `q=${encodeURIComponent(q)}` : '');
    }
  });

  // Logout
  document.getElementById('user-menu')?.addEventListener('click', async () => {
    if (!confirm('Tancar sessió?')) return;
    try { await API.logout(); } catch {}
    State.user = null;
    location.hash = '#/login';
    location.reload();
  });

  Router.start();
});