// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ive.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract veGoverance is Initializable {
    using SafeERC20 for IERC20;

    struct EpochInfo {
        uint startTime;
        uint endTime;
        string proposals; // string have options
        uint optionNum;
        address proposer;
        uint[10] optionCounts;
    }

    mapping(address => mapping(uint => mapping(uint => uint))) public tokenId_votes;
    mapping(address => mapping(uint => uint)) public user_choice;
    mapping(uint=>uint) public tokenId_vote_option; 
    mapping(address=>bool) public proponents;
    uint[] public tokenIdCounts;
    uint public user_length;
    uint public MinNUTOwnerLimits = 300000 ether;
    uint public ProposalGas = 0;//1 ether;
    uint public minEpochTime = 604800;

    /// @dev Ve nft
    address public  _ve;
    /// @dev reward erc20 token, xCFX
    address public  NUTaddress;
    /// @dev RewardMultiplier
    uint RewardMultiplier = 10000000;
    /// @dev BlockMultiplier
    uint BlockMultiplier = 1000000000000000000;

    /// @dev reward epochs.
    EpochInfo[] internal epochInfo;

    /// @dev user's last claim time.
    mapping(uint => mapping(uint => uint)) public userLastClaimTime; // tokenId -> epoch id -> last claim timestamp\

    address public admin;
    address public pendingAdmin;

    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    event LogVotes(uint tokenId, uint votes, uint choice);
    event LogAddProposal(uint epochId, EpochInfo epochInfo);
    event LogsetVoteLimits(uint limits,uint gas);
    event LogTransferAdmin(address pendingAdmin);
    event LogAcceptAdmin(address admin);

    // constructor (
    //     address _ve_,
    //     address rewardToken_
    // ) {
    //     admin = msg.sender;
    //     _ve = _ve_;
    //     rewardToken = rewardToken_;
    //     // add init point
    //     addCheckpoint();
    // }
    uint internal initz;
    function initialize(address _ve_,
        address _NUTaddress) public initializer {
        require(initz == 0,"inited");
        initz = 1;
        admin = msg.sender;
        _ve = _ve_;
        NUTaddress = _NUTaddress;
        // add init point
        addCheckpoint();
        MinNUTOwnerLimits = 300000 ether;
        ProposalGas = 0;//1 ether;
        minEpochTime = 360;//604800;
        RewardMultiplier = 10000000;
        BlockMultiplier = 1000000000000000000;
    }
    struct Point {
        uint256 ts;
        uint256 blk; // block
    }

    /// @dev list of checkpoints, used in getBlockByTime
    Point[] public point_history;
   
    /// @notice add checkpoint to point_history
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
    function setVoteLimits(uint _limits, uint _gas) external onlyAdmin{
        MinNUTOwnerLimits = _limits;
        ProposalGas = _gas;
        emit LogsetVoteLimits(_limits,_gas);
    }
    function setMinEpochTime(uint _s) external onlyAdmin{
        minEpochTime = _s;
    }
    function setNUTaddress(address _nut) external onlyAdmin{
        NUTaddress = _nut;
    }
    
    function setProposalers(address _proponents) external onlyAdmin{
        proponents[_proponents] = true;
    }

    /// @notice add one epoch
    /// @return epochId
    function addProposal(uint[] memory ids, uint _startTime, uint _endTime, uint _optionNum, string memory _proposals) external returns(uint) {
        assert(block.timestamp <= _startTime && _startTime + minEpochTime <= _endTime); // min epoch is one week,which is 604800s
        uint usersvotes;
        for(uint i=0; i<ids.length; i++){
            usersvotes += ive(_ve).balanceOfNFTAt(ids[i], block.timestamp);
        }
        if(proponents[msg.sender] == false){
            require(usersvotes >= MinNUTOwnerLimits,"Out of veNUT Limits!");
        }
        
        require(IERC20(NUTaddress).balanceOf(msg.sender) >= ProposalGas,"Out of NUT gas limits ");
        if(ProposalGas>0){
            IERC20(NUTaddress).transferFrom(msg.sender, address(this), ProposalGas);
        }

        (uint epochId) = _addProposal(_startTime, _endTime, _proposals, _optionNum, msg.sender);
        uint lastPointTime = point_history[point_history.length - 1].ts;
        if (lastPointTime < block.timestamp) {
            addCheckpoint();
        }
        emit LogAddProposal(epochId, epochInfo[epochId]);
        return (epochId);
    }


    /// @notice add one epoch
    /// @return epochId
    function _addProposal(uint _startTime, uint _endTime, string memory _proposals,uint _optionNum, address _proposer) internal returns(uint) {
        uint epochId = epochInfo.length;
        uint[10] memory setZeroArray;
        epochInfo.push(EpochInfo(_startTime, _endTime, _proposals, _optionNum, _proposer,setZeroArray));
        return (epochId);
    }

    /// @notice set epoch proposals
    function updateEpochproposals(uint _epochId, string memory _proposals) external onlyAdmin {
        require(block.timestamp < epochInfo[_epochId].startTime);
        epochInfo[_epochId].proposals = _proposals;
    }

    struct Interval {
        uint voteEpoch;
        uint choice;
    }

    function voteMany(uint[] calldata tokenIds, uint voteEpoch, uint choice) public{
        for (uint i = 0; i < tokenIds.length; i++) {
            vote(tokenIds[i], voteEpoch, choice);
        }
    }

    function voteAll(uint voteEpoch, uint choice) public returns(uint lengh){
        uint NFTlength = ive(_ve).balanceOf(msg.sender);
        for (uint i = 0; i < NFTlength; i++) {
            vote(ive(_ve).tokenOfOwnerByIndex(msg.sender, i), voteEpoch, choice);
        }
        return (NFTlength);
    }

    /// @notice Vote tokenId power
    function vote(uint tokenId, uint voteEpoch,uint choice) public {
        require(msg.sender == ive(_ve).ownerOf(tokenId),"You are NOT owner");
        require(block.timestamp > epochInfo[voteEpoch].startTime, "Vote is NOT start");
        require(block.timestamp < epochInfo[voteEpoch].endTime, "Vote Time Over");
        require(ive(_ve).balanceOfNFTAt(tokenId, block.timestamp)>=0,"Zero Votes");
        if(tokenId_votes[msg.sender][voteEpoch][tokenId]>0){
            epochInfo[voteEpoch].optionCounts[user_choice[msg.sender][tokenId]] -= tokenId_votes[msg.sender][voteEpoch][tokenId];
        }
        tokenId_votes[msg.sender][voteEpoch][tokenId] = ive(_ve).balanceOfNFTAt(tokenId, block.timestamp);
        epochInfo[voteEpoch].optionCounts[choice] += tokenId_votes[msg.sender][voteEpoch][tokenId];
        user_choice[msg.sender][tokenId] = choice;

        emit LogVotes(tokenId, tokenId_votes[msg.sender][voteEpoch][tokenId], choice);
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

    /// @notice get epoch info
    /// @return epochInfo
    function getEpochInfo(uint epochId) public view returns (EpochInfo memory) {
        require(epochId < epochInfo.length,"Out of epoch ranges");
        return epochInfo[epochId];
    }

    /// @notice get Current Epoch Id
    /// @return currentEpochId
    function getCurrentEpochId() public view returns (uint) {
        uint currentEpochId = getEpochIdByTime(block.timestamp);
        return currentEpochId;
    }

}
