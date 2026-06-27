export interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city_name: string;
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

export interface WCIFRound {
  id: string;
  format: string;
  scrambleSetCount: number;
  results: unknown[];
}

export interface WCIFEvent {
  id: string;
  rounds: WCIFRound[];
}

export interface WCIF {
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
  pdfPath?: string;
}
