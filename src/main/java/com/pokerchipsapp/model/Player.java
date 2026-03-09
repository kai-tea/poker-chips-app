package com.pokerchipsapp.model;

public class Player {
    private String name;
    private int chips;
    private boolean preCheckFold = false;
    private String lastAction;

    private int seatIndex;
    private boolean folded = false;
    private boolean actedThisRound = false;
    private int currentRoundBet = 0;

    public Player() {
    }

    public Player(String name, int chips, int seatIndex) {
        this.name = name;
        this.chips = chips;
        this.seatIndex = seatIndex;
    }

    public String getName() {
        return name;
    }

    public int getChips() {
        return chips;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setChips(int chips) {
        this.chips = chips;
    }

    public boolean isPreCheckFold() {
        return preCheckFold;
    }

    public void setPreCheckFold(boolean preCheckFold) {
        this.preCheckFold = preCheckFold;
    }

    public String getLastAction() {
        return lastAction;
    }

    public void setLastAction(String lastAction) {
        this.lastAction = lastAction;
    }

    public int getSeatIndex() {
        return seatIndex;
    }

    public void setSeatIndex(int seatIndex) {
        this.seatIndex = seatIndex;
    }

    public boolean isFolded() {
        return folded;
    }

    public void setFolded(boolean folded) {
        this.folded = folded;
    }

    public boolean isActedThisRound() {
        return actedThisRound;
    }

    public void setActedThisRound(boolean actedThisRound) {
        this.actedThisRound = actedThisRound;
    }

    public int getCurrentRoundBet() {
        return currentRoundBet;
    }

    public void setCurrentRoundBet(int currentRoundBet) {
        this.currentRoundBet = currentRoundBet;
    }
}