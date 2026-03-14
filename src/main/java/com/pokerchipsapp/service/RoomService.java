package com.pokerchipsapp.service;

import com.pokerchipsapp.dto.PlayerStatusResponse;
import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.model.RoomSettings;
import com.pokerchipsapp.model.SidePot;
import com.pokerchipsapp.repo.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

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
        room.setLastActivityAt(Instant.now());
        repo.save(room);
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
            save(room);

            System.out.println("Room saved successfully with code = " + room.getCode());

            return room;
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
    public Room get(String code){
        String normalizedCode = code == null ? null : code.toUpperCase();
        return repo
                .findRoomByCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("Room not found " + normalizedCode));
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
    private List<SidePot> buildSidePots(Room room) {
        List<Player> players = room.getPlayers();
        List<Integer> levels = players.stream()
                .map(Player::getHandContribution)
                .filter(amount -> amount > 0)
                .distinct()
                .sorted()
                .toList();

        List<SidePot> pots = new ArrayList<>();
        int previous = 0;

        for (int level : levels) {
            int contributingPlayers = 0;
            List<String> eligible = new ArrayList<>();

            for (Player p : players) {
                if (p.getHandContribution() >= level) {
                    contributingPlayers++;
                    if (!p.isFolded()) {
                        eligible.add(p.getName());
                    }
                }
            }

            int amount = (level - previous) * contributingPlayers;
            if (amount > 0) {
                pots.add(new SidePot(amount, eligible));
            }

            previous = level;
        }

        return pots;
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
        player.setHandContribution(player.getHandContribution() + amount);
        if (player.getChips() == 0) {
            player.setAllIn(true);
        }
        player.setActedThisRound(true);
        player.setLastAction(player.isAllIn() ? "ALL_IN" : "BET");

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

        room = pauseForActionVisibility(room);

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

        int amountToPutIn = Math.min(player.getChips(), amountToCall);
        if (amountToPutIn == 0) {
            throw new IllegalArgumentException("Not enough chips");
        }

        player.setChips(player.getChips() - amountToPutIn);
        player.setCurrentRoundBet(player.getCurrentRoundBet() + amountToPutIn);
        player.setHandContribution(player.getHandContribution() + amountToPutIn);
        if (player.getChips() == 0) {
            player.setAllIn(true);
        }
        player.setActedThisRound(true);
        player.setLastAction(player.isAllIn() ? "ALL_IN" : "CALL");

        room.setPot(room.getPot() + amountToPutIn);

        // broadcast fold for visibility
        room = pauseForActionVisibility(room);
        player = getPlayer(room, name);

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

        int targetRoundBet = raiseAmount;

        if (targetRoundBet <= room.getCurrentBet()) {
            throw new IllegalArgumentException("Raise must exceed current bet");
        }

        if (targetRoundBet <= player.getCurrentRoundBet()) {
            throw new IllegalArgumentException("Raise must exceed current round bet");
        }

        int chipsToPutIn = targetRoundBet - player.getCurrentRoundBet();

        if (player.getChips() < chipsToPutIn) {
            throw new IllegalArgumentException("Not enough chips");
        }

        player.setChips(player.getChips() - chipsToPutIn);
        player.setCurrentRoundBet(targetRoundBet);
        player.setHandContribution(player.getHandContribution() + chipsToPutIn);
        if (player.getChips() == 0) {
            player.setAllIn(true);
        }
        player.setActedThisRound(true);
        player.setLastAction(player.isAllIn() ? "ALL_IN" : "RAISE");

        room.setPot(room.getPot() + chipsToPutIn);
        room.setCurrentBet(targetRoundBet);

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

        // broadcast fold for visibility
        room = pauseForActionVisibility(room);

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
        if (player.isAllIn()) {
            throw new IllegalStateException("All-in player cannot queue actions");
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
    public void resolveShowdown(String code, String hostName, List<List<String>> rankedHands, List<String> winnerNames, String fallbackWinnerName) {
        Room room = get(code);

        if (room.getPhase() != SHOWDOWN) {
            throw new IllegalStateException("Showdown is not active");
        }

        if (!room.getHost().equalsIgnoreCase(hostName)) {
            throw new IllegalStateException("Only the host can resolve showdown");
        }
        List<SidePot> sidePots = room.getSidePots();
        if (sidePots == null || sidePots.isEmpty()) {
            sidePots = buildSidePots(room);
        }

        if (sidePots.isEmpty()) {
            sidePots = List.of(new SidePot(room.getPot(), room.getPlayers().stream()
                    .filter(p -> !p.isFolded())
                    .map(Player::getName)
                    .toList()));
        }

        List<Player> activePlayers = room.getPlayers().stream()
                .filter(p -> !p.isFolded())
                .toList();

        List<List<String>> rankedHandsToUse = normalizeRankedHands(rankedHands, activePlayers);

        if (rankedHandsToUse != null) {
            awardSidePotsByRanking(room, sidePots, rankedHandsToUse);
        } else {
            List<String> winnersToUse = winnerNames != null ? winnerNames : List.of();
            if (winnersToUse.isEmpty()) {
                if (fallbackWinnerName == null || fallbackWinnerName.isBlank()) {
                    throw new IllegalArgumentException("Winner names required");
                }
                winnersToUse = List.of(fallbackWinnerName);
            }

            if (winnersToUse.size() != sidePots.size()) {
                throw new IllegalArgumentException("Winner count must match side pot count");
            }

            for (int i = 0; i < sidePots.size(); i++) {
                SidePot pot = sidePots.get(i);
                String winnerName = winnersToUse.get(i);

                if (winnerName == null || winnerName.isBlank()) {
                    throw new IllegalArgumentException("Winner name required for pot " + (i + 1));
                }

                boolean eligible = pot.getEligiblePlayers().stream()
                        .anyMatch(name -> name.equalsIgnoreCase(winnerName));
                if (!eligible) {
                    throw new IllegalArgumentException("Winner not eligible for pot " + (i + 1));
                }

                Player winner = getPlayer(room, winnerName);
                winner.setChips(winner.getChips() + pot.getAmount());
                winner.setLastAction("WIN");
            }
        }

        room.setPot(0);
        room.setCurrentBet(0);
        room.setPhase(ROUND_OVER);
        room.setSidePots(new ArrayList<>());

        for (Player p : room.getPlayers()) {
            p.setCurrentRoundBet(0);
            p.setActedThisRound(false);
            p.setFolded(false);
            p.setAllIn(false);
            p.setHandContribution(0);
            p.setPreCheckFold(false);
            p.setLastAction(null);
        }

        room.moveWaitingPlayers();

        save(room);
    }

    private List<List<String>> normalizeRankedHands(List<List<String>> rankedHands, List<Player> activePlayers) {
        if (rankedHands == null || rankedHands.isEmpty()) {
            return null;
        }

        List<List<String>> normalized = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        Set<String> activeNames = activePlayers.stream()
                .map(p -> p.getName().toLowerCase())
                .collect(Collectors.toSet());

        for (List<String> group : rankedHands) {
            if (group == null || group.isEmpty()) {
                throw new IllegalArgumentException("Ranked hands cannot contain empty groups");
            }

            List<String> normalizedGroup = new ArrayList<>();
            for (String name : group) {
                if (name == null || name.isBlank()) {
                    throw new IllegalArgumentException("Ranked hand contains blank player name");
                }

                String key = name.toLowerCase();
                if (!activeNames.contains(key)) {
                    throw new IllegalArgumentException("Player " + name + " is not eligible for showdown");
                }

                if (!seen.add(key)) {
                    throw new IllegalArgumentException("Player " + name + " appears multiple times in rankings");
                }

                normalizedGroup.add(name);
            }

            normalized.add(normalizedGroup);
        }

        if (seen.size() != activeNames.size()) {
            throw new IllegalArgumentException("All active players must be ranked exactly once");
        }

        return normalized;
    }

    private void awardSidePotsByRanking(Room room, List<SidePot> sidePots, List<List<String>> rankedHands) {
        for (int i = 0; i < sidePots.size(); i++) {
            SidePot pot = sidePots.get(i);
            List<String> winners = null;

            for (List<String> group : rankedHands) {
                List<String> eligibleGroup = group.stream()
                        .filter(name -> pot.getEligiblePlayers().stream()
                                .anyMatch(eligibleName -> eligibleName.equalsIgnoreCase(name)))
                        .toList();

                if (!eligibleGroup.isEmpty()) {
                    winners = eligibleGroup;
                    break;
                }
            }

            if (winners == null || winners.isEmpty()) {
                throw new IllegalArgumentException("No eligible winner found for pot " + (i + 1));
            }

            int share = pot.getAmount() / winners.size();
            int remainder = pot.getAmount() % winners.size();

            for (int w = 0; w < winners.size(); w++) {
                String winnerName = winners.get(w);
                Player winner = getPlayer(room, winnerName);
                int payout = share + (w < remainder ? 1 : 0);
                winner.setChips(winner.getChips() + payout);
                winner.setLastAction("WIN");
            }
        }
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
    public void setSeatingAsHost(String code, String hostName, List<com.pokerchipsapp.dto.PlayerSeatAssignment> assignments) {
        if (hostName == null || hostName.isBlank()) {
            throw new IllegalArgumentException("hostName required");
        }

        Room room = get(code);

        if (!room.getHost().equalsIgnoreCase(hostName)) {
            throw new IllegalStateException("Only the host can set seating");
        }

        if (room.getPhase() != WAITING_FOR_PLAYERS && room.getPhase() != ROUND_OVER) {
            throw new IllegalStateException("Cannot change seating during an active round");
        }

        if (assignments == null) {
            throw new IllegalArgumentException("assignments required");
        }

        List<Player> players = room.getPlayers();
        int playerCount = players.size();

        if (assignments.size() != playerCount) {
            throw new IllegalArgumentException("All active players must be assigned exactly once");
        }

        Map<String, com.pokerchipsapp.dto.PlayerSeatAssignment> assignmentByName = new HashMap<>();
        Set<Integer> seatIndices = new HashSet<>();

        for (com.pokerchipsapp.dto.PlayerSeatAssignment assignment : assignments) {
            if (assignment == null || assignment.getPlayerName() == null || assignment.getPlayerName().isBlank()) {
                throw new IllegalArgumentException("playerName required for seating assignment");
            }

            String key = assignment.getPlayerName().toLowerCase();
            if (assignmentByName.containsKey(key)) {
                throw new IllegalArgumentException("Duplicate player assignment: " + assignment.getPlayerName());
            }

            int seatIndex = assignment.getSeatIndex();
            if (seatIndex < 0 || seatIndex >= playerCount) {
                throw new IllegalArgumentException("Invalid seat index: " + seatIndex);
            }

            if (!seatIndices.add(seatIndex)) {
                throw new IllegalArgumentException("Duplicate seat index: " + seatIndex);
            }

            assignmentByName.put(key, assignment);
        }

        for (Player player : players) {
            if (!assignmentByName.containsKey(player.getName().toLowerCase())) {
                throw new IllegalArgumentException("Missing seating assignment for player: " + player.getName());
            }
        }

        String dealerName = null;
        if (room.getDealerIndex() >= 0 && room.getDealerIndex() < players.size()) {
            dealerName = players.get(room.getDealerIndex()).getName();
        }

        String currentPlayerName = null;
        if (room.getCurrentPlayerIndex() >= 0 && room.getCurrentPlayerIndex() < players.size()) {
            currentPlayerName = players.get(room.getCurrentPlayerIndex()).getName();
        }

        for (Player player : players) {
            com.pokerchipsapp.dto.PlayerSeatAssignment assignment =
                    assignmentByName.get(player.getName().toLowerCase());
            player.setSeatIndex(assignment.getSeatIndex());
        }

        players.sort((a, b) -> Integer.compare(a.getSeatIndex(), b.getSeatIndex()));

        for (int i = 0; i < players.size(); i++) {
            players.get(i).setSeatIndex(i);
        }

        if (dealerName != null) {
            int dealerIndex = -1;
            for (int i = 0; i < players.size(); i++) {
                if (players.get(i).getName().equalsIgnoreCase(dealerName)) {
                    dealerIndex = i;
                    break;
                }
            }
            if (dealerIndex >= 0) {
                room.setDealerIndex(dealerIndex);
            }
        }

        if (currentPlayerName != null) {
            int currentIndex = -1;
            for (int i = 0; i < players.size(); i++) {
                if (players.get(i).getName().equalsIgnoreCase(currentPlayerName)) {
                    currentIndex = i;
                    break;
                }
            }
            if (currentIndex >= 0) {
                room.setCurrentPlayerIndex(currentIndex);
            }
        }

        save(room);
    }


    // game flow helpers
    // resets Pot, currentBet, and actions of every player
    private void resetRoundState(Room room) {
        room.setPot(0);
        room.setCurrentBet(0);
        room.setSidePots(new ArrayList<>());

        for (Player p : room.getPlayers()) {
            p.setFolded(false);
            p.setActedThisRound(false);
            p.setCurrentRoundBet(0);
            p.setPreCheckFold(false);
            p.setLastAction(null);
            p.setAllIn(false);
            p.setHandContribution(0);
        }
    }
    private void afterAction(Room room) {
        if (isBettingRoundComplete(room)) {
            advancePhase(room);

            while (room.getPhase() != SHOWDOWN && room.getPhase() != ROUND_OVER && !hasActionablePlayer(room)) {
                advancePhase(room);
            }
        } else {
            moveToNextPlayer(room);
            applyQueuedActionIfNeeded(room);
        }
    }
    private void moveToNextPlayer(Room room) {
        List<Player> players = room.getPlayers();
        int size = players.size();

        for (int step = 1; step <= size; step++) {
            int nextIndex = (room.getCurrentPlayerIndex() + step) % size;
            Player nextPlayer = players.get(nextIndex);

            if (!nextPlayer.isFolded() && !nextPlayer.isAllIn()) {
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

        if (room.getPhase() == SHOWDOWN) {
            room.setSidePots(buildSidePots(room));
        } else {
            room.setSidePots(new ArrayList<>());
        }

        if (room.getPhase() != ROUND_OVER) {
            if (hasActionablePlayer(room)) {
                setFirstActivePlayer(room);
            }
        } else {
            room.moveWaitingPlayers();
        }
    }
    private void setFirstActivePlayer(Room room) {
        List<Player> players = room.getPlayers();

        for (int i = room.getSmallBlindIndex(); i < players.size(); i++) {
            if (!players.get(i).isFolded() && !players.get(i).isAllIn()) {
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
            if (p.isAllIn()) {
                continue;
            }
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
    private boolean hasActionablePlayer(Room room) {
        return room.getPlayers().stream()
                .anyMatch(p -> !p.isFolded() && !p.isAllIn());
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
        if (player.isAllIn()) {
            throw new IllegalStateException("All-in player cannot act");
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
    private Room pauseForActionVisibility(Room room) {
        room = save(room);

        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        return room;
    }
    private int getNextActivePlayerIndex(Room room, int startIndex) {
        List<Player> players = room.getPlayers();
        int size = players.size();

        for (int step = 1; step <= size; step++) {
            int nextIndex = (startIndex + step) % size;
            Player nextPlayer = players.get(nextIndex);

            if (!nextPlayer.isFolded() && !nextPlayer.isAllIn()) {
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
        player.setHandContribution(player.getHandContribution() + posted);
        if (player.getChips() == 0) {
            player.setAllIn(true);
        }
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
        room.setSidePots(new ArrayList<>());

        for (Player p : room.getPlayers()) {
            p.setCurrentRoundBet(0);
            p.setActedThisRound(false);
            p.setPreCheckFold(false);
            p.setFolded(false);
            p.setAllIn(false);
            p.setHandContribution(0);
            p.setLastAction(null);
        }

        room.moveWaitingPlayers();
    }
}
