import { create } from 'zustand';

export interface P2PDispute {
  id: string;
  tradeId: string;
  orderId?: string;
  raisedBy: string;
  category: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  evidenceUrls: string[];
  messages: {
    sender: 'user' | 'admin' | 'counterparty';
    text: string;
    time: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface DisputeState {
  disputes: P2PDispute[];
  addDispute: (dispute: Omit<P2PDispute, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'messages'>) => void;
  updateDispute: (id: string, updates: Partial<P2PDispute>) => void;
}

export const useDisputeStore = create<DisputeState>((set) => ({
  disputes: [
    {
      id: 'dsp-1',
      tradeId: 'TRD-XK9',
      raisedBy: 'user-1',
      category: 'payment_not_received',
      reason: 'Seller has not released NRT after 30 minutes',
      description: 'I have uploaded the proof and messaged the seller multiple times but no response.',
      status: 'investigating',
      evidenceUrls: [],
      messages: [
        { sender: 'user', text: 'Reporting this trade as the seller is unresponsive.', time: '10:30 AM' },
        { sender: 'admin', text: 'We are investigating. Please hold while we verify the payment proof.', time: '11:00 AM' }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  addDispute: (dispute) => set((state) => ({
    disputes: [
      {
        ...dispute,
        id: 'dsp-' + Math.random().toString(36).slice(2, 7),
        status: 'open',
        messages: [{ sender: 'user', text: dispute.reason, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...state.disputes
    ]
  })),
  updateDispute: (id, updates) => set((state) => ({
    disputes: state.disputes.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)
  }))
}));
