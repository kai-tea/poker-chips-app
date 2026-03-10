package com.pokerchipsapp.dto;

public class RaiseRequest {
    private String name;
    private int raiseToAmount;

    public RaiseRequest() {}

    public String getName() {
        return name;
    }

    public int getRaiseToAmount() {
        return raiseToAmount;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRaiseToAmount(int raiseToAmount) {
        this.raiseToAmount = raiseToAmount;
    }
}
