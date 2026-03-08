package com.pokerchipsapp.dto;

public class PreCheckFoldRequest {
    private String name;
    private boolean enabled;

    public PreCheckFoldRequest() {}

    public String getName() {
        return name;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}