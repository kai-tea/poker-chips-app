package com.pokerchipsapp.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Objects;

public class Player {
    private String name;
    private int chips;

    public Player() {}

    public Player(String name, int chips) {
        this.name = name;
        this.chips = chips;
    }

    public String getName() { return name; }
    public int getChips() { return chips; }

    public void setName(String name) { this.name = name; }
    public void setChips(int chips) { this.chips = chips; }
}
