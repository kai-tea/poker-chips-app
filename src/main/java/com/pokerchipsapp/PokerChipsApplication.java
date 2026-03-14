package com.pokerchipsapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class PokerChipsApplication {
    public static void main(String[] args) {
        SpringApplication.run(PokerChipsApplication.class, args);
    }
}
