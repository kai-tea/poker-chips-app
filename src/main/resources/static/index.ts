type Room = {
    code: string;
};

const playerNameInput = document.getElementById("playerNameInput") as HTMLInputElement | null;

const createRoomCodeInput = document.getElementById("createRoomCodeInput") as HTMLInputElement | null;
const createRoomButton = document.getElementById("createRoomButton");
const joinRoomCodeInput = document.getElementById("joinRoomCodeInput") as HTMLInputElement | null;
const joinRoomButton = document.getElementById("joinRoomButton");

const statusMessage = document.getElementById("statusMessage");

function setStatus(message: string): void {
    if (statusMessage) {
        statusMessage.innerText = message;
    }
}

function goToRoom(roomCode: string, playerName: string): void {
    localStorage.setItem("roomCode", roomCode);
    localStorage.setItem("playerName", playerName);
    window.location.href = "/room.html";
}

async function createRoom(code: string, host: string): Promise<Room> {
    const response = await fetch("/room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ code, host })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json() as Room;
}

async function joinRoom(code: string, name: string): Promise<void> {
    const response = await fetch(
        `/room/${encodeURIComponent(code)}/players/${encodeURIComponent(name)}`,
        { method: "POST" }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }
}

createRoomButton?.addEventListener("click", async () => {
    try {
        const code = createRoomCodeInput?.value.trim() || "";
        const host = playerNameInput?.value.trim() || "";

        if (!code || !host) {
            setStatus("Please enter room code and host name.");
            return;
        }

        const room = await createRoom(code, host);
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