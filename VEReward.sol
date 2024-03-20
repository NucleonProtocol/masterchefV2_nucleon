// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ive.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract veReward is Initializable{
    using SafeERC20 for IERC20;

    struct EpochInfo {
        uint startTime;
        uint endTime;
        uint rewardPerSecond; // totalReward * RewardMultiplier / (endBlock - startBlock)
        uint totalPower;
        uint startBlock;
    }

    /// @dev Ve nft
    address public  _ve;
    /// @dev reward erc20 token, xCFX
    address public  rewardToken;
    /// @dev RewardMultiplier
    uint  RewardMultiplier = 10000000;
    /// @dev BlockMultiplier
    uint  BlockMultiplier = 1000000000000000000;

    /// @dev reward epochs.
    EpochInfo[] public epochInfo;

    /// @dev user's last claim time.
    mapping(uint => mapping(uint => uint)) public userLastClaimTime; // tokenId -> epoch id -> last claim timestamp\

    address public admin;
    address public pendingAdmin;
    address public admin2;
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }
    modifier onlyAdmin2() {
        require(msg.sender == admin2);
        _;
    }

    event LogClaimReward(uint tokenId, uint reward);
    event LogAddEpoch(uint epochId, EpochInfo epochInfo);
    event LogAddEpoch(uint startTime, uint epochLength, uint epochCount, uint startEpochId);
    event LogTransferAdmin(address pendingAdmin);
    event LogAcceptAdmin(address admin);
    event LogSetAdmin2(address admin2);

    // constructor (
    //     address _ve_,
    //     address rewardToken_
    // ) {
    //     admin = msg.sender;
    //     admin2 = msg.sender;
    //     _ve = _ve_;
    //     rewardToken = rewardToken_;
    //     // add init point
    //     addCheckpoint();
    // }
    uint internal initz;
    function initialize(
        address _ve_,
        address rewardToken_) public initializer {
        require(initz == 0,"inited");
        initz = 1;
        admin = msg.sender;
        admin2 = msg.sender;
        _ve = _ve_;
        rewardToken = rewardToken_;
        RewardMultiplier = 10000000;
        BlockMultiplier = 1000000000000000000;
        // add init point
        addCheckpoint();
    }

    struct Point {
        uint256 ts;
        uint256 blk; // block
    }

    /// @dev list of checkpoints, used in getBlockByTime
    Point[] public point_history;
   
    /// @notice add checkpoint to point_history
    /// called in constructor, addEpoch, addEpochBatch and claimReward
    /// point_history increments without repetition, length always >= 1
    function addCheckpoint() internal {
        point_history.push(Point(block.timestamp, block.number));
    }
    
    /// @notice estimate last block number before given time
    /// @return blockNumber
    function getBlockByTime(uint _time) public view returns (uint) {
        // Binary search
        uint _min = 0;
        uint _max = point_history.length - 1; // asserting length >= 2
        for (uint i = 0; i < 128; ++i) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint _mid = (_min + _max + 1) / 2;
            if (point_history[_mid].ts <= _time) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }

        Point memory point0 = point_history[_min];
        Point memory point1 = point_history[_min + 1];
        if (_time == point0.ts) {
            return point0.blk;
        }
        // asserting point0.blk < point1.blk, point0.ts < point1.ts
        uint block_slope; // dblock/dt
        block_slope = (BlockMultiplier * (point1.blk - point0.blk)) / (point1.ts - point0.ts);
        uint dblock = (block_slope * (_time - point0.ts)) / BlockMultiplier;
        return point0.blk + dblock;
    }

    function withdrawFee(uint amount) external onlyAdmin {
        IERC20(rewardToken).safeTransfer(admin, amount);
    }

    function transferAdmin(address _admin) external onlyAdmin {
        pendingAdmin = _admin;
        emit LogTransferAdmin(pendingAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin);
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit LogAcceptAdmin(admin);
    }
    function setAdmin2(address _admin2) external onlyAdmin {
        admin2 = _admin2;
        emit LogSetAdmin2(admin2);
    }

    /// @notice add one epoch
    /// @return epochId
    /// @return accurateTotalReward
    function addEpoch(uint startTime, uint endTime, uint totalReward) external onlyAdmin2 returns(uint, uint) {
        assert(block.timestamp < endTime && startTime < endTime);
        if (epochInfo.length > 0) {
            require(epochInfo[epochInfo.length - 1].endTime <= startTime);
        }
        (uint epochId, uint accurateTotalReward) = _addEpoch(startTime, endTime, totalReward);
        uint lastPointTime = point_history[point_history.length - 1].ts;
        if (lastPointTime < block.timestamp) {
            addCheckpoint();
        }
        emit LogAddEpoch(epochId, epochInfo[epochId]);
        return (epochId, accurateTotalReward);
    }

    /// @notice add a batch of continuous epochs
    /// @return firstEpochId
    /// @return lastEpochId
    /// @return accurateTotalReward
    function addEpochBatch(uint startTime, uint epochLength, uint epochCount, uint totalReward) external onlyAdmin2 returns(uint, uint, uint) {
        require(block.timestamp < startTime + epochLength);
        if (epochInfo.length > 0) {
            require(epochInfo[epochInfo.length - 1].endTime <= startTime);
        }
        uint _reward = totalReward / epochCount;
        uint _epochId;
        uint accurateTR;
        uint _start = startTime;
        uint _end = _start + epochLength;
        for (uint i = 0; i < epochCount; i++) {
            (_epochId, accurateTR) = _addEpoch(_start, _end, _reward);
            _start = _end;
            _end = _start + epochLength;
        }
        uint lastPointTime = point_history[point_history.length - 1].ts;
        if (lastPointTime < block.timestamp) {
            addCheckpoint();
        }
        emit LogAddEpoch(startTime, epochLength, epochCount, _epochId + 1 - epochCount);
        return (_epochId + 1 - epochCount, _epochId, accurateTR * epochCount);
    }

    /// @notice add one epoch
    /// @return epochId
    /// @return accurateTotalReward
    function _addEpoch(uint startTime, uint endTime, uint totalReward) internal returns(uint, uint) {
        uint rewardPerSecond = totalReward * RewardMultiplier / (endTime - startTime);
        uint epochId = epochInfo.length;
        epochInfo.push(EpochInfo(startTime, endTime, rewardPerSecond, 1, 1));
        uint accurateTotalReward = (endTime - startTime) * rewardPerSecond / RewardMultiplier;
        return (epochId, accurateTotalReward);
    }

    /// @notice set epoch reward
    function updateEpochReward(uint epochId, uint totalReward) external onlyAdmin {
        require(block.timestamp < epochInfo[epochId].startTime);
        epochInfo[epochId].rewardPerSecond = totalReward * RewardMultiplier / (epochInfo[epochId].endTime - epochInfo[epochId].startTime);
    }

    /// @notice query pending reward by epoch
    /// @return pendingReward
    /// @return finished
    /// panic when block.timestamp < epoch.startTime
    function _pendingRewardSingle(uint tokenId, uint lastClaimTime, EpochInfo memory epoch) internal view returns (uint, bool) {
        uint last = lastClaimTime >= epoch.startTime ? lastClaimTime : epoch.startTime;
        if (last >= epoch.endTime) {
            return (0, true);
        }
        if (epoch.totalPower == 0) {
            return (0, true);
        }
        
        uint end = block.timestamp;
        bool finished = false;
        if (end > epoch.endTime) {
            end = epoch.endTime;
            finished = true;
        }

        uint power = ive(_ve).balanceOfAtNFT(tokenId, epoch.startBlock);
        
        uint reward = epoch.rewardPerSecond * (end - last) * power / (epoch.totalPower * RewardMultiplier);
        return (reward, finished);
    }

    function checkpointAndCheckEpoch(uint epochId) public {
        uint lastPointTime = point_history[point_history.length - 1].ts;
        if (lastPointTime < block.timestamp) {
            addCheckpoint();
        }
        checkEpoch(epochId);
    }

    function checkEpoch(uint epochId) internal {
        if (epochInfo[epochId].startBlock == 1) {
            epochInfo[epochId].startBlock = getBlockByTime(epochInfo[epochId].startTime);
        }
        if (epochInfo[epochId].totalPower == 1) {
            epochInfo[epochId].totalPower = ive(_ve).totalSupplyAt(epochInfo[epochId].startBlock);
        }
    }

    struct Interval {
        uint startEpoch;
        uint endEpoch;
    }

    struct IntervalReward {
        uint startEpoch;
        uint endEpoch;
        uint reward;
    }

    function claimRewardMany(uint[] calldata tokenIds, Interval[][] calldata intervals) public returns (uint[] memory rewards) {
        require(tokenIds.length == intervals.length, "length not equal");
        rewards = new uint[] (tokenIds.length);
        for (uint i = 0; i < tokenIds.length; i++) {
            rewards[i] = claimReward(tokenIds[i], intervals[i]);
        }
        return rewards;
    }

    function claimReward(uint tokenId, Interval[] calldata intervals) public returns (uint reward) {
        for (uint i = 0; i < intervals.length; i++) {
            reward += claimReward(tokenId, intervals[i].startEpoch, intervals[i].endEpoch);
        }
        return reward;
    }

    /// @notice claim reward in range
    function claimReward(uint tokenId, uint startEpoch, uint endEpoch) public returns (uint reward) {
        require(msg.sender == ive(_ve).ownerOf(tokenId));
        require(endEpoch < epochInfo.length, "claim out of range");
        EpochInfo memory epoch;
        uint lastPointTime = point_history[point_history.length - 1].ts;
        for (uint i = startEpoch; i <= endEpoch; i++) {
            epoch = epochInfo[i];
            if (block.timestamp < epoch.startTime) {
                break;
            }
            if (lastPointTime < epoch.startTime) {
                // this branch runs 0 or 1 time
                lastPointTime = block.timestamp;
                addCheckpoint();
            }
            checkEpoch(i);
            (uint reward_i, bool finished) = _pendingRewardSingle(tokenId, userLastClaimTime[tokenId][i], epochInfo[i]);
            if (reward_i > 0) {
                reward += reward_i;
                userLastClaimTime[tokenId][i] = block.timestamp;
            }
            if (!finished) {
                break;
            }
        }
        IERC20(rewardToken).safeTransfer(ive(_ve).ownerOf(tokenId), reward);
        emit LogClaimReward(tokenId, reward);
        return reward;
    }

    /// @notice get epoch by time
    function getEpochIdByTime(uint _time) view public returns (uint) {
        assert(epochInfo[0].startTime <= _time);
        if (_time > epochInfo[epochInfo.length - 1].startTime) {
            return epochInfo.length - 1;
        }
        // Binary search
        uint _min = 0;
        uint _max = epochInfo.length - 1; // asserting length >= 2
        for (uint i = 0; i < 128; ++i) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint _mid = (_min + _max + 1) / 2;
            if (epochInfo[_mid].startTime <= _time) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    /**
    External read functions
     */
    struct RewardInfo {
        uint epochId;
        uint reward;
    }

    uint constant MaxQueryLength = 50;

    /// @notice get epoch info
    /// @return startTime
    /// @return endTime
    /// @return totalReward
    function getEpochInfo(uint epochId) public view returns (uint, uint, uint) {
        if (epochId >= epochInfo.length) {
            return (0,0,0);
        }
        EpochInfo memory epoch = epochInfo[epochId];
        uint totalReward = (epoch.endTime - epoch.startTime) * epoch.rewardPerSecond / RewardMultiplier;
        return (epoch.startTime, epoch.endTime, totalReward);
    }

    function getCurrentEpochId() public view returns (uint) {
        uint currentEpochId = getEpochIdByTime(block.timestamp);
        return currentEpochId;
    }

    /// @notice only for external view functions
    /// Time beyond last checkpoint resulting in inconsistent estimated block number.
    function getBlockByTimeWithoutLastCheckpoint(uint _time) public view returns (uint) {
        if (point_history[point_history.length - 1].ts >= _time) {
            return getBlockByTime(_time);
        }
        Point memory point0 = point_history[point_history.length - 1];
        if (_time == point0.ts) {
            return point0.blk;
        }
        uint block_slope;
        block_slope = (BlockMultiplier * (block.number - point0.blk)) / (block.timestamp - point0.ts);
        uint dblock = (block_slope * (_time - point0.ts)) / BlockMultiplier;
        return point0.blk + dblock;
    }

    function getEpochStartBlock(uint epochId) public view returns (uint) {
        if (epochInfo[epochId].startBlock == 1) {
            return getBlockByTimeWithoutLastCheckpoint(epochInfo[epochId].startTime);
        }
        return epochInfo[epochId].startBlock;
    }

    function getEpochTotalPower(uint epochId) public view returns (uint) {
        if (epochInfo[epochId].totalPower == 1) {
            uint blk = getEpochStartBlock(epochId);
            if (blk > block.number) {
                return ive(_ve).totalSupplyAtT(epochInfo[epochId].startTime);
            }
            return ive(_ve).totalSupplyAt(blk);
        }
        return epochInfo[epochId].totalPower;
    }

    /// @notice get user's power at epochId
    function getUserPower(uint tokenId, uint epochId) view public returns (uint) {
        EpochInfo memory epoch = epochInfo[epochId];
        uint blk = getBlockByTimeWithoutLastCheckpoint(epoch.startTime);
        if (blk < block.number) {
            return ive(_ve).balanceOfAtNFT(tokenId, blk);
        }
        return ive(_ve).balanceOfNFTAt(tokenId, epochInfo[epochId].startTime);
    }

    /// @notice
    /// Current epoch reward is inaccurate
    /// because the checkpoint may not have been added.
    function getPendingRewardSingle(uint tokenId, uint epochId) public view returns (uint reward, bool finished) {
        if (epochId > getCurrentEpochId()) {
            return (0, false);
        }
        EpochInfo memory epoch = epochInfo[epochId];
        uint startBlock = getEpochStartBlock(epochId);
        uint totalPower = getEpochTotalPower(epochId);
        if (totalPower == 0) {
            return (0, true);
        }
        uint power = ive(_ve).balanceOfAtNFT(tokenId, startBlock);

        uint last = userLastClaimTime[tokenId][epochId];
        last = last >= epoch.startTime ? last : epoch.startTime;
        if (last >= epoch.endTime) {
            return (0, true);
        }
        
        uint end = block.timestamp;
        finished = false;
        if (end > epoch.endTime) {
            end = epoch.endTime;
            finished = true;
        }
        
        reward = epoch.rewardPerSecond * (end - last) * power / (totalPower * RewardMultiplier);
        return (reward, finished);
    }

    /// @notice get claimable rewards
    function userPendingReward(uint tokenId, uint start, uint end) public view returns (uint Rewards) {
        uint current = getCurrentEpochId();
        require(start <= end);
        if (end > current) {
            end = current;
        }
        RewardInfo[] memory rewards = new RewardInfo[](end - start + 1);
        for (uint i = start; i <= end; i++) {
            if (block.timestamp < epochInfo[i].startTime) {
                break;
            }
            (uint reward_i,) = getPendingRewardSingle(tokenId, i);
            rewards[i-start] = RewardInfo(i, reward_i);
        }

        // omit zero rewards and convert epoch list to intervals
        IntervalReward[] memory intervalRewards_0 = new IntervalReward[] (rewards.length);
        uint intv = 0;
        uint intvCursor = 0;
        uint sum = 0;
        for (uint i = 0; i < rewards.length; i++) {
            if (rewards[i].reward == 0) {
                if (i != intvCursor) {
                    intervalRewards_0[intv] = IntervalReward(rewards[intvCursor].epochId, rewards[i-1].epochId, sum);
                    intv++;
                    sum = 0;
                }
                intvCursor = i + 1;
                continue;
            }
            sum += rewards[i].reward;
        }
        return sum;
    }

    /// @notice get claimable reward
    function pendingReward(uint tokenId, uint start, uint end) public view returns (IntervalReward[] memory intervalRewards) {
        uint current = getCurrentEpochId();
        require(start <= end);
        if (end > current) {
            end = current;
        }
        RewardInfo[] memory rewards = new RewardInfo[](end - start + 1);
        for (uint i = start; i <= end; i++) {
            if (block.timestamp < epochInfo[i].startTime) {
                break;
            }
            (uint reward_i,) = getPendingRewardSingle(tokenId, i);
            rewards[i-start] = RewardInfo(i, reward_i);
        }

        // omit zero rewards and convert epoch list to intervals
        IntervalReward[] memory intervalRewards_0 = new IntervalReward[] (rewards.length);
        uint intv = 0;
        uint intvCursor = 0;
        uint sum = 0;
        for (uint i = 0; i < rewards.length; i++) {
            if (rewards[i].reward == 0) {
                if (i != intvCursor) {
                    intervalRewards_0[intv] = IntervalReward(rewards[intvCursor].epochId, rewards[i-1].epochId, sum);
                    intv++;
                    sum = 0;
                }
                intvCursor = i + 1;
                continue;
            }
            sum += rewards[i].reward;
        }
        if (sum > 0) {
            intervalRewards_0[intv] = IntervalReward(rewards[intvCursor].epochId, rewards[rewards.length-1].epochId, sum);
            intervalRewards = new IntervalReward[] (intv+1);
            // Copy interval array
            for (uint i = 0; i < intv+1; i++) {
                intervalRewards[i] = intervalRewards_0[i];
            }
        } else {
            intervalRewards = new IntervalReward[] (intv);
            // Copy interval array
            for (uint i = 0; i < intv; i++) {
                intervalRewards[i] = intervalRewards_0[i];
            }
        }
        
        return intervalRewards;
    }
}
