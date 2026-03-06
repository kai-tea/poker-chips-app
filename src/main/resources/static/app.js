console.log("app.js loading")

let PLAYER_NAME = localStorage.getItem("player_name") || "Daniel";

const chips_element         = document.getElementById("my_chips");
const player_input_element  = document.getElementById("player_name_input");
const delete_player_element   = document.getElementById("delete_player_input");

// buttons
const player_name_btn        = document.getElementById("player_name_btn");
const bet_50_btn            = document.getElementById("bet50");
const bet_100_btn           = document.getElementById("bet100");
const reset_btn             = document.getElementById("reset_btn");
const create_btn            = document.getElementById("create_btn");
const delete_players_btn    = document.getElementById("delete_players_btn");
const delete_player_btn     = document.getElementById("delete_player_btn");

// Player List
const player_list_el        = document.getElementById("player_list");

// init input
player_input_element.value = PLAYER_NAME;

// player name Listeners
player_name_btn.addEventListener("click", () => setPlayerName(player_input_element.value));
player_input_element.addEventListener(
    "keydown", (e) => { if (e.key === "Enter") setPlayerName(player_input_element.value);
})

// delete all Listener
delete_players_btn.addEventListener("click", () => deleteAllPlayers());

// delete player Listeners
delete_player_btn.addEventListener("click", () => deletePlayer(delete_player_element.value));
delete_player_element.addEventListener(
    "keydown", (e) => { if (e.key === "Enter") deletePlayer(delete_player_element.value);
    })

// Listeners
bet_50_btn.addEventListener("click", () => bet(50));
bet_100_btn.addEventListener("click", () => bet(100));
reset_btn.addEventListener("click", () => reset());
create_btn.addEventListener("click", () => createPlayer(player_input_element.value));

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

// API calls
async function createPlayer(name, chips = 1000) {
    const cleaned = (name || "").trim();
    if (!cleaned) return;

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
        const resp = await fetch("/api/reset");
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

async function deleteAllPlayers() {
    try {
        const resp = await fetch("/api/deleteAll");
        if (!resp.ok) throw new Error(await resp.text());
    } catch (err) {
        console.error(err);
        setChips("Delete Failed")
    } finally {
        //await getChipCount();
        await loadPlayers();
    }
}

async function deletePlayer(name) {
    const cleaned = (name || "").trim();
    if (!cleaned) return;

    try {
        const resp = await fetch(`/api/delete?name=${encodeURIComponent(name)}`);
        if (!resp.ok) throw new Error(await resp.text());
    } catch (err) {
        console.error(err);
        setChips("Delete Failed")
    } finally {
        //await getChipCount();
        await loadPlayers();
    }
}

loadPlayers();
getChipCount();
