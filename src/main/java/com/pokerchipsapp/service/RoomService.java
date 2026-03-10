package com.pokerchipsapp.service;

import com.pokerchipsapp.dto.PlayerStatusResponse;
import com.pokerchipsapp.model.GamePhase;
import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.model.RoomSettings;
import com.pokerchipsapp.repo.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;

import static com.pokerchipsapp.model.GamePhase.*;

@Service
public class RoomService {
    private final RoomRepository repo;
    private final Random random = new Random();
    private final RoomBroadcastService roomBroadcastService;

    public RoomService(RoomRepository repo, RoomBroadcastService roomBroadcastService) {
        this.repo = repo;
        this.roomBroadcastService = roomBroadcastService;
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        while (true) {
            StringBuilder code = new StringBuilder();

            for (int i = 0; i < 6; i++) {
                int index = random.nextInt(chars.length());
                code.append(chars.charAt(index));
            }

            String generatedCode = code.toString();

            if (repo.findRoomByCode(generatedCode).isEmpty()) {
                return generatedCode;
            }
        }
    }

    private Room save(Room room){
        repo.save(room);
        room.setLastActivityAt(Instant.now());
        roomBroadcastService.broadcastRoom(room);
        return room;
    }

    public Room create(String host, RoomSettings settings) {
        String code = generateRoomCode();

        try {
            System.out.println("Creating room...");
            System.out.println("host = " + host);
            System.out.println("startingChips = " + settings.getStartingChips());
            System.out.println("bigBlind = " + settings.getBigBlind());
            System.out.println("smallBlind = " + settings.getSmallBlind());

            Room room = new Room(code, host, settings);
            Room saved = repo.save(room);

            System.out.println("Room saved successfully with code = " + saved.getCode());

            return saved;
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
    public Room get(String code){
        return repo
                .findRoomByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Room not found " + code));
    }
    public Room join(String code, String name){

        Room room = get(code);

        int totalPlayers = room.getPlayers().size() + room.getWaitingPlayers().size();
        if (totalPlayers >= 10) {
            throw new IllegalStateException("Room is full");
        }

        if (room.getPhase() == WAITING_FOR_PLAYERS || room.getPhase() == ROUND_OVER) {
            room.addPlayer(name);
        } else {
            if (!room.getWaitingPlayers().contains(name)) {
                room.getWaitingPlayers().add(name);
            }
        }

        return save(room);
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
    public void deletePlayer(String code, String name) {
        Room room = get(code);

        room.getPlayers().removeIf(p -> p.getName().equalsIgnoreCase(name));
        room.getWaitingPlayers().removeIf(waitingName -> waitingName.equalsIgnoreCase(name));

        for (int i = 0; i < room.getPlayers().size(); i++) {
            room.getPlayers().get(i).setSeatIndex(i);
        }

        reassignHostIfNeeded(room, name);

        if (room.getPlayers().isEmpty()) {
            room.setCurrentPlayerIndex(0);
            room.setDealerIndex(0);
            room.setPhase(WAITING_FOR_PLAYERS);
        } else {
            if (room.getCurrentPlayerIndex() >= room.getPlayers().size()) {
                room.setCurrentPlayerIndex(0);
            }
            if (room.getDealerIndex() >= room.getPlayers().size()) {
                room.setDealerIndex(0);
            }
        }

        // delete room if no players are left
        if (room.getPlayers().isEmpty() && room.getWaitingPlayers().isEmpty()) {
            repo.delete(room);
            return;
        }

        save(room);
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

        save(room);
    } // deletes all players except the host
    public PlayerStatusResponse getPlayerStatus(String code, String name) {
        Room room = get(code);

        for (Player p : room.getPlayers()) {
            if (p.getName().equalsIgnoreCase(name)) {
                return new PlayerStatusResponse(name, true, false, p.getChips());
            }
        }

        for (String waitingName : room.getWaitingPlayers()) {
            if (waitingName.equalsIgnoreCase(name)) {
                return new PlayerStatusResponse(name, false, true, null);
            }
        }

        throw new IllegalArgumentException("Player not found: " + name + " in room: " + code);
    }

    // chips
    public void setChips(String code, String name, int amount){
        if (amount < 0) throw new IllegalArgumentException("Chips must be >= 0");

        Room room = get(code);
        Player p = room.getPlayer(name);

        p.setChips(amount);

        save(room);
    }
    public void setAllChips(String code, int chips){
        if (chips < 0) throw new IllegalArgumentException("Chips must be >= 0");

        Room room = get(code);

        for (Player p : room.getPlayers()){
            p.setChips(chips);
        }

        save(room);
    }
    public void resetAllChips(String code, String hostName){
        if (hostName == null || hostName.isBlank()) {
            throw new IllegalArgumentException("hostName required");
        }

        Room room = get(code);

        if (!room.getHost().equalsIgnoreCase(hostName)) {
            throw new IllegalStateException("Only the host can reset chips");
        }

        int chips = room.getSettings().getStartingChips();

        for (Player player : getActivePlayers(room)) {
            player.setChips(chips);
        }

        save(room);
    }
    private int getMaxMatchableRoundBet(Room room, String actingPlayerName) {
        int maxMatchable = -1;

        for (Player p : room.getPlayers()) {
            if (p.getName().equalsIgnoreCase(actingPlayerName)) {
                continue;
            }

            if (p.isFolded()) {
                continue;
            }

            int reachableTotal = p.getCurrentRoundBet() + p.getChips();
            if (reachableTotal > maxMatchable) {
                maxMatchable = reachableTotal;
            }
        }

        return maxMatchable;
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

        int maxMatchableRoundBet = getMaxMatchableRoundBet(room, player.getName());
        if (maxMatchableRoundBet >= 0 && newRoundBet > maxMatchableRoundBet) {
            throw new IllegalArgumentException("Bet exceeds the effective stack of remaining opponents");
        }

        player.setChips(player.getChips() - amount);
        player.setCurrentRoundBet(newRoundBet);
        player.setActedThisRound(true);
        player.setLastAction("BET");

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
            awardPotToLastActivePlayer(room);
            save(room);
            return player;
        }

        afterAction(room);
        save(room);
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
        player.setLastAction("CHECK");

        afterAction(room);

        save(room);
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
        player.setLastAction("CALL");

        room.setPot(room.getPot() + amountToCall);

        if (getActivePlayers(room).size() == 1) {
            awardPotToLastActivePlayer(room);
            save(room);
            return player;
        }

        afterAction(room);
        save(room);
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

        int newRoundBet = player.getCurrentRoundBet() + totalAmount;
        int maxMatchableRoundBet = getMaxMatchableRoundBet(room, player.getName());
        if (maxMatchableRoundBet >= 0 && newRoundBet > maxMatchableRoundBet) {
            throw new IllegalArgumentException("Raise exceeds the effective stack of remaining opponents");
        }

        player.setChips(player.getChips() - totalAmount);
        player.setCurrentRoundBet(newRoundBet);
        player.setActedThisRound(true);
        player.setLastAction("RAISE");

        room.setPot(room.getPot() + totalAmount);
        room.setCurrentBet(player.getCurrentRoundBet());

        for (Player p : room.getPlayers()) {
            if (!p.isFolded() && !p.getName().equalsIgnoreCase(player.getName())) {
                p.setActedThisRound(false);
            }
        }

        player.setActedThisRound(true);

        if (getActivePlayers(room).size() == 1) {
            awardPotToLastActivePlayer(room);
            save(room);
            return player;
        }

        afterAction(room);
        save(room);
        return player;
    }
    public void fold(String code, String name) {
        Room room = get(code);
        Player player = getPlayer(room, name);

        validateTurn(room, player);

        player.setFolded(true);
        player.setActedThisRound(true);
        player.setLastAction("FOLD");

        if (getActivePlayers(room).size() == 1) {
            awardPotToLastActivePlayer(room);
            save(room);
            return;
        }

        afterAction(room);
        save(room);
    }
    public void setPreCheckFold(String code, String name, boolean enabled) {
        Room room = get(code);
        Player player = room.getPlayer(name);

        if (player.isFolded()) {
            throw new IllegalStateException("Folded player cannot queue actions");
        }

        if (room.getPhase() == WAITING_FOR_PLAYERS || room.getPhase() == SHOWDOWN || room.getPhase() == ROUND_OVER) {
            throw new IllegalStateException("No active round");
        }

        player.setPreCheckFold(enabled);
        save(room);
    }

    // game flow
    // round
    public void startRound(String code) {
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

        int dealerIndex = room.getDealerIndex();
        int smallBlindIndex;
        int bigBlindIndex;
        int firstToActIndex;

        if (room.getPlayerCount() == 2) {
            smallBlindIndex = dealerIndex;
            bigBlindIndex = getNextActivePlayerIndex(room, dealerIndex);
            firstToActIndex = dealerIndex;
        } else {
            smallBlindIndex = getNextActivePlayerIndex(room, dealerIndex);
            bigBlindIndex = getNextActivePlayerIndex(room, smallBlindIndex);
            firstToActIndex = getNextActivePlayerIndex(room, bigBlindIndex);
        }

        int smallBlindAmount = room.getSettings().getSmallBlind();
        int bigBlindAmount = room.getSettings().getBigBlind();

        int postedSmallBlind = postBlind(room, smallBlindIndex, smallBlindAmount, "SB");
        int postedBigBlind = postBlind(room, bigBlindIndex, bigBlindAmount, "BB");

        room.setCurrentBet(Math.max(postedSmallBlind, postedBigBlind));
        room.setCurrentPlayerIndex(firstToActIndex);

        room.setSmallBlindIndex(smallBlindIndex);
        room.setBigBlindIndex(bigBlindIndex);

        save(room);
    }
    public void endRound(String code){
        Room room = get(code);

        room.setPhase(ROUND_OVER);
        resetRoundState(room);
        room.moveWaitingPlayers();

        save(room);
    }
    public void resetRoundState(String code){
        Room room = get(code);
        resetRoundState(room);
        save(room);
    }
    public void resolveShowdown(String code, String hostName, String winnerName) {
        Room room = get(code);

        if (room.getPhase() != SHOWDOWN) {
            throw new IllegalStateException("Showdown is not active");
        }

        if (!room.getHost().equalsIgnoreCase(hostName)) {
            throw new IllegalStateException("Only the host can resolve showdown");
        }

        Player winner = getPlayer(room, winnerName);

        winner.setChips(winner.getChips() + room.getPot());
        room.setPot(0);
        room.setCurrentBet(0);
        room.setPhase(ROUND_OVER);

        for (Player p : room.getPlayers()) {
            p.setCurrentRoundBet(0);
            p.setActedThisRound(false);
            p.setFolded(false);
        }

        room.moveWaitingPlayers();

        save(room);
    }


    // host actions
    public void setPlayerChipsAsHost(String code, String hostName, String playerName, int chips) {
        if (chips < 0) {
            throw new IllegalArgumentException("Chips must be >= 0");
        }

        Room room = get(code);

        if (!room.getHost().equalsIgnoreCase(hostName)) {
            throw new IllegalStateException("Only the host can set player chips");
        }

        Player player = room.getPlayer(playerName);
        player.setChips(chips);

        save(room);
    }
    public void kickPlayer(String code, String hostName, String playerNameToKick) {
        Room room = get(code);

        if (!room.getHost().equalsIgnoreCase(hostName)) {
            throw new IllegalStateException("Only the host can kick players");
        }

        if (room.getHost().equalsIgnoreCase(playerNameToKick)) {
            throw new IllegalStateException("Host cannot kick themselves");
        }

        List<Player> players = room.getPlayers();
        List<String> waitingPlayers = room.getWaitingPlayers();

        int activeIndex = -1;
        for (int i = 0; i < players.size(); i++) {
            if (players.get(i).getName().equalsIgnoreCase(playerNameToKick)) {
                activeIndex = i;
                break;
            }
        }

        if (activeIndex >= 0) {
            players.remove(activeIndex);

            for (int i = 0; i < players.size(); i++) {
                players.get(i).setSeatIndex(i);
            }

            reassignHostIfNeeded(room, playerNameToKick);

            if (players.isEmpty()) {
                room.setCurrentPlayerIndex(0);
                room.setDealerIndex(0);
                room.setPhase(WAITING_FOR_PLAYERS);
            } else {
                if (room.getCurrentPlayerIndex() > activeIndex) {
                    room.setCurrentPlayerIndex(room.getCurrentPlayerIndex() - 1);
                } else if (room.getCurrentPlayerIndex() == activeIndex) {
                    room.setCurrentPlayerIndex(room.getCurrentPlayerIndex() % players.size());
                }

                if (room.getDealerIndex() > activeIndex) {
                    room.setDealerIndex(room.getDealerIndex() - 1);
                } else if (room.getDealerIndex() == activeIndex) {
                    room.setDealerIndex(room.getDealerIndex() % players.size());
                }
            }

            save(room);
            return;
        }

        boolean removedWaiting = waitingPlayers.removeIf(name -> name.equalsIgnoreCase(playerNameToKick));

        if (!removedWaiting) {
            throw new IllegalArgumentException("Player not found in room");
        }

        if (room.getPlayers().isEmpty() && room.getWaitingPlayers().isEmpty()) {
            repo.delete(room);
            return;
        }

        reassignHostIfNeeded(room, playerNameToKick);
        save(room);
    }


    // game flow helpers
    // resets Pot, currentBet, and actions of every player
    private void resetRoundState(Room room) {
        room.setPot(0);
        room.setCurrentBet(0);

        for (Player p : room.getPlayers()) {
            p.setFolded(false);
            p.setActedThisRound(false);
            p.setCurrentRoundBet(0);
            p.setPreCheckFold(false);
            p.setLastAction(null);
        }
    }
    private void afterAction(Room room) {
        if (isBettingRoundComplete(room)) {
            advancePhase(room);
        } else {
            moveToNextPlayer(room);
            applyQueuedActionIfNeeded(room);
        }
    }    private void moveToNextPlayer(Room room) {
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
            p.setLastAction(null);
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
    private void applyQueuedActionIfNeeded(Room room) {
        Player currentPlayer = room.getPlayers().get(room.getCurrentPlayerIndex());

        if (!currentPlayer.isPreCheckFold()) {
            return;
        }

        currentPlayer.setPreCheckFold(false);

        if (currentPlayer.getCurrentRoundBet() == room.getCurrentBet()) {
            currentPlayer.setActedThisRound(true);
            currentPlayer.setLastAction("CHECK");
        } else {
            currentPlayer.setFolded(true);
            currentPlayer.setActedThisRound(true);
            currentPlayer.setLastAction("FOLD");
        }

        if (getActivePlayers(room).size() == 1) {
            awardPotToLastActivePlayer(room);
            return;
        }

        if (isBettingRoundComplete(room)) {
            advancePhase(room);
        } else {
            moveToNextPlayer(room);
            applyQueuedActionIfNeeded(room);
        }
    }
    private void pauseForActionVisibility() {
        try {
            Thread.sleep(1200);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
    private int getNextActivePlayerIndex(Room room, int startIndex) {
        List<Player> players = room.getPlayers();
        int size = players.size();

        for (int step = 1; step <= size; step++) {
            int nextIndex = (startIndex + step) % size;
            Player nextPlayer = players.get(nextIndex);

            if (!nextPlayer.isFolded()) {
                return nextIndex;
            }
        }

        throw new IllegalStateException("No active player found");
    }
    private int postBlind(Room room, int playerIndex, int blindAmount, String actionName) {
        Player player = room.getPlayers().get(playerIndex);
        int posted = Math.min(player.getChips(), blindAmount);

        player.setChips(player.getChips() - posted);
        player.setCurrentRoundBet(posted);
        player.setLastAction(actionName);

        room.setPot(room.getPot() + posted);

        return posted;
    }
    private void reassignHostIfNeeded(Room room, String removedPlayerName) {
        if (!room.getHost().equalsIgnoreCase(removedPlayerName)) {
            return;
        }

        if (!room.getPlayers().isEmpty()) {
            room.setHost(room.getPlayers().get(0).getName());
            return;
        }

        if (!room.getWaitingPlayers().isEmpty()) {
            room.setHost(room.getWaitingPlayers().get(0));
        }
    }
    private void awardPotToLastActivePlayer(Room room) {
        List<Player> activePlayers = getActivePlayers(room);

        if (activePlayers.size() != 1) {
            throw new IllegalStateException("Cannot award pot without exactly one active player");
        }

        Player winner = activePlayers.get(0);
        winner.setChips(winner.getChips() + room.getPot());
        winner.setLastAction("WIN");

        room.setPot(0);
        room.setCurrentBet(0);
        room.setPhase(ROUND_OVER);

        for (Player p : room.getPlayers()) {
            p.setCurrentRoundBet(0);
            p.setActedThisRound(false);
            p.setPreCheckFold(false);
        }

        room.moveWaitingPlayers();
    }
}
