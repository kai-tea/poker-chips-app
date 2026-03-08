package com.pokerchipsapp.dto;

public class PlayerStatusResponse {
    private String name;
    private boolean active;
    private boolean waiting;
    private Integer chips;

    public PlayerStatusResponse() {}

    public PlayerStatusResponse(String name, boolean active, boolean waiting, Integer chips) {
        this.name = name;
        this.active = active;
        this.waiting = waiting;
        this.chips = chips;
    }

    public String getName() {
        return name;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isWaiting() {
        return waiting;
    }

    public Integer getChips() {
        return chips;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void setWaiting(boolean waiting) {
        this.waiting = waiting;
    }

    public void setChips(Integer chips) {
        this.chips = chips;
    }
}