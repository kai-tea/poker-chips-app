package com.pokerchipsapp.dto;

import java.util.List;

public class ResolveShowdownRequest {
    private String hostName;
    private String winnerName;
    private List<String> winnerNames;
    private List<List<String>> rankedHands;

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

    public List<String> getWinnerNames() {
        return winnerNames;
    }

    public void setWinnerNames(List<String> winnerNames) {
        this.winnerNames = winnerNames;
    }

    public List<List<String>> getRankedHands() {
        return rankedHands;
    }

    public void setRankedHands(List<List<String>> rankedHands) {
        this.rankedHands = rankedHands;
    }
}
