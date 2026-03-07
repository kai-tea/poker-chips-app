package com.pokerchipsapp.controller;

import com.pokerchipsapp.dto.AddPlayerRequest;
import com.pokerchipsapp.dto.BetRequest;
import com.pokerchipsapp.dto.CreateRoomRequest;
import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.model.RoomSettings;
import com.pokerchipsapp.service.RoomService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.pokerchipsapp.controller.AppConstants.STARTING_CHIPS;

@RestController
@RequestMapping("/room")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    private RoomSettings getDefaultSettings(){
        int bigBlind = STARTING_CHIPS / 100;
        int smallBlind = STARTING_CHIPS / 200;
        return new RoomSettings(STARTING_CHIPS, bigBlind, smallBlind);
    }

    @PostMapping
    public Room createRoom(@RequestBody CreateRoomRequest body){
        if (body == null) throw new IllegalArgumentException("Request body required");

        String code = body.getCode();
        String host = body.getHost();
        RoomSettings settings = body.getSettings();

        if (code == null || code.isBlank()) throw new IllegalArgumentException("code required");
        if (host == null || host.isBlank()) throw new IllegalArgumentException("host required");
        if (settings == null) settings = getDefaultSettings();

        return roomService.create(code, host, settings);
    }

    @GetMapping("/{code}/players")
    public List<Player> getPlayers(@PathVariable String code){
        return roomService.getPlayers(code);
    }

    @GetMapping("/{code}/players/{name}")
    public Player getPlayer(@PathVariable String code, @PathVariable String name){
        return roomService.getPlayer(code, name);
    }

    @PostMapping("/{code}/players")
    public void addPlayer(@PathVariable String code, @RequestBody AddPlayerRequest body) {
        roomService.addPlayer(code, body.getName());
    }

    @DeleteMapping("/{code}/players/{name}")
    public void deletePlayer(@PathVariable String code, @PathVariable String name) { roomService.deletePlayer(code, name); }

    @GetMapping("/{code}/chips/{name}")
    public int getChips(@PathVariable String code, @PathVariable String name){
        return roomService.getPlayer(code, name).getChips();
    }

    @PostMapping("/{code}/bet")
    public Player bet(@PathVariable String code, @RequestBody BetRequest body) {
        return roomService.bet(code, body.getName(), body.getAmount());
    }

    @PostMapping("/{code}/reset")
    public void resetAllChips(@PathVariable String code){
        roomService.resetAllChips(code);
    }
}


























