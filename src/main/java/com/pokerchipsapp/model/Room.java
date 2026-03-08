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
    private List<String> waitingPlayers = new ArrayList<>();

    // Settings
    private RoomSettings settings;

    // Game flow
    private GamePhase phase = GamePhase.WAITING_FOR_PLAYERS;
    private int dealerIndex = 0;
    private int pot = 0;
    private int currentPlayerIndex = 0;
    private int currentBet = 0;
    private int smallBlindIndex = -1;
    private int bigBlindIndex = -1;


    public Room() {}

    public Room(String code, String host, RoomSettings settings) {
        this.code = code;
        this.host = host;
        this.settings = settings;
        this.players.add(new Player(host, settings.getStartingChips(), 0));
    }

    public void addPlayer(String name){
        if (name.isBlank()) return;

        boolean alreadyExists = players.stream()
                .anyMatch(p -> p.getName().equalsIgnoreCase(name));

        if (alreadyExists) return;

        if (getPlayerCount() >= 10) {
            throw new IllegalStateException("Room is full");
        }

        int seatIndex = getPlayerCount();
        players.add(new Player(name, settings.getStartingChips(), seatIndex));
    }
    public int getPlayerCount(){
        return players.size();
    }
    public void rotateDealer(){
        dealerIndex = (dealerIndex+1) % getActivePlayerCount();
    }
    public void moveWaitingPlayers(){
        for (String name : waitingPlayers){
            addPlayer(name);
        }
        waitingPlayers = new ArrayList<>();
    }
    public boolean containsPlayer(String name){
        for (Player p : players){
            if (p.getName().equalsIgnoreCase(name)) return true;
        }
        for (String n : waitingPlayers){
            if (n.equalsIgnoreCase(name)) return true;
        }
        return false;
    }


    // Getters and Setters
    public void setWaitingPlayers(List<String> waitingPlayers) {
        this.waitingPlayers = waitingPlayers;
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
    public List<String> getWaitingPlayers() {
        return waitingPlayers;
    }
    public int getActivePlayerCount() {
        return players.size();
    }
    public String getCode() {
        return code;
    }
    public void setCode(String code) {
        this.code = code;
    }
    public int getDealerIndex() {
        return dealerIndex;
    }
    public void setDealerIndex(int dealerIndex) {
        this.dealerIndex = dealerIndex;
    }
    public GamePhase getPhase() {
        return phase;
    }
    public void setPhase(GamePhase phase) {
        this.phase = phase;
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
    public Player getPlayer(String name){
        for (Player p : players){
            if (p.getName().equals(name)){
                return p;
            }
        }
        throw new IllegalArgumentException("Player: " + name + " not found in Room: " + code);
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
