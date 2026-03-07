package com.pokerchipsapp.service;

import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.model.RoomSettings;
import com.pokerchipsapp.repo.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomService {
    private final RoomRepository repo;

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


    // player methods
    private boolean containsPlayer(List<Player> players, String name){
        for (Player p : players){
            if (p.getName().equals(name)){
                return true;
            }
        }
        return false;
    }

    public void addPlayer(String code, String name){
        Room room = get(code);

        if (containsPlayer(room.getPlayers(), name)) return;

        int chips = room.getSettings().getStartingChips();

        room.getPlayers().add(new Player(name, chips));

        repo.save(room);
    }

    public void deletePlayer(String code, String name){
        Room room = get(code);
        room.getPlayers().removeIf(p -> p.getName().equals(name));

        repo.save(room);
    }

    public List<Player> getPlayers(String code){
        Room room = get(code);
        return room.getPlayers();
    }

    public Player getPlayer(String code, String name){
        var players = getPlayers(code);

        for (Player p : players){
            if (p.getName().equals(name)){
                return p;
            }
        }

        throw new IllegalArgumentException("Player not found: " + name + " in room: " + code);
    }

    /*
    // needs rework
    // should it delete all players or everyone except the host? probably everyone except the host
     */
    public void deleteAllPlayers(String code){
        Room room = get(code);
        String host = room.getHost();

        room.getPlayers().removeIf(p -> !p.getName().equals(host));

        repo.save(room);
    }

    // chips methods
    public void setChips(String code, String name, int amount){
        if (amount < 0) throw new IllegalArgumentException("Chips must be >= 0");

        Room room = get(code);
        Player p = getPlayer(code, name);

        if (p == null) throw new IllegalArgumentException("Player: " + name + " not found for Room: " + code);

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

    public Player bet(String code, String name, int amount){
        if (amount <= 0) throw new IllegalArgumentException("amount must be > 0");

        Room room = get(code);
        Player p = getPlayer(code, name);

        if (p.getChips() < amount) throw new IllegalArgumentException("Not enough chips");

        p.setChips(p.getChips() - amount);

        repo.save(room);
        return p;
    }

    public void resetAllChips(String code){
        int chips = get(code).getSettings().getStartingChips();
        setAllChips(code, chips);
    }
}
