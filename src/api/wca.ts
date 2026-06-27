import { Competition, WCIF } from '../types/wcif';

const WCA_API = 'https://www.worldcubeassociation.org/api/v0';

export async function searchCompetitions(query: string): Promise<Competition[]> {
  const url = `${WCA_API}/competitions?q=${encodeURIComponent(query)}&sort=start_date&per_page=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WCA API error: ${res.status}`);
  return res.json() as Promise<Competition[]>;
}

export async function fetchWCIF(competitionId: string): Promise<WCIF> {
  const url = `${WCA_API}/competitions/${competitionId}/wcif/public`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WCA API error: ${res.status}`);
  return res.json() as Promise<WCIF>;
}
