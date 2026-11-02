export const KEY_BINDINGS={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyJ:'punch',KeyZ:'punch',KeyK:'knife',KeyX:'knife',KeyL:'shoot',KeyC:'shoot',Space:'dodge',KeyE:'pickup',KeyU:'special',KeyV:'special',KeyB:'summon',KeyN:'summon'};

export function cinematicDirection(code){
 if(['KeyD','ArrowRight','Enter','Space'].includes(code))return 1;
 if(['KeyA','ArrowLeft'].includes(code))return -1;
 return 0;
}

// A real keyboard layout, drawn with HTML so labels stay sharp at any resolution.
export function keyboardDiagram(){
 const marked={W:['move','↑'],A:['move','←'],S:['move','↓'],D:['move','→'],J:['attack','Golpe'],K:['attack','Cutter'],L:['attack','Disparo'],U:['special','Especial'],B:['special','Apoyo'],P:['utility','Pausa'],H:['utility','Ayuda'],M:['utility','Sonido'],F:['utility','Pantalla']};
 const row=(letters,offset)=>`<div class="keyboard-row" style="--offset:${offset}">${letters.split(' ').map(key=>{const [group,label]=marked[key]??['',''];return `<span class="keyboard-key ${group}"><kbd>${key}</kbd><small>${label}</small></span>`;}).join('')}</div>`;
 return `<div class="keyboard-diagram" role="img" aria-label="Esquema del teclado: WASD mueve, J golpea, K usa el cutter, L dispara, espacio esquiva, U activa hoz y martillo, B pide apoyo cuando esté disponible. H abre esta ayuda; P pausa, M sonido y F pantalla completa.">${row('Q W E R T Y U I O P',0)}${row('A S D F G H J K L',.35)}${row('Z X C V B N M',.9)}<div class="keyboard-space"><kbd>ESPACIO</kbd><small>ESQUIVAR</small></div></div>`;
}
