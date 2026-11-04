export interface RawLead {
  name: string;
  category: string;
  phone: string;
  whatsappUrl: string;
  address: string;
  website?: string;
  rating: number;
  reviewCount: number;
}

export interface SearchParams {
  niche: string;
  location: string;
}

export interface SearchResult {
  jobId: string;
  niche: string;
  location: string;
  totalFound: number;
  isPaid: boolean;
  sampleLeads: RawLead[];
  lockedCount: number;
}

