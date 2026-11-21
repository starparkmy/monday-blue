import Desk from '../desk';
export default async function Legacy({searchParams}:{searchParams:Promise<{workspace?:string}>}){
 const {workspace}=await searchParams;
 return <Desk workspace={workspace}/>;
}
