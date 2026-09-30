// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract StudyPulse {
    enum Status { Active, Completed, Cancelled }

    struct Goal {
        address owner;
        string title;
        uint64 deadline;
        uint64 createdAt;
        Status status;
    }

    Goal[] private goals;

    event GoalCreated(uint256 indexed goalId, address indexed owner, string title, uint64 deadline);
    event GoalStatusChanged(uint256 indexed goalId, address indexed owner, Status status);

    modifier goalExists(uint256 goalId) {
        require(goalId < goals.length, "Goal does not exist");
        _;
    }

    modifier onlyGoalOwner(uint256 goalId) {
        require(goals[goalId].owner == msg.sender, "Only the goal owner can update it");
        _;
    }

    function createGoal(string calldata title, uint64 deadline) external {
        require(bytes(title).length >= 3 && bytes(title).length <= 80, "Title must be 3-80 characters");
        require(deadline > block.timestamp, "Deadline must be in the future");

        goals.push(Goal({
            owner: msg.sender,
            title: title,
            deadline: deadline,
            createdAt: uint64(block.timestamp),
            status: Status.Active
        }));

        emit GoalCreated(goals.length - 1, msg.sender, title, deadline);
    }

    function completeGoal(uint256 goalId) external goalExists(goalId) onlyGoalOwner(goalId) {
        require(goals[goalId].status == Status.Active, "Goal is not active");
        goals[goalId].status = Status.Completed;
        emit GoalStatusChanged(goalId, msg.sender, Status.Completed);
    }

    function cancelGoal(uint256 goalId) external goalExists(goalId) onlyGoalOwner(goalId) {
        require(goals[goalId].status == Status.Active, "Goal is not active");
        goals[goalId].status = Status.Cancelled;
        emit GoalStatusChanged(goalId, msg.sender, Status.Cancelled);
    }

    function getGoals() external view returns (Goal[] memory) {
        return goals;
    }

    function goalCount() external view returns (uint256) {
        return goals.length;
    }
}
