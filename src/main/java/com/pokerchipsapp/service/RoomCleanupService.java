package com.pokerchipsapp.service;

import com.pokerchipsapp.model.Room;
import com.pokerchipsapp.repo.RoomRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class RoomCleanupService {

    private final RoomRepository repo;

    public RoomCleanupService(RoomRepository repo) {
        this.repo = repo;
    }

    @Scheduled(fixedRate = 12 * 300000) // every 12 * 5 minutes
    public void deleteInactiveRooms() {
        List<Room> rooms = repo.findAll();

        for (Room room : rooms) {
            if (room.getPlayers().isEmpty() && room.getWaitingPlayers().isEmpty()) {
                repo.delete(room);
                continue;
            }

            if (isInactive(room, Duration.ofHours(1))) {
                repo.delete(room);
            }
        }
    }

    private boolean isInactive(Room room, Duration maxAge) {
        if (room.getLastActivityAt() == null) {
            return true;
        }

        return room.getLastActivityAt().isBefore(Instant.now().minus(maxAge));
    }
}