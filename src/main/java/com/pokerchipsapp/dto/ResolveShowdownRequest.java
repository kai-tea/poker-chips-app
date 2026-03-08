package com.pokerchipsapp.dto;

public class ResolveShowdownRequest {
    private String hostName;
    private String winnerName;

    public ResolveShowdownRequest() {}

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public String getWinnerName() {
        return winnerName;
    }

    public void setWinnerName(String winnerName) {
        this.winnerName = winnerName;
    }
}