import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
export default defineConfig({
 root:fileURLToPath(new URL('.',import.meta.url)),
 publicDir:root+'public',
 plugins:[react()],
 // dummy project: the student scripts answer its RPC with page.route, nothing reaches a real Supabase
 define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://localhost:54321'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('fixture-key')},
 resolve:{alias:[{find:/^\.\.\/supabase$/,replacement:root+'verify/fixture-client.ts'}]},
 server:{port:5199,strictPort:true,fs:{allow:[root]}}
});
