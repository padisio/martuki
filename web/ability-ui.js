// Shared by the game and the visual review so both show the same recharge state.
export function updateAbilityButton(button,remaining,duration,label){
 const cooling=remaining>0,seconds=Math.ceil(Math.max(0,remaining));
 button.classList.toggle('is-cooling',cooling);
 button.style.setProperty('--recharge',`${100*(1-Math.min(duration,Math.max(0,remaining))/duration)}%`);
 const counter=button.querySelector('.cooldown-value');
 counter.hidden=!cooling;
 const value=`${seconds}s`;
 if(counter.textContent!==value)counter.textContent=value;
 const description=cooling?`${label}: recarga, ${seconds} segundos`:`${label}: listo`;
 if(button.getAttribute('aria-label')!==description)button.setAttribute('aria-label',description);
}
