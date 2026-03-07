package com.pokerchipsapp.dto;

public class BetRequest {
    private String name;
    private int amount;

    public BetRequest() {}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }
}
