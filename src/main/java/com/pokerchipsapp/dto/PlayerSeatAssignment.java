package com.pokerchipsapp.dto;

public class PlayerSeatAssignment {
    private String playerName;
    private int seatIndex;

    public PlayerSeatAssignment() {}

    public String getPlayerName() {
        return playerName;
    }

    public int getSeatIndex() {
        return seatIndex;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public void setSeatIndex(int seatIndex) {
        this.seatIndex = seatIndex;
    }
}
