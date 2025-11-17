import React from 'react';
import { Vote } from 'lucide-react';

const ProposalIndicator = ({ proposalCount, onClick }) => {
  if (!proposalCount || proposalCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-yellow-500/90 backdrop-blur-sm rounded-full animate-pulse hover:bg-yellow-500 transition-colors"
    >
      <Vote className="w-3 h-3 text-black" />
      <span className="text-xs font-semibold text-black">
        {proposalCount} Active Proposal{proposalCount > 1 ? 's' : ''}
      </span>
    </button>
  );
};

export default ProposalIndicator;