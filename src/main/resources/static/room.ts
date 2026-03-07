const storedRoomCode = localStorage.getItem("roomCode");
const storedPlayerName = localStorage.getItem("playerName");

if (!storedRoomCode || !storedPlayerName) {
    window.location.href = "/";
    throw new Error("Missing room data");
}

const roomCode: string = storedRoomCode;
const playerName: string = storedPlayerName;
 if (!roomCode || !playerName) {
    window.location.href = "/";
    throw new Error("Missing room data");
}

type Player = {
    name: string;
    chips: number;
};

const roomTitleElement = document.getElementById("roomTitle");
const roomInfoElement = document.getElementById("roomInfo");
const chipCountElement = document.getElementById("chipCount");
const playerListElement = document.getElementById("playerList");
const bet50Button = document.getElementById("bet50Button");
const bet100Button = document.getElementById("bet100Button");
const resetChipsButton = document.getElementById("resetChipsButton");

if (!chipCountElement) {
    throw new Error("Element #chipCount not found");
}

function setChipCount(text: string): void {
    // @ts-ignore
    chipCountElement.innerText = text;
}

function renderPlayers(players: Player[]): void {
    if (!playerListElement) return;

    playerListElement.innerHTML = "";

    for (const player of players) {
        const listItem = document.createElement("li");
        listItem.innerText = `${player.name}: ${player.chips}`;

        if (player.name === playerName) {
            listItem.style.fontWeight = "bold";
        }

        playerListElement.appendChild(listItem);
    }
}

async function getChipCount(): Promise<void> {
    const response = await fetch(
        `/room/${encodeURIComponent(roomCode)}/chips/${encodeURIComponent(playerName)}`
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const chips = await response.text();
    setChipCount(`Your chips: ${chips}`);
}

async function getPlayers(): Promise<Player[]> {
    const response = await fetch(
        `/room/${encodeURIComponent(roomCode)}/players`
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json() as Player[];
}

async function refreshPlayers(): Promise<void> {
    const players = await getPlayers();
    renderPlayers(players);
}

async function bet(amount: number): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/bet`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: playerName,
            amount: amount
        })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error("bet failed response", text);
        throw new Error(text);
    }
}

async function resetChips(): Promise<void> {
    const response = await fetch(
        `/room/${encodeURIComponent(roomCode)}/reset`,
        { method: "POST" }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }
}

async function refreshRoom(): Promise<void> {
    await getChipCount();
    await refreshPlayers();
}

if (roomTitleElement) {
    roomTitleElement.innerText = `Room: ${roomCode}`;
}

if (roomInfoElement) {
    roomInfoElement.innerText = `Player: ${playerName}`;
}

bet50Button?.addEventListener("click", async () => {
    try {
        await bet(50);
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Bet failed");
    }
});

bet100Button?.addEventListener("click", async () => {
    try {
        await bet(100);
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Bet failed");
    }
});

resetChipsButton?.addEventListener("click", async () => {
    try {
        await resetChips();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Reset failed");
    }
});

void refreshRoom();

// to be replaced by web sockets
setInterval(() => {
    void refreshPlayers();
}, 2000);