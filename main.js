// =====================================================
// SPECIAL TAGS
// =====================================================

const SPECIAL_TAGS = {
    hugeadventure: { text: "OWNER", class: "tag-owner" },
    admin_name: { text: "ADMIN", class: "tag-admin" },
    dev_name: { text: "DEV", class: "tag-dev" }
};

let myChart = null;
let myRadar = null;

let currentLbPage = 1;
let totalLbPages = 1;
let currentLbSort = "wins";


// =====================================================
// INIT / WINDOW LOAD
// =====================================================

window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const playerParam = urlParams.get("player");

    if (playerParam) {
        document.getElementById("playerInput").value = playerParam;
        switchTab("stats");
        fetchStats();
    }

    checkLogin();
    loadUserTheme();
    
    setupAutocomplete();
    initParticles();
    animateParticles();
    loadGlobalFeed();
    updateRecent();
    checkServerStatus();

    // Leaderboard page 1
    loadLeaderboard(1);

    // Intervals
    setInterval(loadGlobalFeed, 30000);
};


// =====================================================
// NAVIGATION
// =====================================================

function switchTab(tab) {
    document.querySelectorAll(".page-section").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

    document.getElementById(tab + "-page").classList.add("active");
    document.getElementById("btn-" + tab).classList.add("active");

    const footer = document.querySelector("footer");
    footer.style.display = tab === "stats" ? "none" : "block";
}


// =====================================================
// FETCH STATS
// =====================================================

async function fetchStats() {
    const username = document.getElementById("playerInput").value;
    if (!username) return;

    const container = document.getElementById("profileDisplay");
    container.classList.add("visible");

    const idsToLoad = [
        "nameDisplay", "rankDisplay", "viewContainer", "kdrVal",
        "winsVal", "streakVal", "skinContainer", "chartBox",
        "wrBox", "bioBox", "nemesisBox"
    ];

    idsToLoad.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("skeleton");
    });

    const skinImg = document.getElementById("skinImg");
    skinImg.classList.remove("loaded");
    skinImg.src = "";
    document.getElementById("nemesisHead").src = "";

    document.getElementById("matchHistoryList").innerHTML =
        `<div class="match-card skeleton" style="height: 60px;"></div>
         <div class="match-card skeleton" style="height: 60px;"></div>`;

    document.getElementById("sequenceTicker").innerHTML = "";

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
        document.getElementById("kdrVal").innerText = parseFloat(stats.kdr || 0).toFixed(2);
        document.getElementById("winsVal").innerText = stats.wins || 0;
        document.getElementById("streakVal").innerText = stats.best_streak || 0;
        document.getElementById("viewCount").innerText = stats.views || 0;

        // Rank styling
        const rankEl = document.getElementById("rankDisplay");
        rankEl.innerText = `#${stats.rank || "-"}`;
        rankEl.style.background = "var(--panel)";
        rankEl.style.color = "var(--text-dim)";

        if (stats.rank === 1) {
            rankEl.style.background = "var(--gold)";
            rankEl.style.color = "black";
        } else if (stats.rank === 2) {
            rankEl.style.background = "var(--silver)";
            rankEl.style.color = "black";
        } else if (stats.rank === 3) {
            rankEl.style.background = "var(--bronze)";
            rankEl.style.color = "black";
        }

        // Winrate bar
        const totalGames = (stats.wins || 0) + (stats.losses || 0);
        const winPercent = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 50;

        document.getElementById("wr-percent").innerText = `${winPercent}%`;
        document.getElementById("bar-win").style.width = `${winPercent}%`;
        document.getElementById("bar-loss").style.width = `${100 - winPercent}%`;

        // Charts & extras
        try { renderChart(matches, username); } catch (e) { console.error("Chart", e); }
        try { renderBiometrics(stats); } catch (e) { console.error("Bio", e); }
        try { findNemesis(matches, username); } catch (e) { console.error("Nemesis", e); }
        try { renderTicker(matches, username); } catch (e) { console.error("Ticker", e); }

        // Match history
        const historyContainer = document.getElementById("matchHistoryList");
        historyContainer.innerHTML = "";

        if (matches.length === 0) {
            historyContainer.innerHTML =
                `<div style="color:#666; text-align:center; padding:1rem;">No matches played yet.</div>`;
        } else {
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

        // Skin
        const skinContainer = document.getElementById("skinContainer");
        skinImg.onload = () => {
            skinImg.classList.add("loaded");
            if (skinContainer) skinContainer.classList.remove("skeleton");
        };
        skinImg.onerror = () => {
            if (skinContainer) skinContainer.classList.remove("skeleton");
        };
        skinImg.src = `https://visage.surgeplay.com/full/512/${username}`;

        // Special tags
        const tagEl = document.getElementById("tagDisplay");
        tagEl.innerHTML = "";
        const lowerName = username.toLowerCase();

        if (SPECIAL_TAGS[lowerName]) {
            const tagData = SPECIAL_TAGS[lowerName];
            tagEl.innerHTML = `<span class="player-tag ${tagData.class}">${tagData.text}</span>`;
        }

        cleanSkeletons(idsToLoad);

    } catch (error) {
        console.error(error);
        cleanSkeletons(idsToLoad);
        alert("Error: " + error.message);
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


// =====================================================
// LEADERBOARD
// =====================================================

function switchLbCategory(category) {
    if (currentLbSort === category) return;

    currentLbSort = category;
    currentLbPage = 1;

    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`sort-${category}`).classList.add("active");

    loadLeaderboard(1);
}

async function loadLeaderboard(page) {
    currentLbPage = page;

    document.getElementById("lb-page-num").innerText = `PAGE ${page}`;
    const nextBtn = document.getElementById("lb-next");
    const prevBtn = document.getElementById("lb-prev");

    prevBtn.classList.toggle("disabled", page === 1);

    const tbody = document.getElementById("lb-body");
    tbody.innerHTML =
        `<tr><td colspan="6" style="text-align:center; color:#888; padding:2rem;">Accessing Database...</td></tr>`;

    try {
        const res = await fetch(`/api/leaderboard?page=${page}&sort=${currentLbSort}`);
        const data = await res.json();

        tbody.innerHTML = "";

        totalLbPages = data.totalPages || 1;
        nextBtn.classList.toggle("disabled", page >= totalLbPages);

        if (!data.players || data.players.length === 0) {
            tbody.innerHTML =
                `<tr><td colspan="6" style="text-align:center; color:#666;">No players found.</td></tr>`;
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
                <tr class="lb-row ${rankClass}"
                    style="opacity:0; animation: lbSlideIn 0.3s ease-out forwards; animation-delay:${delay}s;">
                    <td class="rank-num">${rankCounter}</td>

                    <td>
                        <div class="player-cell">
                            <img src="https://visage.surgeplay.com/face/64/${p.name}" class="lb-head">
                            <div>
                                <span style="font-weight:bold; font-size:1.1rem;">${p.name}</span>
                                ${specialTag}
                            </div>
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
        console.error(e);
        tbody.innerHTML =
            `<tr><td colspan="6" style="text-align:center; color:var(--loss);">Connection Failed: ${e.message}</td></tr>`;
    }
}

function changeLbPage(dir) {
    const newPage = currentLbPage + dir;
    if (newPage < 1 || newPage > totalLbPages) return;
    loadLeaderboard(newPage);
}


// =====================================================
// CHARTS & TICKER
// =====================================================

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

function renderChart(matches, username) {
    const ctx = document.getElementById("performanceChart").getContext("2d");
    if (!matches || matches.length === 0) {
        if (myChart) myChart.destroy();
        return;
    }

    const sorted = [...matches].reverse();
    let score = 0;

    const dataPoints = sorted.map(m => {
        score += m.winner_name.toLowerCase() === username.toLowerCase() ? 1 : -1;
        return score;
    });

    const labels = sorted.map((_, i) => `M${i + 1}`);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
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
            scales: {
                x: { display: false },
                y: { grid: { color: "rgba(255,255,255,0.05)" } }
            }
        }
    });
}

function renderBiometrics(stats) {
    const ctx = document.getElementById("radarChart").getContext("2d");
    const totalGames = (stats.wins || 0) + (stats.losses || 0);

    const survivability = Math.min(100, ((stats.wins || 0) / (totalGames || 1)) * 150);
    const lethality = Math.min(100, ((stats.kdr || 0) / 4) * 100);
    const consistency = Math.min(100, ((stats.best_streak || 0) / 20) * 100);
    const experience = Math.min(100, ((stats.wins || 0) / 100) * 100);
    const aggression = Math.min(100, lethality * 1.2 - survivability * 0.2);

    const dataValues = [
        survivability, lethality, consistency, experience, aggression
    ];

    const maxIndex = dataValues.indexOf(Math.max(...dataValues));
    const classes = ["GUARDIAN", "ASSASSIN", "MACHINE", "VETERAN", "BERSERKER"];

    const classEl = document.querySelector("#playerClass span");
    if (classEl) classEl.innerText = classes[maxIndex];

    if (myRadar) myRadar.destroy();

    myRadar = new Chart(ctx, {
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


// =====================================================
// NEMESIS DETECTION
// =====================================================

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

    document.getElementById("nemesisName").innerText =
        nemesis === "None" ? "UNDEFEATED" : nemesis;

    document.getElementById("nemesisKills").innerText = maxKills;

    const headUrl = nemesis === "None" ? "Steve" : nemesis;
    document.getElementById("nemesisHead").src =
        `https://visage.surgeplay.com/face/128/${headUrl}`;
}


// =====================================================
// RECENT SEARCHES
// =====================================================

document.getElementById("playerInput").addEventListener("keypress", e => {
    if (e.key === "Enter") fetchStats();
});

function setupAutocomplete() {
    const input = document.getElementById("playerInput");
    const box = document.getElementById("suggestions-box");
    let debounceTimer;

    input.addEventListener("input", function () {
        const val = this.value;
        clearTimeout(debounceTimer);

        if (val.length < 2) {
            box.style.display = "none";
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
                const names = await res.json();

                box.innerHTML = "";

                if (names.length > 0) {
                    box.style.display = "block";
                    names.forEach(n => {
                        const div = document.createElement("div");
                        div.className = "suggestion-item";
                        div.onmousedown = () => {
                            input.value = n.name;
                            box.style.display = "none";
                            fetchStats(); 
                        };
                        div.innerHTML = `
                            <img src="https://visage.surgeplay.com/face/32/${n.name}" class="sug-head">
                            <span>${n.name}</span>`;
                        box.appendChild(div);
                    });
                } else {
                    box.style.display = "none";
                }
            } catch (e) {
                console.error("Search error:", e);
            }
        }, 300);
    });

    document.addEventListener("click", e => {
        if (e.target !== input && !box.contains(e.target)) {
            box.style.display = "none";
        }
    });
}

function updateRecent() {
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    const container = document.getElementById("recent-container");
    const list = document.getElementById("recent-list");

    if (history.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    list.innerHTML = "";

    history.forEach(name => {
        const tag = document.createElement("div");
        tag.className = "recent-tag";

        tag.innerHTML = `
            <img src="https://visage.surgeplay.com/face/32/${name}" class="recent-head">
            ${name}`;

        tag.onclick = () => {
            document.getElementById("playerInput").value = name;
            fetchStats();
        };

        list.appendChild(tag);
    });
}

function saveToHistory(name) {
    let history = JSON.parse(localStorage.getItem("searchHistory")) || [];

    history = history.filter(n => n.toLowerCase() !== name.toLowerCase());
    history.unshift(name);

    if (history.length > 3) history.pop();

    localStorage.setItem("searchHistory", JSON.stringify(history));
    updateRecent();
}


// =====================================================
// MISC
// =====================================================

function copyIP() {
    navigator.clipboard.writeText("play.slashup.net");

    const toast = document.getElementById("toast-box");
    toast.innerHTML = `
        <i class="fas fa-check-circle toast-icon"></i>
        <div>
            <div style="font-weight:bold; color:white;">IP Copied!</div>
            <div style="font-size:0.8rem; color:#aaa;">See you on the battlefield.</div>
        </div>`;

    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3000);
}

async function checkServerStatus() {
    const ip = "194.164.96.27:25601"; 

    const statusText = document.getElementById("server-status-text");
    const statusDot = document.getElementById("status-dot");

    if(!statusText || !statusDot) return;

    try {
        const res = await fetch(`https://api.mcstatus.io/v2/status/java/${ip}`);
        const data = await res.json();

        if (data.online && data.players) {
            statusDot.classList.remove("offline");
            statusDot.classList.add("online");

            statusText.innerHTML =
                `<span class="status-dot online"></span> ${data.players.online}/${data.players.max} ONLINE`;
        } else {
            throw new Error("Offline");
        }
    } catch (e) {
        statusDot.classList.remove("online");
        statusDot.classList.add("offline");
        statusText.innerHTML = `<span class="status-dot offline"></span> OFFLINE`;
    }
}


// =====================================================
// TILT CARDS
// =====================================================

document.querySelectorAll(".tilt-card").forEach(card => {
    card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform =
            `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform =
            "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
    });
});


// =====================================================
// PARTICLE BACKGROUND
// =====================================================

const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;

        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 1 + 0.5;

        this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.y -= this.speedY;
        this.opacity -= 0.002;

        if (this.opacity <= 0) this.reset();
    }

    draw() {
        ctx.fillStyle = `rgba(255, 62, 62, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function initParticles() {
    for (let i = 0; i < 50; i++) particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animateParticles);
}


// =====================================================
// GLOBAL FEED
// =====================================================

async function loadGlobalFeed() {
    const feed = document.getElementById("global-feed");
    if (!feed) return;

    try {
        const res = await fetch("/api/global_matches");
        const data = await res.json();

        feed.innerHTML = "";

        data.forEach((match, index) => {
            const dateStr = new Date(match.match_time)
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            feed.innerHTML += `
                <div style="
                    min-width: 280px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    opacity: 0;
                    animation: lbSlideIn 0.5s forwards;
                    animation-delay: ${index * 0.1}s;
                ">
                    <div style="font-size:0.7rem; color:#666; font-family:'Share Tech Mono'">${dateStr}</div>

                    <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px;">

                        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                            <img src="https://visage.surgeplay.com/face/32/${match.winner_name}"
                                 style="border-radius:4px; flex-shrink:0;">
                            <span style="color:var(--win); font-weight:bold; font-size:0.9rem; white-space:nowrap;">
                                ${match.winner_name}
                            </span>
                        </div>

                        <span style="font-size:0.7rem; color:#444; font-family:'Share Tech Mono';">VS</span>

                        <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; overflow:hidden;">
                            <span style="color:#888; font-size:0.9rem; white-space:nowrap; text-align:right;">
                                ${match.loser_name}
                            </span>
                            <img src="https://visage.surgeplay.com/face/32/${match.loser_name}"
                                 style="border-radius:4px; filter:grayscale(100%); flex-shrink:0;">
                        </div>

                    </div>
                </div>`;
        });

    } catch (e) {
        console.error("Pulse error:", e);
    }
}


// =====================================================
// SCROLL REVEAL
// =====================================================

window.addEventListener("scroll", reveal);

function reveal() {
    const reveals = document.querySelectorAll(".reveal");

    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const revealTop = el.getBoundingClientRect().top;

        if (revealTop < windowHeight - 150) {
            el.classList.add("active");
        }
    });
}

reveal();



// --- AUTHENTICATION SYSTEM ---

function checkLogin() {
    const storedUser = localStorage.getItem('slashup_user');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        updateNavForLogin(user);
    }
}

function openLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.add('open');
    document.getElementById('link-code').focus();
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('open');
}

function toggleProfileMenu() {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

window.onclick = function(e) {
    if (!e.target.closest('.nav-profile')) {
        document.getElementById('profile-dropdown').classList.remove('show');
    }
    if (e.target.classList.contains('modal-overlay')) {
        closeLoginModal();
    }
}

async function submitLogin() {
    const code = document.getElementById('link-code').value.trim();
    const msg = document.getElementById('login-msg');
    
    if (code.length < 3) {
        msg.style.color = 'var(--loss)';
        msg.innerText = "Invalid Code Length";
        return;
    }

    msg.style.color = '#fff';
    msg.innerText = "Verifying...";

    try {
        const res = await fetch(`/api/auth?code=${code}`);
        const data = await res.json();

        if (data.success) {
            msg.style.color = 'var(--win)';
            msg.innerText = "SUCCESS! Redirecting...";
            
            const userObj = { name: data.name, uuid: data.uuid };
            localStorage.setItem('slashup_user', JSON.stringify(userObj));
            
            setTimeout(() => {
                closeLoginModal();
                updateNavForLogin(userObj);
            }, 1000);
        } else {
            msg.style.color = 'var(--loss)';
            msg.innerText = "Invalid or Expired Code";
        }
    } catch (e) {
        console.error(e);
        msg.style.color = 'var(--loss)';
        msg.innerText = "Connection Error";
    }
}

function updateNavForLogin(user) {
    document.getElementById('login-btn').style.display = 'none';
    const profile = document.getElementById('nav-profile');
    
    document.getElementById('nav-name').innerText = user.name;
    document.getElementById('nav-head').src = `https://visage.surgeplay.com/face/32/${user.uuid}`;
    
    profile.style.display = 'flex';
}

function logout() {
    localStorage.removeItem('slashup_user');
    location.reload();
}

function myProfile() {
    const user = JSON.parse(localStorage.getItem('slashup_user'));
    if(user) {
        document.getElementById('playerInput').value = user.name;
        switchTab('stats');
        fetchStats();
    }
}


// --- SETTINGS & CUSTOMIZATION ---

let cachedOriginalTheme = 'default';
let pendingTheme = 'default';

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
        
        const rank = (data.stats && data.stats.rank_name) ? data.stats.rank_name : "DEFAULT";
        const currentTheme = (data.stats && data.stats.site_theme) ? data.stats.site_theme : "default";

        cachedOriginalTheme = currentTheme;
        pendingTheme = currentTheme;

        updateLockState(rank);
        previewTheme(currentTheme, true); 

    } catch(e) {
        console.error("Customization fetch error:", e);
        showToast("Network Error", "Could not load profile data.", "error");
    }
}

function updateLockState(rank) {
    const isOwner = (rank === "OWNER" || rank === "ADMIN"); 
    
    const unlocks = {
        'default': true,
        'neon': isOwner || rank === "VIP" || rank === "MVP",
        'gold': isOwner || rank === "MVP",
        'matrix': isOwner
    };

    for (const [theme, unlocked] of Object.entries(unlocks)) {
        const card = document.getElementById(`card-${theme}`);
        if(card) {
            if(unlocked) {
                card.classList.remove('locked');
                const statusIcon = card.querySelector('.theme-status i');
                if(statusIcon) statusIcon.className = "fas fa-circle"; 
            } else {
                card.classList.add('locked');
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
        const allIcons = document.querySelectorAll('.theme-status i');
        allIcons.forEach(i => i.className = "fas fa-circle"); 
        
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
    const originalText = btn.innerText;
    btn.innerText = "SAVING...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uuid: user.uuid, theme: pendingTheme })
        });
        
        const data = await res.json();
        
        if(data.success) {
            showToast("System Updated", "Interface theme installed.", "success");
            localStorage.setItem('slashup_theme_cache', pendingTheme);
            cachedOriginalTheme = pendingTheme; 
        } else {
            showToast("Error", data.error || "Save failed", "error");
        }
    } catch(e) {
        showToast("Connection Lost", "Could not reach server.", "error");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

