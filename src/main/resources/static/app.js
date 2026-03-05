const PLAYER_NAME = "Daniel";
const chips_element = document.getElementById("my-chips");

function setChips(text){
    chips_element.innerText = text;
}

async function createPlayer(name) {
    const resp = await fetch("/api/players", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, chips}),
    });

    if (!resp.ok) throw new Error(await resp.text());
    return await resp.json();
}

async function getChipCount() {
    try {
        const resp = await fetch(`/api/chips?name=${encodeURIComponent(PLAYER_NAME)}`);
        setChips(await resp.text());
    } catch (err) {
        console.error(err);
        setChips("Server not responding");
    }
}

async function bet(amount) {
    try {
        await fetch(`/api/bet?name=${encodeURIComponent(PLAYER_NAME)}&amount=${amount}`);
    } catch (err) {
        console.error(err);
        setChips("Bet failed");
    } finally {
        await getChipCount();
    }
}

async function reset() {
    try {
        await fetch(`api/reset?name${name}`);
    } catch (err) {
        console.error(err);
        setChips("Reset failed");
    } finally {
        await getChipCount();
    }
}

getChipCount();