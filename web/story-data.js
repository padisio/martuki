import {EPILOGUE_ASSETS,EPILOGUE_PAGES} from './epilogue-data.js?v=onesimo-1';
import {ROOFTOP_ASSETS,ROOFTOP_ARRIVAL_PAGES,ROOFTOP_ENCOUNTER_PAGES,ROOFTOP_AFTERMATH_PAGES,ROOFTOP_EPILOGUE_PAGES} from './rooftop-data.js?v=7';
import {FACTORY_ASSETS,FACTORY_ARRIVAL_PAGES,FACTORY_ENCOUNTER_PAGES,FACTORY_AFTERMATH_PAGES} from './factory-data.js?v=8';
import {SEWER_ASSETS,SEWER_ARRIVAL_PAGES,SEWER_ENCOUNTER_PAGES,SEWER_AFTERMATH_PAGES} from './sewer-data.js?v=9';
import {LAB_ASSETS,LAB_ARRIVAL_PAGES,LAB_ENCOUNTER_PAGES,LAB_FUSION_PAGES,LAB_AFTERMATH_PAGES} from './lab-data.js?v=52';
import {JAVI_ASSETS,JAVI_PAGES,JAVI_SPLASH_PAGES} from './javi-data.js?v=5-reveal';
import {INTRO_ASSETS,INTRO_PAGES} from './intro-data.js?v=52';
import {JAVI_FINAL_ASSETS,JAVI_FINAL_PAGES} from './javi-final-data.js?v=52';
import {EXPO_ASSETS,EXPO_ENCOUNTER_PAGES,EXPO_AFTERMATH_PAGES} from './expo-data.js?v=52';
// User script, including later corrections: infiltration comes first; every
// boss is a coworker. Exhibition boss assigned by the user: Jasmin + Maria.
export const STORY_FILES={...Object.fromEntries(['infiltration','prologue','office','exhibition','laboratory','sewers','factory','rooftop','epilogue'].map(id=>[id,`assets/story-v1/${id}.png`])),...INTRO_ASSETS,...JAVI_ASSETS,...JAVI_FINAL_ASSETS,...EXPO_ASSETS,...LAB_ASSETS,...SEWER_ASSETS,...FACTORY_ASSETS,...ROOFTOP_ASSETS,...EPILOGUE_ASSETS};
export const STORY_ART=Object.keys(STORY_FILES);
export const storyAssetPath=id=>STORY_FILES[id];
const p=(art,text,speaker='Narración',partner=null)=>({art,text,speaker,partner});
export const SEQUENCES={
 intro:INTRO_PAGES,
 javiEncounter:JAVI_PAGES,
 javiPresentation:JAVI_SPLASH_PAGES,
 officeAftermath:JAVI_FINAL_PAGES,
 exhibition:EXPO_ENCOUNTER_PAGES,
 exhibitionAftermath:EXPO_AFTERMATH_PAGES,
 laboratoryArrival:LAB_ARRIVAL_PAGES,
 laboratory:LAB_ENCOUNTER_PAGES,
 laboratoryFusion:LAB_FUSION_PAGES,
 laboratoryAftermath:LAB_AFTERMATH_PAGES,
 sewers:SEWER_ARRIVAL_PAGES,
 sewersEncounter:SEWER_ENCOUNTER_PAGES,
 sewersAftermath:SEWER_AFTERMATH_PAGES,
 factory:FACTORY_ARRIVAL_PAGES,
 factoryEncounter:FACTORY_ENCOUNTER_PAGES,
 factoryAftermath:FACTORY_AFTERMATH_PAGES,
 rooftop:ROOFTOP_ARRIVAL_PAGES,
 rooftopEncounter:ROOFTOP_ENCOUNTER_PAGES,
 rooftopAftermath:ROOFTOP_AFTERMATH_PAGES,
 epilogue:[...ROOFTOP_EPILOGUE_PAGES,...EPILOGUE_PAGES]
};
export const CHAPTERS=[
 {id:'prologue',number:'00',title:'INFILTRACIÓN',art:'intro-01-exterior',sequences:['intro'],playable:false,future:false},
 {id:'office',number:'01',title:'DEPARTAMENTO DE DISEÑO',art:'office',sequences:['javiEncounter','javiPresentation','officeAftermath'],playable:true,future:false,boss:{name:'Dimitri Tontotsky',civilianName:'Javier Armuña',relationship:'compañero de departamento',design:'existing'}},
 {id:'exhibition',number:'02',title:'LA EXPOSICIÓN',art:'exhibition',sequences:['exhibition','exhibitionAftermath'],playable:true,future:false,boss:{name:'Marixásmin Matatodosk',relationship:'compañeras de WOW',design:'marixas-v2',components:['Jasmín Matamoros','María Giner']}},
 {id:'laboratory',number:'03',title:'LABORATORIO DE CERÁMICA',art:'laboratory',sequences:['laboratoryArrival','laboratory','laboratoryFusion','laboratoryAftermath'],playable:true,future:false,boss:{name:'Elisa Martón y el Oso Martín',civilianName:'Elisa Martón',relationship:'compañera de WOW',design:'elisa-oso-v3',phases:2}},
 {id:'sewers',number:'04',title:'LAS ALCANTARILLAS',art:'sewer-01-descenso',sequences:['sewers','sewersEncounter','sewersAftermath'],playable:true,future:false,cinematicReady:true,boss:{name:'Mayrena Disenyostka',relationship:'compañeras de WOW',design:'mayrena-redesign-v3',components:['Mayte Aguilar','Lorena Aguayo']}},
 {id:'factory',number:'05',title:'FÁBRICA DE AZULEJOS',art:'factory-01-entrada',sequences:['factory','factoryEncounter','factoryAftermath'],playable:true,future:false,cinematicReady:true,boss:{name:'Rost-Vidf Rubiñoz Rubiñoz',relationship:'compañeros de WOW',design:'rost-vidf-v4',components:['Rosi Rubio Rubio','David Muñoz Muñoz']}},
 {id:'rooftop',number:'06',title:'LA AZOTEA',art:'roof-01-salida',sequences:['rooftop','rooftopEncounter','rooftopAftermath'],playable:true,future:false,cinematicReady:true,boss:{name:'Me|Ni|Na',civilianName:'Jorge Besnard',relationship:'compañero de WOW bajo la máscara de Jorge',design:'boss-final-guion-v4-v5'}},
 {id:'epilogue',number:'FIN',title:'VUELTA A CASA',art:'epi-51-feliz',sequences:['epilogue'],playable:false,future:false,cinematicReady:true}
].map(ch=>({...ch,...(ch.future&&!ch.cinematicReady&&ch.id!=='epilogue'?{boss:{name:null,relationship:'compañero de WOW',design:'pending'}}:{})}));
export const ROUTES={rooftopConclusion:['rooftopAftermath','epilogue'],finale:['rooftop','rooftopEncounter','rooftopAftermath','epilogue'],rooftopIntro:['rooftop'],rooftopEncounter:['rooftopEncounter'],rooftopExit:['rooftopAftermath'],epilogue:['epilogue'],intro:['intro'],javiEncounter:['javiEncounter'],javiPresentation:['javiPresentation'],expoEncounter:['exhibition'],officeExit:['officeAftermath'],exhibitionExit:['exhibitionAftermath'],laboratoryIntro:['laboratoryArrival'],laboratoryEncounter:['laboratory'],laboratoryFusion:['laboratoryFusion'],laboratoryExit:['laboratoryAftermath'],sewersIntro:['sewers'],sewersEncounter:['sewersEncounter'],sewersExit:['sewersAftermath'],factoryIntro:['factory'],factoryEncounter:['factoryEncounter'],factoryExit:['factoryAftermath'],campaign:CHAPTERS.flatMap(c=>c.sequences.filter(s=>!['exhibitionArrival'].includes(s)))};
export function sequencePages(ids){return ids.flatMap(id=>{
 if(!SEQUENCES[id])throw new Error('Unknown story sequence: '+id);
 const chapter=CHAPTERS.find(c=>c.sequences.includes(id));
 return SEQUENCES[id].map((page,index)=>({...page,sequence:id,page:index,chapterId:chapter.id,chapterTitle:chapter.title,number:chapter.number}));
});}
