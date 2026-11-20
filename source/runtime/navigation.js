export function pointInPolygon(x, y, polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,ay]=polygon[i],[bx,by]=polygon[j];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}

export function insideSpace(x,y,space) {
  return pointInPolygon(x,y,space.polygon) && !space.holes.some(h=>pointInPolygon(x,y,h));
}

export function segmentDistance(px,py,ax,ay,bx,by) {
  const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
  const t=den ? Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den)) : 0;
  return Math.hypot(px-ax-t*dx,py-ay-t*dy);
}

export function canCross(from,to,x,y,connections,doorStates) {
  const link=connections.find(l=>(l.a===from && l.b===to)||(l.a===to && l.b===from));
  if(!link || ['stairs','winding_stairs','hatch'].includes(link.kind))return false;
  if(link.kind==='door' && (doorStates.get(link.id)?.open ?? 0)<.83)return false;
  return Math.hypot(x-link.point[0],y-link.point[1])<link.width/2+.35;
}

export function furnitureBlocks(x,y,spaceId,items,radius=.18) {
  return items.some(item=>{
    if(item.space_id!==spaceId)return false;
    const dx=x-item.center[0],dy=y-item.center[1],c=Math.cos(item.angle),s=Math.sin(item.angle);
    const u=dx*c+dy*s,v=-dx*s+dy*c;
    return Math.abs(u)<item.size[0]/2+radius && Math.abs(v)<item.size[1]/2+radius;
  });
}

export function doorSweepHits(link,from,to,point,radius=.19) {
  const base=link.axis==='x'?0:Math.PI/2;
  const hx=link.point[0]-link.width/2*Math.cos(base),hy=link.point[1]-link.width/2*Math.sin(base);
  const sign=link.swing_sign??1;
  for(let i=0;i<=8;i++){
    const a=base+(from+(to-from)*i/8)*link.max_angle*Math.PI/180*sign;
    const ex=hx+link.width*Math.cos(a),ey=hy+link.width*Math.sin(a);
    if(segmentDistance(point[0],point[1],hx,hy,ex,ey)<radius)return true;
  }
  return false;
}
