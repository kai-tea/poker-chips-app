function loadRoomContext(): { roomCode: string; playerName: string } | null {
    const roomCode = sessionStorage.getItem("roomCode");
    const playerName = sessionStorage.getItem("playerName");

    if (!roomCode || !playerName) return null;

    return { roomCode, playerName };
}

let previousVisibleCommunityCards = 0;

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
    folded: boolean;
    seatIndex: number;
    preCheckFold: boolean;
    lastAction?: string | null;
};

// @ts-ignore
type Room = {
    code: string;
    host: string;
    phase: string;
    pot: number;
    currentBet: number;
    currentPlayerIndex: number;
    players: Player[];
    waitingPlayers?: string[];
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
const waitingPlayersListElement = document.getElementById("waitingPlayersList");

const bet50Button = document.getElementById("bet50Button") as HTMLButtonElement | null;
const bet100Button = document.getElementById("bet100Button") as HTMLButtonElement | null;
const resetChipsButton = document.getElementById("resetChipsButton") as HTMLButtonElement | null;

const startRoundButton = document.getElementById("startRoundButton") as HTMLButtonElement | null;
const checkButton = document.getElementById("checkButton") as HTMLButtonElement | null;
const callButton = document.getElementById("callButton") as HTMLButtonElement | null;
const foldButton = document.getElementById("foldButton") as HTMLButtonElement | null;
const checkFoldButton = document.getElementById("checkFoldButton") as HTMLButtonElement | null;
const raiseButton = document.getElementById("raiseButton") as HTMLButtonElement | null;
const raiseAmountInput = document.getElementById("raiseAmountInput") as HTMLInputElement | null;
const preCheckFoldButton = document.getElementById("preCheckFoldButton") as HTMLButtonElement | null;
const betRaiseSlider = document.getElementById("betRaiseSlider") as HTMLInputElement | null;
const betRaiseValue = document.getElementById("betRaiseValue");
const betRaiseActionButton = document.getElementById("betRaiseActionButton") as HTMLButtonElement | null;

const tablePotDisplayElement = document.getElementById("tablePotDisplay");

const showdownSection = document.getElementById("showdownSection");
const winnerSelect = document.getElementById("winnerSelect") as HTMLSelectElement | null;
const resolveShowdownButton = document.getElementById("resolveShowdownButton") as HTMLButtonElement | null;

const communityCardsElement = document.getElementById("communityCards");

//host
const hostChipsSection = document.getElementById("hostChipsSection");
const hostPlayerSelect = document.getElementById("hostPlayerSelect") as HTMLSelectElement | null;
const hostChipsInput = document.getElementById("hostChipsInput") as HTMLInputElement | null;
const setPlayerChipsButton = document.getElementById("setPlayerChipsButton") as HTMLButtonElement | null;

if (!chipCountElement) {
    throw new Error("Element #chipCount not found");
}

const chipCountEl: HTMLElement = chipCountElement;

// game state functions
function renderShowdownControls(room: Room): void {
    if (!showdownSection || !winnerSelect || !resolveShowdownButton) return;

    const isHost = room.host.toLowerCase() === playerName.toLowerCase();
    const isShowdown = room.phase === "SHOWDOWN";

    if (!isShowdown || !isHost) {
        showdownSection.style.display = "none";
        return;
    }

    showdownSection.style.display = "block";
    winnerSelect.innerHTML = "";

    for (const player of room.players) {
        if (player.folded) continue;

        const option = document.createElement("option");
        option.value = player.name;
        option.innerText = player.name;
        winnerSelect.appendChild(option);
    }
}
function renderWaitingPlayers(waitingPlayers: string[] = []): void {
    if (!waitingPlayersListElement) return;

    waitingPlayersListElement.innerHTML = "";

    if (waitingPlayers.length === 0) {
        const listItem = document.createElement("li");
        listItem.innerText = "No waiting players";
        waitingPlayersListElement.appendChild(listItem);
        return;
    }

    for (const name of waitingPlayers) {
        const listItem = document.createElement("li");
        listItem.innerText = name;
        waitingPlayersListElement.appendChild(listItem);
    }
}
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

    if (tablePotDisplayElement) {
        tablePotDisplayElement.innerText = `Pot: ${room.pot}`;
    }

    renderCommunityCards(room.phase);

}
async function refreshGameState(): Promise<void> {
    const room = await getRoom();
    renderGameState(room);
}
function setChipCount(text: string): void {
    chipCountEl.innerText = text;
}
function renderPlayers(players: Player[], currentPlayerIndex?: number): void {
    if (!playerListElement) return;

    playerListElement.innerHTML = "";

    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const listItem = document.createElement("li");
        listItem.className = "player-row";

        const nameSpan = document.createElement("span");
        nameSpan.className = "player-name";
        nameSpan.innerText = player.name;

        const chipsSpan = document.createElement("span");
        chipsSpan.className = "player-chips";
        chipsSpan.innerText = `${player.chips} chips`;

        const betSpan = document.createElement("span");
        betSpan.className = "player-bet";
        betSpan.innerText = `bet: ${player.currentRoundBet}`;

        if (player.name.toLowerCase() === playerName.toLowerCase()) {
            nameSpan.classList.add("is-me");
        }

        listItem.appendChild(nameSpan);
        listItem.appendChild(chipsSpan);
        listItem.appendChild(betSpan);

        if (player.folded) {
            const foldedSpan = document.createElement("span");
            foldedSpan.className = "player-status";
            foldedSpan.innerText = "folded";
            listItem.appendChild(foldedSpan);
        }

        if (i === currentPlayerIndex) {
            const turnSpan = document.createElement("span");
            turnSpan.className = "player-status turn-status";
            turnSpan.innerText = "turn";
            listItem.appendChild(turnSpan);
        }

        if (player.lastAction) {
            const actionSpan = document.createElement("span");
            actionSpan.className = "player-status";
            actionSpan.innerText = player.lastAction.toLowerCase();
            listItem.appendChild(actionSpan);
        }

        playerListElement.appendChild(listItem);
    }
}
function renderTableSeats(room: Room): void {
    const seatElements = [
        document.getElementById("seat0"),
        document.getElementById("seat1"),
        document.getElementById("seat2"),
        document.getElementById("seat3"),
        document.getElementById("seat4"),
        document.getElementById("seat5"),
        document.getElementById("seat6"),
        document.getElementById("seat7"),
        document.getElementById("seat8"),
        document.getElementById("seat9"),
    ];

    const activePlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = room.players[room.currentPlayerIndex];

    const centerX = 50;
    const centerY = 50;
    const radiusX = 40;
    const radiusY = 34;

    // reset
    for (const seatEl of seatElements) {
        if (!seatEl || !seatEl.parentElement) continue;
        seatEl.parentElement.style.display = "none";
        seatEl.parentElement.classList.remove("seat-active", "seat-inactive", "seat-folded");
        seatEl.innerHTML = "";
    }

    const count = activePlayers.length;

    for (let i = 0; i < count; i++) {
        const player = activePlayers[i];
        const seatEl = seatElements[player.seatIndex];

        if (!seatEl || !seatEl.parentElement) continue;

        const angle = (-Math.PI / 2) + (2 * Math.PI * i) / count;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);

        const seatContainer = seatEl.parentElement;
        seatContainer.style.display = "block";
        seatContainer.style.left = `${x}%`;
        seatContainer.style.top = `${y}%`;

        const isCurrentTurn =
            !!currentPlayer &&
            currentPlayer.name.toLowerCase() === player.name.toLowerCase();

        if (isCurrentTurn) {
            seatContainer.classList.remove("seat-inactive");
            seatContainer.classList.add("seat-active");
        } else {
            seatContainer.classList.remove("seat-active");
            seatContainer.classList.add("seat-inactive");
        }

        const nameDiv = document.createElement("div");
        nameDiv.className = "seat-player-name";
        nameDiv.innerText = player.name;

        const chipsDiv = document.createElement("div");
        chipsDiv.className = "seat-player-chips";
        chipsDiv.innerText = `${player.chips} chips`;

        seatEl.innerHTML = "";
        seatEl.appendChild(nameDiv);
        seatEl.appendChild(chipsDiv);

        if (player.currentRoundBet > 0) {
            const betDiv = document.createElement("div");
            betDiv.className = "seat-player-bet";
            betDiv.innerText = `bet ${player.currentRoundBet}`;
            seatEl.appendChild(betDiv);
        }

        if (player.folded) {
            const statusDiv = document.createElement("div");
            statusDiv.className = "seat-player-status";
            statusDiv.innerText = "folded";
            seatEl.appendChild(statusDiv);
            seatContainer.classList.add("seat-folded");
        } else if (isCurrentTurn) {
            const statusDiv = document.createElement("div");
            statusDiv.className = "seat-player-status turn-status";
            statusDiv.innerText = "turn";
            seatEl.appendChild(statusDiv);
        }

        if (player.name.toLowerCase() === playerName.toLowerCase()) {
            nameDiv.style.color = "var(--accent)";
        }

        if (player.lastAction) {
            const actionDiv = document.createElement("div");
            actionDiv.className = "seat-player-status";
            actionDiv.innerText = player.lastAction.toLowerCase();
            seatEl.appendChild(actionDiv);
        }
    }
}
function renderCommunityCards(phase: string): void {
    if (!communityCardsElement) return;

    const cards = Array.from(communityCardsElement.children) as HTMLElement[];

    const faces = ["", "", "", "", ""];

    let visibleCount = 0;

    switch (phase) {
        case "FLOP":
            visibleCount = 3;
            break;
        case "TURN":
            visibleCount = 4;
            break;
        case "RIVER":
        case "SHOWDOWN":
        case "ROUND_OVER":
            visibleCount = 5;
            break;
        default:
            visibleCount = 0;
    }

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        card.classList.remove("card-flip", "showdown-card");
        void card.offsetWidth;

        if (i < visibleCount) {
            card.className = "community-card";
            card.innerText = faces[i];

            if (i >= previousVisibleCommunityCards) {
                card.classList.add("card-flip");
            }

            if (phase === "SHOWDOWN") {
                card.classList.add("showdown-card");
            }
        } else {
            card.className = "community-card hidden-card";
            card.innerText = "";
        }
    }

    previousVisibleCommunityCards = visibleCount;
}
function renderHostChipControls(room: Room): void {
    if (!hostChipsSection || !hostPlayerSelect) return;

    const isHost = room.host.toLowerCase() === playerName.toLowerCase();

    if (!isHost) {
        hostChipsSection.style.display = "none";
        return;
    }

    hostChipsSection.style.display = "block";
    hostPlayerSelect.innerHTML = "";

    for (const player of room.players) {
        const option = document.createElement("option");
        option.value = player.name;
        option.innerText = `${player.name} (${player.chips})`;
        hostPlayerSelect.appendChild(option);
    }
}
function renderPreCheckFold(room: Room): void {
    if (!preCheckFoldButton) return;

    const me = room.players.find(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );

    if (!me) {
        preCheckFoldButton.disabled = true;
        //preCheckFoldButton.innerText = "Check/Fold: OFF";
        return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const isMyTurn =
        !!currentPlayer &&
        currentPlayer.name.toLowerCase() === playerName.toLowerCase();

    const inActiveRound =
        room.phase !== "WAITING_FOR_PLAYERS" &&
        room.phase !== "SHOWDOWN" &&
        room.phase !== "ROUND_OVER";

    preCheckFoldButton.disabled = !inActiveRound || me.folded || isMyTurn;
    //preCheckFoldButton.innerText = me.preCheckFold ? "Check/Fold: ON" : "Check/Fold: OFF";

    if (me.preCheckFold) {
        preCheckFoldButton.classList.add("active");
    } else {
        preCheckFoldButton.classList.remove("active");
    }
}
function getSliderAmount(): number {
    return Number(betRaiseSlider?.value || "0");
}
function updateBetRaiseControls(room: Room): void {
    if (!betRaiseSlider || !betRaiseActionButton || !betRaiseValue) return;

    const me = room.players.find(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );

    if (!me) {
        betRaiseSlider.disabled = true;
        betRaiseActionButton.disabled = true;
        betRaiseActionButton.innerText = "Bet / Raise";
        betRaiseValue.innerText = "0";
        return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    const isMyTurn =
        !!currentPlayer &&
        currentPlayer.name.toLowerCase() === playerName.toLowerCase();

    const inActiveRound =
        room.phase !== "WAITING_FOR_PLAYERS" &&
        room.phase !== "SHOWDOWN" &&
        room.phase !== "ROUND_OVER";

    const canAct = inActiveRound && !me.folded && isMyTurn;

    betRaiseSlider.disabled = !canAct;
    betRaiseActionButton.disabled = !canAct;

    betRaiseSlider.min = "1";
    betRaiseSlider.max = String(Math.max(me.chips, 1));

    if (Number(betRaiseSlider.value) > me.chips) {
        betRaiseSlider.value = String(Math.max(me.chips, 1));
    }

    const amount = Number(betRaiseSlider.value);
    betRaiseValue.innerText = String(amount);

    if (room.currentBet === 0) {
        betRaiseActionButton.innerText = `Bet ${amount}`;
    } else {
        betRaiseActionButton.innerText = `Raise ${amount}`;
    }
}
function updateAvailableActions(room: Room): void {
    const me = room.players.find(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );

    const currentPlayer = room.players[room.currentPlayerIndex];

    const isMyTurn =
        !!me &&
        !!currentPlayer &&
        currentPlayer.name.toLowerCase() === playerName.toLowerCase();

    const inActiveRound =
        room.phase !== "WAITING_FOR_PLAYERS" &&
        room.phase !== "ROUND_OVER" &&
        room.phase !== "SHOWDOWN";

    const canStartRound =
        room.phase === "WAITING_FOR_PLAYERS" || room.phase === "ROUND_OVER";

    const isHost =
        !!room.host &&
        room.host.toLowerCase() === playerName.toLowerCase();

    const isShowdown = room.phase === "SHOWDOWN";

    if (startRoundButton) {
        startRoundButton.disabled = !canStartRound;
    }

    if (isShowdown) {
        bet50Button && (bet50Button.disabled = true);
        bet100Button && (bet100Button.disabled = true);
        checkButton && (checkButton.disabled = true);
        callButton && (callButton.disabled = true);
        foldButton && (foldButton.disabled = true);
        raiseButton && (raiseButton.disabled = true);
        checkFoldButton && (checkFoldButton.disabled = true);

        if (resolveShowdownButton) {
            resolveShowdownButton.disabled = !isHost;
        }

        return;
    }

    if (resolveShowdownButton) {
        resolveShowdownButton.disabled = true;
    }

    if (!me || !inActiveRound || me.folded || !isMyTurn) {
        bet50Button && (bet50Button.disabled = true);
        bet100Button && (bet100Button.disabled = true);
        checkButton && (checkButton.disabled = true);
        callButton && (callButton.disabled = true);
        foldButton && (foldButton.disabled = true);
        raiseButton && (raiseButton.disabled = true);
        checkFoldButton && (checkFoldButton.disabled = true);
        return;
    }

    const mustCall = me.currentRoundBet < room.currentBet;
    const canCheck = me.currentRoundBet === room.currentBet;
    const canBet = room.currentBet === 0;
    const canCall = mustCall;
    const canRaise = room.currentBet > 0;

    bet50Button && (bet50Button.disabled = !canBet);
    bet100Button && (bet100Button.disabled = !canBet);

    checkButton && (checkButton.disabled = !canCheck);
    callButton && (callButton.disabled = !canCall);
    foldButton && (foldButton.disabled = false);
    raiseButton && (raiseButton.disabled = !canRaise);
    checkFoldButton && (checkFoldButton.disabled = false);

    if (checkFoldButton) {
        checkFoldButton.innerText = canCheck ? "Check / Fold" : "Check / Fold";
    }
}


async function setPreCheckFold(enabled: boolean): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/pre-check-fold`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: playerName,
            enabled: enabled
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function setPlayerChipsAsHost(): Promise<void> {
    if (!hostPlayerSelect || !hostChipsInput) {
        throw new Error("Host chip controls not found");
    }

    const selectedPlayer = hostPlayerSelect.value;
    const chips = Number(hostChipsInput.value);

    if (Number.isNaN(chips) || chips < 0) {
        throw new Error("Chips must be >= 0");
    }

    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/set-player-chips`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            hostName: playerName,
            playerName: selectedPlayer,
            chips: chips
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
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
async function raise(raiseAmount: number): Promise<void> {
    if (raiseAmount <= 0) {
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
async function checkFold(): Promise<void> {
    const room = await getRoom();

    const me = room.players.find(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );

    if (!me) {
        throw new Error("Player not found in active players");
    }

    if (me.currentRoundBet === room.currentBet) {
        await check();
    } else {
        await fold();
    }
}

async function refreshRoom(): Promise<void> {
    const room = await getRoom();

    renderGameState(room);
    renderPlayers(room.players, room.currentPlayerIndex);
    renderWaitingPlayers(room.waitingPlayers ?? []);
    renderTableSeats(room);
    updateAvailableActions(room);
    updateBetRaiseControls(room);
    renderShowdownControls(room);
    renderPreCheckFold(room);
    renderHostChipControls(room);


    const isActivePlayer = room.players.some(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );
    const isWaitingPlayer = (room.waitingPlayers ?? []).some(
        name => name.toLowerCase() === playerName.toLowerCase()
    );


    if (isActivePlayer) {
        await getChipCount();
    } else if (isWaitingPlayer) {
        setChipCount("You are waiting for the next round");
    } else {
        setChipCount("You are not seated in this room");
    }
}
async function resolveShowdown(): Promise<void> {
    if (!winnerSelect) {
        throw new Error("Winner select not found");
    }

    const winnerName = winnerSelect.value;

    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/resolve-showdown`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            hostName: playerName,
            winnerName: winnerName
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
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
resolveShowdownButton?.addEventListener("click", async () => {
    try {
        await resolveShowdown();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Resolve showdown failed");
    }
});
checkFoldButton?.addEventListener("click", async () => {
    try {
        await checkFold();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Check / Fold failed");
    }
});
setPlayerChipsButton?.addEventListener("click", async () => {
    try {
        await setPlayerChipsAsHost();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Set chips failed");
    }
});
preCheckFoldButton?.addEventListener("click", async () => {
    try {
        const room = await getRoom();
        const me = room.players.find(
            player => player.name.toLowerCase() === playerName.toLowerCase()
        );

        if (!me) {
            throw new Error("Player not found");
        }

        await setPreCheckFold(!me.preCheckFold);
        await refreshRoom();
    } catch (err) {
        console.error(err);
    }
});
betRaiseSlider?.addEventListener("input", async () => {
    try {
        const room = await getRoom();
        updateBetRaiseControls(room);
    } catch (err) {
        console.error(err);
    }
});
betRaiseActionButton?.addEventListener("click", async () => {
    try {
        const room = await getRoom();
        const amount = getSliderAmount();

        if (room.currentBet === 0) {
            await bet(amount);
        } else {
            await raise(amount);
        }

        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Bet / Raise failed");
    }
});

void refreshRoom();

// to be replaced by websockets
setInterval(() => {
    void refreshRoom();
}, 2000);