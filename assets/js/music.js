// SchoolFlow — música no modo foco (YouTube IFrame API)
// Card compacto no dashboard + player robusto no overlay de foco.
// Preferências ficam em localStorage (nenhum dado sensível).

const MUSIC_STORAGE_KEY = 'schoolflow:music';
const MUSIC_DEFAULTS = { url: '', syncPause: true, volume: 60 };

const MUSIC_PRESETS = [
  { label: 'Lo-fi hip hop radio', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A' },
  { label: 'Synthwave radio', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { label: 'Deep focus', url: 'https://www.youtube.com/watch?v=WPni755-Krg' },
];

let musicPrefs = loadMusicPrefs();
let ytApiPromise = null;
const musicPlayers = { card: null, overlay: null };

function loadMusicPrefs() {
  try {
    const raw = localStorage.getItem(MUSIC_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...MUSIC_DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (error) {
    return { ...MUSIC_DEFAULTS };
  }
}

function saveMusicPrefs() {
  try {
    localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(musicPrefs));
  } catch (error) {
    /* armazenamento indisponível */
  }
}

// Extrai videoId/listId de URLs do YouTube (watch, youtu.be, embed, shorts, live, music)
function parseYouTubeUrl(raw) {
  if (!raw) return null;
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch (error) {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'youtube-nocookie.com') return null;

  const listId = url.searchParams.get('list');
  const path = url.pathname.replace(/\/+$/, '');

  if (host === 'youtu.be') {
    const videoId = path.slice(1).split('/')[0];
    return videoId ? { type: 'video', videoId, listId: listId || null } : (listId ? { type: 'playlist', listId } : null);
  }
  const match = path.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
  if (match) return { type: 'video', videoId: match[2], listId: listId || null };
  const videoId = url.searchParams.get('v');
  if (videoId) return { type: 'video', videoId, listId: listId || null };
  if (listId) return { type: 'playlist', listId };
  return null;
}

function currentMusicSource() {
  return musicPrefs.url ? parseYouTubeUrl(musicPrefs.url) : null;
}

function musicEmbedUrl(source) {
  if (!source) return '';
  const params = 'rel=0&modestbranding=1';
  if (source.listId && source.type === 'playlist') {
    return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(source.listId)}&${params}`;
  }
  const list = source.listId ? `&list=${encodeURIComponent(source.listId)}` : '';
  return `https://www.youtube.com/embed/${encodeURIComponent(source.videoId)}?${params}${list}`;
}

// ---------------------------------------------------------------------------
// YouTube IFrame API (lazy)

function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function destroyMusicPlayer(mode) {
  const player = musicPlayers[mode];
  if (player) {
    try { player.destroy(); } catch (error) { /* já destruído */ }
    musicPlayers[mode] = null;
  }
}

function mountMusicPlayer(root, mode) {
  const mount = root.querySelector('[data-music-mount]');
  const source = currentMusicSource();
  if (!mount || !source) return;
  destroyMusicPlayer(mode);
  const target = document.createElement('div');
  mount.innerHTML = '';
  mount.appendChild(target);
  loadYouTubeApi().then((YT) => {
    if (!target.isConnected) return;
    const config = source.type === 'playlist'
      ? { playerVars: { listType: 'playlist', list: source.listId, rel: 0, modestbranding: 1 } }
      : { videoId: source.videoId, playerVars: { rel: 0, modestbranding: 1, ...(source.listId ? { listType: 'playlist', list: source.listId } : {}) } };
    musicPlayers[mode] = new YT.Player(target, {
      ...config,
      width: '100%',
      height: mode === 'card' ? '150' : '210',
      events: {
        onReady(event) {
          try { event.target.setVolume(Number(musicPrefs.volume) || 60); } catch (error) { /* mudo */ }
        },
        onStateChange(event) {
          const btn = root.querySelector('.music-toggle-btn');
          if (btn) btn.innerHTML = icon(event.data === 1 ? 'pause' : 'play', 16);
        },
        onError() {
          mount.innerHTML = `<div class="music-error">${icon('alert-circle', 18)}<div><strong>Não foi possível carregar este vídeo.</strong><small>O dono desativou a incorporação ou o link é inválido. Tente outro link do YouTube.</small></div></div>`;
        },
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Templates

function musicPresetChipsHTML() {
  return MUSIC_PRESETS.map((preset) => `
    <button class="music-chip" data-action="music-preset" data-url="${utils.escapeHTML(preset.url)}">${utils.escapeHTML(preset.label)}</button>
  `).join('');
}

function musicRootInnerHTML(mode) {
  const source = currentMusicSource();
  const hasSource = Boolean(source);
  const inputId = mode === 'card' ? 'music-url-card' : 'music-url-overlay';
  return `
    <div class="music-head">
      <div class="music-title">${icon('music', mode === 'card' ? 17 : 19)}<span>Música</span></div>
      ${hasSource ? `<button class="music-clear" data-action="music-clear" title="Remover música">${icon('x', 14)} Trocar</button>` : ''}
    </div>
    ${hasSource ? `
      <div class="music-mount ${mode === 'card' ? 'music-mount-card' : 'music-mount-overlay'}" data-music-mount></div>
      ${mode === 'overlay' ? `
        <div class="music-controls">
          <button class="icon-btn music-toggle-btn" data-action="music-toggle" aria-label="Tocar ou pausar a música">${icon('play', 16)}</button>
          <span class="music-volume-icon">${icon('volume', 15)}</span>
          <input class="music-volume-range" type="range" min="0" max="100" step="1" value="${Number(musicPrefs.volume) || 60}" aria-label="Volume da música">
        </div>` : ''}
      <label class="music-sync" title="Pausa a música quando o timer de foco pausar">
        <input type="checkbox" data-action="music-sync-toggle" ${musicPrefs.syncPause ? 'checked' : ''}>
        <span>Pausar música junto com o foco</span>
      </label>
    ` : `
      <form class="music-form" data-music-form>
        <input class="input music-url-input" id="${inputId}" type="url" inputmode="url" placeholder="Cole um link do YouTube (vídeo ou playlist)" aria-label="Link do YouTube" autocomplete="off">
        <button class="btn btn-secondary btn-sm" type="button" data-action="music-load">Carregar</button>
      </form>
      <div class="music-chips">${musicPresetChipsHTML()}</div>
      <p class="music-hint">${icon('headphones', 12)} Toque algo para focar: lo-fi, chuva, jazz…</p>
    `}`;
}

// Card compacto para o dashboard (abaixo do card de Modo foco)
function musicCardHTML() {
  return `
    <section class="panel music-panel anim-up delay-2" style="--panel-tone:#8b5cf6">
      <div data-music-root="card">${musicRootInnerHTML('card')}</div>
    </section>`;
}

// Coluna do player no overlay de foco
function overlayMusicHTML() {
  return `
    <aside class="focus-music-col" data-music-root="overlay">
      ${musicRootInnerHTML('overlay')}
    </aside>`;
}

// Re-renderiza uma única raiz de música
function refreshMusicRoot(root) {
  const mode = root.dataset.musicRoot === 'overlay' ? 'overlay' : 'card';
  destroyMusicPlayer(mode);
  root.innerHTML = musicRootInnerHTML(mode);
  if (currentMusicSource()) mountMusicPlayer(root, mode);
}

// Re-renderiza todas as raízes de música presentes no DOM
function refreshMusicRoots() {
  document.querySelectorAll('[data-music-root]').forEach(refreshMusicRoot);
}

function setMusicFromUrl(rawUrl, root) {
  const source = parseYouTubeUrl(rawUrl);
  if (!source) {
    toast('Link inválido', 'Cole uma URL de vídeo ou playlist do YouTube.', 'error', 4200);
    return false;
  }
  musicPrefs.url = String(rawUrl).trim();
  saveMusicPrefs();
  refreshMusicRoots();
  return true;
}

function musicTogglePlay() {
  const player = musicPlayers.overlay || musicPlayers.card;
  if (!player || typeof player.getPlayerState !== 'function') return;
  try {
    const state = player.getPlayerState();
    if (state === 1) player.pauseVideo();
    else player.playVideo();
  } catch (error) { /* player ainda não pronto */ }
}

// Sincronização com o timer de foco
function musicOnTimerStart() {
  Object.values(musicPlayers).forEach((player) => {
    try { if (player && typeof player.playVideo === 'function') player.playVideo(); } catch (error) { /* ignorar */ }
  });
}

function musicOnTimerPause() {
  if (!musicPrefs.syncPause) return;
  Object.values(musicPlayers).forEach((player) => {
    try { if (player && typeof player.pauseVideo === 'function') player.pauseVideo(); } catch (error) { /* ignorar */ }
  });
}

// Monta players após o DOM estar pronto (dashboard é renderizado assincronamente)
document.addEventListener('DOMContentLoaded', () => {
  if (currentMusicSource()) {
    document.querySelectorAll('[data-music-root]').forEach((root) => {
      mountMusicPlayer(root, root.dataset.musicRoot === 'overlay' ? 'overlay' : 'card');
    });
  }
});

// Volume via delegação (o slider vive dentro do overlay)
document.addEventListener('input', (event) => {
  const range = event.target.closest?.('.music-volume-range');
  if (!range) return;
  const volume = Math.max(0, Math.min(100, Number(range.value) || 0));
  musicPrefs.volume = volume;
  saveMusicPrefs();
  Object.values(musicPlayers).forEach((player) => {
    try { if (player && typeof player.setVolume === 'function') player.setVolume(volume); } catch (error) { /* ignorar */ }
  });
});

// Checkbox "pausar música junto com o foco"
document.addEventListener('change', (event) => {
  const checkbox = event.target.closest?.('[data-action="music-sync-toggle"]');
  if (!checkbox) return;
  musicPrefs.syncPause = Boolean(checkbox.checked);
  saveMusicPrefs();
});

// Submit do formulário (Enter) sem recarregar a página
document.addEventListener('submit', (event) => {
  const form = event.target.closest?.('[data-music-form]');
  if (!form) return;
  event.preventDefault();
  const input = form.querySelector('.music-url-input');
  if (input) setMusicFromUrl(input.value);
});
