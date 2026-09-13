import type { ActorId, LocationDefinition } from '../types';

export const locations: LocationDefinition[] = [
  { id: 'farm', name: 'Kent Farm', subtitle: 'WHERE IT ALL BEGINS', description: 'Red walls. Open fields. A place to call home.', latitude: 12, longitude: -14, color: '#80a86b', accent: '#d6bd80' },
  { id: 'school', name: 'Smallville High', subtitle: 'HOME OF THE CROWS', description: 'Ordinary hallways. Extraordinary secrets.', latitude: 24, longitude: 39, color: '#a2af78', accent: '#dca586' },
  { id: 'bridge', name: 'Loeb Bridge', subtitle: 'A CHANCE ENCOUNTER', description: 'Sometimes a second changes two lives.', latitude: -13, longitude: 9, color: '#7e9f72', accent: '#91d2c8' },
  { id: 'mansion', name: 'Luthor Mansion', subtitle: 'A DIFFERENT KIND OF LEGACY', description: 'Behind the iron gates, a friendship begins.', latitude: 3, longitude: -76, color: '#77957a', accent: '#c5b3d5' },
  { id: 'cemetery', name: 'Smallville Cemetery', subtitle: 'WHAT WE CARRY WITH US', description: 'Some conversations begin with listening.', latitude: 61, longitude: -11, color: '#91aa80', accent: '#ddc6aa' },
  { id: 'cornfield', name: 'Riley Field', subtitle: 'BENEATH A KANSAS SKY', description: 'The past casts a long shadow through the corn.', latitude: -31, longitude: -46, color: '#b8b47a', accent: '#e5c179' },
  { id: 'metropolis', name: 'Metropolis', subtitle: 'A STORY STILL TO COME', description: 'A bigger world is waiting. In a future episode.', latitude: 5, longitude: 113, color: '#8ca0a0', accent: '#a8c8d0', locked: true },
];
export const locationById = Object.fromEntries(locations.map(location => [location.id, location])) as Record<string, LocationDefinition>;
export const actorNames: Record<ActorId | 'narrator', string> = {
  clark: 'Clark Kent', jonathan: 'Jonathan Kent', martha: 'Martha Kent', pete: 'Pete Ross', chloe: 'Chloe Sullivan',
  lana: 'Lana Lang', lex: 'Lex Luthor', whitney: 'Whitney Fordman', jeremy: 'Jeremy Creek', narrator: 'Smallville, Kansas',
};
