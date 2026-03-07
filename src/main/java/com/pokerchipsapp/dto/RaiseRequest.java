package com.pokerchipsapp.dto;

public class RaiseRequest {
    private String name;
    private int raiseAmount;

    public RaiseRequest() {}

    public String getName() {
        return name;
    }

    public int getRaiseAmount() {
        return raiseAmount;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRaiseAmount(int raiseAmount) {
        this.raiseAmount = raiseAmount;
    }
}