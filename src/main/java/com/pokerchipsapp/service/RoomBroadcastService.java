package com.pokerchipsapp.service;

import com.pokerchipsapp.model.Room;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RoomBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    public RoomBroadcastService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void broadcastRoom(Room room) {
        messagingTemplate.convertAndSend("/topic/room/" + room.getCode(), room);
    }
}