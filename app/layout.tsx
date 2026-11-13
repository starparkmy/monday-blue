import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'ReturnPilot',description:'Warehouse receiving and returns management',manifest:'/manifest.webmanifest',referrer:'no-referrer',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
