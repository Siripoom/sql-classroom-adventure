// Where each of the 8 desks sits in the room picture (px of the 2454x1558 image), in journey order:
// pre-test, lessons 1-6, post-test. compose-room.mjs paints the desks and the dotted path at these spots.
export const ROOM={width:2454,height:1558};

export type Slot={x:number;y:number};

// x,y is the centre of the white keyboard pad, where the desk label sits.
export const DESK_SLOTS:readonly Slot[]=[
 {x:330,y:700},
 {x:800,y:1020},
 {x:1010,y:560},
 {x:1260,y:960},
 {x:1510,y:480},
 {x:1740,y:980},
 {x:1980,y:640},
 {x:2210,y:960},
];

// What a desk covers around its slot (monitor to chair legs). The post-test desk stands on a wider podium.
export type Body={left:number;right:number;top:number;bottom:number};
export const DESK_BODY:Body={left:170,right:170,top:160,bottom:130};
export const PODIUM_BODY:Body={left:225,right:225,top:160,bottom:150};
export const bodyOf=(index:number):Body=>index===DESK_SLOTS.length-1?PODIUM_BODY:DESK_BODY;

export type Curve={from:Slot;c1:Slot;c2:Slot;to:Slot};

// The point just outside a desk's body, on the side that faces `toward`.
function leave(slot:Slot,body:Body,toward:Slot,gap:number):Slot{
 const dx=toward.x-slot.x,dy=toward.y-slot.y,len=Math.hypot(dx,dy);
 const reach=Math.min(dx?Math.abs((dx>0?body.right:body.left)/dx):Infinity,dy?Math.abs((dy>0?body.bottom:body.top)/dy):Infinity);
 return {x:slot.x+dx*reach+dx/len*gap,y:slot.y+dy*reach+dy/len*gap};
}

// One gentle S-curve per step of the journey, from the edge of one desk to the edge of the next, so no dot falls on a desk.
export function pathCurves(slots:readonly Slot[]):Curve[]{
 return slots.slice(1).map((next,i)=>{
  const here=slots[i],from=leave(here,bodyOf(i),next,12),to=leave(next,bodyOf(i+1),here,12);
  const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy),bend=(i%2?1:-1)*len*0.14;
  const nx=-dy/len*bend,ny=dx/len*bend;
  return {from,c1:{x:from.x+dx*0.35+nx,y:from.y+dy*0.35+ny},c2:{x:from.x+dx*0.65-nx,y:from.y+dy*0.65-ny},to};
 });
}
