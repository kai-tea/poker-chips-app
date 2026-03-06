package com.pokerchipsapp;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PokerController {

    private int startingChips = 1000;

    public static class CreatePlayerRequest {
        public String name;
        public Integer chips;
    }

    private final PlayerService playerService;

    public PokerController(PlayerService playerService) {
       this.playerService = playerService;
    }

    /*
    * return player and create if it doesn't exist
    * Frontend sends JSON: { "name": "Daniel", "chips": 1000 }
    */
    @PostMapping("/players")
    public Player createPlayer(@RequestBody CreatePlayerRequest body) {
        String name = (body == null) ? null : body.name;
        int chips = (body == null || body.chips == null) ? 1000 : body.chips;

        return playerService.create(name, chips);
    }

    @GetMapping("/players")
    public List<Player> getPlayers(){
        return playerService.getPlayers();
    }

    @GetMapping("/players/{name}")
    public Player get(@PathVariable String name) {
        return playerService.get(name);
    }

    // returns chips for given player name
    @GetMapping("/chips")
    public int getChips(@RequestParam String name){
        Player p = playerService.get(name);
        return p.getChips();
    }

    @GetMapping("/bet")
    public Player bet(@RequestParam String name, @RequestParam int amount) {
        return playerService.bet(name, amount);
    }

    @GetMapping("/reset")
    public String resetChips() {
        playerService.setAllChips(startingChips);
        return "Chips reset";
    }

    @GetMapping("/startingChips")
    public String setStartingChips(@RequestParam int chips) {
        startingChips = chips;
        return "Starting Chips set";
    }

    // delete all players
    @GetMapping("/deleteAll")
    public String deleteAllPlayers() {
        playerService.deleteAll();
        return "Delete All Players";
    }

    // delete specific
    @GetMapping("/delete")
    public String deletePlayer(@RequestParam String name) {
        playerService.deletePlayer(name);
        return "Delete Player: " + name;
    }

}