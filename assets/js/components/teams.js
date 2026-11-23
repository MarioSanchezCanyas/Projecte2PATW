async function renderTeams(app) {
  app.innerHTML = `
    <section class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <p class="text-primary text-xs font-bold tracking-widest mb-1">CENTRO DE ESTRATEGIA</p>
        <h1 class="text-2xl md:text-3xl font-extrabold">Mis Equipos</h1>
        <p class="text-gray-500 text-sm mt-1">Crea, configura y prepara tus equipos para competir.</p>
      </div>
      <button id="new-team" class="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-lg transition self-start md:self-auto">
        <i class="fa-solid fa-plus mr-1"></i> Crear nuevo equipo
      </button>
    </section>
    <div id="teams-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
  `;

  document.getElementById('new-team').addEventListener('click', () => openCreateTeamModal(app));
  await loadTeams(app);
}

async function loadTeams(app) {
  const grid = document.getElementById('teams-grid');
  grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Cargando…</div>';
  try {
    const teams = await API.listTeams();
    if (!teams.length) {
      grid.innerHTML = `
        <div class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center cursor-pointer hover:border-primary/40 transition" id="empty-create">
          <div class="w-12 h-12 rounded-full bg-red-50 text-primary mx-auto flex items-center justify-center mb-3">
            <i class="fa-solid fa-plus"></i>
          </div>
          <p class="font-semibold">Crear un nuevo equipo</p>
          <p class="text-xs text-gray-500 mt-1">Elige un formato o simplemente añade Pokémon</p>
        </div>`;
      document.getElementById('empty-create').addEventListener('click', () => openCreateTeamModal(app));
      return;
    }

    grid.innerHTML = teams.map(t => renderTeamCard(t)).join('') + `
      <div class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition min-h-[220px]" id="empty-create">
        <div class="w-12 h-12 rounded-full bg-red-50 text-primary mx-auto flex items-center justify-center mb-3">
          <i class="fa-solid fa-plus"></i>
        </div>
        <p class="font-semibold text-sm">Crear un nuevo equipo</p>
        <p class="text-xs text-gray-500 mt-1">Elige un formato o simplemente añade Pokémon</p>
      </div>
    `;
    document.getElementById('empty-create').addEventListener('click', () => openCreateTeamModal(app));

    grid.querySelectorAll('[data-team-edit]').forEach(el => {
      el.addEventListener('click', () => openTeamDetail(el.dataset.teamEdit));
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-red-500 text-center py-6">${err.message}</div>`;
  }
}

function renderTeamCard(t) {
  const members = t.members || [];
  const slots = [];
  for (let i = 0; i < t.max_size; i++) {
    const m = members.find(x => x.slot === i + 1);
    if (m && m.pokemon_cache) {
      const sprite = m.is_shiny ? (m.pokemon_cache.sprite_shiny || m.pokemon_cache.sprite_default) : m.pokemon_cache.sprite_default;
      slots.push(`<div class="slot filled"><img src="${sprite}" alt="" class="w-full h-full object-contain" /></div>`);
    } else {
      slots.push(`<div class="slot"><i class="fa-solid fa-plus"></i></div>`);
    }
  }

  return `
    <div class="bg-white rounded-2xl p-5 border border-gray-100">
      <div class="flex items-start justify-between mb-3">
        <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <button class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-ellipsis"></i></button>
      </div>
      <h3 class="font-bold text-lg">${escapeHtml(t.name)}</h3>
      <p class="text-xs text-gray-500 mt-0.5">${members.length}/${t.max_size} · Nivel 50</p>
      <div class="flex flex-wrap gap-2 mt-3">${slots.join('')}</div>
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">${members.length} / ${t.max_size} Pokémon</span>
        <button data-team-edit="${t.id}" class="text-primary text-sm font-semibold hover:underline">Editar equipo <i class="fa-solid fa-chevron-right text-[10px]"></i></button>
      </div>
    </div>
  `;
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- Modales ----------

function openCreateTeamModal(app) {
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
  wrap.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-md">
      <h2 class="text-xl font-extrabold mb-4">Crear nuevo equipo</h2>
      <form id="create-team-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Nombre del equipo</label>
          <input name="name" required placeholder="Ej: VGC Dobles"
                 class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Tamaño máximo</label>
          <select name="max_size" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
            <option value="3">3 (Dobles)</option>
            <option value="4">4</option>
            <option value="6" selected>6 (Singles)</option>
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" data-cancel class="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 font-semibold text-sm">Cancelar</button>
          <button class="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg text-sm">Crear</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector('[data-cancel]').onclick = () => wrap.remove();
  wrap.querySelector('#create-team-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.createTeam(fd.get('name'), Number(fd.get('max_size')));
      wrap.remove();
      toast('Equipo creado');
      await loadTeams(app);
    } catch (err) { toast(err.message, 'error'); }
  };
}

// Vista detalle equipo
async function openTeamDetail(teamId) {
  location.hash = '#/team?id=' + teamId;
}

// Registramos ruta extra (team detail)
Router.register('team', async (app, query) => {
  const teamId = query.get('id');
  if (!teamId) return Router.go('teams');
  app.innerHTML = '<div class="text-center py-10 text-gray-400">Cargando equipo…</div>';

  try {
    const team = await API.getTeam(teamId);
    app.innerHTML = `
      <a href="#/teams" class="text-sm text-gray-500 hover:text-primary mb-4 inline-block"><i class="fa-solid fa-chevron-left mr-1"></i> Volver</a>
      <section class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold">${escapeHtml(team.name)}</h1>
          <p class="text-gray-500 text-sm">${(team.members||[]).length}/${team.max_size} Pokémon</p>
        </div>
        <div class="flex gap-2">
          <button id="delete-team" class="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">Eliminar</button>
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="team-members"></div>
    `;

    const membersEl = document.getElementById('team-members');
    const slots = [];
    for (let i = 1; i <= team.max_size; i++) {
      slots.push(team.members.find(m => m.slot === i) || null);
    }
    membersEl.innerHTML = slots.map((m, idx) => {
      if (!m) {
        return `<div class="bg-white rounded-2xl p-5 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 min-h-[140px]">
          <div class="slot mb-2"><i class="fa-solid fa-plus"></i></div>
          <p class="text-sm">Slot ${idx+1} vacío</p>
          <button data-add-slot="${idx+1}" class="mt-3 text-primary text-xs font-semibold">Añadir Pokémon</button>
        </div>`;
      }
      const p = m.pokemon_cache || {};
      const stats = m.final_stats || {};
      return `
        <div class="bg-white rounded-2xl p-4 border border-gray-100">
          <div class="flex items-center gap-3">
            <img src="${m.is_shiny ? (p.sprite_shiny||p.sprite_default) : p.sprite_default}" class="w-14 h-14 object-contain" />
            <div class="flex-1 min-w-0">
              <p class="font-bold capitalize truncate">${p.name}</p>
              <div class="flex flex-wrap gap-1 mt-1">${renderTypeBadges(p.types)}</div>
            </div>
            <button data-remove-member="${m.id}" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-3 text-center text-[11px]">
            <div><p class="text-gray-400">HP</p><p class="font-bold">${stats.hp ?? '-'}</p></div>
            <div><p class="text-gray-400">Atk</p><p class="font-bold">${stats.atk ?? '-'}</p></div>
            <div><p class="text-gray-400">Def</p><p class="font-bold">${stats.def ?? '-'}</p></div>
            <div><p class="text-gray-400">SpA</p><p class="font-bold">${stats.spa ?? '-'}</p></div>
            <div><p class="text-gray-400">SpD</p><p class="font-bold">${stats.spd ?? '-'}</p></div>
            <div><p class="text-gray-400">Spe</p><p class="font-bold">${stats.spe ?? '-'}</p></div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('delete-team').addEventListener('click', async () => {
      if (!confirm('¿Eliminar el equipo?')) return;
      try {
        await API.deleteTeam(teamId);
        Router.go('teams');
      } catch (err) { toast(err.message, 'error'); }
    });

    membersEl.querySelectorAll('[data-remove-member]').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('¿Quitar este Pokémon del equipo?')) return;
        try { await API.removeMember(b.dataset.removeMember); Router.go('team', 'id=' + teamId); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    membersEl.querySelectorAll('[data-add-slot]').forEach(b => {
      b.addEventListener('click', () => pickPokemonForTeam(teamId, Number(b.dataset.addSlot)));
    });
  } catch (err) {
    app.innerHTML = `<div class="text-red-500 text-center py-10">${err.message}</div>`;
  }
});

// Selector simple de Pokémon para añadir a un slot
async function pickPokemonForTeam(teamId, slot) {
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
  wrap.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col">
      <h2 class="text-xl font-extrabold mb-3">Elige un Pokémon (Slot ${slot})</h2>
      <input id="pick-search" placeholder="Buscar por ID (ej: 6)" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" />
      <div id="pick-results" class="overflow-y-auto grid grid-cols-3 gap-2"></div>
      <button data-cancel class="mt-4 text-sm text-gray-500 hover:text-navy">Cancelar</button>
    </div>
  `;
  document.body.appendChild(wrap);

  const results = wrap.querySelector('#pick-results');
  const search = wrap.querySelector('#pick-search');
  wrap.querySelector('[data-cancel]').onclick = () => wrap.remove();

  async function load(offset = 0) {
    results.innerHTML = '<div class="col-span-3 text-center py-6 text-gray-400">Cargando…</div>';
    try {
      const list = await API.listPokemons(20, offset);
      results.innerHTML = list.map(p => `
        <button data-pick="${p.pokemon_id}" class="bg-gray-50 hover:bg-gray-100 rounded-lg p-2 flex flex-col items-center">
          <img src="${p.sprite_default}" class="w-12 h-12 object-contain" />
          <span class="text-[11px] capitalize truncate w-full text-center">${p.name}</span>
        </button>
      `).join('');
      results.querySelectorAll('[data-pick]').forEach(b => {
        b.onclick = () => {
          wrap.remove();
          openConfigMemberModal(teamId, Number(b.dataset.pick), slot);
        };
      });
    } catch (err) { results.innerHTML = `<div class="col-span-3 text-red-500 text-sm">${err.message}</div>`; }
  }
  load();
}

// Configuración competitiva de un miembro
async function openConfigMemberModal(teamId, pokemonId, slot) {
  const [natures, items, pokemon] = await Promise.all([
    API.natures(), API.items(), API.getPokemon(pokemonId)
  ]).catch(() => [[],[],null]);

  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto';
  wrap.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-2xl my-8">
      <div class="flex items-center gap-3 mb-4">
        <img src="${pokemon.sprite_default}" class="w-12 h-12" />
        <div>
          <h2 class="text-xl font-extrabold capitalize">${pokemon.name}</h2>
          <p class="text-xs text-gray-500">Slot ${slot} · Nivel 50</p>
        </div>
      </div>
      <form id="cfg-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Naturaleza</label>
            <select name="nature_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              ${natures.map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Objeto</label>
            <select name="held_item_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">— Ninguno —</option>
              ${items.slice(0, 200).map(i => `<option value="${i.item_id}">${i.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-6 gap-2">
          ${['hp','atk','def','spa','spd','spe'].map(s => `
            <div class="text-center">
              <p class="text-[10px] text-gray-500 font-semibold uppercase">${s}</p>
              <input name="iv_${s}" type="number" min="0" max="31" value="31"
                     class="w-full mt-1 text-center px-1 py-1.5 border border-gray-200 rounded text-xs" title="IV" />
              <input name="ev_${s}" type="number" min="0" max="252" value="0"
                     class="w-full mt-1 text-center px-1 py-1.5 border border-gray-200 rounded text-xs" title="EV" />
            </div>
          `).join('')}
        </div>
        <p class="text-[10px] text-gray-400">Arriba: IV (0-31) · Abajo: EV (0-252, total ≤ 510)</p>
        <div class="flex gap-2 pt-2">
          <button type="button" data-cancel class="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 font-semibold text-sm">Cancelar</button>
          <button class="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg text-sm">Guardar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector('[data-cancel]').onclick = () => wrap.remove();

  wrap.querySelector('#cfg-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = { team_id: teamId, pokemon_id: pokemonId, slot, level: 50 };
    for (const [k, v] of fd.entries()) payload[k] = v === '' ? null : (isNaN(Number(v)) ? v : Number(v));
    try {
      await API.addMember(payload);
      wrap.remove();
      Router.go('team', 'id=' + teamId);
    } catch (err) { toast(err.message, 'error'); }
  };
}

// Hook global: desde la Pokédex "Añadir a un equipo"
window.openAddPokemonToTeam = async function(pokemonId) {
  try {
    const teams = await API.listTeams();
    if (!teams.length) {
      toast('Crea primero un equipo', 'error');
      return Router.go('teams');
    }
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    wrap.innerHTML = `
      <div class="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 class="text-xl font-extrabold mb-4">Añadir a un equipo</h2>
        <div class="space-y-2">
          ${teams.map(t => `
            <button data-team="${t.id}" data-size="${t.max_size}" class="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-red-50 transition">
              <p class="font-semibold">${t.name}</p>
              <p class="text-xs text-gray-500">${(t.members||[]).length}/${t.max_size}</p>
            </button>
          `).join('')}
        </div>
        <button data-cancel class="mt-4 text-sm text-gray-500 hover:text-navy">Cancelar</button>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-cancel]').onclick = () => wrap.remove();
    wrap.querySelectorAll('[data-team]').forEach(b => {
      b.onclick = () => {
        wrap.remove();
        const team = teams.find(t => t.id === b.dataset.team);
        const used = new Set((team.members||[]).map(m => m.slot));
        let freeSlot = 0;
        for (let i = 1; i <= team.max_size; i++) if (!used.has(i)) { freeSlot = i; break; }
        if (!freeSlot) return toast(`Equipo lleno (${team.max_size})`, 'error');
        openConfigMemberModal(team.id, pokemonId, freeSlot);
      };
    });
  } catch (err) { toast(err.message, 'error'); }
};