package com.pokerchipsapp;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlayerRepository extends MongoRepository<Player, String>{
    Optional<Player> findByName(String name);
    boolean existsByName(String name);
    void deleteByName(String name);
}
