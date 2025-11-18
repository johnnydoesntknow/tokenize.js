import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, DollarSign, FileText, Users, AlertCircle } from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';

const ProposalVotingCard = ({ proposal, userOwnership, onVote }) => {
  const { address } = useWeb3();
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [voting, setVoting] = useState(false);

  // Calculate vote percentages
  const totalVotes = proposal.votes.yes + proposal.votes.no;
  const yesPercentage = totalVotes > 0 ? (proposal.votes.yes / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (proposal.votes.no / totalVotes) * 100 : 0;
  
  // Calculate user's share of cost
  const userCost = (parseFloat(proposal.estimatedCost) * (userOwnership / 100)).toFixed(2);
  
  // Calculate time remaining
  const endDate = new Date(proposal.createdAt);
  endDate.setDate(endDate.getDate() + proposal.votingPeriodDays);
  const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

  const handleVote = async (voteType) => {
    setVoting(true);
    try {
      // Here you would call the smart contract
      // For now, simulate the vote
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasVoted(true);
      setUserVote(voteType);
      
      // Update proposal votes (in real app, this would come from chain)
      if (voteType === 'yes') {
        proposal.votes.yes += userOwnership;
      } else {
        proposal.votes.no += userOwnership;
      }
      proposal.votes.total += userOwnership;
      
      onVote(proposal.id, voteType, userOwnership);
    } catch (error) {
      console.error('Voting failed:', error);
      alert('Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const getProposalTypeColor = (type) => {
    switch (type) {
      case 'maintenance': return 'bg-yellow-500/10 text-yellow-500';
      case 'upgrade': return 'bg-blue-500/10 text-blue-500';
      case 'sale': return 'bg-red-500/10 text-red-500';
      default: return 'bg-neutral-500/10 text-neutral-500';
    }
  };

  return (
    <div className="bg-black border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getProposalTypeColor(proposal.type)}`}>
                {proposal.type.charAt(0).toUpperCase() + proposal.type.slice(1)}
              </span>
              {daysRemaining <= 2 && (
                <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-medium">
                  Ending Soon
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-neutral-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{daysRemaining}d left</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-neutral-400 line-clamp-2">{proposal.description}</p>
      </div>

      {/* Cost & Your Share */}
      <div className="p-4 bg-neutral-950/50 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Total Cost</p>
          <p className="text-lg font-semibold text-white flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {proposal.estimatedCost} OPN
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Your Share ({userOwnership}%)</p>
          <p className="text-lg font-semibold text-yellow-500 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {userCost} OPN
          </p>
          {/* <p className="text-xs text-neutral-600 mt-1 line-through">Payment disabled for testnet</p> */}
        </div>
      </div>

      {/* Current Votes */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">Current Results</span>
          <span className="text-neutral-500">
            {proposal.votes.total}% voted
          </span>
        </div>
        
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-green-500">Yes</span>
              <span className="text-sm text-green-500">{yesPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${yesPercentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-red-500">No</span>
              <span className="text-sm text-red-500">{noPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${noPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quorum Status */}
        <div className={`p-2 rounded-lg ${proposal.votes.total >= 51 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          <div className="flex items-center gap-2">
            {proposal.votes.total >= 51 ? (
              <>
                <Users className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500">Quorum reached</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-yellow-500">
                  Need {(51 - proposal.votes.total).toFixed(1)}% more votes for quorum
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Voting Buttons */}
      <div className="p-4 border-t border-neutral-800">
        {hasVoted ? (
          <div className="text-center py-2">
            <p className="text-sm text-neutral-400">
              You voted <span className={userVote === 'yes' ? 'text-green-500' : 'text-red-500'}>
                {userVote === 'yes' ? 'Yes' : 'No'}
              </span> with {userOwnership}% weight
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVote('yes')}
              disabled={voting}
              className="flex items-center justify-center gap-2 py-2 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Vote Yes</span>
            </button>
            
            <button
              onClick={() => handleVote('no')}
              disabled={voting}
              className="flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              <span>Vote No</span>
            </button>
          </div>
        )}
      </div>

      {/* Documentation Link */}
      {proposal.documentation && (
        <div className="px-4 pb-4">
          
            href={proposal.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
          <a>
            <FileText className="w-3 h-3" />
            View Documentation
          </a>
        </div>
      )}
    </div>
  );
};

export default ProposalVotingCard;