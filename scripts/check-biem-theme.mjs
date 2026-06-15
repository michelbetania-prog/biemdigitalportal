import { access, readFile } from 'node:fs/promises'
const themePath='src/biem-theme.css'
await access(themePath)
const [theme,index,build]=await Promise.all([readFile(themePath,'utf8'),readFile('index.html','utf8'),readFile('scripts/build.mjs','utf8')])
const tokens={primary:'#4B0082',primaryHover:'#3A0066',soft:'#E6E6FA',softLight:'#F6F3FB',accent:'#C46A2D',accentHover:'#A95724',text:'#1F1A24',muted:'#6B6472',border:'#D8D2E6',success:'#2E7D5B',error:'#B42318'}
for(const [name,value] of Object.entries(tokens))if(!theme.includes(value))throw new Error(`BIEM theme token missing: ${name} ${value}`)
for(const selector of ['.admin-login-shell','.first-access-shell','.client-portal-shell','.admin-sidebar','.kanban-team-shell','.kanban-column','.brand-library-card','.guide-example-card','.portal-drive-assets'])if(!theme.includes(selector))throw new Error(`BIEM theme coverage missing: ${selector}`)
if(!index.includes('/src/biem-theme.css'))throw new Error('Theme stylesheet must be loaded after portal styles')
if(!build.includes("'biem-theme.css'"))throw new Error('Theme stylesheet must be copied to dist')
if(/background:\s*#E6E6FA[^}]*color:\s*#fff/i.test(theme))throw new Error('Lavender backgrounds must not use white text')
if(/background:var\(--color-accent\)[^}]*color:#fff/i.test(theme))throw new Error('Copper accents must not use small white text below AA contrast')
console.log('BIEM purple, lavender and copper theme tokens and workspace coverage validated')
