import {ArrowLeft,Camera,ScanText} from 'lucide-react';

export const workspaces=[
 {id:'receiving',title:'Warehouse',description:'Open the photo board, receive parcels and submit inspections.',href:'/photo-board',image:'/mascot-workspace-warehouse.png',roles:['Administrator','Warehouse','Inventory']},
 {id:'customer-service',title:'Returns Desk',description:'Create RMAs, review inspections and follow returns through to completion.',href:'/legacy?workspace=customer-service',image:'/mascot-workspace-customer-service.png',roles:['Administrator','Customer service','Inventory']},
] as const;

export function availableWorkspaces(role:string){
 return workspaces.filter(workspace=>workspace.roles.some(allowed=>allowed===role));
}

export function WorkspaceNavigation({showPhotoBoard=false}:{showPhotoBoard?:boolean}){
 return <nav className="workspace-navigation" aria-label="Workspace navigation">
  <a href="/"><ArrowLeft size={17} aria-hidden="true"/>Workspaces</a>
  {showPhotoBoard&&<a href="/photo-board"><Camera size={17} aria-hidden="true"/>Photo board</a>}
 </nav>;
}
