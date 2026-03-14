console.log("loading .js");

const playerNameInput = document.getElementById("playerNameInput") as HTMLInputElement | null;

//const createRoomCodeInput = document.getElementById("createRoomCodeInput") as HTMLInputElement | null;
const createRoomButton = document.getElementById("createRoomButton");
const joinRoomCodeInput = document.getElementById("joinRoomCodeInput") as HTMLInputElement | null;
const joinRoomButton = document.getElementById("joinRoomButton");

const statusMessage = document.getElementById("statusMessage");
const statusMessageSection = document.getElementById("statusMessageSection");

console.log("playerNameInput", playerNameInput);
console.log("createRoomButton", createRoomButton);

function setStatus(message: string): void {
    if (statusMessage) {
        const trimmed = message.trim();
        statusMessage.innerText = trimmed;
        statusMessage.style.display = trimmed ? "block" : "none";
        if (statusMessageSection) {
            statusMessageSection.style.display = trimmed ? "block" : "none";
        }
    }
}

function saveRoomContext(roomCode: string, playerName: string): void {
    localStorage.setItem("roomCode", roomCode);
    localStorage.setItem("playerName", playerName);
}

function goToRoom(roomCode: string, playerName: string): void {
    saveRoomContext(roomCode, playerName);
    window.location.href = "/room.html";
}

async function createRoom(host: string): Promise<Room> {
    const response = await fetch("/room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ host })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json() as Room;
}

async function joinRoom(roomCode: string, playerName: string): Promise<void> {
    const response = await fetch(`/room/${encodeURIComponent(roomCode)}/join`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code: roomCode,
            name: playerName ,
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
}

createRoomButton?.addEventListener("click", async () => {
    try {
        const host = playerNameInput?.value.trim() || "";

        if (!host) {
            setStatus("Please enter your name.");
            return;
        }

        const room = await createRoom(host);
        goToRoom(room.code, host);
    } catch (err) {
        console.error(err);
        setStatus("Could not create room.");
    }
});
joinRoomButton?.addEventListener("click", async () => {
    try {
        const code = joinRoomCodeInput?.value.trim() || "";
        const name = playerNameInput?.value.trim() || "";

        if (!code || !name) {
            setStatus("Please enter room code and player name.");
            return;
        }

        const normalizedCode = code.toUpperCase();
        if (joinRoomCodeInput) {
            joinRoomCodeInput.value = normalizedCode;
        }

        await joinRoom(normalizedCode, name);
        goToRoom(normalizedCode, name);
    } catch (err) {
        console.error(err);
        setStatus("Could not join room.");
    }
});
