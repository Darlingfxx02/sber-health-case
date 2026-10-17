export function Icon({name,className=''}){
  return <span className={`icon ${className}`} style={{'--icon':`url('assets/iconsax/${name}.svg')`}} aria-hidden="true"/>;
}
