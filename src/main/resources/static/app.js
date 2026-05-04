// ================================
// GLOBAL STATE
// ================================
let songs = [];
let currentTrackIndex = 0;
let isPlaying = false;
let currentMood = "Energetic";
let currentAudio = null;        // HTMLAudioElement for real audio
let audioBlobs = {};            // songId → object URL
let progressInterval = null;
let visualizerInterval = null;
let analyser = null;
let audioCtx = null;
let sourceNode = null;

// ================================
// LOAD SONGS
// ================================
function loadSongs() {
  fetch("http://localhost:8080/songs")
    .then(res => res.json())
    .then(data => {
      songs = data;
      songs.forEach(song => {
        if (song.filePath && !audioBlobs[song.id]) {
          audioBlobs[song.id] =
            `http://localhost:8080/songs/audio/${song.filePath}`;
        }
      });
      renderLibrary();
      renderRecommendations();
      updateLibCount();
    })
    .catch(() => {
      document.getElementById("song-grid").innerHTML =
        `<div class="no-results">Could not connect to server 😢</div>`;
    });
}

// ================================
// VINYL HELPERS
// ================================
function getVinylColors(id) {
  const palettes = [
    ['#7c3aed','#f472b6'],['#2dd4bf','#7c3aed'],['#fb923c','#f472b6'],
    ['#38bdf8','#2dd4bf'],['#a78bfa','#fb923c'],['#f472b6','#38bdf8'],
    ['#4ade80','#7c3aed'],['#facc15','#fb923c'],
  ];
  return palettes[id % palettes.length];
}

function vinylHTML(song, size = 90) {
  const [c1, c2] = getVinylColors(song.id);
  const dur = 3 + (song.id % 3);
  const center = Math.round(size * 0.27);
  const hole   = Math.round(size * 0.09);
  return `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:conic-gradient(#1a1a1a 0deg,#222 60deg,#1a1a1a 120deg,#222 180deg,#1a1a1a 240deg,#222 300deg,#1a1a1a 360deg);
      position:relative;box-shadow:0 0 28px ${c1}66;
      animation:vinylSpin ${dur}s linear infinite;z-index:1;">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:${center}px;height:${center}px;border-radius:50%;
        background:linear-gradient(135deg,${c1},${c2});"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:${hole}px;height:${hole}px;border-radius:50%;background:#0f0f1e;"></div>
    </div>`;
}

// ================================
// SMART RECOMMENDATION SCORE
// ================================
function getMatchScore(song) {
  let score = 0;
  if ((song.mood || '').toLowerCase() === currentMood.toLowerCase()) score += 60;
  const genreCount = songs.filter(s => s.genre === song.genre).length;
  score += Math.max(0, 20 - genreCount * 2);
  if (audioBlobs[song.id]) score += 20;
  return Math.min(score, 100);
}

// ================================
// RENDER RECOMMENDATIONS
// ================================
function renderRecommendations() {
  const container = document.getElementById("rec-cards");
  container.innerHTML = "";

  const scored = songs
    .map(s => ({ ...s, _score: getMatchScore(s) }))
    .filter(s => s._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);

  if (scored.length === 0) {
    container.innerHTML = `<p style="color:#666688;padding:20px;">No songs match this mood yet — add some!</p>`;
    return;
  }

  scored.forEach(song => {
    const realIndex = songs.findIndex(s => s.id === song.id);
    const [c1] = getVinylColors(song.id);
    const isActive = realIndex === currentTrackIndex && isPlaying;

    const div = document.createElement("div");
    div.className = "rec-card" + (isActive ? " is-playing" : "");
    div.id = `rec-card-${song.id}`;
    div.onclick = () => playTrack(realIndex);

    div.innerHTML = `
      <div class="rec-card-img-wrap">
        <div style="width:100%;height:140px;
          background:linear-gradient(160deg,#0f0f1e,#1c1c38);
          display:flex;align-items:center;justify-content:center;
          position:relative;overflow:hidden;">
          <div style="position:absolute;width:120px;height:120px;border-radius:50%;
            background:radial-gradient(circle,${c1}33 0%,transparent 70%);"></div>
          ${vinylHTML(song, 80)}
          ${song._score === 100 ? '<span class="ai-badge">✦ TOP PICK</span>' : ''}
          ${audioBlobs[song.id]
            ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(74,222,128,0.2);
                border:1px solid #4ade80;border-radius:20px;padding:2px 8px;
                font-size:9px;font-weight:700;color:#4ade80;letter-spacing:0.5px;">● AUDIO</div>`
            : ''}
        </div>
        <span class="bpm-badge">${song.bpm || 100} BPM</span>
      </div>
      <div class="rec-card-info">
        <h3>${song.title}</h3>
        <p>${song.artist || "Unknown"} · ${song.language || song.genre || ""}</p>
        <div class="match-bar-wrap">
          <div class="match-bar-fill" style="width:${song._score}%"></div>
        </div>
        <p class="match-score-label">${song._score}% match</p>
      </div>`;

    container.appendChild(div);
  });

  autoScrollCarousel();
}

// ================================
// RENDER LIBRARY
// ================================
function renderLibrary(data = songs) {
  const grid = document.getElementById("song-grid");
  grid.innerHTML = "";

  if (data.length === 0) {
    grid.innerHTML = `<div class="no-results">No songs found 😢</div>`;
    return;
  }

  data.forEach(song => {
    const realIndex = songs.findIndex(s => s.id === song.id);
    const [c1, c2] = getVinylColors(song.id);
    const isActive = realIndex === currentTrackIndex && isPlaying;
    const hasAudio = !!audioBlobs[song.id];

    const div = document.createElement("div");
    div.className = "song-card" + (isActive ? " is-playing" : "");
    div.id = `song-card-${song.id}`;
    div.onclick = () => playTrack(realIndex);

    div.innerHTML = `
      <div style="width:100%;height:100%;
        background:linear-gradient(160deg,#0f0f1e 0%,#1c1c38 100%);
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:14px;padding:16px;
        position:relative;overflow:hidden;">
        <div style="position:absolute;width:160px;height:160px;border-radius:50%;
          background:radial-gradient(circle,${c1}22 0%,transparent 70%);
          top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;"></div>
        ${vinylHTML(song, 90)}
        <div style="position:absolute;top:10px;right:10px;
          background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
          padding:3px 9px;border-radius:20px;
          font-size:10px;font-weight:700;color:#fff;letter-spacing:0.5px;z-index:2;">
          ${song.bpm || 100} BPM</div>
        ${hasAudio
          ? `<div style="position:absolute;top:10px;left:10px;
              background:rgba(74,222,128,0.2);border:1px solid #4ade80;
              border-radius:20px;padding:2px 8px;
              font-size:9px;font-weight:700;color:#4ade80;z-index:2;">● AUDIO</div>`
          : ''}
      </div>
      <div class="song-card-overlay"></div>
      <div class="song-card-info">
        <h3>${song.title}</h3>
        <p>${song.genre || "Unknown"}${song.language ? ' · ' + song.language : ''}</p>
      </div>
      <div class="song-card-play-overlay">
        <div class="song-play-circle">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
      </div>`;

    grid.appendChild(div);
  });

  updateLibCount(data.length);
}

// ================================
// AUDIO UPLOAD HANDLER
// ================================
function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 50 * 1024 * 1024) {
    alert("File too large. Max 50MB.");
    return;
  }

  const zone        = document.getElementById("audio-upload-zone");
  const placeholder = document.getElementById("upload-placeholder");
  const preview     = document.getElementById("upload-preview");
  const filename    = document.getElementById("upload-filename");
  const filesize    = document.getElementById("upload-filesize");
  const audioPrev   = document.getElementById("upload-audio-preview");

  const mb = (file.size / 1024 / 1024).toFixed(1);
  filename.textContent = file.name;
  filesize.textContent = `${mb} MB · ${file.type}`;
  audioPrev.src = URL.createObjectURL(file);

  placeholder.style.display = "none";
  preview.style.display = "flex";
  zone.classList.add("has-file");

  window._pendingAudioFile = file;
}

// ================================
// ADD SONG FORM SUBMIT
// ================================
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("add-song-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const addBtn = document.getElementById("add-btn");
    addBtn.disabled = true;
    addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" style="width:16px;height:16px;
      animation:vinylSpin 1s linear infinite">
      <path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Saving...`;

    const songData = {
      title:    document.getElementById("song-title").value.trim(),
      artist:   document.getElementById("song-artist").value.trim(),
      genre:    document.getElementById("song-genre").value,
      mood:     document.getElementById("song-mood").value,
      bpm:      parseInt(document.getElementById("song-bpm").value) || 100,
      language: document.getElementById("song-language").value || "",
    };

    const formData = new FormData();
    formData.append("song", JSON.stringify(songData));
    if (window._pendingAudioFile) {
      formData.append("file", window._pendingAudioFile);
    }

    fetch("http://localhost:8080/songs", {
      method: "POST",
      body: formData
    })
    .then(res => {
      if (!res.ok) throw new Error("Server error: " + res.status);
      return res.json();
    })
    .then(saved => {
      if (saved.filePath) {
        audioBlobs[saved.id] = `http://localhost:8080/songs/audio/${saved.filePath}`;
      }
      showToast();
      resetForm();
      loadSongs();

      addBtn.disabled = false;
      addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg> Add to Library`;
    })
    .catch(err => {
      console.error(err);
      alert("Failed to save. Check server is running.");
      addBtn.disabled = false;
      addBtn.innerHTML = `Add to Library`;
    });
  });

  // ================================
  // FIX: SEEK ON CLICK — Progress bar click handler
  // ================================
  setupProgressBarSeek();
});

// ================================
// SEEK SETUP — click on progress bar to jump to time
// ================================
function setupProgressBarSeek() {
  // Home page progress bar
  const homeBar = document.getElementById("progress-bar");
  if (homeBar) {
    homeBar.addEventListener("click", handleProgressClick);
    homeBar.addEventListener("mousemove", handleProgressHover);
    homeBar.addEventListener("mouseleave", () => {
      homeBar.removeAttribute("data-seek-tooltip");
    });
  }

  // Library page progress bar (if it has id)
  const libBar = document.querySelector(".lib-player .progress-bar");
  if (libBar) {
    libBar.addEventListener("click", handleProgressClick);
    libBar.addEventListener("mousemove", handleProgressHover);
    libBar.addEventListener("mouseleave", () => {
      libBar.removeAttribute("data-seek-tooltip");
    });
  }
}

function handleProgressClick(e) {
  if (!currentAudio || !currentAudio.duration) return;

  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const seekTime = ratio * currentAudio.duration;

  currentAudio.currentTime = seekTime;

  // Immediately update fill visually
  updateProgressUI(seekTime, currentAudio.duration);
}

function handleProgressHover(e) {
  if (!currentAudio || !currentAudio.duration) return;

  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  const hoverX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, hoverX / rect.width));
  const hoverTime = ratio * currentAudio.duration;

  bar.setAttribute("data-seek-tooltip", formatTime(hoverTime));
  bar.style.setProperty("--tooltip-x", (hoverX) + "px");
}

function updateProgressUI(currentTime, duration) {
  const pct = (currentTime / duration) * 100 || 0;
  document.querySelectorAll(".progress-fill, #lib-progress-fill")
    .forEach(f => f.style.width = pct + "%");

  const cur = document.getElementById("current-time");
  const tot = document.getElementById("total-time");
  if (cur) cur.textContent = formatTime(currentTime);
  if (tot) tot.textContent = formatTime(duration || 0);
}

// ================================
// PLAY TRACK
// ================================
function playTrack(index) {
  currentTrackIndex = index;
  const song = songs[index];
  if (!song) return;

  // Stop current audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (progressInterval) clearInterval(progressInterval);

  // Disconnect old audio context
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch(e) {}
    sourceNode = null;
  }

  // Update all player UI
  const title  = song.title;
  const meta   = `${song.genre || ""}${song.language ? ' · ' + song.language : ''} · ${song.bpm || 100} BPM`;
  ["player-title","lib-player-title"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = title;
  });
  ["player-meta","lib-player-meta"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = meta;
  });
  document.getElementById("np-title").innerText = title;
  document.getElementById("np-artist").innerText = song.artist || "Unknown";

  // Sidebar thumbnail
  const [c1, c2] = getVinylColors(song.id);
  const thumb = document.getElementById("np-thumb");
  thumb.style.cssText = `background:linear-gradient(135deg,${c1},${c2});border-radius:8px;width:40px;height:40px;`;
  thumb.removeAttribute("src");

  // Highlight active cards
  document.querySelectorAll(".song-card.is-playing, .rec-card.is-playing")
    .forEach(el => el.classList.remove("is-playing"));
  const sc = document.getElementById(`song-card-${song.id}`);
  const rc = document.getElementById(`rec-card-${song.id}`);
  if (sc) sc.classList.add("is-playing");
  if (rc) rc.classList.add("is-playing");

  if (audioBlobs[song.id]) {
    currentAudio = new Audio(audioBlobs[song.id]);
    currentAudio.volume = (document.getElementById("volume-slider")?.value ?? 75) / 100;
    currentAudio.play();
    isPlaying = true;
    updatePlayIcons(true);

    // Hook into audio context for real-time visualizer
    setupAudioContext(currentAudio);

    // Progress tracking
    currentAudio.addEventListener("timeupdate", () => {
      updateProgressUI(currentAudio.currentTime, currentAudio.duration);
    });

    currentAudio.addEventListener("ended", () => {
      isPlaying = false;
      updatePlayIcons(false);
      nextTrack();
    });

  } else {
    showNoAudioToast();
    isPlaying = false;
    updatePlayIcons(false);
  }
}

// ================================
// AUDIO CONTEXT FOR REAL VISUALIZER
// ================================
function setupAudioContext(audioEl) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.connect(audioCtx.destination);
    }

    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (sourceNode) {
      try { sourceNode.disconnect(); } catch(e) {}
    }

    sourceNode = audioCtx.createMediaElementSource(audioEl);
    sourceNode.connect(analyser);

    startRealVisualizer();
  } catch(e) {
    // Fallback to animated visualizer if AudioContext fails (CORS etc.)
    startFallbackVisualizer();
  }
}

function startRealVisualizer() {
  if (visualizerInterval) clearInterval(visualizerInterval);
  const bars = document.querySelectorAll(".spec-bar");
  if (!bars.length || !analyser) return;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    if (!isPlaying) return;
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    bars.forEach((bar, i) => {
      const idx = Math.floor(i * dataArray.length / bars.length);
      const value = dataArray[idx];
      const pct = value / 255;
      bar.style.transform = `scaleY(${Math.max(0.08, pct)})`;
      bar.style.opacity = 0.5 + pct * 0.5;
    });
  }
  draw();
}

// ================================
// FALLBACK ANIMATED VISUALIZER (CSS-only simulation)
// ================================
function startFallbackVisualizer() {
  if (visualizerInterval) clearInterval(visualizerInterval);
  visualizerInterval = setInterval(() => {
    if (!isPlaying) return;
    document.querySelectorAll(".spec-bar").forEach(b => {
      const h = Math.random();
      b.style.transform = `scaleY(${Math.max(0.08, h)})`;
      b.style.opacity = 0.5 + h * 0.5;
    });
  }, 80);
}

// ================================
// PLAY / PAUSE
// ================================
function togglePlay() {
  if (!currentAudio) {
    if (songs[currentTrackIndex]) playTrack(currentTrackIndex);
    return;
  }
  if (isPlaying) {
    currentAudio.pause();
    isPlaying = false;
    updatePlayIcons(false);
    if (audioCtx) audioCtx.suspend();
  } else {
    currentAudio.play();
    isPlaying = true;
    updatePlayIcons(true);
    if (audioCtx) audioCtx.resume();
    // Restart visualizer
    if (analyser) startRealVisualizer();
    else startFallbackVisualizer();
  }
}

function updatePlayIcons(playing) {
  const pause = `<rect x="6" y="4" width="4" height="16" rx="1"/>
                 <rect x="14" y="4" width="4" height="16" rx="1"/>`;
  const play  = `<polygon points="5,3 19,12 5,21"/>`;
  ["play-icon","lib-play-icon"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = playing ? pause : play;
  });
}

// ================================
// NEXT / PREV
// ================================
function nextTrack() {
  if (!songs.length) return;
  currentTrackIndex = (currentTrackIndex + 1) % songs.length;
  playTrack(currentTrackIndex);
}

function prevTrack() {
  if (!songs.length) return;
  currentTrackIndex = (currentTrackIndex - 1 + songs.length) % songs.length;
  playTrack(currentTrackIndex);
}

// ================================
// VOLUME
// ================================
function setVolume(val) {
  if (currentAudio) currentAudio.volume = val / 100;
}

// ================================
// MOOD
// ================================
function setMood(mood, el) {
  currentMood = mood;
  document.getElementById("mood-label").innerText = `Mood: ${mood}`;
  document.querySelectorAll(".mood-pill").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  renderRecommendations();
}

// ================================
// FILTER LIBRARY
// ================================
function filterLibrary(type, el) {
  document.querySelectorAll(".filter-tab, .mood-chip").forEach(b => {
    b.classList.remove("active", "filter-active");
  });
  el.classList.add(el.classList.contains("mood-chip") ? "filter-active" : "active");

  if (type === "all")       renderLibrary(songs);
  else if (type === "genre") renderLibrary([...songs].sort((a,b) => (a.genre||"").localeCompare(b.genre||"")));
  else if (type === "tempo") renderLibrary([...songs].sort((a,b) => (b.bpm||100)-(a.bpm||100)));
  else renderLibrary(songs.filter(s => (s.mood||"").toLowerCase() === type.toLowerCase()));
}

// ================================
// SEARCH
// ================================
function handleSearch() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  if (query === "") { renderLibrary(songs); return; }
  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(query) ||
    (s.artist||"").toLowerCase().includes(query) ||
    (s.genre||"").toLowerCase().includes(query) ||
    (s.mood||"").toLowerCase().includes(query) ||
    (s.language||"").toLowerCase().includes(query)
  );
  showPage("library", document.getElementById("nav-lib"));
  renderLibrary(filtered);
}

// ================================
// NAVIGATION
// ================================
function showPage(page, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  if (el) el.classList.add("active");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ================================
// TOASTS
// ================================
function showToast() {
  const t = document.getElementById("toast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function showNoAudioToast() {
  const t = document.getElementById("toast");
  const orig = t.innerHTML;
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;color:#fb923c;flex-shrink:0">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16.5"/>
  </svg> No audio file — re-add song with an MP3`;
  t.classList.add("show");
  setTimeout(() => { t.classList.remove("show"); t.innerHTML = orig; }, 3000);
}

// ================================
// HELPERS
// ================================
function formatTime(secs) {
  if (!secs || isNaN(secs)) return "0:00";
  const s = Math.floor(secs);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function updateLibCount(count) {
  const n = count !== undefined ? count : songs.length;
  const composers = new Set(songs.map(s => s.artist).filter(Boolean)).size;
  document.getElementById("lib-count").innerText = `${n} tracks · ${composers} artists`;
}

function resetForm() {
  document.getElementById("add-song-form").reset();
  document.getElementById("upload-placeholder").style.display = "block";
  document.getElementById("upload-preview").style.display = "none";
  document.getElementById("audio-upload-zone").classList.remove("has-file");
  document.getElementById("upload-audio-preview").src = "";
  window._pendingAudioFile = null;
}

// ================================
// SPECTRAL VISUALIZER — Build bars + start animation
// ================================
function startVisualizer() {
  const container = document.getElementById("spectral-bars");
  if (!container) return;
  container.innerHTML = "";

  // Build 40 bars with staggered animation delays
  for (let i = 0; i < 40; i++) {
    const bar = document.createElement("div");
    bar.className = "spec-bar";
    // Assign varied heights and durations for a lively default state
    const heightPct = 20 + Math.random() * 80; // base height 20–100%
    bar.style.height = heightPct + "px";
    // Color: vary between purple-pink and cyan-teal
    const useAlt = i % 5 === 0;
    bar.style.background = useAlt
      ? "linear-gradient(to top, #2dd4bf, #38bdf8)"
      : "linear-gradient(to top, #7c3aed, #f472b6)";
    // Stagger animation start
    const dur = (0.4 + Math.random() * 0.9).toFixed(2);
    const delay = (Math.random() * 0.8).toFixed(2);
    bar.style.setProperty("--dur", dur + "s");
    bar.style.animationDelay = delay + "s";
    container.appendChild(bar);
  }

  // Passive fallback: randomly re-vary heights every 150ms when not using AudioContext
  visualizerInterval = setInterval(() => {
    if (isPlaying && analyser) return; // real visualizer handles this
    container.querySelectorAll(".spec-bar").forEach(b => {
      const h = 10 + Math.random() * 90;
      b.style.height = h + "px";
    });
  }, 150);
}

// ================================
// CAROUSEL — auto scroll every 3s, pauses on hover
// ================================
let carouselInterval;
let carouselPaused = false;

function autoScrollCarousel() {
  const container = document.getElementById("rec-cards");
  if (!container) return;
  if (carouselInterval) clearInterval(carouselInterval);

  // Pause auto-scroll on user hover
  container.addEventListener("mouseenter", () => { carouselPaused = true; }, { passive: true });
  container.addEventListener("mouseleave", () => { carouselPaused = false; }, { passive: true });
  // Also pause on touch
  container.addEventListener("touchstart", () => { carouselPaused = true; }, { passive: true });
  container.addEventListener("touchend",   () => { setTimeout(() => { carouselPaused = false; }, 2000); }, { passive: true });

  carouselInterval = setInterval(() => {
    if (carouselPaused) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;
    const next = container.scrollLeft + 236;
    if (next >= maxScroll) {
      container.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      container.scrollTo({ left: next, behavior: "smooth" });
    }
  }, 3000);
}

function refreshMix() {
  renderRecommendations();
}

// ================================
// INIT
// ================================
window.onload = () => {
  loadSongs();
  startVisualizer();
  // Re-attach seek listeners after DOM ready (for dynamically placed bars)
  setTimeout(setupProgressBarSeek, 100);
};