const PokedexState = {
  items: [],
  offset: 0,
  limit: 8,
  selected: null,
  filterType: null,
  search: '',
};

const TYPE_FILTERS = ['Todos','Fuego','Agua','Planta','Eléctrico','Dragón','Fantasma'];
const TYPE_MAP = {
  normal:'normal', fire:'Fuego', water:'Agua', electric:'Eléctrico',
  grass:'Planta', ice:'Hielo', fighting:'Lucha', poison:'Veneno',
  ground:'Tierra', flying:'Volador', psychic:'Psíquico', bug:'Bicho',
  rock:'Roca', ghost:'Fantasma', dragon:'Dragón', dark:'Siniestro',
  steel:'Acero', fairy:'Hada'
};

function renderTypeBadges(types, big = false) {
  return (types || []).map(t => {
    const slug = t.type?.name || t;
    const label = TYPE_MAP[slug] || slug;
    return `<span class="type-badge type-${slug} ${big ? 'text-xs px-3 py-1' : ''}">${label}</span>`;
  }).join(' ');
}

async function renderPokedex(app, query) {
  const q = query.get('q') || '';
  PokedexState.search = q;
  PokedexState.offset = 0;
  PokedexState.selected = null;

  app.innerHTML = `
    <section class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <p class="text-primary text-xs font-bold tracking-widest mb-1">EXPLORA Y DESCUBRE</p>
        <h1 class="text-2xl md:text-3xl font-extrabold">Pokédex Nacional</h1>
        <p class="text-gray-500 text-sm mt-1">Encuentra Pokémon y consulta toda su información competitiva.</p>
      </div>
      <div class="bg-white rounded-xl px-4 py-3 border border-gray-100 w-full md:w-64">
        <div class="flex items-baseline justify-between mb-1">
          <span class="font-extrabold text-lg">1.025</span>
          <span class="text-[11px] text-gray-400">Pokémon registrados</span>
        </div>
        <div class="stat-bar"><div style="width:38%"></div></div>
      </div>
    </section>

    <section class="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
      <span class="text-xs text-gray-500 font-medium whitespace-nowrap">Filtrar por tipo</span>
      <div id="filter-chips" class="flex gap-2">
        ${TYPE_FILTERS.map(f => `
          <button data-type="${f}" class="filter-chip whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition
            ${f === 'Todos' ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}">
            ${f}
          </button>
        `).join('')}
      </div>
      <button id="clear-filters" class="ml-auto text-primary text-xs font-semibold whitespace-nowrap">Limpiar filtros</button>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div id="pokemon-grid" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3"></div>
        <div id="pager" class="flex items-center justify-center gap-2 mt-6"></div>
      </div>
      <aside id="detail-panel" class="hidden lg:block">
        <div class="bg-white rounded-2xl p-6 border border-gray-100 sticky top-24 text-center text-gray-400">
          <i class="fa-solid fa-hand-pointer text-2xl mb-2"></i>
          <p class="text-sm">Selecciona un Pokémon para ver sus estadísticas base</p>
        </div>
      </aside>
    </div>
  `;

  document.getElementById('clear-filters').addEventListener('click', () => {
    PokedexState.filterType = null;
    PokedexState.offset = 0;
    loadPokemons();
  });

  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      PokedexState.filterType = btn.dataset.type === 'Todos' ? null : btn.dataset.type;
      PokedexState.offset = 0;
      document.querySelectorAll('.filter-chip').forEach(b => {
        b.classList.remove('bg-navy','text-white','border-navy');
        b.classList.add('bg-white','text-gray-600','border-gray-200');
      });
      btn.classList.remove('bg-white','text-gray-600','border-gray-200');
      btn.classList.add('bg-navy','text-white','border-navy');
      loadPokemons();
    });
  });

  await loadPokemons();
}
async function loadPokemons() {
  const grid = document.getElementById('pokemon-grid');
  grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Cargando…</div>';

  try {
    const res = await API.listPokemons(PokedexState.limit, PokedexState.offset);
    
    // COMPROBACIÓN: Si el backend no devuelve un array, mostramos error.
    if (!Array.isArray(res)) {
      grid.innerHTML = `<div class="col-span-full text-red-500 text-center py-6">
        <p class="font-bold">Error del servidor</p>
        <p class="text-sm">El backend no devolvió una lista de Pokémon. ¿Estás usando Live Server en vez de PHP?</p>
      </div>`;
      return;
    }

    let filtered = res;

    if (PokedexState.filterType) {
      filtered = filtered.filter(p =>
        (p.types || []).some(t => (TYPE_MAP[t.type?.name] || t.type?.name) === PokedexState.filterType)
      );
    }
    if (PokedexState.search) {
      const q = PokedexState.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    PokedexState.items = filtered;
    renderGrid();
    renderPager(res.length === PokedexState.limit);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-red-500 text-center py-6">${err.message}</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById('pokemon-grid');
  if (!PokedexState.items.length) {
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">No hay Pokémon que coincidan.</div>';
    return;
  }
  grid.innerHTML = PokedexState.items.map(p => {
    const isFav = State.favorites.has(p.pokemon_id);
    const isSel = PokedexState.selected?.pokemon_id === p.pokemon_id;
    return `
      <div class="poke-card ${isSel ? 'selected' : ''}" data-id="${p.pokemon_id}">
        <div class="flex items-start justify-between mb-2">
          <span class="text-[11px] text-gray-400 font-semibold">#${String(p.pokemon_id).padStart(4,'0')}</span>
          <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${p.pokemon_id}" aria-label="Favorito">
            <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>
        <div class="flex justify-center py-2">
          <img src="${p.sprite_default || ''}" alt="${p.name}" class="w-20 h-20 object-contain" loading="lazy" />
        </div>
        <p class="font-semibold capitalize text-sm mt-1 mb-2 text-gray-800">${p.name}</p>
        <div class="flex flex-wrap gap-1">${renderTypeBadges(p.types)}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.poke-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-fav]')) return;
      showDetail(Number(card.dataset.id));
    });
  });

  grid.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.fav);
      try {
        if (State.favorites.has(id)) {
          await API.removeFavorite(id);
          State.favorites.delete(id);
        } else {
          await API.addFavorite(id, false);
          State.favorites.add(id);
        }
        await refreshFavorites();
        renderGrid();
        if (PokedexState.selected?.pokemon_id === id) showDetail(id);
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

function renderPager(hasMore) {
  const pager = document.getElementById('pager');
  const page = Math.floor(PokedexState.offset / PokedexState.limit) + 1;
  pager.innerHTML = `
    <button ${PokedexState.offset === 0 ? 'disabled' : ''}
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <span class="text-sm text-gray-500 px-3">Página ${page}</span>
    <button ${hasMore ? '' : 'disabled'}
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
  const [prev, next] = pager.querySelectorAll('button');
  prev.addEventListener('click', () => {
    PokedexState.offset = Math.max(0, PokedexState.offset - PokedexState.limit);
    loadPokemons();
  });
  next.addEventListener('click', () => {
    PokedexState.offset += PokedexState.limit;
    loadPokemons();
  });
}

async function showDetail(id) {
  const panel = document.getElementById('detail-panel');
  try {
    const p = await API.getPokemon(id);
    PokedexState.selected = p;
    renderGrid();

    const statLabels = {
      base_hp:['HP','hp'], base_atk:['Ataque','atk'], base_def:['Defensa','def'],
      base_spa:['At. Esp.','spa'], base_spd:['Def. Esp.','spd'], base_spe:['Velocidad','spe']
    };
    const maxStat = 180;
    const isFav = State.favorites.has(p.pokemon_id);

    panel.innerHTML = `
      <div class="bg-white rounded-2xl p-6 border border-gray-100 sticky top-24">
        <div class="flex justify-end mb-2">
          <button class="fav-btn ${isFav ? 'active' : ''}" id="detail-fav">
            <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>
        <div class="text-center">
          <img src="${p.sprite_default}" alt="${p.name}"
               class="w-32 h-32 mx-auto object-contain" />
        </div>
        <h2 class="text-2xl font-extrabold capitalize text-center mt-2">${p.name}</h2>
        <div class="flex flex-wrap justify-center gap-2 mt-2">
          ${renderTypeBadges(p.types, true)}
        </div>
        <div class="flex justify-center gap-2 mt-3 text-[11px] text-gray-500">
          <span>Altura: 1,7 m</span><span>·</span><span>Peso: 90,5 kg</span>
        </div>

        <p class="text-xs font-bold text-gray-500 tracking-widest mt-6 mb-3">ESTADÍSTICAS BASE</p>
        <div class="space-y-2">
          ${Object.entries(statLabels).map(([key, [label]]) => {
            const v = p[key] || 0;
            return `
              <div class="grid grid-cols-[70px_1fr_36px] gap-2 items-center">
                <span class="text-xs text-gray-500">${label}</span>
                <div class="stat-bar"><div style="width:${Math.min(100, (v/maxStat)*100)}%"></div></div>
                <span class="text-xs font-semibold text-right">${v}</span>
              </div>
            `;
          }).join('')}
        </div>

        <button id="add-to-team" class="w-full mt-6 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition">
          Añadir a un equipo
        </button>
      </div>
    `;

    document.getElementById('detail-fav').addEventListener('click', async () => {
      try {
        if (State.favorites.has(p.pokemon_id)) await API.removeFavorite(p.pokemon_id);
        else await API.addFavorite(p.pokemon_id, false);
        await refreshFavorites();
        showDetail(p.pokemon_id);
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('add-to-team').addEventListener('click', () => {
      openAddMemberModal(p.pokemon_id);
    });

  } catch (err) {
    panel.innerHTML = `<div class="text-red-500 text-sm">${err.message}</div>`;
  }
}

// Modal para elegir equipo (se implementa en teams.js)
function openAddMemberModal(pokemonId) {
  if (typeof window.openAddPokemonToTeam === 'function') {
    window.openAddPokemonToTeam(pokemonId);
  } else {
    toast('Abre la sección "Mis Equipos" para añadir este Pokémon', 'error');
  }
}