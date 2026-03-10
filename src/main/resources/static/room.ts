function loadRoomContext(): { roomCode: string; playerName: string } | null {
    const roomCode = localStorage.getItem("roomCode");
    const playerName = localStorage.getItem("playerName");

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
    dealerIndex: number;
    players: Player[];
    waitingPlayers?: string[];
    settings: {
        startingChips: number;
        bigBlind: number;
        smallBlind: number;
    };
};

// game state elements
const roomTitleElement = document.getElementById("roomTitle");
const roomInfoElement = document.getElementById("roomInfo");
const playerListElement = document.getElementById("playerList");
const waitingPlayersListElement = document.getElementById("waitingPlayersList");
const resetChipsButton = document.getElementById("resetChipsButton") as HTMLButtonElement | null;
const startRoundButton = document.getElementById("startRoundButton") as HTMLButtonElement | null;
const checkButton = document.getElementById("checkButton") as HTMLButtonElement | null;
const callButton = document.getElementById("callButton") as HTMLButtonElement | null;
const foldButton = document.getElementById("foldButton") as HTMLButtonElement | null;
const checkFoldButton = document.getElementById("checkFoldButton") as HTMLButtonElement | null;
const raiseButton = document.getElementById("raiseButton") as HTMLButtonElement | null;
const preCheckFoldButton = document.getElementById("preCheckFoldButton") as HTMLButtonElement | null;
const betRaiseSlider = document.getElementById("betRaiseSlider") as HTMLInputElement | null;
const betRaiseValue = document.getElementById("betRaiseValue");
const betRaiseActionButton = document.getElementById("betRaiseActionButton") as HTMLButtonElement | null;
const tablePotDisplayElement = document.getElementById("tablePotDisplay");
const showdownSection = document.getElementById("showdownSection");
const winnerSelect = document.getElementById("winnerSelect") as HTMLSelectElement | null;
const resolveShowdownButton = document.getElementById("resolveShowdownButton") as HTMLButtonElement | null;
const communityCardsElement = document.getElementById("communityCards");
const decrementBetButton = document.getElementById("decrementBetButton") as HTMLButtonElement | null;
const incrementBetButton = document.getElementById("incrementBetButton") as HTMLButtonElement | null;
const betRaiseNumberInput = document.getElementById("betRaiseNumberInput") as HTMLInputElement | null;

//host
const hostChipsSection = document.getElementById("hostChipsSection");
const hostPlayerSelect = document.getElementById("hostPlayerSelect") as HTMLSelectElement | null;
const hostChipsInput = document.getElementById("hostChipsInput") as HTMLInputElement | null;
const setPlayerChipsButton = document.getElementById("setPlayerChipsButton") as HTMLButtonElement | null;
const hostKickSection = document.getElementById("hostKickSection");
const kickPlayerSelect = document.getElementById("kickPlayerSelect") as HTMLSelectElement | null;
const kickPlayerButton = document.getElementById("kickPlayerButton") as HTMLButtonElement | null;
const hostSeatingSection = document.getElementById("hostSeatingSection");
const hostSeatingList = document.getElementById("hostSeatingList");
const saveSeatingButton = document.getElementById("saveSeatingButton") as HTMLButtonElement | null;
const seatingEditHint = document.getElementById("seatingEditHint");
const tableControlsOverlay = document.querySelector(".table-controls-overlay") as HTMLElement | null;

let draggingPlayerName: string | null = null;

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
    if (tablePotDisplayElement) {
        tablePotDisplayElement.innerText = `Pot: ${room.pot}`;
    }

    renderCommunityCards(room.phase);
}
async function refreshGameState(): Promise<void> {
    const room = await getRoom();
    renderGameState(room);
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
        chipsSpan.innerText = `${player.chips}`;

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
    const activePlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = room.players[room.currentPlayerIndex];
    const canEditSeating =
        room.host.toLowerCase() === playerName.toLowerCase() &&
        (room.phase === "WAITING_FOR_PLAYERS" || room.phase === "ROUND_OVER");

    const centerX = 50;
    const centerY = 50;
    const radiusX = 40;
    const radiusY = 34;

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

    const betElements = [
        document.getElementById("bet0"),
        document.getElementById("bet1"),
        document.getElementById("bet2"),
        document.getElementById("bet3"),
        document.getElementById("bet4"),
        document.getElementById("bet5"),
        document.getElementById("bet6"),
        document.getElementById("bet7"),
        document.getElementById("bet8"),
        document.getElementById("bet9"),
    ];

    const checkElements = [
        document.getElementById("check0"),
        document.getElementById("check1"),
        document.getElementById("check2"),
        document.getElementById("check3"),
        document.getElementById("check4"),
        document.getElementById("check5"),
        document.getElementById("check6"),
        document.getElementById("check7"),
        document.getElementById("check8"),
        document.getElementById("check9"),
    ];

    // reset seats
    for (const seatEl of seatElements) {
        if (!seatEl || !seatEl.parentElement) continue;
        seatEl.parentElement.style.display = "none";
        seatEl.parentElement.classList.remove("seat-active", "seat-inactive", "seat-folded");
        seatEl.innerHTML = "";
    }

    // reset bets
    for (const betEl of betElements) {
        if (!betEl) continue;
        betEl.style.display = "none";
        betEl.textContent = "";
    }

    // reset checks
    for (const checkEl of checkElements) {
        if (!checkEl) continue;
        checkEl.style.display = "none";
        checkEl.textContent = "";
    }

    const meIndex = activePlayers.findIndex(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );
    const rotatedPlayers = meIndex >= 0
        ? [...activePlayers.slice(meIndex), ...activePlayers.slice(0, meIndex)]
        : activePlayers;

    const count = rotatedPlayers.length;

    for (let i = 0; i < count; i++) {
        const player = rotatedPlayers[i];
        const seatEl = seatElements[i];
        const checkEl = checkElements[i];

        if (!seatEl || !seatEl.parentElement) continue;

        const angle = (Math.PI / 2) + (2 * Math.PI * i) / count;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);

        if (player.currentRoundBet > 0) {
            const betEl = betElements[i];
            if (betEl) {
                const betX = centerX + (radiusX * 0.72) * Math.cos(angle);
                const betY = centerY + (radiusY * 0.72) * Math.sin(angle);

                betEl.style.display = "block";
                betEl.style.left = `${betX}%`;
                betEl.style.top = `${betY}%`;
                betEl.textContent = `${player.currentRoundBet}`;
            }
        } else if (player.lastAction?.toLowerCase() === "check") {
            if (checkEl) {
                const checkX = centerX + (radiusX * 0.80) * Math.cos(angle);
                const checkY = centerY + (radiusY * 0.80) * Math.sin(angle);

                checkEl.style.display = "block";
                checkEl.style.left = `${checkX}%`;
                checkEl.style.top = `${checkY}%`;
                checkEl.textContent = "Check";
            }
        }

        const seatContainer = seatEl.parentElement;
        seatContainer.style.display = "block";
        seatContainer.style.left = `${x}%`;
        seatContainer.style.top = `${y}%`;
        seatContainer.dataset.playerName = player.name;
        seatContainer.dataset.seatIndex = String(player.seatIndex);

        seatContainer.draggable = canEditSeating;
        seatContainer.classList.toggle("seat-drop-target", false);
        seatContainer.ondragstart = canEditSeating
            ? (event) => {
                draggingPlayerName = player.name;
                event.dataTransfer?.setData("text/plain", player.name);
                event.dataTransfer?.setDragImage(seatContainer, 0, 0);
            }
            : null;
        seatContainer.ondragover = canEditSeating
            ? (event) => {
                event.preventDefault();
            }
            : null;
        seatContainer.ondragenter = canEditSeating
            ? () => {
                seatContainer.classList.add("seat-drop-target");
            }
            : null;
        seatContainer.ondragleave = canEditSeating
            ? () => {
                seatContainer.classList.remove("seat-drop-target");
            }
            : null;
        seatContainer.ondrop = canEditSeating
            ? async (event) => {
                event.preventDefault();
                seatContainer.classList.remove("seat-drop-target");
                const sourceName = draggingPlayerName || event.dataTransfer?.getData("text/plain");
                const targetName = player.name;
                if (!sourceName || sourceName.toLowerCase() === targetName.toLowerCase()) {
                    draggingPlayerName = null;
                    return;
                }
                try {
                    const assignments = room.players.map(p => ({
                        playerName: p.name,
                        seatIndex: p.seatIndex
                    }));
                    const source = assignments.find(a => a.playerName.toLowerCase() === sourceName.toLowerCase());
                    const target = assignments.find(a => a.playerName.toLowerCase() === targetName.toLowerCase());
                    if (!source || !target) {
                        draggingPlayerName = null;
                        return;
                    }
                    const temp = source.seatIndex;
                    source.seatIndex = target.seatIndex;
                    target.seatIndex = temp;
                    await setSeatingAsHost(assignments);
                } catch (err) {
                    console.error(err);
                    console.error("Set seating failed");
                } finally {
                    draggingPlayerName = null;
                }
            }
            : null;

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
        chipsDiv.innerText = `${player.chips}`;

        seatEl.innerHTML = "";
        seatEl.appendChild(nameDiv);
        seatEl.appendChild(chipsDiv);

        if (player.folded) {
            seatContainer.classList.add("seat-folded");
        }

        if (player.name.toLowerCase() === playerName.toLowerCase()) {
            nameDiv.style.color = "var(--accent)";
        }

        const isDealer = player.seatIndex === room.dealerIndex;

        if (isDealer) {
            const dealerDiv = document.createElement("div");
            dealerDiv.className = "seat-dealer-button";
            dealerDiv.innerText = "D";
            seatEl.appendChild(dealerDiv);
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
        if (resetChipsButton) {
            resetChipsButton.style.display = "none";
            resetChipsButton.disabled = true;
        }
        return;
    }

    hostChipsSection.style.display = "block";
    if (resetChipsButton) {
        resetChipsButton.style.display = "inline-block";
        resetChipsButton.disabled = false;
    }
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
        preCheckFoldButton.style.display = "none";
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

    const isBehindBet = me.currentRoundBet < room.currentBet;
    const canPreFold = inActiveRound && !me.folded && !isMyTurn && isBehindBet;

    if (!canPreFold) {
        preCheckFoldButton.style.display = "none";
        return;
    }

    preCheckFoldButton.style.display = "inline-flex";

    if (me.preCheckFold) {
        preCheckFoldButton.classList.add("active");
    } else {
        preCheckFoldButton.classList.remove("active");
    }
}
function updateBetRaiseControls(room: Room): void {
    if (!betRaiseSlider || !betRaiseActionButton) return;

    const bigBlind = room.settings.bigBlind;
    const smallBlind = room.settings.smallBlind;
    const increment = smallBlind;

    const me = room.players.find(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );

    if (!me) {
        betRaiseSlider.disabled = true;
        betRaiseActionButton.disabled = true;
        betRaiseActionButton.innerText = "Bet / Raise";
        betRaiseActionButton.style.display = "none";
        if (betRaiseValue) {
            betRaiseValue.innerText = "0";
        }

        betRaiseSlider.min = "0";
        betRaiseSlider.max = String(bigBlind * 100);
        betRaiseSlider.step = String(increment);

        if (betRaiseNumberInput) {
            betRaiseNumberInput.value = "0";
            betRaiseNumberInput.min = "0";
            betRaiseNumberInput.max = String(bigBlind * 100);
            betRaiseNumberInput.step = String(increment);
        }

        updateSliderFill();
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

    const canUseSlider = inActiveRound && !me.folded;
    betRaiseSlider.disabled = !canUseSlider;

    const hundredBbCap = bigBlind * 100;
    const baseMax = Math.max(0, Math.min(me.currentRoundBet + me.chips, hundredBbCap));
    const maxMatchableRoundBet = room.players
        .filter(p => !p.folded && p.name.toLowerCase() !== me.name.toLowerCase())
        .reduce((max, p) => Math.max(max, p.currentRoundBet + p.chips), -1);
    const effectiveCap =
        maxMatchableRoundBet >= 0
            ? Math.min(baseMax, maxMatchableRoundBet)
            : baseMax;
    const sliderMax = Math.max(0, effectiveCap);
    const minRaiseTarget = room.currentBet > 0
        ? Math.max(room.currentBet + smallBlind, me.currentRoundBet + 1)
        : 0;
    const sliderMin = Math.min(minRaiseTarget, sliderMax);

    betRaiseSlider.min = String(sliderMin);
    betRaiseSlider.max = String(sliderMax);
    betRaiseSlider.step = String(increment);

    let currentValue = Number(betRaiseSlider.value);
    if (Number.isNaN(currentValue)) currentValue = 0;

    currentValue = snapToStep(currentValue, sliderMin, sliderMax, increment);

    if (currentValue > sliderMax) currentValue = sliderMax;
    if (currentValue < sliderMin) currentValue = sliderMin;

    betRaiseSlider.value = String(currentValue);
    if (betRaiseValue) {
        betRaiseValue.innerText = String(currentValue);
    }

    if (betRaiseNumberInput) {
        betRaiseNumberInput.min = String(sliderMin);
        betRaiseNumberInput.max = String(sliderMax);
        betRaiseNumberInput.step = String(increment);
        betRaiseNumberInput.value = String(currentValue);
    }

    const canBet =
        inActiveRound &&
        !me.folded &&
        isMyTurn &&
        room.currentBet === 0 &&
        currentValue > 0 &&
        currentValue <= me.chips;

    const canRaise =
        inActiveRound &&
        !me.folded &&
        isMyTurn &&
        room.currentBet > 0 &&
        currentValue > room.currentBet &&
        currentValue > me.currentRoundBet &&
        currentValue <= (me.currentRoundBet + me.chips);

    betRaiseActionButton.disabled = !(canBet || canRaise);
    betRaiseActionButton.innerText =
        room.currentBet === 0 ? "Bet" : "Raise";
    betRaiseActionButton.style.display = (inActiveRound && !me.folded && isMyTurn) ? "inline-flex" : "none";

    updateSliderFill();
}
function updateAvailableActions(room: Room): void {
    const setActionVisibility = (button: HTMLButtonElement | null, visible: boolean): void => {
        if (!button) return;
        button.style.display = visible ? "inline-flex" : "none";
        button.disabled = !visible;
    };

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
        startRoundButton.style.display = canStartRound ? "inline-block" : "none";
    }

    if (isShowdown) {
        setActionVisibility(checkButton, false);
        setActionVisibility(callButton, false);
        setActionVisibility(foldButton, false);
        setActionVisibility(raiseButton, false);
        setActionVisibility(checkFoldButton, false);

        if (resolveShowdownButton) {
            resolveShowdownButton.disabled = !isHost;
        }

        return;
    }

    if (resolveShowdownButton) {
        resolveShowdownButton.disabled = true;
    }

    const canAct = !!me && inActiveRound && !me.folded && isMyTurn;

    if (!canAct) {
        setActionVisibility(checkButton, false);
        setActionVisibility(callButton, false);
        setActionVisibility(foldButton, false);
        setActionVisibility(raiseButton, false);
        setActionVisibility(checkFoldButton, false);
        return;
    }

    const mustCall = me.currentRoundBet < room.currentBet;
    const canCheck = me.currentRoundBet === room.currentBet;
    const canBet = room.currentBet === 0;
    const canCall = mustCall;
    const canRaise = room.currentBet > 0;
    const canFold = true;
    const currentValue = getSliderAmount();
    const canBetRaiseValue = room.currentBet === 0
        ? currentValue > 0 && currentValue <= me.chips
        : currentValue > room.currentBet &&
            currentValue > me.currentRoundBet &&
            currentValue <= (me.currentRoundBet + me.chips);
    setActionVisibility(checkButton, canCheck);
    setActionVisibility(callButton, canCall);
    setActionVisibility(foldButton, canFold);
    setActionVisibility(raiseButton, canRaise);
    setActionVisibility(checkFoldButton, true);

    if (checkFoldButton) {
        checkFoldButton.innerText = canCheck ? "Check / Fold" : "Check / Fold";
    }
}
function getSliderAmount(): number {
    return Number(betRaiseSlider?.value || "0");
}
function updateSliderFill(): void {
    if (!betRaiseSlider) return;

    const min = Number(betRaiseSlider.min);
    const max = Number(betRaiseSlider.max);
    const value = Number(betRaiseSlider.value);

    const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;
    betRaiseSlider.style.setProperty("--fill-size", `${percentage}%`);
}
function renderSliderValue(): void {
    if (!betRaiseSlider) return;

    const currentValue = Number(betRaiseSlider.value);

    if (betRaiseValue) {
        betRaiseValue.innerText = betRaiseSlider.value;
    }

    if (betRaiseNumberInput) {
        betRaiseNumberInput.value = betRaiseSlider.value;
    }

    updateSliderFill();
}
function incrementSlider(): void {
    if (!betRaiseSlider) return;

    const step = Number(betRaiseSlider.step || "1");
    const max = Number(betRaiseSlider.max);
    const current = Number(betRaiseSlider.value);

    betRaiseSlider.value = String(Math.min(current + step, max));
    renderSliderValue();
}
function decrementSlider(): void {
    if (!betRaiseSlider) return;

    const step = Number(betRaiseSlider.step || "1");
    const min = Number(betRaiseSlider.min);
    const current = Number(betRaiseSlider.value);

    betRaiseSlider.value = String(Math.max(current - step, min));
    renderSliderValue();
}
function syncSliderFromNumberInput(): void {
    if (!betRaiseSlider || !betRaiseNumberInput) return;

    const min = Number(betRaiseSlider.min);
    const max = Number(betRaiseSlider.max);
    const step = Number(betRaiseSlider.step || "1");

    let value = Number(betRaiseNumberInput.value);
    if (Number.isNaN(value)) value = min;

    value = snapToStep(value, min, max, step);

    betRaiseSlider.value = String(value);
    betRaiseNumberInput.value = String(value);
}
function snapToStep(value: number, min: number, max: number, step: number): number {
    const clamped = Math.max(min, Math.min(max, value));
    return Math.round(clamped / step) * step;
}
function setBetRaiseAmountToBb(multiplier: number): void {
    getRoom()
        .then(room => {
            setBetRaiseAmount(room.settings.bigBlind * multiplier);
        })
        .catch(err => console.error(err));
}
function setBetRaiseAmount(value: number): void {
    if (!betRaiseSlider) return;

    const min = Number(betRaiseSlider.min);
    const max = Number(betRaiseSlider.max);
    const step = Number(betRaiseSlider.step || "1");

    let next = Math.max(min, Math.min(max, value));

    if (step > 0) {
        next = min + Math.round((next - min) / step) * step;
        next = Math.max(min, Math.min(max, next));
    }

    betRaiseSlider.value = String(next);
    renderSliderValue();
}
function renderHostKickControls(room: Room): void {
    if (!hostKickSection || !kickPlayerSelect) return;

    const isHost = room.host.toLowerCase() === playerName.toLowerCase();

    if (!isHost) {
        hostKickSection.style.display = "none";
        return;
    }

    hostKickSection.style.display = "block";
    kickPlayerSelect.innerHTML = "";

    const kickablePlayers = [
        ...room.players
            .filter(player => player.name.toLowerCase() !== playerName.toLowerCase())
            .map(player => player.name),
        ...(room.waitingPlayers ?? []).filter(name => name.toLowerCase() !== playerName.toLowerCase())
    ];

    if (kickablePlayers.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.innerText = "No players to kick";
        kickPlayerSelect.appendChild(option);
        return;
    }

    for (const name of kickablePlayers) {
        const option = document.createElement("option");
        option.value = name;
        option.innerText = name;
        kickPlayerSelect.appendChild(option);
    }
}
function renderHostSeatingControls(room: Room): void {
    if (!hostSeatingSection || !hostSeatingList || !saveSeatingButton) return;

    const isHost = room.host.toLowerCase() === playerName.toLowerCase();

    if (!isHost) {
        hostSeatingSection.style.display = "none";
        if (seatingEditHint) seatingEditHint.style.display = "none";
        return;
    }

    hostSeatingSection.style.display = "block";
    if (seatingEditHint) {
        const canEdit = room.phase === "WAITING_FOR_PLAYERS" || room.phase === "ROUND_OVER";
        seatingEditHint.style.display = canEdit ? "block" : "none";
    }
    hostSeatingList.innerHTML = "";

    const playerCount = room.players.length;
    saveSeatingButton.disabled = playerCount === 0;

    for (const player of room.players) {
        const row = document.createElement("div");
        row.className = "host-seating-row";

        const label = document.createElement("label");
        label.innerText = player.name;

        const select = document.createElement("select");
        select.dataset.playerName = player.name;

        for (let i = 0; i < playerCount; i++) {
            const option = document.createElement("option");
            option.value = String(i);
            option.innerText = `Seat ${i + 1}`;
            select.appendChild(option);
        }

        select.value = String(player.seatIndex);

        row.appendChild(label);
        row.appendChild(select);
        hostSeatingList.appendChild(row);
    }
}
function renderRoom(room: Room): void {
    renderGameState(room);
    renderPlayers(room.players, room.currentPlayerIndex);
    renderWaitingPlayers(room.waitingPlayers ?? []);
    renderTableSeats(room);
    updateBetRaiseControls(room);
    updateAvailableActions(room);
    renderShowdownControls(room);
    renderPreCheckFold(room);
    renderHostChipControls(room);
    renderHostKickControls(room);
    renderHostSeatingControls(room);
    updateMobileActionBarMode();
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
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                hostName: playerName
            })
        }
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
            raiseToAmount: raiseAmount
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
    try {
        const room = await getRoom();

        const me = room.players.find(
            player => player.name.toLowerCase() === playerName.toLowerCase()
        );

        renderGameState(room);
        renderPlayers(room.players, room.currentPlayerIndex);
        renderWaitingPlayers(room.waitingPlayers ?? []);
        renderTableSeats(room);
        updateBetRaiseControls(room);
        updateAvailableActions(room);
        renderShowdownControls(room);
        renderPreCheckFold(room);
        renderHostChipControls(room);
        renderHostSeatingControls(room);
        updateMobileActionBarMode();
    } catch (err) {
        console.error("refreshRoom failed", err);
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
async function kickPlayerAsHost(): Promise<void> {
    if (!kickPlayerSelect) {
        throw new Error("Kick player controls not found");
    }

    const selectedPlayer = kickPlayerSelect.value;

    if (!selectedPlayer) {
        throw new Error("No player selected");
    }

    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/kick`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            hostName: playerName,
            playerName: selectedPlayer
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}
async function setSeatingAsHost(assignments: { playerName: string; seatIndex: number }[]): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/set-seating`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            hostName: playerName,
            assignments: assignments
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

resetChipsButton?.addEventListener("click", async () => {
    try {
        await resetChips();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Reset failed");
    }
});
startRoundButton?.addEventListener("click", async () => {
    try {
        await startRound();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Start round failed");
    }
});
checkButton?.addEventListener("click", async () => {
    try {
        await check();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Check failed");
    }
});
callButton?.addEventListener("click", async () => {
    try {
        await call();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Call failed");
    }
});
foldButton?.addEventListener("click", async () => {
    try {
        await fold();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Fold failed");
    }
});
resolveShowdownButton?.addEventListener("click", async () => {
    try {
        await resolveShowdown();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Resolve showdown failed");
    }
});
checkFoldButton?.addEventListener("click", async () => {
    try {
        await checkFold();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Check / Fold failed");
    }
});
setPlayerChipsButton?.addEventListener("click", async () => {
    try {
        await setPlayerChipsAsHost();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Set chips failed");
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
        console.error("Bet / Raise failed");
    }
});
incrementBetButton?.addEventListener("click", async () => {
    try {
        incrementSlider();
        const room = await getRoom();
        updateBetRaiseControls(room);
    } catch (err) {
        console.error(err);
    }
});
decrementBetButton?.addEventListener("click", async () => {
    try {
        decrementSlider();
        const room = await getRoom();
        updateBetRaiseControls(room);
    } catch (err) {
        console.error(err);
    }
});
betRaiseNumberInput?.addEventListener("input", () => {
    syncSliderFromNumberInput();
    renderSliderValue();
});
betRaiseSlider?.addEventListener("input", () => {
    renderSliderValue();
});
betRaiseSlider?.addEventListener("change", () => {
    if (!betRaiseSlider) return;

    const min = Number(betRaiseSlider.min);
    const max = Number(betRaiseSlider.max);
    const step = Number(betRaiseSlider.step || "1");

    const value = snapToStep(Number(betRaiseSlider.value), min, max, step);
    betRaiseSlider.value = String(value);
    renderSliderValue();
});
void refreshRoom();
kickPlayerButton?.addEventListener("click", async () => {
    try {
        await kickPlayerAsHost();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Kick player failed");
    }
});
saveSeatingButton?.addEventListener("click", async () => {
    if (!hostSeatingList) {
        console.error("Seating list not found");
        return;
    }

    const selects = Array.from(hostSeatingList.querySelectorAll("select"));
    const assignments: { playerName: string; seatIndex: number }[] = [];
    const usedSeats = new Set<number>();

    for (const select of selects) {
        const player = select.dataset.playerName;
        if (!player) continue;
        const seatIndex = Number(select.value);
        assignments.push({ playerName: player, seatIndex });
        usedSeats.add(seatIndex);
    }

    if (assignments.length !== selects.length || usedSeats.size !== assignments.length) {
        console.error("Invalid seating selection");
        return;
    }

    try {
        await setSeatingAsHost(assignments);
        await refreshRoom();
    } catch (err) {
        console.error(err);
        console.error("Set seating failed");
    }
});

// refreshes in intervals of 2s - to be replaced by websockets
//setInterval(() => { void refreshRoom(); }, 2000);

declare const SockJS: any;
declare const Stomp: any;

let stompClient: any = null;

function connectRoomSocket(): void {
    const socket = new SockJS("/ws");
    stompClient = Stomp.over(socket);

    stompClient.debug = () => {};

    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/room/${roomCode}`, (message: any) => {
            const room = JSON.parse(message.body) as Room;
            renderRoom(room);
        });
    }, (error: any) => {
        console.error("WebSocket connection failed", error);
    });
}

connectRoomSocket();
void refreshRoom();

function getMobileReleaseTarget(): HTMLElement | null {
    const candidates = [hostChipsSection, hostKickSection, hostSeatingSection];
    for (const el of candidates) {
        if (!el) continue;
        const style = window.getComputedStyle(el);
        if (style.display !== "none") return el;
    }
    return document.querySelector(".content-grid") as HTMLElement | null;
}

function updateMobileActionBarMode(): void {
    if (!tableControlsOverlay) return;

    const isMobile = window.innerWidth <= 800;
    if (!isMobile) {
        tableControlsOverlay.classList.remove("mobile-actions-fixed");
        document.body.style.paddingBottom = "";
        return;
    }

    const releaseTarget = getMobileReleaseTarget();
    let shouldFix = true;

    if (releaseTarget) {
        const targetTop = releaseTarget.getBoundingClientRect().top;
        shouldFix = targetTop > window.innerHeight * 0.85;
    }

    tableControlsOverlay.classList.toggle("mobile-actions-fixed", shouldFix);

    if (shouldFix) {
        const height = tableControlsOverlay.getBoundingClientRect().height;
        document.body.style.paddingBottom = `${Math.ceil(height + 12)}px`;
    } else {
        document.body.style.paddingBottom = "";
    }
}

window.addEventListener("scroll", () => {
    updateMobileActionBarMode();
}, { passive: true });
window.addEventListener("resize", updateMobileActionBarMode);
