package com.pokerchipsapp.controller;

import com.pokerchipsapp.dto.*;
import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.model.RoomSettings;
import com.pokerchipsapp.service.RoomService;
import org.springframework.http.ResponseEntity;
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

    private RoomSettings getDefaultSettings() {
        int bigBlind = STARTING_CHIPS / 100;
        int smallBlind = STARTING_CHIPS / 200;
        return new RoomSettings(STARTING_CHIPS, bigBlind, smallBlind);
    }

    @PostMapping
    public Room createRoom(@RequestBody CreateRoomRequest body) {
        if (body == null) throw new IllegalArgumentException("Request body required");

        String host = body.getHost();
        RoomSettings settings = body.getSettings();

        if (host == null || host.isBlank()) throw new IllegalArgumentException("host required");
        if (settings == null) settings = getDefaultSettings();

        return roomService.create(host, settings);
    }

    @GetMapping("/{code}")
    public Room getRoom(@PathVariable String code) {
        return roomService.get(code);
    }

    @GetMapping("/{code}/players")
    public List<Player> getPlayers(@PathVariable String code) {
        return roomService.getPlayers(code);
    }

    @GetMapping("/{code}/players/{name}")
    public Player getPlayer(@PathVariable String code, @PathVariable String name) {
        return roomService.getPlayer(code, name);
    }

    @DeleteMapping("/{code}/players/{name}")
    public void deletePlayer(@PathVariable String code, @PathVariable String name) {
        roomService.deletePlayer(code, name);
    }

    @GetMapping("/{code}/chips/{name}")
    public int getChips(@PathVariable String code, @PathVariable String name) {
        return roomService.getPlayer(code, name).getChips();
    }

    @GetMapping("/{code}/waiting-players")
    public List<String> getWaitingPlayers(@PathVariable String code) {
        return roomService.get(code).getWaitingPlayers();
    }

    @PostMapping("/{code}/bet")
    public Player bet(@PathVariable String code, @RequestBody BetRequest body) {
        return roomService.bet(code, body.getName(), body.getAmount());
    }

    @PostMapping("/{code}/check")
    public void check(@PathVariable String code, @RequestBody NameRequest body) {
        roomService.check(code, body.getName());
    }

    @PostMapping("/{code}/call")
    public Player call(@PathVariable String code, @RequestBody NameRequest body) {
        return roomService.call(code, body.getName());
    }

    @PostMapping("/{code}/raise")
    public Player raise(@PathVariable String code, @RequestBody RaiseRequest body) {
        return roomService.raise(code, body.getName(), body.getRaiseToAmount());
    }

    @PostMapping("/{code}/fold")
    public void fold(@PathVariable String code, @RequestBody NameRequest body) {
        roomService.fold(code, body.getName());
    }

    @PostMapping("/{code}/start")
    public void startRound(@PathVariable String code) {
        roomService.startRound(code);
    }

    @PostMapping("/{code}/reset")
    public void resetAllChips(@PathVariable String code, @RequestBody ResetChipsRequest body) {
        roomService.resetAllChips(code, body.getHostName());
    }

    @PostMapping("/{code}/join")
    public Room joinRoom(@RequestBody JoinRoomRequest body) {
        return roomService.join(body.getCode(), body.getName());
    }

    @GetMapping("/{code}/players/{name}/status")
    public PlayerStatusResponse getPlayerStatus(@PathVariable String code, @PathVariable String name) {
        return roomService.getPlayerStatus(code, name);
    }

    @PostMapping("/{code}/resolve-showdown")
    public void resolveShowdown(@PathVariable String code, @RequestBody ResolveShowdownRequest body) {
        roomService.resolveShowdown(code, body.getHostName(), body.getRankedHands(), body.getWinnerNames(), body.getWinnerName());
    }

    @PostMapping("/{code}/set-player-chips")
    public void setPlayerChips(@PathVariable String code, @RequestBody SetPlayerChipsRequest body) {
        roomService.setPlayerChipsAsHost(code, body.getHostName(), body.getPlayerName(), body.getChips());
    }

    @PostMapping("/{code}/pre-check-fold")
    public void setPreCheckFold(@PathVariable String code, @RequestBody PreCheckFoldRequest body) {
        roomService.setPreCheckFold(code, body.getName(), body.isEnabled());
    }

    @PostMapping("/{code}/kick")
    public ResponseEntity<Void> kickPlayer(
            @PathVariable String code,
            @RequestBody KickPlayerRequest request
    ) {
        roomService.kickPlayer(code, request.hostName(), request.playerName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{code}/set-seating")
    public void setSeating(@PathVariable String code, @RequestBody SetSeatingRequest body) {
        roomService.setSeatingAsHost(code, body.getHostName(), body.getAssignments());
    }
}
