import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
let engine:ReturnType<typeof initSqlJs>|undefined;
export const loadMissionEngine=()=>engine??=(initSqlJs({locateFile:()=>wasmUrl}).catch(error=>{engine=undefined;throw error;}));
