package com.pokerchipsapp.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document("rooms")
public class Room {
    @Id
    private String id;

    private String code;
    private String host;
    private List<Player> players = new ArrayList<>();
    private List<String> waitingPlayers = new ArrayList<>();
    private RoomSettings settings;
    private Instant lastActivityAt;

    private GamePhase phase = GamePhase.WAITING_FOR_PLAYERS;
    private int dealerIndex = 0;
    private int pot = 0;
    private int currentPlayerIndex = 0;
    private int currentBet = 0;
    private int smallBlindIndex = -1;
    private int bigBlindIndex = -1;

    public Room() {
    }

    public Room(String code, String host, RoomSettings settings) {
        this.code = code;
        this.host = host;
        this.settings = settings;
        this.players = new ArrayList<>();
        this.waitingPlayers = new ArrayList<>();
        this.phase = GamePhase.WAITING_FOR_PLAYERS;
        this.dealerIndex = 0;
        this.pot = 0;
        this.currentPlayerIndex = 0;
        this.currentBet = 0;
        this.smallBlindIndex = -1;
        this.bigBlindIndex = -1;

        this.players.add(new Player(host, settings.getStartingChips(), 0));
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public void addPlayer(String name) {
        if (name == null || name.isBlank()) return;

        boolean alreadyExists = players.stream()
                .anyMatch(p -> p.getName().equalsIgnoreCase(name));

        if (alreadyExists) return;

        if (getPlayerCount() >= 10) {
            throw new IllegalStateException("Room is full");
        }

        int seatIndex = getPlayerCount();
        players.add(new Player(name, settings.getStartingChips(), seatIndex));
    }

    public int getPlayerCount() {
        return players.size();
    }

    public int getActivePlayerCount() {
        return players.size();
    }

    public void rotateDealer() {
        if (getActivePlayerCount() == 0) return;
        dealerIndex = (dealerIndex + 1) % getActivePlayerCount();
    }

    public void moveWaitingPlayers() {
        for (String name : waitingPlayers) {
            addPlayer(name);
        }
        waitingPlayers = new ArrayList<>();
    }

    public boolean containsPlayer(String name) {
        for (Player p : players) {
            if (p.getName().equalsIgnoreCase(name)) return true;
        }
        for (String n : waitingPlayers) {
            if (n.equalsIgnoreCase(name)) return true;
        }
        return false;
    }

    public Player getPlayer(String name) {
        for (Player p : players) {
            if (p.getName().equalsIgnoreCase(name)) {
                return p;
            }
        }
        throw new IllegalArgumentException("Player: " + name + " not found in Room: " + code);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public void setPlayers(List<Player> players) {
        this.players = players != null ? players : new ArrayList<>();
    }

    public List<String> getWaitingPlayers() {
        return waitingPlayers;
    }

    public void setWaitingPlayers(List<String> waitingPlayers) {
        this.waitingPlayers = waitingPlayers != null ? waitingPlayers : new ArrayList<>();
    }

    public RoomSettings getSettings() {
        return settings;
    }

    public void setSettings(RoomSettings settings) {
        this.settings = settings;
    }

    public GamePhase getPhase() {
        return phase;
    }

    public void setPhase(GamePhase phase) {
        this.phase = phase;
    }

    public int getDealerIndex() {
        return dealerIndex;
    }

    public void setDealerIndex(int dealerIndex) {
        this.dealerIndex = dealerIndex;
    }

    public int getPot() {
        return pot;
    }

    public void setPot(int pot) {
        this.pot = pot;
    }

    public int getCurrentPlayerIndex() {
        return currentPlayerIndex;
    }

    public void setCurrentPlayerIndex(int currentPlayerIndex) {
        this.currentPlayerIndex = currentPlayerIndex;
    }

    public int getCurrentBet() {
        return currentBet;
    }

    public void setCurrentBet(int currentBet) {
        this.currentBet = currentBet;
    }

    public int getSmallBlindIndex() {
        return smallBlindIndex;
    }

    public void setSmallBlindIndex(int smallBlindIndex) {
        this.smallBlindIndex = smallBlindIndex;
    }

    public int getBigBlindIndex() {
        return bigBlindIndex;
    }

    public void setBigBlindIndex(int bigBlindIndex) {
        this.bigBlindIndex = bigBlindIndex;
    }
}