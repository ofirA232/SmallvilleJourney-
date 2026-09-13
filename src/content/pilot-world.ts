import type { EpisodeDefinition } from '../types';

export const pilotWorld:EpisodeDefinition['world']={
  initial:{
    actors:{
      jonathan:{location:'farm',point:[0,1.7]},martha:{location:'farm',point:[1.3,.4]},
      pete:{location:'school',point:[-1.5,1.5]},chloe:{location:'school',point:[-.4,1.5]},
      lana:{location:'school',point:[1.8,1.3],necklace:true},
    },
    props:{crate:{visible:true},car:{visible:false}},
    player:{abilities:['super-speed','super-strength','invulnerability']},
    kryptonite:[{location:'school',point:[1.8,1.3]}],
  },
  rules:[
    {from:'friends',changes:{props:{crate:{visible:true,position:{location:'farm',point:[2.8,.7]}}}}},
    {from:'car-door',changes:{props:{car:{visible:true}}}},
    {from:'bridge-moment',changes:{actors:{chloe:{location:'school',point:[4.2,.6]},lana:{location:'school',point:[1.8,1.3]}},kryptonite:[]}},
    {from:'lex-thanks',until:'family-truth',changes:{actors:{lex:{location:'bridge',point:[3,1.5]}}}},
    {from:'bring-lex-ashore',until:'lex-thanks',changes:{player:{carrying:'lex'}}},
    {from:'lex-thanks',changes:{props:{car:{visible:false}}}},
    {from:'family-truth',changes:{actors:{lex:{location:'mansion',point:[0,1.7]}}}},
    {from:'spaceship',changes:{props:{ship:{visible:true}}}},
    {from:'cemetery',changes:{actors:{lana:{location:'cemetery',point:[.4,1.5]}}}},
    {from:'wall',until:'jeremy-field',changes:{actors:{whitney:{location:'school',point:[2.9,3.1]}}}},
    {from:'whitney',until:'jeremy-field',changes:{actors:{whitney:{location:'school',point:[2.9,3.1],necklace:true}},kryptonite:[{location:'school',point:[2.9,3.1]}]}},
    {from:'jeremy-field',changes:{night:true}},
    {from:'jeremy-field',until:'call-for-help',changes:{actors:{jeremy:{location:'cornfield',point:[0,1.8]}}}},
    {from:'jeremy-field',until:'race',changes:{player:{restrained:true},kryptonite:[{location:'cornfield',point:[0,.5]}]}},
    {from:'call-for-help',until:'race',changes:{actors:{lex:{location:'cornfield',point:[.65,1.6],visible:false}}}},
    {from:'race',changes:{props:{truck:{visible:true}}}},
    {from:'race',until:'home',changes:{actors:{jeremy:{location:'school',point:[-3.9,.5]}}}},
    {from:'free-jeremy',changes:{props:{truck:{visible:true,tilt:.12},spray:{visible:true}}}},
    {from:'free-jeremy',until:'home',changes:{actors:{jeremy:{location:'school',point:[-4,2.5]}}}},
  ],
};
