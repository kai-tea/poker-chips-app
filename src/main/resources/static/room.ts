function loadRoomContext(): { roomCode: string; playerName: string } | null {
    const roomCode = sessionStorage.getItem("roomCode");
    const playerName = sessionStorage.getItem("playerName");

    if (!roomCode || !playerName) return null;

    return { roomCode, playerName };
}

const roomContext = loadRoomContext();

if (!roomContext) {
    window.location.href = "/";
    throw new Error("Missing room data");
}

const roomCode: string = roomContext.roomCode;
const playerName: string = roomContext.playerName;

type Player = {
    name: string;
    chips: number;
    currentRoundBet: number;
};

// @ts-ignore
type Room = {
    code: string;
    phase: string;
    pot: number;
    currentBet: number;
    currentPlayerIndex: number;
    players: Player[];
    waiting_players?: string[];
};

// game state elements
const phaseTextElement = document.getElementById("phaseText");
const potTextElement = document.getElementById("potText");
const currentBetTextElement = document.getElementById("currentBetText");
const currentPlayerTextElement = document.getElementById("currentPlayerText");

const roomTitleElement = document.getElementById("roomTitle");
const roomInfoElement = document.getElementById("roomInfo");
const chipCountElement = document.getElementById("chipCount");
const playerListElement = document.getElementById("playerList");

const bet50Button = document.getElementById("bet50Button");
const bet100Button = document.getElementById("bet100Button");
const resetChipsButton = document.getElementById("resetChipsButton");

const startRoundButton = document.getElementById("startRoundButton");
const checkButton = document.getElementById("checkButton");
const callButton = document.getElementById("callButton");
const foldButton = document.getElementById("foldButton");
const raiseButton = document.getElementById("raiseButton");
const raiseAmountInput = document.getElementById("raiseAmountInput") as HTMLInputElement | null;

if (!chipCountElement) {
    throw new Error("Element #chipCount not found");
}

const chipCountEl: HTMLElement = chipCountElement;

// game state functions
async function getRoom(): Promise<Room> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}`);

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json() as Room;
}
function renderGameState(room: Room): void {
    if (phaseTextElement) {
        phaseTextElement.innerText = `Phase: ${room.phase}`;
    }

    if (potTextElement) {
        potTextElement.innerText = `Pot: ${room.pot}`;
    }

    if (currentBetTextElement) {
        currentBetTextElement.innerText = `Current Bet: ${room.currentBet}`;
    }

    if (currentPlayerTextElement) {
        const currentPlayer = room.players[room.currentPlayerIndex];
        currentPlayerTextElement.innerText = `Current Player: ${currentPlayer ? currentPlayer.name : "-"}`;
    }
}
async function refreshGameState(): Promise<void> {
    const room = await getRoom();
    renderGameState(room);
}
function setChipCount(text: string): void {
    chipCountEl.innerText = text;
}
function renderPlayers(players: Player[]): void {
    if (!playerListElement) return;

    playerListElement.innerHTML = "";

    for (const player of players) {
        const listItem = document.createElement("li");
        //listItem.innerText = `${player.name}: ${player.chips} chips (bet: ${player.currentRoundBet})`;
        listItem.innerText = `${player.name} - chips: ${player.chips}, round bet: ${player.currentRoundBet}`;

        if (player.name.toLowerCase() === playerName.toLowerCase()) {
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
async function startRound(): Promise<void> {
    const response = await fetch(
        `/room/${encodeURIComponent(roomCode)}/start`,
        { method: "POST" }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function check(): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/check`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: playerName
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function call(): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/call`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: playerName
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function fold(): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/fold`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: playerName
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function raise(): Promise<void> {
    const raiseAmount = Number(raiseAmountInput?.value || "0");

    if (!raiseAmount || raiseAmount <= 0) {
        throw new Error("Raise amount must be > 0");
    }

    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/raise`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: playerName,
            raiseAmount: raiseAmount
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function refreshPlayers(): Promise<void> {
    const players = await getPlayers();
    renderPlayers(players);
}
async function refreshRoom(): Promise<void> {
    await getChipCount();
    await refreshPlayers();
    await refreshGameState();
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
startRoundButton?.addEventListener("click", async () => {
    try {
        await startRound();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Start round failed");
    }
});
checkButton?.addEventListener("click", async () => {
    try {
        await check();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Check failed");
    }
});
callButton?.addEventListener("click", async () => {
    try {
        await call();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Call failed");
    }
});
foldButton?.addEventListener("click", async () => {
    try {
        await fold();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Fold failed");
    }
});
raiseButton?.addEventListener("click", async () => {
    try {
        await raise();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Raise failed");
    }
});

void refreshRoom();

// to be replaced by websockets
setInterval(() => {
    void refreshRoom();
}, 2000);