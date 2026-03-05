package com.pokerchipsapp;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PokerController {

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

    @GetMapping("/players/{name}")
    public Player get(@PathVariable String name) {
        return playerService.get(name);
    }

    @GetMapping("/chips")
    public int getChips(@RequestParam String name){
        Player p = playerService.create(name, 1000);
        return p.getChips();
    }

    @GetMapping("/bet")
    public Player bet(@RequestParam String name, @RequestParam int amount) {
        return playerService.bet(name, amount);
    }

    @GetMapping("reset")
    public String resetChips(@RequestParam String name) {
        playerService.reset();
        return "reset";
    }
}