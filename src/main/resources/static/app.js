let PLAYER_NAME = localStorage.getItem("player_name") || "Daniel";

const chips_element = document.getElementById("my_chips");
const player_input = document.getElementById("player_name");
const set_player_btn = document.getElementById("set_player");

// buttons
const bet_50_btn = document.getElementById("bet50");
const bet_100_btn = document.getElementById("bet100");
const reset_btn = document.getElementById("reset_btn");
const create_btn = document.getElementById("create_btn");

// Player List
const player_list_el = document.getElementById("player_list");


// setters
function setChips(text){
    chips_element.innerText = text;
}

function setPlayerName(name) {
    const cleaned = (name || "").trim();
    if (!cleaned) return;

    PLAYER_NAME = cleaned;
    localStorage.setItem("player_name", PLAYER_NAME);
    getChipCount();
}

function renderPlayers(players) {
    player_list_el.innerHTML = players
        .map(p => `<li>${p.name} — ${p.chips} chips</li>`)
        .join("");
}

// init input
player_input.value = PLAYER_NAME;

// listeners
set_player_btn.addEventListener("click", () => setPlayerName(player_input.value));
player_input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") setPlayerName(player_input.value);
})

bet_50_btn.addEventListener("click", () => bet(50));
bet_100_btn.addEventListener("click", () => bet(100));
reset_btn.addEventListener("click", () => reset());
create_btn.addEventListener("click", () => createPlayer(player_input.value));

// API calls
async function createPlayer(name, chips = 1000) {
    const resp = await fetch("/api/players", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, chips}),
    });

    if (!resp.ok) throw new Error(await resp.text());

    const created = await resp.json();
    await loadPlayers();
    await getChipCount();
    return created;
}

async function getChipCount() {
    try {
        const resp = await fetch(`/api/chips?name=${encodeURIComponent(PLAYER_NAME)}`);
        if (!resp.ok) throw new Error(await resp.text());
        setChips(await resp.text());
    } catch (err) {
        console.error(err);
        setChips("Server not responding");
    }
}

async function bet(amount) {
    try {
        const resp = await fetch(`/api/bet?name=${encodeURIComponent(PLAYER_NAME)}&amount=${amount}`);
        if (!resp.ok) throw new Error(await resp.text());
    } catch (err) {
        console.error(err);
        setChips("Bet failed");
    } finally {
        await getChipCount();
        await loadPlayers();
    }
}

async function reset() {
    try {
        const resp = await fetch(`/(api/reset?name=${encodeURIComponent(PLAYER_NAME)}`);
        if (!resp.ok) throw new Error(await resp.text());
    } catch (err) {
        console.error(err);
        setChips("Reset failed");
    } finally {
        await getChipCount();
        await loadPlayers();
    }
}

async function loadPlayers() {
    const resp = await fetch("/api/players");
    if (!resp.ok) throw new Error(await resp.text());
    renderPlayers(await resp.json());
}

loadPlayers();
getChipCount();
