import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FormDrafts {
  campaign: {
    serviceId: string;
    name: string;
    budgetNrt: number | '';
    startDate: string;
    endDate: string;
    isRecurring: boolean;
    targetLocations: any[];
  };
  service: {
    name: string;
    description: string;
    category: string;
    webUrl: string;
    androidUrl: string;
    iosUrl: string;
    logoPreview: string | null;
  };
}

interface FormStore {
  drafts: FormDrafts;
  updateCampaignDraft: (updates: Partial<FormDrafts['campaign']>) => void;
  updateServiceDraft: (updates: Partial<FormDrafts['service']>) => void;
  clearCampaignDraft: () => void;
  clearServiceDraft: () => void;
}

const initialDrafts: FormDrafts = {
  campaign: {
    serviceId: '',
    name: '',
    budgetNrt: '',
    startDate: '',
    endDate: '',
    isRecurring: false,
    targetLocations: [],
  },
  service: {
    name: '',
    description: '',
    category: 'Streaming',
    webUrl: '',
    androidUrl: '',
    iosUrl: '',
    logoPreview: null,
  },
};

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      drafts: initialDrafts,
      updateCampaignDraft: (updates) => 
        set((state) => ({ 
          drafts: { ...state.drafts, campaign: { ...state.drafts.campaign, ...updates } } 
        })),
      updateServiceDraft: (updates) => 
        set((state) => ({ 
          drafts: { ...state.drafts, service: { ...state.drafts.service, ...updates } } 
        })),
      clearCampaignDraft: () => 
        set((state) => ({ 
          drafts: { ...state.drafts, campaign: initialDrafts.campaign } 
        })),
      clearServiceDraft: () => 
        set((state) => ({ 
          drafts: { ...state.drafts, service: initialDrafts.service } 
        })),
    }),
    {
      name: 'nrt-form-drafts',
    }
  )
);
