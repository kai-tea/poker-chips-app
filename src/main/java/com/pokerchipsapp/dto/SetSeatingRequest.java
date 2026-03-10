package com.pokerchipsapp.dto;

import java.util.List;

public class SetSeatingRequest {
    private String hostName;
    private List<PlayerSeatAssignment> assignments;

    public SetSeatingRequest() {}

    public String getHostName() {
        return hostName;
    }

    public List<PlayerSeatAssignment> getAssignments() {
        return assignments;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public void setAssignments(List<PlayerSeatAssignment> assignments) {
        this.assignments = assignments;
    }
}
