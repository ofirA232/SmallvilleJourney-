import { palettes } from './content/appearance';
import type { ActorId } from './types';

/** Original vector busts share the in-world wardrobe palette. */
export function portraitMarkup(actor:ActorId|'narrator'){
  if(actor==='narrator')return '<svg viewBox="0 0 80 96" aria-hidden="true"><path d="m40 21 7 20 20 7-20 7-7 20-7-20-20-7 20-7Z" fill="none" stroke="#e1ca96" stroke-width="1.5"/><circle cx="40" cy="48" r="26" fill="none" stroke="#e1ca9640"/></svg>';
  const p=palettes[actor],long=actor==='lana'||actor==='martha',bob=actor==='chloe';
  const back=long?`<path d="M17 71V31C17 5 63 5 63 31v42L50 80 25 77Z" fill="${p.hair}"/>`:bob?`<path d="M16 56V29C16 4 64 4 64 31l1 26-14 9-25-1Z" fill="${p.hair}"/>`:'';
  const hair=actor==='lex'?'':`<path d="M21 33C13 22 25 8 41 10c18-2 27 15 19 27l-5-13c-9 1-12-6-12-6-4 10-17 5-22 15Z" fill="${p.hair}"/>`;
  const clothes=actor==='clark'?'<path d="m33 65 7 6 7-6 2 31H31Z" fill="#3d7393"/><path d="m27 65 8 4-5 10-6-10m29-4-8 4 5 10 6-10" fill="#ce6755"/>':actor==='lex'?'<path d="m33 65 7 7 7-7 3 31H30Z" fill="#5f526b"/><path d="m27 64 10 8-8 13-6-16m30-5-10 8 8 13 6-16" fill="#202832"/>':'';
  return `<svg viewBox="0 0 80 96" aria-hidden="true"><path d="M0 96V77Q13 64 30 64h20q20 0 30 14v18Z" fill="${p.shirt}"/>${back}<path d="M31 52h18v15q-9 12-18 0Z" fill="${p.skin}"/><path d="m31 54 18-1v8l-18 3Z" fill="#5d39232b"/><ellipse cx="20" cy="39" rx="4" ry="7" fill="${p.skin}"/><ellipse cx="60" cy="39" rx="4" ry="7" fill="${p.skin}"/><path d="M21 30c0-23 38-23 38 0v15c-1 13-12 18-19 18S22 57 21 45Z" fill="${p.skin}"/><path d="M49 18q12 5 10 27c-1 10-7 15-15 17l5-12Z" fill="#68442f18"/>${hair}<path d="m27 35 8-1m10 0 8 1" fill="none" stroke="${p.hair}" stroke-width="2.2" stroke-linecap="round"/><path d="m27 40 8-1m10 0 8 1" fill="none" stroke="#f5e8d7" stroke-width="2.3"/><circle cx="32" cy="40" r="1.6" fill="#375950"/><circle cx="48" cy="40" r="1.6" fill="#375950"/><path d="m40 40-2 8h4m-7 5q5 2 10 0" fill="none" stroke="#a9735a" stroke-width="1" stroke-linecap="round"/>${clothes}${long?`<path d="m20 31 6-10-1 41 1 24-8-12Z" fill="${p.hair}"/><path d="m59 31-5-9 1 43-1 22 8-14Z" fill="${p.hair}"/>`:''}</svg>`;
}
