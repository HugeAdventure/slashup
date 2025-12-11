// =====================================================
// 1. CONFIG & TAGS
// =====================================================

const SPECIAL_TAGS = {
    hugeadventure: { text: "OWNER", class: "tag-owner" },
    vinalyyy: { text: "MVP", class: "tag-admin" },
    admin_name: { text: "ADMIN", class: "tag-admin" },
    dev_name: { text: "DEV", class: "tag-dev" }
};

let pendingBanner = 'default';

let myChart = null;
let myRadar = null;

let currentLbPage = 1;
let totalLbPages = 1;
let currentLbSort = "wins";

// Variables for Customization
let cachedOriginalTheme = 'default';
let pendingTheme = 'default';

// =====================================================
// 2. INIT / WINDOW LOAD
// =====================================================

window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const playerParam = urlParams.get("player");

    // Load Particles first so bg isn't empty
    try { initParticles(); animateParticles(); } catch(e) { console.log("Particles error", e); }

    if (playerParam) {
        document.getElementById("playerInput").value = playerParam;
        switchTab("stats");
        fetchStats();
    }

    checkLogin();
    
    // We try/catch these so one error doesn't kill the whole site
    try { setupAutocomplete(); } catch(e) { console.error("Autocomplete init failed", e); }
    try { loadGlobalFeed(); } catch(e) { console.error("Feed init failed", e); }
    try { checkServerStatus(); } catch(e) { console.error("Status init failed", e); }

    // Leaderboard page 1
    loadLeaderboard(1);

    // Refresh Feed every 30s
    setInterval(loadGlobalFeed, 30000);
};

// =====================================================
// 3. NAVIGATION & UI
// =====================================================

function switchTab(tab) {
    document.querySelectorAll(".page-section").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

    const page = document.getElementById(tab + "-page");
    const btn = document.getElementById("btn-" + tab);
    
    if(page) page.classList.add("active");
    if(btn) btn.classList.add("active");

    const footer = document.querySelector("footer");
    if(footer) footer.style.display = tab === "stats" ? "none" : "block";
}

// =====================================================
// 4. STATS FETCHING
// =====================================================

async function fetchStats() {
    const username = document.getElementById("playerInput").value;
    if (!username) return;

    const container = document.getElementById("profileDisplay");
    container.classList.add("visible");

    const idsToLoad = ["nameDisplay", "rankDisplay", "viewContainer", "kdrVal", "winsVal", "streakVal", "skinContainer", "chartBox", "wrBox", "bioBox", "nemesisBox"];
    idsToLoad.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("skeleton");
    });

    try {
        const response = await fetch(`/api?player=${username}`);
        const data = await response.json();

        if (data.error) {
            alert("Player not found!");
            cleanSkeletons(idsToLoad);
            return;
        }

        saveToHistory(username);

        const stats = data.stats || {};
        const matches = data.matches || [];

        document.getElementById("nameDisplay").innerText = stats.name || username;

        const bannerId = stats.profile_banner || 'default';
        const headerEl = document.getElementById('profile-header');
        headerEl.className = `profile-header banner-${bannerId}`;

        const socBox = document.getElementById("socials-display");
        const socYt = document.getElementById("soc-yt");
        const socTw = document.getElementById("soc-tw");
        const socDc = document.getElementById("soc-dc");
        const socX = document.getElementById("soc-x");
    
        let hasSocials = false;
    
        const setSocial = (el, link) => {
            if (link && link.length > 2) {
                el.href = link.startsWith('http') ? link : `https://${link}`;
                el.style.display = "flex";
                hasSocials = true;
            } else {
                el.style.display = "none";
            }
        };
    
        setSocial(socYt, stats.social_youtube);
        setSocial(socTw, stats.social_twitch);
        setSocial(socDc, stats.social_discord);
        setSocial(socX, stats.social_twitter);
    
        socBox.style.display = hasSocials ? "flex" : "none";
        
        document.getElementById("kdrVal").innerText = parseFloat(stats.kdr || 0).toFixed(2);
        document.getElementById("winsVal").innerText = stats.wins || 0;
        document.getElementById("streakVal").innerText = stats.best_streak || 0;
        document.getElementById("viewCount").innerText = stats.views || 0;

        // Rank Styling
        const rankEl = document.getElementById("rankDisplay");
        rankEl.innerText = `#${stats.rank || "-"}`;
        
        // Reset colors
        rankEl.style.background = "var(--panel)";
        rankEl.style.color = "var(--text-dim)";
        
        if (stats.rank === 1) { rankEl.style.background = "var(--gold)"; rankEl.style.color = "black"; }
        else if (stats.rank === 2) { rankEl.style.background = "var(--silver)"; rankEl.style.color = "black"; }
        else if (stats.rank === 3) { rankEl.style.background = "var(--bronze)"; rankEl.style.color = "black"; }

        // Winrate
        const totalGames = (stats.wins || 0) + (stats.losses || 0);
        const winPercent = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 50;
        document.getElementById("wr-percent").innerText = `${winPercent}%`;
        document.getElementById("bar-win").style.width = `${winPercent}%`;
        document.getElementById("bar-loss").style.width = `${100 - winPercent}%`;

        // Load Graphs
        if(window.Chart) {
            renderChart(matches, username);
            renderBiometrics(stats);
        }
        
        findNemesis(matches, username);
        renderTicker(matches, username);
        renderMatchHistory(matches, username);

        // Load Skin
        const skinContainer = document.getElementById("skinContainer");
        const skinImg = document.getElementById("skinImg");
        
        skinContainer.innerHTML = "";
        skinContainer.classList.remove("skeleton");

        const newImg = document.createElement("img");
        newImg.id = "skinImg";
        newImg.className = "skin-img floating-skin"; 
        newImg.src = `https://visage.surgeplay.com/full/512/${username}`;
        
        newImg.onload = () => {
            newImg.classList.add("loaded");
        };

        skinContainer.appendChild(newImg);

        // Special Tags
        const tagEl = document.getElementById("tagDisplay");
        tagEl.innerHTML = "";
        if (SPECIAL_TAGS[username.toLowerCase()]) {
            const tagData = SPECIAL_TAGS[username.toLowerCase()];
            tagEl.innerHTML = `<span class="player-tag ${tagData.class}">${tagData.text}</span>`;
        }

        cleanSkeletons(idsToLoad);

    } catch (error) {
        console.error(error);
        cleanSkeletons(idsToLoad);
    }
}

function cleanSkeletons(ids) {
    ids.forEach(id => {
        if (id !== "skinContainer") {
            const el = document.getElementById(id);
            if (el) el.classList.remove("skeleton");
        }
    });
}

function renderMatchHistory(matches, username) {
    const historyContainer = document.getElementById("matchHistoryList");
    historyContainer.innerHTML = "";

    if (matches.length === 0) {
        historyContainer.innerHTML = `<div style="color:#666; text-align:center; padding:1rem;">No matches played yet.</div>`;
        return;
    }

    matches.forEach(match => {
        const isWin = match.winner_name.toLowerCase() === username.toLowerCase();
        const opponent = isWin ? match.loser_name : match.winner_name;
        const dateStr = new Date(match.match_time).toLocaleDateString();

        historyContainer.innerHTML += `
            <div class="match-card ${isWin ? "win" : "loss"}">
                <div class="match-outcome">
                    ${isWin ? "<i class='fas fa-trophy'></i>" : "<i class='fas fa-skull'></i>"}
                    <span>${isWin ? "VICTORY" : "DEFEAT"}</span>
                </div>
                <div class="match-vs">
                    <span style="color:#666; font-size:0.8rem;">VS</span>
                    <img src="https://visage.surgeplay.com/face/64/${opponent}" class="opponent-head">
                    <span class="opponent-name">${opponent}</span>
                </div>
                <div class="match-date">${dateStr}</div>
            </div>`;
    });
}

// =====================================================
// 5. BARRACKS / CUSTOMIZATION (FIXED)
// =====================================================

function selectBanner(bannerId) {
    const el = document.getElementById(`ban-${bannerId}`);
    if(el && el.classList.contains('locked')) {
        showToast("Locked", "Rank required.", "error");
        return;
    }

    pendingBanner = bannerId;
    
    document.querySelectorAll('.banner-option').forEach(b => b.classList.remove('active'));
    if(el) el.classList.add('active');
}

async function openCustomizePage() {
    const user = JSON.parse(localStorage.getItem('slashup_user'));
    
    if(!user) {
        showToast("Access Denied", "Login required for Barracks.", "error");
        openLoginModal();
        return;
    }

    switchTab('customize');

    try {
        const res = await fetch(`/api?player=${user.name}`);
        const data = await res.json();
        

        let rawRank = "DEFAULT";
        if(data.stats) {
            rawRank = data.stats.rank_name || data.stats.rank || "DEFAULT";
        }

        const cleanRank = String(rawRank).toUpperCase().trim();
        
        console.log("Barracks Debug -> Raw:", rawRank, "Clean:", cleanRank);

        if(data.stats) {
            document.getElementById('in-youtube').value = data.stats.social_youtube || "";
            document.getElementById('in-twitch').value = data.stats.social_twitch || "";
            document.getElementById('in-discord').value = data.stats.social_discord || "";
            document.getElementById('in-twitter').value = data.stats.social_twitter || "";
        }
        
        // Load current theme
        const currentTheme = (data.stats && data.stats.site_theme) ? data.stats.site_theme : "default";
        cachedOriginalTheme = currentTheme;
        pendingTheme = currentTheme;

        // Update UI
        updateLockState(cleanRank);
        previewTheme(currentTheme, true);

    } catch(e) {
        console.error("Barracks Error:", e);
        showToast("Network Error", "Could not load profile.", "error");
    }
}

function updateLockState(rank) {
    // Defines who counts as High Staff
    const isHighStaff = ["OWNER", "ADMIN", "DEV", "DEVELOPER", "MANAGER"].includes(rank);
    
    const unlocks = {
        'default': true,
        'neon': isHighStaff || rank === "VIP" || rank === "MVP",
        'gold': isHighStaff || rank === "MVP",
        'zen': isHighStaff || rank === "VIP" || rank === "MVP",
        'ronin': isHighStaff || rank === "MVP" ,
        'matrix': isHighStaff
    };

    const bannerUnlocks = {
        'default': true,
        'neon': ["VIP", "MVP", "OWNER", "ADMIN"].includes(rank),
        'gold': ["MVP", "OWNER", "ADMIN"].includes(rank),
        'ronin': ["MVP", "OWNER", "ADMIN"].includes(rank)
    };

    for (const [id, unlocked] of Object.entries(bannerUnlocks)) {
        const el = document.getElementById(`ban-${id}`);
        if(el) {
            if(unlocked) {
                el.classList.remove('locked');
                const lock = el.querySelector('.lock-icon');
                if(lock) lock.style.display = 'none';
            } else {
                el.classList.add('locked');
            }
        }
    }

    for (const [theme, unlocked] of Object.entries(unlocks)) {
        const card = document.getElementById(`card-${theme}`);
        if(card) {
            if(unlocked) {
                card.classList.remove('locked');
                const icon = card.querySelector('.theme-status i');
                if(icon) icon.className = "fas fa-circle";
            } else {
                card.classList.add('locked');
                const icon = card.querySelector('.theme-status i');
                if(icon) icon.className = "fas fa-lock";
            }
        }
    }
}

function previewTheme(theme, isInit = false) {
    const card = document.getElementById(`card-${theme}`);
    
    if(card && card.classList.contains('locked') && !isInit) {
        showToast("Access Restricted", "Higher rank required.", "error");
        return;
    }

    document.documentElement.className = `theme-${theme}`;
    pendingTheme = theme;

    document.querySelectorAll('.theme-card').forEach(el => el.classList.remove('active'));
    if(card) {
        card.classList.add('active');
        // Set checkmark for active one
        document.querySelectorAll('.theme-status i').forEach(i => {
            // Reset icons based on lock state of PARENT
            if(i.closest('.locked')) i.className = "fas fa-lock";
            else i.className = "fas fa-circle";
        });
        
        const thisIcon = card.querySelector('.theme-status i');
        if(thisIcon) thisIcon.className = "fas fa-check";
    }
}

function cancelCustomization() {
    previewTheme(cachedOriginalTheme, true);
    switchTab('home');
}

async function saveSettings() {
    const user = JSON.parse(localStorage.getItem('slashup_user'));
    if(!user) return;

    const btn = document.querySelector('.action-bar .cta-btn');
    if(btn) btn.innerText = "SAVING...";

    const payload = {
        uuid: user.uuid,
        theme: pendingTheme,
        banner: pendingBanner,
        youtube: document.getElementById('in-youtube').value,
        twitch: document.getElementById('in-twitch').value,
        discord: document.getElementById('in-discord').value,
        twitter: document.getElementById('in-twitter').value
    };

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if(data.success) {
            showToast("System Updated", "Interface theme installed.", "success");
            localStorage.setItem('slashup_theme_cache', pendingTheme);
            cachedOriginalTheme = pendingTheme;
        } else {
            showToast("Error", "Save failed.", "error");
        }
    } catch(e) {
        showToast("Connection Lost", "Could not save.", "error");
    } finally {
        if(btn) btn.innerText = "INSTALL THEME";
    }
}

// =====================================================
// 6. SERVER STATUS & FEED (FIXED)
// =====================================================

async function checkServerStatus() {
    const ip = "194.164.96.27:25601";
    const statusText = document.getElementById("server-status-text");
    const statusDot = document.getElementById("status-dot");

    try {
        const res = await fetch(`https://api.mcstatus.io/v2/status/java/${ip}`);
        const data = await res.json();

        if (data.online) {
            statusDot.classList.remove("offline");
            statusDot.classList.add("online");
            statusText.innerHTML = `<span class="status-dot online"></span> ${data.players.online}/${data.players.max} ONLINE`;
        } else {
            throw new Error("Offline");
        }
    } catch (e) {
        if(statusText) statusText.innerHTML = `<span class="status-dot offline"></span> OFFLINE`;
        if(statusDot) { statusDot.classList.remove("online"); statusDot.classList.add("offline"); }
    }
}

async function loadGlobalFeed() {
    const feed = document.getElementById("global-feed");
    if (!feed) return;

    try {
        // Ensure file name matches exactly on server
        const res = await fetch("/api/global_matches");
        const data = await res.json();

        feed.innerHTML = "";
        
        if(!Array.isArray(data)) return;

        data.forEach((match, index) => {
            const dateStr = new Date(match.match_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            feed.innerHTML += `
                <div style="min-width: 280px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 1rem; display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-size:0.7rem; color:#666; font-family:'Share Tech Mono'">${dateStr}</div>
                    <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="https://visage.surgeplay.com/face/32/${match.winner_name}" style="border-radius:4px; width:24px;">
                            <span style="color:var(--win); font-weight:bold; font-size:0.9rem;">${match.winner_name}</span>
                        </div>
                        <span style="font-size:0.7rem;">VS</span>
                        <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                            <span style="color:#888; font-size:0.9rem;">${match.loser_name}</span>
                            <img src="https://visage.surgeplay.com/face/32/${match.loser_name}" style="border-radius:4px; width:24px; filter:grayscale(1);">
                        </div>
                    </div>
                </div>`;
        });
    } catch (e) {
        // Silent fail for feed
    }
}

// =====================================================
// 7. UTILITIES
// =====================================================

function setupAutocomplete() {
    const input = document.getElementById("playerInput");
    const box = document.getElementById("suggestions-box");
    let debounceTimer;

    input.addEventListener("input", function () {
        const val = this.value;
        clearTimeout(debounceTimer);

        if (val.length < 2) { box.style.display = "none"; return; }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${val}`);
                const names = await res.json();
                box.innerHTML = "";

                if (names.length > 0) {
                    box.style.display = "block";
                    names.forEach(n => {
                        const div = document.createElement("div");
                        div.className = "suggestion-item";
                        // MouseDown fires before Blur
                        div.onmousedown = () => {
                            input.value = n.name;
                            box.style.display = "none";
                            fetchStats();
                        };
                        div.innerHTML = `<img src="https://visage.surgeplay.com/face/32/${n.name}" style="width:20px; border-radius:2px;"> <span>${n.name}</span>`;
                        box.appendChild(div);
                    });
                } else { box.style.display = "none"; }
            } catch (e) {}
        }, 300);
    });

    input.addEventListener("blur", () => {
        // Delay hide so click registers
        setTimeout(() => { box.style.display = "none"; }, 200);
    });
}

function renderChart(matches, username) {
    const ctx = document.getElementById("performanceChart");
    if(!ctx) return;
    
    // Sort oldest first for graph
    const sorted = [...matches].reverse();
    let score = 0;
    const dataPoints = sorted.map(m => {
        score += m.winner_name.toLowerCase() === username.toLowerCase() ? 1 : -1;
        return score;
    });

    const labels = sorted.map((_, i) => `M${i + 1}`);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Trend",
                data: dataPoints,
                borderColor: "#ff3e3e",
                backgroundColor: "rgba(255, 62, 62, 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: "#0b0b10",
                pointBorderColor: "#ff3e3e"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: "rgba(255,255,255,0.05)" } } }
        }
    });
}

function renderBiometrics(stats) {
    const ctx = document.getElementById("radarChart");
    if(!ctx) return;

    const totalGames = (stats.wins || 0) + (stats.losses || 0);
    const survivability = Math.min(100, ((stats.wins || 0) / (totalGames || 1)) * 150);
    const lethality = Math.min(100, ((stats.kdr || 0) / 4) * 100);
    const consistency = Math.min(100, ((stats.best_streak || 0) / 20) * 100);
    const experience = Math.min(100, ((stats.wins || 0) / 100) * 100);
    const aggression = Math.min(100, lethality * 1.2 - survivability * 0.2);

    const dataValues = [survivability, lethality, consistency, experience, aggression];
    const maxIndex = dataValues.indexOf(Math.max(...dataValues));
    const classes = ["GUARDIAN", "ASSASSIN", "MACHINE", "VETERAN", "BERSERKER"];
    
    document.querySelector("#playerClass span").innerText = classes[maxIndex];

    if (myRadar) myRadar.destroy();

    myRadar = new Chart(ctx.getContext("2d"), {
        type: "radar",
        data: {
            labels: ["SURV", "LETHAL", "CONST", "EXP", "AGGRO"],
            datasets: [{
                data: dataValues,
                backgroundColor: "rgba(255, 62, 62, 0.2)",
                borderColor: "#ff3e3e",
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: "#333" },
                    grid: { color: "#222" },
                    pointLabels: { color: "#888", font: { size: 10 } },
                    ticks: { display: false },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function findNemesis(matches, username) {
    const killers = {};
    let maxKills = 0;
    let nemesis = "None";

    matches.forEach(m => {
        if (m.winner_name.toLowerCase() !== username.toLowerCase()) {
            killers[m.winner_name] = (killers[m.winner_name] || 0) + 1;
            if (killers[m.winner_name] > maxKills) {
                maxKills = killers[m.winner_name];
                nemesis = m.winner_name;
            }
        }
    });

    document.getElementById("nemesisName").innerText = nemesis === "None" ? "UNDEFEATED" : nemesis;
    document.getElementById("nemesisKills").innerText = maxKills;
    const headUrl = nemesis === "None" ? "Steve" : nemesis;
    document.getElementById("nemesisHead").src = `https://visage.surgeplay.com/face/128/${headUrl}`;
}

function renderTicker(matches, username) {
    const ticker = document.getElementById("sequenceTicker");
    ticker.innerHTML = "";
    if (!matches) return;
    [...matches].reverse().forEach(m => {
        const isWin = m.winner_name.toLowerCase() === username.toLowerCase();
        const tick = document.createElement("div");
        tick.className = `seq-tick ${isWin ? "win" : "loss"}`;
        tick.title = isWin ? `Win vs ${m.loser_name}` : `Loss vs ${m.winner_name}`;
        ticker.appendChild(tick);
    });
}

// =====================================================
// 8. LEADERBOARD & MISC
// =====================================================

async function loadLeaderboard(page) {
    currentLbPage = page;
    document.getElementById("lb-page-num").innerText = `PAGE ${page}`;
    const prevBtn = document.getElementById("lb-prev");
    const nextBtn = document.getElementById("lb-next");
    if(prevBtn) prevBtn.classList.toggle("disabled", page === 1);

    const tbody = document.getElementById("lb-body");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888; padding:2rem;">Accessing Database...</td></tr>`;

    try {
        const res = await fetch(`/api/leaderboard?page=${page}&sort=${currentLbSort}`);
        const data = await res.json();

        tbody.innerHTML = "";
        totalLbPages = data.totalPages || 1;
        if(nextBtn) nextBtn.classList.toggle("disabled", page >= totalLbPages);

        if (!data.players || data.players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666;">No players found.</td></tr>`;
            return;
        }

        let rankCounter = (page - 1) * 20 + 1;
        data.players.forEach(p => {
            const delay = (rankCounter % 20) * 0.05;
            const kdrVal = parseFloat(p.kdr || 0).toFixed(2);
            let rankClass = "";
            if (rankCounter === 1) rankClass = "rank-1";
            else if (rankCounter === 2) rankClass = "rank-2";
            else if (rankCounter === 3) rankClass = "rank-3";

            let specialTag = "";
            if (p.name && SPECIAL_TAGS[p.name.toLowerCase()]) {
                const t = SPECIAL_TAGS[p.name.toLowerCase()];
                specialTag = `<span class="player-tag ${t.class}" style="font-size:0.5rem; margin-left:5px;">${t.text}</span>`;
            }

            const hlWins = currentLbSort === "wins" ? "col-highlight" : "";
            const hlKills = currentLbSort === "kills" ? "col-highlight" : "";
            const hlKdr = currentLbSort === "kdr" ? "col-highlight" : "";
            const hlStreak = ["streak", "best_streak"].includes(currentLbSort) ? "col-highlight" : "";

            tbody.innerHTML += `
                <tr class="lb-row ${rankClass}" style="opacity:0; animation: lbSlideIn 0.3s ease-out forwards; animation-delay:${delay}s;">
                    <td class="rank-num">${rankCounter}</td>
                    <td>
                        <div class="player-cell">
                            <img src="https://visage.surgeplay.com/face/64/${p.name}" class="lb-head">
                            <div><span style="font-weight:bold; font-size:1.1rem;">${p.name}</span>${specialTag}</div>
                        </div>
                    </td>
                    <td class="${hlWins}" style="font-family:'Share Tech Mono'">${p.wins}</td>
                    <td class="${hlKills}" style="font-family:'Share Tech Mono'">${p.kills || 0}</td>
                    <td class="${hlKdr}" style="font-family:'Share Tech Mono'">${kdrVal}</td>
                    <td class="${hlStreak}" style="color:var(--gold); font-family:'Share Tech Mono'">${p.best_streak || 0}</td>
                </tr>`;
            rankCounter++;
        });

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--loss);">Connection Failed</td></tr>`;
    }
}

function switchLbCategory(category) {
    if (currentLbSort === category) return;
    currentLbSort = category;
    currentLbPage = 1;
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`sort-${category}`).classList.add("active");
    loadLeaderboard(1);
}

function changeLbPage(dir) {
    const newPage = currentLbPage + dir;
    if (newPage < 1 || newPage > totalLbPages) return;
    loadLeaderboard(newPage);
}

// =====================================================
// 9. AUTH & MISC
// =====================================================

function checkLogin() {
    const storedUser = localStorage.getItem('slashup_user');
    if (storedUser) {
        updateNavForLogin(JSON.parse(storedUser));
        loadUserTheme();
    }
}

function loadUserTheme() {
    const savedTheme = localStorage.getItem('slashup_theme_cache');
    if(savedTheme) document.documentElement.className = `theme-${savedTheme}`;
}

function openLoginModal() { document.getElementById('login-modal').classList.add('open'); }
function closeLoginModal() { document.getElementById('login-modal').classList.remove('open'); }
function toggleProfileMenu() { document.getElementById('profile-dropdown').classList.toggle('show'); }

window.onclick = function(e) {
    if (!e.target.closest('.nav-profile')) document.getElementById('profile-dropdown').classList.remove('show');
    if (e.target.classList.contains('modal-overlay')) closeLoginModal();
}

async function submitLogin() {
    const code = document.getElementById('link-code').value.trim();
    const msg = document.getElementById('login-msg');
    
    if (code.length < 3) { msg.innerText = "Invalid Code"; return; }
    msg.style.color = '#fff'; msg.innerText = "Verifying...";

    try {
        const res = await fetch(`/api/auth?code=${code}`);
        const data = await res.json();
        if (data.success) {
            msg.style.color = 'var(--win)'; msg.innerText = "SUCCESS! Redirecting...";
            const userObj = { name: data.name, uuid: data.uuid };
            localStorage.setItem('slashup_user', JSON.stringify(userObj));
            setTimeout(() => { closeLoginModal(); updateNavForLogin(userObj); }, 1000);
        } else {
            msg.style.color = 'var(--loss)'; msg.innerText = "Invalid or Expired Code";
        }
    } catch (e) {
        msg.style.color = 'var(--loss)'; msg.innerText = "Connection Error";
    }
}

function updateNavForLogin(user) {
    document.getElementById('login-btn').style.display = 'none';
    const profile = document.getElementById('nav-profile');
    document.getElementById('nav-name').innerText = user.name;
    document.getElementById('nav-head').src = `https://visage.surgeplay.com/face/32/${user.uuid}`;
    profile.style.display = 'flex';
}

function logout() { localStorage.removeItem('slashup_user'); location.reload(); }

function myProfile() {
    const user = JSON.parse(localStorage.getItem('slashup_user'));
    if(user) { document.getElementById('playerInput').value = user.name; switchTab('stats'); fetchStats(); }
}

function saveToHistory(name) {
    let history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    history = history.filter(n => n.toLowerCase() !== name.toLowerCase());
    history.unshift(name);
    if (history.length > 3) history.pop();
    localStorage.setItem("searchHistory", JSON.stringify(history));
    updateRecent();
}

function updateRecent() {
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    const container = document.getElementById("recent-container");
    const list = document.getElementById("recent-list");
    if (history.length === 0) { container.style.display = "none"; return; }
    container.style.display = "block";
    list.innerHTML = "";
    history.forEach(name => {
        const tag = document.createElement("div");
        tag.className = "recent-tag";
        tag.innerHTML = `<img src="https://visage.surgeplay.com/face/32/${name}" class="recent-head"> ${name}`;
        tag.onclick = () => { document.getElementById("playerInput").value = name; fetchStats(); };
        list.appendChild(tag);
    });
}

function copyIP() {
    navigator.clipboard.writeText("play.slashup.net");
    showToast("IP Copied", "See you on the battlefield.");
}

function showToast(title, msg, type = "success") {
    const box = document.getElementById("toast-box");
    const color = type === "success" ? "var(--win)" : "var(--loss)";
    box.style.borderLeftColor = color;
    box.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}" style="color:${color}; font-size:1.5rem;"></i>
        <div><div style="font-weight: bold; color: white;">${title}</div><div style="font-size: 0.8rem; color: #aaa;">${msg}</div></div>`;
    box.classList.add("show");
    setTimeout(() => box.classList.remove("show"), 3000);
}

// =====================================================
// 10. DYNAMIC BACKGROUND PARTICLES
// =====================================================

const canvas = document.getElementById("bg-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
let particles = [];

function resizeCanvas() { 
    if(canvas) { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
    } 
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Particle {
    constructor() { 
        this.reset(true); 
    }

    reset(initial = false) {
        if(!canvas) return;

        // Detect themes
        const isRonin = document.documentElement.classList.contains('theme-ronin');
        const isZen = document.documentElement.classList.contains('theme-zen');
        const isMatrix = document.documentElement.classList.contains('theme-matrix');
        const isNeon = document.documentElement.classList.contains('theme-neon');
        const isGold = document.documentElement.classList.contains('theme-gold'); // Detect Gold

        this.x = Math.random() * canvas.width;
        this.opacity = Math.random() * 0.5 + 0.2;
        
        if (isZen) {
            this.y = initial ? Math.random() * canvas.height : -20;
            this.size = Math.random() * 5 + 3;
            this.speedY = Math.random() * 1.5 + 0.5;
            this.speedX = Math.random() * 1 - 0.5;
            this.swaySpeed = Math.random() * 0.03 + 0.01; 
            this.swayOffset = Math.random() * Math.PI * 2; 
            this.rotation = Math.random() * 360;
            this.rotationSpeed = (Math.random() - 0.5) * 2;
            this.tilt = 0;
            this.tiltSpeed = Math.random() * 0.05 + 0.02;
            this.color = Math.random() > 0.5 ? '#ffb7c5' : '#ffdae0'; 
        } 
        else if (isRonin) {
            this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
            this.size = Math.random() * 4 + 1; 
            this.speedY = (Math.random() * 0.8 + 0.3) * -1; 
            this.speedX = Math.random() * 1.5 - 0.75; 
            
            const rand = Math.random();
            if (rand > 0.9) this.color = '#ff4500'; 
            else if (rand > 0.6) this.color = '#8b0000'; 
            else this.color = '#333'; 
            
            this.rotation = Math.random() * 360; 
        }
        else if (isMatrix) {
            this.y = initial ? Math.random() * canvas.height : -10;
            this.size = Math.random() * 2 + 1;
            this.speedY = Math.random() * 5 + 5; 
            this.speedX = 0;
            this.color = '#00ff00';
            this.rotation = 0;
        }
        else if (isNeon) {
            this.y = Math.random() * canvas.height;
            this.x = initial ? Math.random() * canvas.width : -10;
            this.speedX = Math.random() * 5 + 3; 
            this.speedY = 0;
            this.size = Math.random() * 2 + 0.5; 
            this.color = '#00f2ff';
            this.rotation = 0;
        }
        else if (isGold) {
            this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
            this.size = Math.random() * 4 + 2; 
            this.speedY = (Math.random() * 0.5 + 0.2) * -1; 
            this.speedX = Math.random() * 0.5 - 0.25;
            this.color = '#ffd700'; 
            this.rotation = 0;
        }
        else {
            this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
            this.speedY = (Math.random() * 1 + 0.5) * -1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.size = Math.random() * 3 + 1;
            this.color = '#ff3e3e';
            this.rotation = 0;
        }
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;

        if (document.documentElement.classList.contains('theme-zen')) {
            this.x += Math.sin(this.y * this.swaySpeed + this.swayOffset) * 0.5;
            this.tilt += this.tiltSpeed;
            this.rotation += this.rotationSpeed;
        }

        if (this.y > canvas.height + 20 || this.y < -30 || this.x > canvas.width + 20 || this.x < -20) {
            this.reset();
        }
    }

    draw() {
        if(!ctx) return;
        
        const isZen = document.documentElement.classList.contains('theme-zen');
        const isMatrix = document.documentElement.classList.contains('theme-matrix');

        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;

        if (isZen) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.scale(1, Math.abs(Math.sin(this.tilt))); 
            
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } 
        else if (isMatrix) {
            ctx.fillRect(this.x, this.y, 2, 12);
        }
        else {
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
        
        ctx.globalAlpha = 1.0;
    }
}

function initParticles() { 
    if(canvas) { 
        particles = [];
        for (let i = 0; i < 70; i++) particles.push(new Particle()); 
    } 
}

function animateParticles() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
}

const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.attributeName === "class") {
            particles.forEach(p => p.reset(true)); 
        }
    });
});
observer.observe(document.documentElement, { attributes: true });

window.addEventListener("scroll", () => {
    document.querySelectorAll(".reveal").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 150) el.classList.add("active");
    });
});
