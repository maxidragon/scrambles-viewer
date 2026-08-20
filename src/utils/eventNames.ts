const EVENT_NAMES: Record<string, string> = {
  '333': '3x3x3',
  '222': '2x2x2',
  '444': '4x4x4',
  '555': '5x5x5',
  '666': '6x6x6',
  '777': '7x7x7',
  '333bf': '3x3x3 Blindfolded',
  '333fm': '3x3x3 Fewest Moves',
  '333oh': '3x3x3 One-Handed',
  clock: 'Clock',
  minx: 'Megaminx',
  pyram: 'Pyraminx',
  skewb: 'Skewb',
  sq1: 'Square-1',
  '444bf': '4x4x4 Blindfolded',
  '555bf': '5x5x5 Blindfolded',
  '333mbf': '3x3x3 Multi-Blind',
};

// Extra spellings TNoodle uses in generated PDF filenames; they don't always match
// the short display names above (e.g. "3x3x3 Multiple Blindfolded" for 333mbf).
const EVENT_FILE_NAME_ALIASES: Record<string, string[]> = {
  '333': ['3x3x3 Cube'],
  '222': ['2x2x2 Cube'],
  '444': ['4x4x4 Cube'],
  '555': ['5x5x5 Cube'],
  '666': ['6x6x6 Cube'],
  '777': ['7x7x7 Cube'],
  '333mbf': ['3x3x3 Multiple Blindfolded', '3x3x3 Multi-Blindfolded'],
};

export function getEventName(eventId: string): string {
  return EVENT_NAMES[eventId] ?? eventId;
}

// All lowercase names a PDF filename may use for this event.
export function getEventFileNames(eventId: string): string[] {
  const names = [getEventName(eventId), ...(EVENT_FILE_NAME_ALIASES[eventId] ?? [])];
  return [...new Set(names.map(n => n.toLowerCase()))];
}
