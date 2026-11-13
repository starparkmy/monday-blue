import { env } from 'cloudflare:workers';
import { handleRms, type Bindings } from '../../../lib/rms';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>handleRms(request,env as unknown as Bindings);
export const POST=GET;
