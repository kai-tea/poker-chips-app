package com.pokerchipsapp;

import com.pokerchipsapp.Player;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PlayerService {

    private final Map<String, Player> players =  new ConcurrentHashMap<>();

    public Player create(String name, int startingChips){
        players.putIfAbsent(name, new Player(name, startingChips));
        return players.get(name);
    }

    public Player get(String name) {
        return players.get(name);
    }

    public Player bet(String name, int amount){
        Player p = players.get(name);

        if (p == null) throw new IllegalArgumentException("Player not found");
        if (amount <= 0) throw new IllegalArgumentException("Amount needs to be > 0");
        if (p.getChips() < amount) throw new IllegalArgumentException("Not enough chips");

        p.setChips(p.getChips() - amount);

        return p;
    }

    public void reset() {
        players.clear();
    }
}
