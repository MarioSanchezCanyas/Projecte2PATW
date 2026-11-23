async function renderFavorites(app) {
  app.innerHTML = `
    <section class="mb-6">
      <p class="text-primary text-xs font-bold tracking-widest mb-1">TU COLECCIÓN</p>
      <h1 class="text-2xl md:text-3xl font-extrabold">Pokémon favoritos</h1>
      <p class="text-gray-500 text-sm mt-1">Accede rápidamente a los Pokémon que más te gustan.</p>
    </section>
    <div id="fav-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
  `;

  const grid = document.getElementById('fav-grid');
  grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Cargando…</div>';

  try {
    const favs = await API.listFavorites();
    State.favoritesRaw = favs;
    State.favorites = new Set(favs.map(f => f.pokemon_id));
    await refreshFavorites();

    if (!favs.length) {
      grid.innerHTML = `<div class="col-span-full text-center py-16 text-gray-400">
        <i class="fa-regular fa-heart text-3xl mb-2"></i>
        <p>Todavía no tienes favoritos.</p>
      </div>`;
      return;
    }

    grid.innerHTML = favs.map(f => {
      const p = f.pokemon_cache || {};
      return `
        <div class="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
          <img src="${p.sprite_default || ''}" alt="${p.name || ''}" class="w-16 h-16 object-contain shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-[11px] text-gray-400 font-semibold">#${String(f.pokemon_id).padStart(4,'0')}</p>
            <p class="font-bold capitalize truncate">${p.name || 'Pokémon'}</p>
            <div class="flex flex-wrap gap-1 mt-1">${renderTypeBadges(p.types)}</div>
          </div>
          <button class="fav-btn active shrink-0" data-unfav="${f.pokemon_id}">
            <i class="fa-solid fa-heart"></i>
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-unfav]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await API.removeFavorite(Number(btn.dataset.unfav));
          await refreshFavorites();
          renderFavorites(app);
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-red-500 text-center py-6">${err.message}</div>`;
  }
}