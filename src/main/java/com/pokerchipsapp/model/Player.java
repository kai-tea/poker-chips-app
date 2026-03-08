package com.pokerchipsapp.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Objects;

public class Player {
    private String name;
    private int chips;
    private boolean preCheckFold = false;

    // game flow
    private int seatIndex;
    private boolean folded = false;
    private boolean actedThisRound = false;
    private int currentRoundBet = 0;

    public Player() {}

    public Player(String name, int chips, int seatIndex) {
        this.name = name;
        this.chips = chips;
        this.seatIndex = seatIndex;
    }

    public boolean isPreCheckFold() {
        return preCheckFold;
    }
    public void setPreCheckFold(boolean preCheckFold) {
        this.preCheckFold = preCheckFold;
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

    public int getSeatIndex() {
        return seatIndex;
    }
    public void setSeatIndex(int seatIndex) {
        this.seatIndex = seatIndex;
    }

    public String getName() { return name; }
    public int getChips() { return chips; }

    public void setName(String name) { this.name = name; }
    public void setChips(int chips) { this.chips = chips; }
}
