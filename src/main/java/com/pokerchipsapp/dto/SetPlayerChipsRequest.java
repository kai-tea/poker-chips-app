package com.pokerchipsapp.dto;

public class SetPlayerChipsRequest {
    private String hostName;
    private String playerName;
    private int chips;

    public SetPlayerChipsRequest() {}

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public int getChips() {
        return chips;
    }

    public void setChips(int chips) {
        this.chips = chips;
    }
}