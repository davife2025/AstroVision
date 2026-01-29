// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AstroDAO
 * @dev Simplified Decentralized Science DAO for community governance and voting
 * No token requirements - anyone can create proposals and vote
 */
contract AstroDAO is Ownable, ReentrancyGuard {
    
    // Proposal types
    enum ProposalType {
        WEEKLY_TOPIC,
        SCIENTIFIC_DISCOVERY,
        KNOWLEDGE_SHARING,
        FUNDING,
        GENERAL
    }
    
    enum ProposalStatus {
        PENDING,
        ACTIVE,
        PASSED,
        REJECTED,
        EXECUTED
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        string title;
        string description;
        string ipfsHash;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    struct ScientificDiscovery {
        uint256 proposalId;
        string discoveryTitle;
        string researcherName;
        string paperIPFS;
        uint256 votingScore;
        uint256 timestamp;
    }
    
    // State variables
    uint256 public proposalCount;
    uint256 public votingPeriod = 7 days;
    uint256 public quorumPercentage = 10; // 10% of total voters needed
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => ScientificDiscovery) public discoveries;
    mapping(uint256 => address[]) public proposalVoters; // Track voters per proposal
    
    uint256[] public weeklyTopicProposals;
    uint256[] public discoveryProposals;
    uint256[] public knowledgeSharingProposals;
    
    address[] public allVoters; // Track all unique voters
    mapping(address => bool) public hasVotedEver; // Track if address has ever voted
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string title
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    
    event DiscoverySubmitted(
        uint256 indexed proposalId,
        string title,
        string researcher
    );
    
    // Constructor
    constructor() Ownable(msg.sender) {
        // No governance token needed
    }
    
    /**
     * @dev Create a new proposal - NO TOKEN REQUIRED
     */
    function createProposal(
        ProposalType _type,
        string memory _title,
        string memory _description,
        string memory _ipfsHash
    ) public returns (uint256) {
        // No token requirement - anyone can create a proposal!
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.proposalType = _type;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.ipfsHash = _ipfsHash;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + votingPeriod;
        newProposal.status = ProposalStatus.ACTIVE;
        
        // Categorize proposal
        if (_type == ProposalType.WEEKLY_TOPIC) {
            weeklyTopicProposals.push(proposalId);
        } else if (_type == ProposalType.SCIENTIFIC_DISCOVERY) {
            discoveryProposals.push(proposalId);
        } else if (_type == ProposalType.KNOWLEDGE_SHARING) {
            knowledgeSharingProposals.push(proposalId);
        }
        
        emit ProposalCreated(proposalId, msg.sender, _type, _title);
        
        return proposalId;
    }
    
    /**
     * @dev Submit a scientific discovery for voting
     */
    function submitDiscovery(
        string memory _title,
        string memory _description,
        string memory _researcherName,
        string memory _paperIPFS
    ) external returns (uint256) {
        uint256 proposalId = createProposal(
            ProposalType.SCIENTIFIC_DISCOVERY,
            _title,
            _description,
            _paperIPFS
        );
        
        discoveries[proposalId] = ScientificDiscovery({
            proposalId: proposalId,
            discoveryTitle: _title,
            researcherName: _researcherName,
            paperIPFS: _paperIPFS,
            votingScore: 0,
            timestamp: block.timestamp
        });
        
        emit DiscoverySubmitted(proposalId, _title, _researcherName);
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal - ONE VOTE PER ADDRESS
     */
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(proposal.status == ProposalStatus.ACTIVE, "Proposal not active");
        
        // Mark as voted
        proposal.hasVoted[msg.sender] = true;
        
        // Track voter
        proposalVoters[_proposalId].push(msg.sender);
        
        // Track unique voter (for quorum calculation)
        if (!hasVotedEver[msg.sender]) {
            hasVotedEver[msg.sender] = true;
            allVoters.push(msg.sender);
        }
        
        // Count vote (1 wallet = 1 vote)
        if (_support) {
            proposal.votesFor += 1;
        } else {
            proposal.votesAgainst += 1;
        }
        
        // Update discovery score if applicable
        if (proposal.proposalType == ProposalType.SCIENTIFIC_DISCOVERY) {
            discoveries[_proposalId].votingScore = proposal.votesFor;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support);
    }
    
    /**
     * @dev Finalize a proposal after voting period
     */
    function finalizeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(proposal.status == ProposalStatus.ACTIVE, "Already finalized");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        
        // Simple majority wins
        if (totalVotes > 0 && proposal.votesFor > proposal.votesAgainst) {
            proposal.status = ProposalStatus.PASSED;
        } else {
            proposal.status = ProposalStatus.REJECTED;
        }
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        ProposalType proposalType,
        string memory title,
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 endTime,
        ProposalStatus status
    ) {
        Proposal storage p = proposals[_proposalId];
        return (
            p.id,
            p.proposer,
            p.proposalType,
            p.title,
            p.description,
            p.votesFor,
            p.votesAgainst,
            p.endTime,
            p.status
        );
    }
    
    /**
     * @dev Get weekly topic proposals
     */
    function getWeeklyTopics() external view returns (uint256[] memory) {
        return weeklyTopicProposals;
    }
    
    /**
     * @dev Get top discoveries by votes
     */
    function getTopDiscoveries(uint256 _count) external view returns (uint256[] memory) {
        uint256 actualCount = _count;
        if (actualCount > discoveryProposals.length) {
            actualCount = discoveryProposals.length;
        }
        
        uint256[] memory topDiscoveries = new uint256[](actualCount);
        uint256[] memory scores = new uint256[](actualCount);
        
        for (uint256 i = 0; i < discoveryProposals.length; i++) {
            uint256 proposalId = discoveryProposals[i];
            uint256 score = discoveries[proposalId].votingScore;
            
            for (uint256 j = 0; j < actualCount; j++) {
                if (score > scores[j]) {
                    // Shift down
                    for (uint256 k = actualCount - 1; k > j; k--) {
                        scores[k] = scores[k - 1];
                        topDiscoveries[k] = topDiscoveries[k - 1];
                    }
                    scores[j] = score;
                    topDiscoveries[j] = proposalId;
                    break;
                }
            }
        }
        
        return topDiscoveries;
    }
    
    /**
     * @dev Get knowledge sharing proposals
     */
    function getKnowledgeSharingProposals() external view returns (uint256[] memory) {
        return knowledgeSharingProposals;
    }
    
    /**
     * @dev Check if user has voted on a proposal
     */
    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return proposals[_proposalId].hasVoted[_voter];
    }
    
    /**
     * @dev Get voters for a proposal
     */
    function getProposalVoters(uint256 _proposalId) external view returns (address[] memory) {
        return proposalVoters[_proposalId];
    }
    
    /**
     * @dev Get total number of unique voters ever
     */
    function getTotalVoters() external view returns (uint256) {
        return allVoters.length;
    }
    
    /**
     * @dev Update governance parameters (only owner)
     */
    function updateParameters(
        uint256 _votingPeriod,
        uint256 _quorumPercentage
    ) external onlyOwner {
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
    }
}
