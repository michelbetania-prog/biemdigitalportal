import { createElement } from './mini-react.js'
import { getPortalSettings, portalInitials } from './lib/portal-settings.js'

export default function PortalBrand({variant='main',showName=true,className='',admin=false}){
  const settings=getPortalSettings()
  const source=variant==='icon'?(settings.icon_logo_url||settings.main_logo_url):settings.main_logo_url
  return <span className={`portal-brand portal-brand-${variant} ${className}`.trim()}>
    {source?<img src={source} alt={`Logo ${settings.agency_name}`}/>:<span className="portal-brand-fallback">{portalInitials(settings)}</span>}
    {showName&&!source&&<span className="portal-brand-name">{settings.agency_name}</span>}
    {admin&&<b>ADMIN</b>}
  </span>
}
