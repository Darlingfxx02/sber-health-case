import {useEffect,useRef} from 'react';
import {Icon} from './Icon.jsx';

export function ProfileSettings({startView,onChange,onClose}){
  const panelRef=useRef(null),backRef=useRef(null);
  useEffect(()=>{backRef.current?.focus({preventScroll:true});},[]);
  function trapFocus(event){
    if(event.key!=='Tab')return;
    const items=[...panelRef.current.querySelectorAll('button,input')].filter(item=>!item.disabled&&(item.type!=='radio'||item.checked));
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  return <section className="detail-panel open profile-settings" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="profile-title" onKeyDown={trapFocus}>
    <div className="detail-head"><button ref={backRef} aria-label="Закрыть профиль" onClick={onClose}><Icon name="back"/></button></div>
    <h1 className="detail-title" id="profile-title">Профиль</h1>
    <fieldset className="start-view-settings"><legend>Открывать при запуске</legend><div className="start-view-options">
      {[{value:'chat',title:'Чат',icon:'chat'},{value:'widgets',title:'Виджеты',icon:'activity'}].map(option=><label key={option.value} className="start-view-option">
        <Icon name={option.icon}/><span>{option.title}</span><input type="radio" name="start-view" value={option.value} checked={startView===option.value} onChange={()=>onChange(option.value)}/>
      </label>)}
    </div></fieldset>
  </section>;
}
