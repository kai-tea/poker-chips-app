package com.pokerchipsapp.model;

public class RoomSettings {
    private int startingChips;
    private int bigBlind;
    private int smallBlind;

    public RoomSettings() {}

    public RoomSettings(int startingChips, int bigBlind, int smallBlind) {
        this.startingChips = startingChips;
        this.bigBlind = bigBlind;
        this.smallBlind = smallBlind;
    }

    public int getStartingChips() {
        return startingChips;
    }

    public void setStartingChips(int startingChips) {
        this.startingChips = startingChips;
    }

    public int getBigBlind() {
        return bigBlind;
    }

    public void setBigBlind(int bigBlind) {
        this.bigBlind = bigBlind;
    }

    public int getSmallBlind() {
        return smallBlind;
    }

    public void setSmallBlind(int smallBlind) {
        this.smallBlind = smallBlind;
    }
}
