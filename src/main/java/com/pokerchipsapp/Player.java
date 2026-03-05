package com.pokerchipsapp;

public class Player {
    private String id;
    private String name;
    private int chips;

    public Player(String name, int chips) {
        this.name = name;
        this.chips = chips;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public int getChips() { return chips; }

    public void setId(String id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setChips(int chips) { this.chips = chips; }
}
