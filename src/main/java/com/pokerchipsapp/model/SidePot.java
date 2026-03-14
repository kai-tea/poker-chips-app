package com.pokerchipsapp.model;

import java.util.ArrayList;
import java.util.List;

public class SidePot {
    private int amount;
    private List<String> eligiblePlayers = new ArrayList<>();

    public SidePot() {}

    public SidePot(int amount, List<String> eligiblePlayers) {
        this.amount = amount;
        this.eligiblePlayers = eligiblePlayers != null ? eligiblePlayers : new ArrayList<>();
    }

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }

    public List<String> getEligiblePlayers() {
        return eligiblePlayers;
    }

    public void setEligiblePlayers(List<String> eligiblePlayers) {
        this.eligiblePlayers = eligiblePlayers != null ? eligiblePlayers : new ArrayList<>();
    }
}
