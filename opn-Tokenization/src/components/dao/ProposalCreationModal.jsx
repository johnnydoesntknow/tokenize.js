import React, { useState } from 'react';
import { X, Upload, FileText, Calendar, DollarSign, Users, Loader2 } from 'lucide-react';
import { uploadMetadataToIPFS } from '../../utils/ipfsUpload';

const ProposalCreationModal = ({ isOpen, onClose, assetId, assetName, onProposalCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposalType: 'maintenance', // maintenance, upgrade, sale, other
    estimatedCost: '',
    votingPeriodDays: 7,
    documentation: null,
    documentationUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      // Upload document to IPFS
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
          'pinata_secret_api_key': import.meta.env.VITE_PINATA_API_SECRET
        },
        body: formData
      });
      
      const data = await res.json();
      const docUrl = `${import.meta.env.VITE_IPFS_GATEWAY}${data.IpfsHash}`;
      
      setFormData(prev => ({
        ...prev,
        documentation: file.name,
        documentationUrl: docUrl
      }));
    } catch (error) {
      console.error('Document upload failed:', error);
      alert('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      // Create proposal metadata
      const proposalMetadata = {
        assetId,
        assetName,
        title: formData.title,
        description: formData.description,
        type: formData.proposalType,
        estimatedCost: formData.estimatedCost,
        votingPeriodDays: formData.votingPeriodDays,
        documentation: formData.documentationUrl,
        createdAt: new Date().toISOString(),
        status: 'active',
        votes: {
          yes: 0,
          no: 0,
          total: 0
        }
      };

      // Upload to IPFS
      const metadataHash = await uploadMetadataToIPFS(proposalMetadata);
      
      // Here you would call the smart contract to create the proposal
      // For now, we'll just simulate it
      console.log('Proposal created with IPFS hash:', metadataHash);
      
      onProposalCreated({
        ...proposalMetadata,
        ipfsHash: metadataHash,
        id: Date.now() // Temporary ID
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create proposal:', error);
      alert('Failed to create proposal');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-black border border-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-black border-b border-neutral-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Create Proposal</h2>
            <p className="text-sm text-neutral-400 mt-1">for {assetName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Proposal Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Proposal Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
              placeholder="e.g., House Painting Proposal"
            />
          </div>

          {/* Proposal Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Proposal Type
            </label>
            <select
              value={formData.proposalType}
              onChange={(e) => setFormData(prev => ({ ...prev, proposalType: e.target.value }))}
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
            >
              <option value="maintenance">Maintenance</option>
              <option value="upgrade">Upgrade/Improvement</option>
              <option value="sale">Asset Sale</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700 resize-none"
              placeholder="Detailed description of the proposal..."
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Estimated Cost (OPN)
            </label>
            <input
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
              placeholder="100"
              step="0.01"
            />
            <p className="text-xs text-neutral-500 mt-1">
              This cost will be split proportionally among shareholders
            </p>
          </div>

          {/* Voting Period */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Voting Period (Days)
            </label>
            <input
              type="number"
              value={formData.votingPeriodDays}
              onChange={(e) => setFormData(prev => ({ ...prev, votingPeriodDays: e.target.value }))}
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
              min="1"
              max="30"
            />
          </div>

          {/* Documentation Upload */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Supporting Documentation
            </label>
            <div className="border-2 border-dashed border-neutral-800 rounded-lg p-4">
              {formData.documentation ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">{formData.documentation}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, documentation: null, documentationUrl: '' }))}
                    className="text-red-500 hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    disabled={uploadingDoc}
                  />
                  <div className="text-center py-2">
                    {uploadingDoc ? (
                      <Loader2 className="w-5 h-5 text-neutral-500 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                        <p className="text-sm text-neutral-400">
                          Click to upload documentation (PDF, DOC, TXT)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Quorum Notice */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Users className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm text-blue-500 font-medium">Voting Requirements</p>
                <p className="text-xs text-blue-400 mt-1">
                  • Minimum 51% of shareholders must vote
                  <br />
                  • Proposal passes with 51% approval
                  <br />
                  • Each shareholder's vote weight = ownership percentage
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !formData.title || !formData.description}
            className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Proposal...
              </>
            ) : (
              'Create Proposal'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProposalCreationModal;