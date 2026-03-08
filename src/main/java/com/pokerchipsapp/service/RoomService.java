package com.pokerchipsapp.service;

import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.model.RoomSettings;
import com.pokerchipsapp.repo.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;

import static com.pokerchipsapp.model.GamePhase.*;

@Service
public class RoomService {
    private final RoomRepository repo;

    // room
    public RoomService(RoomRepository repo) {
        this.repo = repo;
    }
    public Room create(String code, String host, RoomSettings settings) {
        return repo
                .findRoomByCode(code)
                .orElseGet(() -> repo.save(new Room(code, host, settings)));
    }
    public Room get(String code){
        return repo
                .findRoomByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Room not found " + code));
    }
    public Room join(String code, String name){
        Room room = get(code);

        if (room.getPhase() == WAITING_FOR_PLAYERS || room.getPhase() == ROUND_OVER) {
            room.addPlayer(name);
        } else {
            if (!room.getWaitingPlayers().contains(name)) {
                room.getWaitingPlayers().add(name);
            }
        }

        repo.save(room);
        return room;
    }

    // player
    private boolean containsPlayer(List<Player> players, String name){
        for (Player p : players){
            if (p.getName().equalsIgnoreCase(name)){
                return true;
            }
        }
        return false;
    }
    public void deletePlayer(String code, String name){
        Room room = get(code);

        room.getPlayers().removeIf(p -> p.getName().equalsIgnoreCase(name));
        room.getWaitingPlayers().removeIf(waitingName -> waitingName.equalsIgnoreCase(name));

        repo.save(room);
    }
    public List<Player> getPlayers(String code){
        Room room = get(code);
        return room.getPlayers();
    }
    public Player getPlayer(String code, String name){
        var players = getPlayers(code);

        for (Player p : players){
            if (p.getName().equalsIgnoreCase(name)){
                return p;
            }
        }

        throw new IllegalArgumentException("Player not found: " + name + " in room: " + code);
    }
    public void deleteAllPlayers(String code){
        Room room = get(code);
        String host = room.getHost();

        room.getPlayers().removeIf(p -> !p.getName().equalsIgnoreCase(host));
        room.getWaitingPlayers().clear();

        repo.save(room);
    } // deletes all players except the host

    // chips
    public void setChips(String code, String name, int amount){
        if (amount < 0) throw new IllegalArgumentException("Chips must be >= 0");

        Room room = get(code);
        Player p = room.getPlayer(name);

        p.setChips(amount);

        repo.save(room);
    }
    public void setAllChips(String code, int chips){
        if (chips < 0) throw new IllegalArgumentException("Chips must be >= 0");

        Room room = get(code);

        for (Player p : room.getPlayers()){
            p.setChips(chips);
        }

        repo.save(room);
    }
    public void resetAllChips(String code){
        int chips = get(code).getSettings().getStartingChips();
        setAllChips(code, chips);
    }

    // player actions
    public Player bet(String code, String name, int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be > 0");
        }

        Room room = get(code);
        Player player = getPlayer(room, name);

        validateTurn(room, player);

        if (player.getChips() < amount) {
            throw new IllegalArgumentException("Not enough chips");
        }

        int newRoundBet = player.getCurrentRoundBet() + amount;

        if (room.getCurrentBet() > 0 && newRoundBet < room.getCurrentBet()) {
            throw new IllegalStateException(
                    "Bet is below current bet. Use call, raise, or fold."
            );
        }

        player.setChips(player.getChips() - amount);
        player.setCurrentRoundBet(newRoundBet);
        player.setActedThisRound(true);

        if (player.getCurrentRoundBet() > room.getCurrentBet()) {
            room.setCurrentBet(player.getCurrentRoundBet());

            for (Player p : room.getPlayers()) {
                if (!p.isFolded() && !p.getName().equalsIgnoreCase(player.getName())) {
                    p.setActedThisRound(false);
                }
            }

            player.setActedThisRound(true);
        }

        room.setPot(room.getPot() + amount);

        if (getActivePlayers(room).size() == 1) {
            room.setPhase(ROUND_OVER);
            repo.save(room);
            return player;
        }

        afterAction(room);
        repo.save(room);
        return player;
    }
    public void check(String code, String name) {
        Room room = get(code);
        Player player = room.getPlayer(name);

        validateTurn(room, player);

        if (player.getCurrentRoundBet() != room.getCurrentBet()) {
            throw new IllegalStateException("Cannot check when behind current bet");
        }

        player.setActedThisRound(true);

        afterAction(room);
        repo.save(room);
    }
    public Player call(String code, String name) {
        Room room = get(code);
        Player player = getPlayer(room, name);

        validateTurn(room, player);

        int amountToCall = room.getCurrentBet() - player.getCurrentRoundBet();

        if (amountToCall < 0) {
            throw new IllegalStateException("Player is already above the current bet");
        }

        if (amountToCall == 0) {
            throw new IllegalStateException("Nothing to call; use check instead");
        }

        if (player.getChips() < amountToCall) {
            throw new IllegalArgumentException("Not enough chips");
        }

        player.setChips(player.getChips() - amountToCall);
        player.setCurrentRoundBet(player.getCurrentRoundBet() + amountToCall);
        player.setActedThisRound(true);

        room.setPot(room.getPot() + amountToCall);

        if (getActivePlayers(room).size() == 1) {
            room.setPhase(ROUND_OVER);
            repo.save(room);
            return player;
        }

        afterAction(room);
        repo.save(room);
        return player;
    }
    public Player raise(String code, String name, int raiseAmount) {
        if (raiseAmount <= 0) {
            throw new IllegalArgumentException("Raise amount must be > 0");
        }

        Room room = get(code);
        Player player = getPlayer(room, name);

        validateTurn(room, player);

        int amountToCall = room.getCurrentBet() - player.getCurrentRoundBet();

        if (amountToCall < 0) {
            throw new IllegalStateException("Player is already above the current bet");
        }

        int totalAmount = amountToCall + raiseAmount;

        if (player.getChips() < totalAmount) {
            throw new IllegalArgumentException("Not enough chips");
        }

        player.setChips(player.getChips() - totalAmount);
        player.setCurrentRoundBet(player.getCurrentRoundBet() + totalAmount);
        player.setActedThisRound(true);

        room.setPot(room.getPot() + totalAmount);
        room.setCurrentBet(player.getCurrentRoundBet());

        for (Player p : room.getPlayers()) {
            if (!p.isFolded() && !p.getName().equalsIgnoreCase(player.getName())) {
                p.setActedThisRound(false);
            }
        }

        player.setActedThisRound(true);

        if (getActivePlayers(room).size() == 1) {
            room.setPhase(ROUND_OVER);
            repo.save(room);
            return player;
        }

        afterAction(room);
        repo.save(room);
        return player;
    }
    public void fold(String code, String name) {
        Room room = get(code);
        Player player = getPlayer(room, name);

        validateTurn(room, player);

        player.setFolded(true);
        player.setActedThisRound(true);

        if (getActivePlayers(room).size() == 1) {
            room.setPhase(ROUND_OVER);
            repo.save(room);
            return;
        }

        afterAction(room);
        repo.save(room);
    }

    // game flow
    // round
    public void startRound(String code){
        Room room = get(code);

        room.moveWaitingPlayers();

        if (room.getPlayerCount() <= 1) {
            throw new IllegalStateException("Not enough players to start round");
        }
        if (room.getPhase() != WAITING_FOR_PLAYERS && room.getPhase() != ROUND_OVER) {
            throw new IllegalStateException("Round already started");
        }

        room.rotateDealer();

        resetRoundState(room);

        room.setPhase(PRE_FLOP);
        room.setCurrentPlayerIndex(0);

        repo.save(room);
    }
    public void endRound(String code){
        Room room = get(code);

        room.setPhase(ROUND_OVER);
        resetRoundState(room);
        room.moveWaitingPlayers();

        repo.save(room);
    }
    public void resetRoundState(String code){
        Room room = get(code);
        resetRoundState(room);
        repo.save(room);
    }

    // game flow helpers
    private void resetRoundState(Room room) {
        room.setPot(0);
        room.setCurrentBet(0);

        for (Player p : room.getPlayers()) {
            p.setFolded(false);
            p.setActedThisRound(false);
            p.setCurrentRoundBet(0);
        }
    } // resets Pot, currentBet, and actions of every player
    private void afterAction(Room room) {
        if (isBettingRoundComplete(room)) {
            advancePhase(room);
        } else {
            moveToNextPlayer(room);
        }
    }
    private void moveToNextPlayer(Room room) {
        List<Player> players = room.getPlayers();
        int size = players.size();

        for (int step = 1; step <= size; step++) {
            int nextIndex = (room.getCurrentPlayerIndex() + step) % size;
            Player nextPlayer = players.get(nextIndex);

            if (!nextPlayer.isFolded()) {
                room.setCurrentPlayerIndex(nextIndex);
                return;
            }
        }

        throw new IllegalStateException("No active player found");
    }
    private void advancePhase(Room room) {
        switch (room.getPhase()) {
            case PRE_FLOP -> room.setPhase(FLOP);
            case FLOP -> room.setPhase(TURN);
            case TURN -> room.setPhase(RIVER);
            case RIVER -> room.setPhase(SHOWDOWN);
            case SHOWDOWN -> room.setPhase(ROUND_OVER);
            default -> throw new IllegalStateException("Cannot advance phase from " + room.getPhase());
        }

        room.setCurrentBet(0);

        for (Player p : room.getPlayers()) {
            p.setActedThisRound(false);
            p.setCurrentRoundBet(0);
        }

        if (room.getPhase() != ROUND_OVER) {
            setFirstActivePlayer(room);
        } else {
            room.moveWaitingPlayers();
        }
    }
    private void setFirstActivePlayer(Room room) {
        List<Player> players = room.getPlayers();

        for (int i = 0; i < players.size(); i++) {
            if (!players.get(i).isFolded()) {
                room.setCurrentPlayerIndex(i);
                return;
            }
        }

        throw new IllegalStateException("No active player found");
    }
    private boolean isBettingRoundComplete(Room room) {
        List<Player> activePlayers = getActivePlayers(room);

        if (activePlayers.isEmpty()) {
            return false;
        }

        for (Player p : activePlayers) {
            if (!p.isActedThisRound()) {
                return false;
            }
            if (p.getCurrentRoundBet() != room.getCurrentBet()) {
                return false;
            }
        }

        return true;
    }
    private List<Player> getActivePlayers(Room room) {
        return room.getPlayers().stream()
                .filter(p -> !p.isFolded())
                .toList();
    }
    private Player getPlayer(Room room, String name) {
        return room.getPlayer(name);
    }
    private void validateTurn(Room room, Player player) {
        Player currentPlayer = room.getPlayers().get(room.getCurrentPlayerIndex());

        if (!currentPlayer.getName().equalsIgnoreCase(player.getName())) {
            throw new IllegalStateException("It is not " + player.getName() + "'s turn");
        }

        if (player.isFolded()) {
            throw new IllegalStateException("Folded player cannot act");
        }

        if (room.getPhase() == WAITING_FOR_PLAYERS || room.getPhase() == ROUND_OVER) {
            throw new IllegalStateException("No active round");
        }
    }
}