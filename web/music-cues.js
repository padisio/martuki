// Cue changes use approved scene IDs and survive pagination and Previous.
export const SEQUENCE_MUSIC={
 intro:'intro',javiEncounter:'comedy',javiPresentation:'boss',officeAftermath:'comedy',
 exhibition:'comedy',exhibitionAftermath:'comedy',laboratoryArrival:'comedy',
 laboratory:'comedy',laboratoryFusion:'transformation',laboratoryAftermath:'comedy',
 sewers:'comedy',sewersEncounter:'comedy',sewersAftermath:'comedy',
 factory:'comedy',factoryEncounter:'comedy',factoryAftermath:'comedy',
 rooftop:'comedy',rooftopEncounter:'comedy',rooftopAftermath:'catastrophe',epilogue:'josep'
};
export const SCENE_MUSIC={
 javiEncounter:{'07b-ahora-tienes-que-morir':'boss'},
 exhibition:{'12-maria-bebe':'transformation'},
 laboratory:{'splash-elisa':'boss'},
 sewersEncounter:{'05a-marta-escucha':'radio','25c-beben-probetas':'transformation'},
 factoryEncounter:{'32a-mano-rosi':'transformation'},
 factoryAftermath:{'44-alarma':'transformation'},
 rooftopAftermath:{'v2-81b-cae-josep':'josep'},
 rooftopEncounter:{'15-menina':'boss','v2-42-se-adhiere':'transformation','48-crece':'catastrophe'},
 epilogue:{'01-moscu':'russia','33-bordillo-vacio':'epilogue'}
};
export function storyMusic(story){
 const page=story.page;if(!page)return 'title';
 const cues=SCENE_MUSIC[page.sequence]??{},pages=story.pages??[page],index=story.index??0;
 for(let i=index;i>=0;i--){
  const previous=pages[i];if(previous.sequence!==page.sequence)break;
  if(Object.hasOwn(cues,previous.sceneId))return cues[previous.sceneId];
 }
 return SEQUENCE_MUSIC[page.sequence]??'title';
}
