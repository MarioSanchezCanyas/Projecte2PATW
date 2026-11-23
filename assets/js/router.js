const Router = (() => {
  const routes = {};
  let current = null;

  function register(name, fn) { routes[name] = fn; }

  function parse() {
    const hash = location.hash.replace(/^#\/?/, '') || 'pokedex';
    const [name, query] = hash.split('?');
    return { name: name || 'pokedex', query: new URLSearchParams(query || '') };
  }

  async function render() {
    const { name, query } = parse();
    if (!routes[name]) return render('pokedex');

    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === name);
    });

    current = name;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="text-center py-20 text-gray-400">Carregant…</div>';

    try {
      await routes[name](app, query);
    } catch (err) {
      app.innerHTML = `<div class="bg-red-50 text-red-700 rounded-xl p-6 text-center">
        <p class="font-semibold mb-1">Error</p>
        <p class="text-sm">${err.message}</p>
      </div>`;
    }
  }

  function go(name, query = '') {
    location.hash = '#/' + name + (query ? '?' + query : '');
  }

  function start() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { register, start, go, get current() { return current; } };
})();