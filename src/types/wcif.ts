export interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city: string;
  country_iso2: string;
}

export interface WCIFActivity {
  id: number;
  name: string;
  activityCode: string;
  startTime: string;
  endTime: string;
  childActivities: WCIFActivity[];
  scrambleSetCount?: number;
}

export interface WCIFRoom {
  id: number;
  name: string;
  activities: WCIFActivity[];
}

export interface WCIFVenue {
  id: number;
  name: string;
  timezone: string;
  rooms: WCIFRoom[];
}

export interface WCIFSchedule {
  startDate: string;
  numberOfDays: number;
  venues: WCIFVenue[];
}

// "5" was added in WCIF v1.1 (best of 5), "h" in v2.0 (head-to-head).
export type WCIFRoundFormat = '1' | '2' | '3' | '5' | 'a' | 'm' | 'h';

export interface WCIFRound {
  id: string;
  format: WCIFRoundFormat;
  // Dual rounds (WCIF v2): the ids of every round in the link, this one included.
  // Each linked round still has its own scramble sets.
  linkedRounds: string[] | null;
  scrambleSetCount: number;
  results: unknown[];
}

export interface WCIFEvent {
  id: string;
  rounds: WCIFRound[];
}

export interface WCIF {
  formatVersion: string;
  id: string;
  name: string;
  events: WCIFEvent[];
  schedule: WCIFSchedule;
}

export interface ScrambleSet {
  name: string;
  activityCode: string;
  setLetter: string;
  startTime: string;
  attemptNumber?: number;
  pdfPath?: string;
}
