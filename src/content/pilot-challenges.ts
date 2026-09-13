import type { ChallengeDefinition } from '../types';

export const pilotChallenges:Record<string,ChallengeDefinition>={
  'lex-thanks':{kind:'evidence',title:'What happened on the bridge?',cards:[
    {title:'Bent steel',date:'THE RAILING',text:'The car crossed the lane and broke through the railing where Clark had been standing.'},
    {title:'Two people in the river',date:'THE RESCUE',text:'Lex remembers seeing Clark on the bridge. Clark pulled him from the submerged car.'},
    {title:'Not a scratch',date:'CLARK',text:'Clark has no visible injuries after the impact. He has no ordinary explanation for it.'},
  ],questions:[
    {prompt:'Which detail cannot be explained by an ordinary escape?',choices:['Clark survived a direct impact without an injury.','The river carried the car downstream.'],answer:0,explanation:'Compare where Clark stood with the damaged railing and his lack of injuries.'},
    {prompt:'Who can help Clark understand what happened to him?',choices:['Jonathan, who has always asked him to hide his abilities.','The school football team.'],answer:0,explanation:'Jonathan already knows there is something different about Clark.'},
  ]},
  spaceship:{kind:'evidence',title:'The secret beneath the barn',cards:[
    {title:'An unfamiliar craft',date:'THE CELLAR',text:'There is room for a small child inside. Its surface has no familiar maker or markings.'},
    {title:'A shared date',date:'OCTOBER 1989',text:'Jonathan says the craft and the little boy appeared on the day of the meteor shower.'},
    {title:'A home, not an origin',date:'THE KENTS',text:'Jonathan and Martha found Clark. They raised him, but did not know where he came from.'},
  ],questions:[
    {prompt:'What connects Clark to the craft?',choices:['The child-sized space and the day the Kents found him.','Its color matches the family tractor.'],answer:0,explanation:'Compare its size with Jonathan’s account of the meteor shower.'},
    {prompt:'What does the evidence still leave unanswered?',choices:['Where Clark originally came from.','Whether Jonathan and Martha raised him.'],answer:0,explanation:'The Kents can tell Clark how they found him, but not where his journey began.'},
  ]},
  'feed-crate':{kind:'power',prop:'crate',lift:.55,title:'Strong enough. Gentle enough.',instruction:'Jonathan is watching. Lift the crate without splintering it, then set it down carefully.',beats:['Find your grip','Set it down gently'],speed:.48,zone:[.52,.78]},
  'car-door':{kind:'power',prop:'car',lift:.12,title:'Someone is still in there.',instruction:'Brace against the car and peel back the damaged metal. Lex needs a way out.',beats:['Brace the frame','Break the seal','Make room for Lex'],speed:.58,zone:[.56,.84]},
  sprinklers:{kind:'power',title:'Keep the dance floor dry.',instruction:'Jeremy needs the sprinkler system. Shut the valve without snapping the pipe.',beats:['Catch the wheel','Seal the valve'],speed:.58,zone:[.48,.74]},
  deduction:{kind:'evidence',title:'Something connects all of this.',cards:[
    {title:'The same face',date:'1989 YEARBOOK',text:'Jeremy Creek. A freshman chosen as the homecoming scarecrow. Chloe’s photograph today shows the same boy.'},
    {title:'An empty hospital bed',date:'2001 HOSPITAL REPORT',text:'Twelve years in a coma. A lightning storm. The backup generator fails, and Jeremy disappears.'},
    {title:'Twenty yards away',date:'METEOR SHOWER',text:'A boy is recovered from a flattened cornfield, close to an impact. His former tormentors are being attacked now.'},
  ],questions:[
    {prompt:'Why does Jeremy still look like the boy in the yearbook?',choices:['He is a new student with the same name.','He was the boy found near the impact, unconscious for twelve years.'],answer:1,explanation:'Compare the name, the recovery site, and the twelve-year hospital stay.'},
    {prompt:'What changed the night he left the hospital?',choices:['An electrical storm interrupted the generator.','The homecoming team visited him.'],answer:0,explanation:'The hospital report records a storm and a power failure, not visitors.'},
    {prompt:'What links his targets?',choices:['They all worked at LuthorCorp.','They were the players who left him in the field.'],answer:1,explanation:'Look at the yearbook tradition and the identities of the victims.'},
  ]},
};
