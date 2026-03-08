console.log("loading .js");

const playerNameInput = document.getElementById("playerNameInput") as HTMLInputElement | null;

const createRoomCodeInput = document.getElementById("createRoomCodeInput") as HTMLInputElement | null;
const createRoomButton = document.getElementById("createRoomButton");
const joinRoomCodeInput = document.getElementById("joinRoomCodeInput") as HTMLInputElement | null;
const joinRoomButton = document.getElementById("joinRoomButton");

const statusMessage = document.getElementById("statusMessage");

console.log("playerNameInput", playerNameInput);
console.log("createRoomCodeInput", createRoomCodeInput);
console.log("createRoomButton", createRoomButton);

function setStatus(message: string): void {
    if (statusMessage) {
        statusMessage.innerText = message;
    }
}

function saveRoomContext(roomCode: string, playerName: string): void {
    sessionStorage.setItem("roomCode", roomCode);
    sessionStorage.setItem("playerName", playerName);
}

function goToRoom(roomCode: string, playerName: string): void {
    saveRoomContext(roomCode, playerName);
    window.location.href = "/room.html";
}

async function createRoom(roomCode: string, host: string): Promise<Room> {
    const response = await fetch("/room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ code: roomCode, host })
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
    console.log("create clicked");
    console.log("name value:", playerNameInput?.value);
    console.log("room value:", createRoomCodeInput?.value);

    try {
        const code = createRoomCodeInput?.value.trim() || "";
        const host = playerNameInput?.value.trim() || "";

        console.log({ code, host });

        if (!code || !host) {
            setStatus("Please enter room code and host name.");
            return;
        }

        const room = await createRoom(code, host);
        console.log("room created", room);

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

        await joinRoom(code, name);
        goToRoom(code, name);
    } catch (err) {
        console.error(err);
        setStatus("Could not join room.");
    }
});