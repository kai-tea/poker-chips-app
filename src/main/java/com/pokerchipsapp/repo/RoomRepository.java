package com.pokerchipsapp.repo;

import com.pokerchipsapp.model.Player;
import com.pokerchipsapp.model.Room;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RoomRepository extends MongoRepository<Room, String> {
    Optional<Room> findRoomByCode(String code);
    void deleteRoomByCode(String code);
}
