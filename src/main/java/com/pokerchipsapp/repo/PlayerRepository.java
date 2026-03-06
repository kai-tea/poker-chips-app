package com.pokerchipsapp.repo;

import java.util.Optional;

import com.pokerchipsapp.model.Player;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlayerRepository extends MongoRepository<Player, String>{
    Optional<Player> findByName(String name);
    boolean existsByName(String name);
    void deleteByName(String name);
}
