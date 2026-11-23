function renderLogin(app) {
  app.innerHTML = `
    <div class="max-w-md mx-auto py-8 md:py-16">
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2 mb-6">
          <span class="poke-ball"></span>
          <span class="font-extrabold text-2xl">Poké<span class="text-primary">Manager</span></span>
        </div>
        <p class="text-primary text-xs font-bold tracking-widest mb-2">BIENVENIDO DE NUEVO</p>
        <h1 class="text-3xl font-extrabold mb-2">Iniciar sesión</h1>
        <p class="text-gray-500 text-sm">Accede a tus equipos, favoritos y configuraciones.</p>
      </div>

      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Correo electrónico</label>
          <input name="email" type="email" required placeholder="entrenador@ejemplo.com"
                 class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
          <input name="password" type="password" required minlength="6" placeholder="Mínimo 6 caracteres"
                 class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button class="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition">
          Iniciar sesión
        </button>
      </form>

      <div class="flex items-center gap-3 my-6">
        <hr class="flex-1 border-gray-200" />
        <span class="text-xs text-gray-400">o continúa con</span>
        <hr class="flex-1 border-gray-200" />
      </div>

      <div class="grid grid-cols-3 gap-3">
        <button class="border border-gray-200 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition" disabled>
          <i class="fa-brands fa-google text-red-500 mr-1"></i> Google
        </button>
        <button class="border border-gray-200 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition" disabled>
          <i class="fa-brands fa-facebook text-blue-600 mr-1"></i> Facebook
        </button>
        <button class="border border-gray-200 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition" disabled>
          <i class="fa-brands fa-apple mr-1"></i> Apple
        </button>
      </div>

      <p class="text-center text-sm mt-8 text-gray-500">
        ¿No tienes cuenta? <a href="#" id="switch-register" class="text-primary font-semibold">Regístrate aquí</a>
      </p>
      <p class="text-center text-[11px] text-gray-400 mt-8">Protegemos tus datos y configuraciones</p>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.login(fd.get('email'), fd.get('password'));
      toast('Sessió iniciada');
      location.hash = '#/pokedex';
      location.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('switch-register').addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
  });
}

function showRegister() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-md mx-auto py-8 md:py-16">
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2 mb-6">
          <span class="poke-ball"></span>
          <span class="font-extrabold text-2xl">Poké<span class="text-primary">Manager</span></span>
        </div>
        <p class="text-primary text-xs font-bold tracking-widest mb-2">PRIMERA VEZ</p>
        <h1 class="text-3xl font-extrabold mb-2">Crear cuenta</h1>
      </div>
      <form id="reg-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Nombre de entrenador</label>
          <input name="username" required minlength="3"
                 class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Correo electrónico</label>
          <input name="email" type="email" required
                 class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Contraseña (mín. 6)</label>
          <input name="password" type="password" required minlength="6"
                 class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <button class="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition">
          Crear cuenta
        </button>
      </form>
      <p class="text-center text-sm mt-8 text-gray-500">
        ¿Ya tienes cuenta? <a href="#" id="back-login" class="text-primary font-semibold">Inicia sesión</a>
      </p>
    </div>
  `;

  document.getElementById('reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.register(fd.get('username'), fd.get('email'), fd.get('password'));
      await API.login(fd.get('email'), fd.get('password'));
      location.hash = '#/pokedex';
      location.reload();
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('back-login').addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '#/login';
  });
}