package com.pokerchipsapp;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PlayerService {

    private int STARTING_CHIPS = 1000;

    private final PlayerRepository repo;

    public PlayerService(PlayerRepository repo) {
        this.repo = repo;
    }

    // creates Player with startingChips
    public Player create(String name, int amount){
        return repo
                .findByName(name)
                .orElseGet(() -> repo.save(new Player(name, amount)));
    }

    // returns Player
    public Player get(String name) {
        return repo
                .findByName(name)
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + name));
    }

    // returns list of all Players
    public List<Player> getPlayers() {
        return repo.findAll();
    }

    // reduces chips by amount and creates new player if missing
    public Player bet(String name, int amount){
        if (amount <= 0) throw new IllegalArgumentException("Bet: amount must be > 0");

        Player p = create(name, STARTING_CHIPS);
        if (p.getChips() < amount) throw new IllegalArgumentException("Not enough chips");

        p.setChips(p.getChips() - amount);
        return repo.save(p);
    }

    // deletes repo
    public void reset() {
        repo.deleteAll();
    }
}
