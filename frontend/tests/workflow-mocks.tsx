import React from 'react';
const router = { push() {} };
export const useRouter = () => router;
export const getCurrentUser = async () => ({name:'Test User', email:'test@example.invalid', role:'user'});
export const signOut = async () => {};
export const Dancing_Script = () => ({className:''});
export const Poppins = Dancing_Script;
export const Montserrat = Dancing_Script;
export default function Image(props: any) { return <img {...props} />; }
export const apiRepository = {
  listPropertyBundles(page: number, limit: number, search: string, signal: AbortSignal) {
    // Deliberately ignore abort to prove the stale-result guard works too.
    return new Promise(resolve => window.fixture.listRequests.push({page, limit, search, signal, resolve}));
  },
};
