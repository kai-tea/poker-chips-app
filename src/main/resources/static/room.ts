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
const preset0Button = document.getElementById("preset0Button") as HTMLButtonElement | null;
const preset1BbButton = document.getElementById("preset1BbButton") as HTMLButtonElement | null;
const preset2BbButton = document.getElementById("preset2BbButton") as HTMLButtonElement | null;
const preset5BbButton = document.getElementById("preset5BbButton") as HTMLButtonElement | null;
const preset10BbButton = document.getElementById("preset10BbButton") as HTMLButtonElement | null;
const preset20BbButton = document.getElementById("preset20BbButton") as HTMLButtonElement | null;
const preset30BbButton = document.getElementById("preset30BbButton") as HTMLButtonElement | null;
const preset40BbButton = document.getElementById("preset40BbButton") as HTMLButtonElement | null;
const preset50BbButton = document.getElementById("preset50BbButton") as HTMLButtonElement | null;
const preset100BbButton = document.getElementById("preset100BbButton") as HTMLButtonElement | null;
const allInButton = document.getElementById("allInButton") as HTMLButtonElement | null;

//host
const hostChipsSection = document.getElementById("hostChipsSection");
const hostPlayerSelect = document.getElementById("hostPlayerSelect") as HTMLSelectElement | null;
const hostChipsInput = document.getElementById("hostChipsInput") as HTMLInputElement | null;
const setPlayerChipsButton = document.getElementById("setPlayerChipsButton") as HTMLButtonElement | null;
const hostKickSection = document.getElementById("hostKickSection");
const kickPlayerSelect = document.getElementById("kickPlayerSelect") as HTMLSelectElement | null;
const kickPlayerButton = document.getElementById("kickPlayerButton") as HTMLButtonElement | null;



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
    const activePlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = room.players[room.currentPlayerIndex];

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

    const count = activePlayers.length;

    for (let i = 0; i < count; i++) {
        const player = activePlayers[i];
        const seatEl = seatElements[player.seatIndex];
        const checkEl = checkElements[player.seatIndex];

        if (!seatEl || !seatEl.parentElement) continue;

        const angle = (-Math.PI / 2) + (2 * Math.PI * i) / count;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);

        if (player.currentRoundBet > 0) {
            const betEl = betElements[player.seatIndex];
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

        if (player.currentRoundBet > 0) {
            const betEl = betElements[player.seatIndex];
            if (betEl) {
                const betX = centerX + (radiusX * 0.72) * Math.cos(angle);
                const betY = centerY + (radiusY * 0.72) * Math.sin(angle);

                betEl.style.display = "block";
                betEl.style.left = `${betX}%`;
                betEl.style.top = `${betY}%`;
                betEl.textContent = `${player.currentRoundBet}`;
            }
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

        if (player.lastAction && player.lastAction.toLowerCase() !== "check") {
            const actionDiv = document.createElement("div");
            actionDiv.className = "seat-player-status";
            actionDiv.innerText = player.lastAction.toLowerCase();
            seatEl.appendChild(actionDiv);
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
function updateBetRaiseControls(room: Room): void {
    if (!betRaiseSlider || !betRaiseActionButton || !betRaiseValue) return;

    const bigBlind = room.settings.bigBlind;
    const smallBlind = room.settings.smallBlind;
    const increment = smallBlind;

    const me = room.players.find(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );

    const sliderMaxForLabels = me
        ? Math.max(0, Math.min(me.chips, bigBlind * 100))
        : bigBlind * 100;

    updatePresetLabels(bigBlind, sliderMaxForLabels);

    if (!me) {
        betRaiseSlider.disabled = true;
        betRaiseActionButton.disabled = true;
        betRaiseActionButton.innerText = "Bet / Raise";
        betRaiseValue.innerText = "0";

        betRaiseSlider.min = "0";
        betRaiseSlider.max = String(sliderMaxForLabels);
        betRaiseSlider.step = String(increment);

        if (betRaiseNumberInput) {
            betRaiseNumberInput.value = "0";
            betRaiseNumberInput.min = "0";
            betRaiseNumberInput.max = String(sliderMaxForLabels);
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
    const sliderMax = Math.max(0, Math.min(me.chips, hundredBbCap));
    const sliderMin = 0;

    betRaiseSlider.min = String(sliderMin);
    betRaiseSlider.max = String(sliderMax);
    betRaiseSlider.step = String(increment);

    let currentValue = Number(betRaiseSlider.value);
    if (Number.isNaN(currentValue)) currentValue = 0;

    currentValue = snapToStep(currentValue, sliderMin, sliderMax, increment);

    if (currentValue > sliderMax) currentValue = sliderMax;
    if (currentValue < sliderMin) currentValue = sliderMin;

    betRaiseSlider.value = String(currentValue);
    betRaiseValue.innerText = String(currentValue);

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
        currentValue > 0 &&
        currentValue <= me.chips;

    betRaiseActionButton.disabled = !(canBet || canRaise);
    betRaiseActionButton.innerText =
        room.currentBet === 0 ? `Bet ${currentValue}` : `Raise ${currentValue}`;

    updateSliderFill();
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
function updatePresetLabels(bigBlind: number, sliderMax: number): void {
    if (preset0Button) preset0Button.innerText = "0";
    if (preset1BbButton) preset1BbButton.innerText = String(1 * bigBlind);
    if (preset2BbButton) preset2BbButton.innerText = String(2 * bigBlind);
    if (preset5BbButton) preset5BbButton.innerText = String(5 * bigBlind);
    if (preset10BbButton) preset10BbButton.innerText = String(10 * bigBlind);
    if (preset20BbButton) preset20BbButton.innerText = String(20 * bigBlind);
    if (preset30BbButton) preset30BbButton.innerText = String(30 * bigBlind);
    if (preset40BbButton) preset40BbButton.innerText = String(40 * bigBlind);
    if (preset50BbButton) preset50BbButton.innerText = String(50 * bigBlind);
    if (preset100BbButton) preset100BbButton.innerText = String(100 * bigBlind);
    if (allInButton) allInButton.innerText = `All-in (${sliderMax})`;
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
function renderRoom(room: Room): void {
    renderGameState(room);
    renderPlayers(room.players, room.currentPlayerIndex);
    renderWaitingPlayers(room.waitingPlayers ?? []);
    renderTableSeats(room);
    updateAvailableActions(room);
    updateBetRaiseControls(room);
    renderShowdownControls(room);
    renderPreCheckFold(room);
    renderHostChipControls(room);
    renderHostKickControls(room);

    const isActivePlayer = room.players.some(
        player => player.name.toLowerCase() === playerName.toLowerCase()
    );
    const isWaitingPlayer = (room.waitingPlayers ?? []).some(
        name => name.toLowerCase() === playerName.toLowerCase()
    );

    if (isActivePlayer) {
        void getChipCount();
    } else if (isWaitingPlayer) {
        setChipCount("You are waiting for the next round");
    } else {
        setChipCount("You are not seated in this room");
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
    try {
        const room = await getRoom();

        const me = room.players.find(
            player => player.name.toLowerCase() === playerName.toLowerCase()
        );

        const sliderMaxForLabels = me
            ? Math.max(0, Math.min(me.chips, room.settings.bigBlind * 100))
            : room.settings.bigBlind * 100;

        updatePresetLabels(room.settings.bigBlind, sliderMaxForLabels);

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
preset0Button?.addEventListener("click", () => {
    setBetRaiseAmount(0);
});
preset1BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 1);
});
preset2BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 2);
});
preset5BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 5);
});
preset10BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 10);
});
preset20BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 20);
});
preset30BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 30);
});
preset40BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 40);
});
preset50BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 50);
});
preset100BbButton?.addEventListener("click", async () => {
    const room = await getRoom();
    setBetRaiseAmount(room.settings.bigBlind * 100);
});
allInButton?.addEventListener("click", () => {
    if (!betRaiseSlider) return;
    setBetRaiseAmount(Number(betRaiseSlider.max));
});void refreshRoom();
kickPlayerButton?.addEventListener("click", async () => {
    try {
        await kickPlayerAsHost();
        await refreshRoom();
    } catch (err) {
        console.error(err);
        setChipCount("Kick player failed");
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
getRoom()
    .then(room => {
        const me = room.players.find(
            player => player.name.toLowerCase() === playerName.toLowerCase()
        );

        const sliderMaxForLabels = me
            ? Math.max(0, Math.min(me.chips, room.settings.bigBlind * 100))
            : room.settings.bigBlind * 100;

        updatePresetLabels(room.settings.bigBlind, sliderMaxForLabels);
    })
    .catch(console.error);
void refreshRoom();
