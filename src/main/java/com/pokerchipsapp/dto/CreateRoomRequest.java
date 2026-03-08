package com.pokerchipsapp.dto;

import com.pokerchipsapp.model.RoomSettings;

public class CreateRoomRequest {
    private String host;
    private RoomSettings settings;

    public CreateRoomRequest() {}

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public RoomSettings getSettings() {
        return settings;
    }

    public void setSettings(RoomSettings settings) {
        this.settings = settings;
    }
}