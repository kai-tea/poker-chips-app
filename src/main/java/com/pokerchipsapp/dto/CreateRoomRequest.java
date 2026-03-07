package com.pokerchipsapp.dto;

import com.pokerchipsapp.model.RoomSettings;

public class CreateRoomRequest {
    private String code;
    private String host;
    private RoomSettings settings;

    public CreateRoomRequest() {}

    public RoomSettings getSettings() {
        return settings;
    }

    public void setSettings(RoomSettings settings) {
        this.settings = settings;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }
}
