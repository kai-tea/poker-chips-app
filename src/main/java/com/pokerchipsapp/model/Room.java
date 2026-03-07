package com.pokerchipsapp.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document("rooms")
public class Room {
    @Id private String id;
    private String code;
    private String host;
    private List<Player> players = new ArrayList<>();

    private RoomSettings settings;

    public Room() {}

    public Room(String code, String host, RoomSettings settings) {
        this.code = code;
        this.host = host;
        this.settings = settings;

        int startingChips = settings.getStartingChips();
        this.players.add(new Player(host, startingChips));
    }

    public Player getPlayer(String name){
        for (Player p : players){
            if (p.getName().equals(name)){
                return p;
            }
        }
        return null;
    }

    public String getHost() {
        return host;
    }
    public void setHost(String host) {
        this.host = host;
    }

    public String getId() {
        return id;
    }
    public void setId(String id) {
        this.id = id;
    }

    public String getcode() {
        return code;
    }
    public void setcode(String code) {
        this.code = code;
    }

    public List<Player> getPlayers() {
        return players;
    }
    public void setPlayers(List<Player> players) {
        this.players = players;
    }

    public RoomSettings getSettings() {
        return settings;
    }
    public void setSettings(RoomSettings settings) {
        this.settings = settings;
    }
}
