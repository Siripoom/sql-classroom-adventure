export type SqlTokenKind='keyword'|'string'|'number'|'comment'|'plain';
export type SqlToken={text:string;kind:SqlTokenKind};

const KEYWORDS=new Set(['SELECT','FROM','WHERE','ORDER','BY','GROUP','HAVING','JOIN','INNER','LEFT','RIGHT','OUTER','ON','AS','AND','OR','NOT','NULL','IS','IN','LIKE','BETWEEN','LIMIT','DESC','ASC','DISTINCT','COUNT','SUM','AVG','MIN','MAX']);
const PIECE=/(--[^\n]*)|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|([\s\S])/g;

// Concatenating every token's text gives back the input, so the highlight layer can sit exactly under the textarea.
export function tokenizeSql(sql:string):SqlToken[]{
 const tokens:SqlToken[]=[];
 const push=(text:string,kind:SqlTokenKind)=>{
  const last=tokens.at(-1);
  if(last&&last.kind===kind&&kind==='plain')last.text+=text;else tokens.push({text,kind});
 };
 for(const [text,comment,string,number,word] of sql.matchAll(PIECE)){
  if(comment)push(text,'comment');
  else if(string)push(text,'string');
  else if(number)push(text,'number');
  else if(word&&KEYWORDS.has(word.toUpperCase()))push(text,'keyword');
  else push(text,'plain');
 }
 return tokens;
}
