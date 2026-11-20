import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createEnvironment } from './ocean.js';
import { VesselState } from '../systems/vessel-state.js';
import { sliderCrank, clamp } from '../systems/kinematics.js';
import { insideSpace, canCross, furnitureBlocks, doorSweepHits } from './navigation.js';
import layout from '../../assets/data/ship.json';
import placements from '../../assets/data/furniture_placements.json';
import cameras from '../lighting/cameras.json';
import './style.css';

const $=id=>document.getElementById(id);
const native=v=>new THREE.Vector3(v[0],v[2],-v[1]);
const spaces=new Map(layout.spaces.map(s=>[s.id,s]));
const links=new Map(layout.connections.map(l=>[l.id,l]));
const deckHeights=Object.fromEntries(layout.specification.decks.map(d=>[d.id,d.z]));
const partURLs={
  exterior:new URL('../../assets/runtime/exterior.glb',import.meta.url).href,
  machinery:new URL('../../assets/runtime/machinery.glb',import.meta.url).href,
  main:new URL('../../assets/runtime/main.glb',import.meta.url).href,
  upper:new URL('../../assets/runtime/upper.glb',import.meta.url).href,
  lower:new URL('../../assets/runtime/lower.glb',import.meta.url).href,
  structure:new URL('../../assets/runtime/structure.glb',import.meta.url).href,
};
const nativeURL=new URL('../../assets/models/teutonic_working.blend',import.meta.url).href;
$('download-native').href=nativeURL;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.localClippingEnabled=true;
// Exterior inspection needs metre-scale near clipping; a 3 cm near plane causes z-fighting at 200 m.
$('canvas-host').appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Interactive 3D vessel. Drag to orbit, scroll to approach, or choose a room to inspect.');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc2d0ce);
const camera=new THREE.PerspectiveCamera(31,1,.035,6500);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=.35;controls.maxDistance=520;controls.maxPolarAngle=Math.PI*.88;controls.target.set(0,14,0);
const environment=createEnvironment(scene,renderer);
const vesselGroup=new THREE.Group();vesselGroup.name='Vessel motion — filtered approximation';scene.add(vesselGroup);
const state=new VesselState({warm:true});
const gltfLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loadedParts=new Map(),loadingParts=new Map(),materials=new Map(),renderables=[],animated=[];
const doorStates=new Map(),doorBatches=[];
const animationKinds=new Set(['door','crankshaft','crosshead','connecting_rod','propeller','rudder','helm']);
let mode='exterior',selectedDeck='M',selectedSpace=null,section=false,drydock=false,labelsVisible=false,walking=false,walkSpace=null;
let yaw=0,pitch=0,keys=new Set(),ready=false,transition=null,frameCount=0,lastTelemetry=0;
const clipPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
const heightPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),12);
const fpsQuaternion=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);

function metadata(ob){const chain=[];for(let p=ob;p;p=p.parent)chain.push(p);return Object.assign({},...chain.reverse().map(p=>p.userData));}
function movingAncestor(ob){for(let p=ob;p;p=p.parent)if(animationKinds.has(p.userData.category))return p;return null;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4400);}
function floatGeometry(g){
  const result=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv']){
    const old=g.getAttribute(name),size=name==='uv'?2:3;
    if(!old){if(name==='uv')result.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));continue;}
    const a=new Float32Array(old.count*size);
    for(let i=0;i<old.count;i++){a[i*size]=old.getX(i);a[i*size+1]=old.getY(i);if(size===3)a[i*size+2]=old.getZ(i);}
    result.setAttribute(name,new THREE.BufferAttribute(a,size));
  }
  if(g.index)result.setIndex(new THREE.BufferAttribute(new Uint32Array(g.index.array),1));
  if(!result.getAttribute('normal'))result.computeVertexNormals();
  return result;
}
function cacheMaterial(mat){
  const key=mat.name;
  if(materials.has(key))return materials.get(key);
  if(mat.map)mat.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  mat.side=THREE.DoubleSide;mat.envMapIntensity=.85;mat.clippingPlanes=[];
  if(mat.name.toLowerCase().includes('lamp'))mat.emissiveIntensity=1.5;
  materials.set(key,mat);return mat;
}

function prepareRegion(gltf,part){
  const group=gltf.scene;group.name='Region · '+part;vesselGroup.add(group);vesselGroup.updateMatrixWorld(true);
  const inverse=vesselGroup.matrixWorld.clone().invert();
  const buckets=new Map(),staticMeshes=[],doorMeshes=[];
  group.traverse(ob=>{
    if(animationKinds.has(ob.userData.category)){
      animated.push(ob);
      if(ob.userData.category==='door')doorStates.set(ob.userData.door_id,{node:ob,open:0,target:0,base:ob.quaternion.clone()});
    }
    if(!ob.isMesh)return;
    ob.material=cacheMaterial(ob.material);const meta=metadata(ob);meta.region=part;
    const dynamic=movingAncestor(ob);
    if(dynamic?.userData.category==='door'){doorMeshes.push({mesh:ob,meta,door:dynamic});return;}
    if(dynamic){renderables.push({object:ob,meta,dynamic:true});return;}
    const key=[meta.deck??'',meta.category??'',meta.side??'',ob.material.uuid].join('|');
    if(!buckets.has(key))buckets.set(key,{geometries:[],material:ob.material,meta});
    const geometry=floatGeometry(ob.geometry);geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,ob.matrixWorld));
    buckets.get(key).geometries.push(geometry);staticMeshes.push(ob);
  });
  for(const {geometries,material,meta} of buckets.values()){
    const geometry=geometries.length===1?geometries[0]:mergeGeometries(geometries,false);
    if(!geometry)throw new Error('Static mesh batch could not be merged');
    if(geometries.length>1)geometries.forEach(g=>g.dispose());
    geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.name=`${part} · ${meta.category} · ${material.name}`;mesh.userData={...meta,batched:true};vesselGroup.add(mesh);renderables.push({object:mesh,meta});
  }
  staticMeshes.forEach(ob=>ob.removeFromParent());
  // Repeated door hardware is instanced without losing individual hinge transforms.
  const doorGroups=new Map();
  for(const entry of doorMeshes){
    const key=[entry.mesh.geometry.uuid,entry.mesh.material.uuid,entry.meta.deck].join('|');
    if(!doorGroups.has(key))doorGroups.set(key,[]);doorGroups.get(key).push(entry);
  }
  for(const entries of doorGroups.values()){
    const first=entries[0];const mesh=new THREE.InstancedMesh(first.mesh.geometry,first.mesh.material,entries.length);mesh.name='Individually hinged door instances';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.userData.category='door_instances';
    entries.forEach((entry,i)=>{mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,entry.mesh.matrixWorld));entry.mesh.visible=false;});
    vesselGroup.add(mesh);doorBatches.push({mesh,entries});renderables.push({object:mesh,meta:{category:'door_instances',deck:first.meta.deck,region:part}});
  }
  loadedParts.set(part,group);updateVisibility();
}

async function loadRegion(part,foreground=false){
  if(loadedParts.has(part))return loadedParts.get(part);
  if(loadingParts.has(part))return loadingParts.get(part);
  const promise=new Promise((resolve,reject)=>gltfLoader.load(partURLs[part],gltf=>{
    try{prepareRegion(gltf,part);resolve(gltf.scene);}catch(error){reject(error);}
  },event=>{
    if(foreground && event.total){$('loading-progress').style.width=`${Math.max(10,event.loaded/event.total*87)}%`;$('load-status').textContent=`Loading ${part} · ${(event.loaded/1e6).toFixed(1)} / ${(event.total/1e6).toFixed(1)} MB`;}
  },reject));
  loadingParts.set(part,promise);
  try{return await promise;}catch(error){console.error('Region load failed',part,error);toast(`Could not load ${part}: ${error.message}`);throw error;}finally{loadingParts.delete(part);}
}
const partForDeck=deck=>deck==='M'?'main':['U','P'].includes(deck)?'upper':deck==='T'?'machinery':'lower';

function updateVisibility(){
  const oceanVisible=mode==='exterior'&&!drydock&&!section&&!walking;
  environment.setVisible(oceanVisible);environment.sky.visible=mode==='exterior'&&!drydock&&!section;
  scene.background=new THREE.Color(mode==='machinery'?0xd7dcd4:mode==='decks'||section||drydock?0xe3e6dc:0xc2d0ce);
  const clips=[];
  if(section)clips.push(clipPlane);
  if(mode==='decks'&&!walking){heightPlane.constant=deckHeights[selectedDeck]+(selectedDeck==='T'?9.1:2.35);clips.push(heightPlane);}
  for(const mat of materials.values())mat.clippingPlanes=clips;
  const machineryCategories=new Set(['machinery','moving_machinery','crankshaft','crosshead','connecting_rod','boiler','pipework','propeller_blades','rudder_blade','steering_gear','structure']);
  for(const item of renderables){
    const c=item.meta.category,d=item.meta.deck;
    let visible=true;
    if(mode==='exterior'&&!section){
      visible=item.meta.region==='exterior'||(item.meta.region==='upper'&&c==='ceiling');
    }else if(mode==='machinery'){
      visible=item.meta.region==='machinery'||machineryCategories.has(c);
      if(c==='floor'||c==='staircase'||c==='door_instances')visible=false;
      if(c==='structure')visible=false;
    }else if(mode==='decks'){
      visible=d===selectedDeck && !['ceiling','boat_deck','superstructure','funnel','rigging','boat','boat_gear','bridge'].includes(c);
      if(walking)visible=d===selectedDeck && !['boat_deck','funnel','rigging','boat','boat_gear'].includes(c);
      if(walking && item.meta.region==='exterior' && ['hull','hull_detail'].includes(c))visible=true;
    }else if(section){
      visible=!['boat_deck','ceiling','rigging','boat','boat_gear','funnel','superstructure'].includes(c);
    }
    item.object.visible=visible;
  }
  $('section-toggle').classList.toggle('active',section);$('drydock-toggle').classList.toggle('active',drydock);$('labels-toggle').classList.toggle('active',labelsVisible);
  highlight.visible=!!selectedSpace && !walking;
}

function viewCamera(id,immediate=false){
  const config=cameras.find(c=>c.id===id);if(!config)return;
  walking=false;document.body.classList.remove('walking');$('walk-help').hidden=true;controls.enabled=true;
  const target=native(config.target),position=native(config.position);
  if(config.ortho){position.copy(target).add(native(config.position).sub(target).normalize().multiplyScalar(270));}
  if(immediate){camera.position.copy(position);controls.target.copy(target);}else transition={from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target,t:0};
  $('current-camera').textContent=config.label.toUpperCase();
  document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===id));
  updateVisibility();
}
function setPresets(items){$('camera-presets').replaceChildren(...items.map(([id,name])=>{const b=document.createElement('button');b.dataset.camera=id;b.textContent=name;b.addEventListener('click',()=>viewCamera(id));return b;}));}
async function setMode(next){
  mode=next;walking=false;document.body.className='mode-'+mode;controls.enabled=true;$('walk-help').hidden=true;
  $('identity').hidden=mode!=='exterior';$('explorer').hidden=mode!=='decks';$('engine-panel').hidden=mode!=='machinery';
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  section=false;drydock=mode!=='exterior';$('selected-card').hidden=true;selectedSpace=null;highlight.visible=false;
  if(mode==='decks'){
    $('chapter-number').textContent='02 /';$('chapter-eyebrow').textContent='THE ARRANGEMENT';$('chapter-title').textContent='A life on every deck.';$('chapter-description').textContent='Explore plan-connected spaces. Amber evidence labels distinguish inference from archival fact.';
    toast('Loading the selected deck’s actual geometry…');await loadRegion(partForDeck(selectedDeck));renderSpaceList();
    setPresets([['elevated','Deck overview'],['saloon','Dining saloon'],['stateroom_g','Stateroom G'],['promenade','Promenade']]);
    camera.position.set(70,100,-110);controls.target.set(0,deckHeights[selectedDeck],0);transition=null;
  }else if(mode==='machinery'){
    $('chapter-number').textContent='03 /';$('chapter-eyebrow').textContent='THE MACHINERY';$('chapter-title').textContent='Six cylinders. Two screws.';$('chapter-description').textContent='A 60-inch stroke. Overlapping propellers. Crank-linked motion, with simulation limits disclosed.';
    toast('Loading both engine assemblies and the boiler rooms…');await loadRegion('machinery');
    setPresets([['engine','Working platform'],['engine_top','Cylinder covers'],['stokehold','Stokehold'],['stern','Shafts & screws']]);
    camera.position.set(-13,17,-25);controls.target.set(-26,5.5,0);transition=null;
  }else{
    $('chapter-number').textContent='01 /';$('chapter-eyebrow').textContent='THE VESSEL';$('chapter-title').textContent='Built for the Atlantic.';$('chapter-description').textContent='Harland & Wolff’s twin-screw liner, in a provisional early-service configuration.';
    setPresets([['port_bow','Port bow'],['port_profile','Profile'],['stern','Stern'],['elevated','Above deck']]);viewCamera('port_bow');
  }
  resize();updateVisibility();
}

const highlight=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xb57d43,transparent:true,opacity:.95,depthTest:false}));highlight.renderOrder=20;scene.add(highlight);highlight.visible=false;
function renderSpaceList(){
  const query=$('space-search').value.toLowerCase().trim();
  const filtered=layout.spaces.filter(s=>(query||s.deck===selectedDeck)&&(!query||`${s.id} ${s.name} ${s.type}`.toLowerCase().includes(query)));
  $('result-count').textContent=`${filtered.length} SPACES`;$('deck-height').textContent=`${deckHeights[selectedDeck].toFixed(2)} m`;
  $('space-list').replaceChildren(...filtered.map(s=>{
    const row=document.createElement('button');row.className='space-row'+(selectedSpace?.id===s.id?' active':'');row.setAttribute('role','listitem');
    const text=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small'),arrow=document.createElement('span');
    name.textContent=s.name;detail.textContent=`${s.id}  ·  INFERRED`;arrow.textContent='↗';arrow.className='row-arrow';text.append(name,detail);row.append(text,arrow);row.addEventListener('click',()=>selectSpace(s.id));return row;
  }));
  if(!filtered.length){const p=document.createElement('p');p.className='empty-register';p.textContent='No matching spaces. Try a deck, class, room type or reconstruction ID.';$('space-list').append(p);}
}
async function selectSpace(id){
  const s=spaces.get(id);if(!s)return;
  if(mode!=='decks')await setMode('decks');
  selectedDeck=s.deck;$('deck-select').value=s.deck;await loadRegion(partForDeck(s.deck));selectedSpace=s;renderSpaceList();
  const center=native([s.center[0],s.center[1],s.z+1]);const distance=Math.max(7,Math.max(s.dimensions[0],s.dimensions[1])*1.25);
  transition={from:camera.position.clone(),to:center.clone().add(new THREE.Vector3(distance*.70,distance*.9,-distance*.85)),targetFrom:controls.target.clone(),targetTo:center,t:0};
  const verts=[];for(const polygon of [s.polygon,...s.holes])for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];verts.push(a[0],s.z+.06,-a[1],b[0],s.z+.06,-b[1]);}
  highlight.geometry.dispose();highlight.geometry=new THREE.BufferGeometry();highlight.geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));highlight.visible=true;
  $('selected-kicker').textContent=`${layout.specification.decks.find(d=>d.id===s.deck).name.toUpperCase()} · ${s.id}`;$('selected-name').textContent=s.name;
  $('selected-meta').textContent=`${s.dimensions[0].toFixed(1)} × ${s.dimensions[1].toFixed(1)} m · ${s.evidence_ids.join(' / ')}\nINFERRED BOUNDARIES · NOT VISUALLY APPROVED`;
  $('selected-card').hidden=false;updateVisibility();
}

function enterSpace(){
  if(!selectedSpace)return;walking=true;walkSpace=selectedSpace;selectedDeck=walkSpace.deck;document.body.classList.add('walking');$('walk-help').hidden=false;controls.enabled=false;transition=null;
  const p=walkSpace.standing_point;camera.position.copy(native(p));yaw=Math.PI/2;pitch=0;
  if(furnitureBlocks(p[0],p[1],walkSpace.id,placements.items)){
    const door=layout.connections.find(l=>l.a===walkSpace.id&&l.kind==='door');
    if(door){const dx=walkSpace.center[0]-door.point[0],dy=walkSpace.center[1]-door.point[1],d=Math.hypot(dx,dy)||1;camera.position.copy(native([door.point[0]+dx/d*.45,door.point[1]+dy/d*.45,walkSpace.z+1.65]));}
  }
  $('walk-context').textContent=walkSpace.name+' · linked-landings navigation, not full character physics';updateVisibility();
  toast('WASD to move; arrow keys or drag to look. E operates a nearby door. R uses a linked stair. Esc returns to orbit.');
}
function tryWalk(dx,dz){
  const x=camera.position.x+dx,y=-camera.position.z-dz;
  let destination=walkSpace;
  if(!insideSpace(x,y,destination)){
    destination=layout.spaces.find(s=>s.deck===selectedDeck&&insideSpace(x,y,s)&&canCross(walkSpace.id,s.id,x,y,layout.connections,doorStates));
    if(!destination)return false;
  }
  if(furnitureBlocks(x,y,destination.id,placements.items))return false;
  camera.position.x=x;camera.position.z=-y;camera.position.y=destination.z+1.65;walkSpace=destination;
  $('walk-context').textContent=walkSpace.name+' · '+walkSpace.id;return true;
}
function toggleDoor(id){
  const door=doorStates.get(id),link=links.get(id);if(!door||!link)return false;
  const target=door.target>.5?0:1;
  if(walking&&doorSweepHits(link,door.open,target,[camera.position.x,-camera.position.z])){toast('Step clear of the door’s swing before operating it.');return false;}
  door.target=target;toast(`${id} · ${target?'opening':'closing'}`);return true;
}
function nearestDoor(){
  const candidates=layout.connections.filter(l=>l.kind==='door'&&[l.a,l.b].includes(walkSpace?.id)&&doorStates.has(l.id)).sort((a,b)=>Math.hypot(a.point[0]-camera.position.x,a.point[1]+camera.position.z)-Math.hypot(b.point[0]-camera.position.x,b.point[1]+camera.position.z));
  if(candidates[0]&&Math.hypot(candidates[0].point[0]-camera.position.x,candidates[0].point[1]+camera.position.z)<2.2)toggleDoor(candidates[0].id);else toast('Move within two metres of an interactive door.');
}
async function useStair(){
  const link=layout.connections.find(l=>['stairs','winding_stairs'].includes(l.kind)&&[l.a,l.b].includes(walkSpace.id));
  if(!link){toast('This space has no linked stair. Reach a stair lobby first.');return;}
  const target=spaces.get(link.a===walkSpace.id?link.b:link.a);await loadRegion(partForDeck(target.deck));selectedDeck=target.deck;walkSpace=target;camera.position.copy(native(target.standing_point));updateVisibility();toast('Moved to the connected landing. Continuous stair walking remains unfinished.');
}

function updateMechanisms(dt){
  for(const ob of animated){
    const d=ob.userData,category=d.category,engine=d.engine??0,theta=state.phase[engine];
    if(category==='crankshaft'||category==='propeller')ob.rotation.x=theta;
    else if(category==='crosshead'||category==='connecting_rod'){
      const s=sliderCrank(theta+d.phase,d.crank_radius*2,d.rod_length,d.crank_z,d.shaft_y);
      if(category==='crosshead')ob.position.set(d.cylinder_x,s.crosshead.z,-s.crosshead.y);
      else{ob.position.set(d.cylinder_x,s.crankPin.z,-s.crankPin.y);ob.rotation.x=s.rodAngle;}
    }else if(category==='rudder')ob.rotation.y=state.rudder;
    else if(category==='helm')ob.rotation.z=-state.rudder/(32*Math.PI/180)*Math.PI*5;
  }
  let doorsChanged=false;
  for(const [id,door] of doorStates){
    if(Math.abs(door.open-door.target)<.0005)continue;
    door.open+=clamp(door.target-door.open,-dt*1.35,dt*1.35);
    const l=links.get(id);const angle=(l.swing_sign??1)*door.open*l.max_angle*Math.PI/180;
    door.node.quaternion.copy(door.base).multiply(new THREE.Quaternion().setFromAxisAngle(up,angle));doorsChanged=true;
  }
  if(doorsChanged){vesselGroup.updateMatrixWorld(true);const inverse=vesselGroup.matrixWorld.clone().invert();for(const batch of doorBatches){batch.entries.forEach((entry,i)=>batch.mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,entry.mesh.matrixWorld)));batch.mesh.instanceMatrix.needsUpdate=true;}}
}

const poi=[{name:'First-class saloon',id:'M-SALOON',position:[6,0,15.2]},{name:'Twin reciprocating engines',camera:'engine',position:[-26,0,12]},{name:'Upper staterooms',id:'U-STATEROOM-G',position:[6,5.7,14.6]},{name:'The navigation bridge',id:'P-WHEELHOUSE',position:[34,0,17]}];
for(const [i,p] of poi.entries()){
  const b=document.createElement('button');b.className='point-label';b.innerHTML=`<i>0${i+1}</i>${p.name}`;b.addEventListener('click',async()=>{if(p.id)await selectSpace(p.id);else{await setMode('machinery');viewCamera(p.camera);}});$('point-labels').append(b);p.element=b;
}
function updateLabels(){
  for(const p of poi){p.element.hidden=!labelsVisible||walking||mode!=='exterior';if(p.element.hidden)continue;const v=native(p.position).project(camera);p.element.style.left=`${(v.x*.5+.5)*$('viewport').clientWidth}px`;p.element.style.top=`${(-v.y*.5+.5)*$('viewport').clientHeight}px`;p.element.style.display=v.z>1||v.z<0?'none':'';}
}
function resize(){const w=$('viewport').clientWidth,h=$('viewport').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,walking?0:-w*(w>720?.085:.025),0,w,h);camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();viewCamera('port_bow',true);
$('space-total').textContent=layout.spaces.length;$('dialog-spaces').textContent=layout.spaces.length;
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode).catch(console.error)));
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>viewCamera(b.dataset.camera)));
$('deck-select').addEventListener('change',async()=>{selectedDeck=$('deck-select').value;await loadRegion(partForDeck(selectedDeck));renderSpaceList();selectedSpace=null;$('selected-card').hidden=true;controls.target.y=deckHeights[selectedDeck];updateVisibility();});
$('space-search').addEventListener('input',renderSpaceList);
$('close-explorer').onclick=()=>setMode('exterior');$('close-engine').onclick=()=>setMode('exterior');
$('orbit-reset').onclick=()=>{if(walking){walking=false;document.body.classList.remove('walking');$('walk-help').hidden=true;controls.enabled=true;resize();}if(mode==='exterior')viewCamera('port_bow');else if(mode==='machinery'){camera.position.set(-13,17,-25);controls.target.set(-26,5.5,0);}else{camera.position.set(70,100,-110);controls.target.set(0,deckHeights[selectedDeck],0);}updateVisibility();};
$('section-toggle').onclick=async()=>{
  if(mode!=='exterior')await setMode('exterior');section=!section;
  if(section){toast('Loading all decks for the full-ship longitudinal section. This may take a moment.');for(const part of ['machinery','structure','lower','main','upper'])await loadRegion(part);viewCamera('cutaway');}
  updateVisibility();
};
$('drydock-toggle').onclick=()=>{drydock=!drydock;updateVisibility();};$('labels-toggle').onclick=()=>{labelsVisible=!labelsVisible;updateVisibility();};
$('close-selected').onclick=()=>{selectedSpace=null;highlight.visible=false;$('selected-card').hidden=true;renderSpaceList();};$('enter-space').onclick=()=>{enterSpace();resize();};
$('evidence-button').onclick=$('status-info').onclick=()=>$('evidence-dialog').showModal();$('close-evidence').onclick=()=>$('evidence-dialog').close();
$('evidence-dialog').addEventListener('click',event=>{if(event.target===$('evidence-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
$('fullscreen').onclick=()=>{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p?.catch(()=>toast('Fullscreen is unavailable in this embedded preview.'));};
$('capture').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=`teutonic-${mode}-PREVIEW-NOT-FINAL.png`;a.href=renderer.domElement.toDataURL('image/png');a.click();toast('Saved a viewport preview, not a final-quality inspection render.');};
$('telegraph').oninput=()=>state.setTelegraph(Number($('telegraph').value)/100);$('firing').oninput=()=>state.setFiring(Number($('firing').value)/100);$('helm').oninput=()=>state.setRudder(Number($('helm').value));$('cooling-pump').onchange=()=>state.coolingPump=$('cooling-pump').checked;
$('warm-start').onclick=()=>{state.warmStart();$('firing').value=65;$('cooling-pump').checked=true;toast('Warm-start preset: 150 psi initialized. This is a demonstrator shortcut, not an instantaneous heating simulation.');};
$('stop-engines').onclick=()=>{state.emergencyStop();$('telegraph').value=0;$('firing').value=0;toast('Steam demand shut off. Shafts run down with inertia; cooling remains on.');};
document.querySelector('.wordmark').onclick=e=>{e.preventDefault();setMode('exterior');};
window.addEventListener('keydown',event=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
  if(event.key==='/'){event.preventDefault();setMode('decks').then(()=>$('space-search').focus());}
  if(event.key==='Escape'&&walking){walking=false;document.body.classList.remove('walking');$('walk-help').hidden=true;controls.enabled=true;controls.target.copy(camera.position).add(new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(4));resize();updateVisibility();}
  if(walking){keys.add(event.code);if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();if(event.code==='KeyE'&&!event.repeat)nearestDoor();if(event.code==='KeyR'&&!event.repeat)useStair();}
  else if(['1','2','3'].includes(event.key))setMode(['exterior','decks','machinery'][Number(event.key)-1]);
});
window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());
let pointerStart=null,lastPointer=null;
renderer.domElement.addEventListener('pointerdown',event=>{pointerStart=[event.clientX,event.clientY];lastPointer=pointerStart;});
renderer.domElement.addEventListener('pointermove',event=>{if(walking&&event.buttons&&lastPointer){yaw-=(event.clientX-lastPointer[0])*.004;pitch=clamp(pitch-(event.clientY-lastPointer[1])*.004,-1.2,1.2);}lastPointer=[event.clientX,event.clientY];});
renderer.domElement.addEventListener('pointerup',event=>{
  if(walking||mode!=='decks'||!pointerStart||Math.hypot(event.clientX-pointerStart[0],event.clientY-pointerStart[1])>5)return;
  const rect=renderer.domElement.getBoundingClientRect();const ndc=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);const hit=new THREE.Vector3();
  if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-deckHeights[selectedDeck]),hit)){const s=layout.spaces.find(s=>s.deck===selectedDeck&&insideSpace(hit.x,-hit.z,s));if(s)selectSpace(s.id);}
});
const clock=new THREE.Clock();
// Keep interpolation explicit; navigation and engine state are independent of frame rate.
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.08);state.step(dt);
  if(transition){transition.t=Math.min(1,transition.t+dt*.85);const q=transition.t*transition.t*(3-2*transition.t);camera.position.lerpVectors(transition.from,transition.to,q);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,q);if(transition.t>=1)transition=null;}
  if(walking){
    const turn=(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0);yaw+=turn*dt*1.25;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt,-1.2,1.2);
    const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),speed=(keys.has('ShiftLeft')?2.1:1.25)*dt;
    const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed;
    if(dx||dz){if(!tryWalk(dx,dz)){tryWalk(dx,0);tryWalk(0,dz);}}
    camera.rotation.set(pitch,yaw,0,'YXZ');
  }else controls.update();
  vesselGroup.position.y=mode==='exterior'&&!section&&!drydock?state.heave:0;vesselGroup.rotation.x=mode==='exterior'&&!section&&!drydock?state.roll:0;vesselGroup.rotation.z=mode==='exterior'&&!section&&!drydock?state.pitch:0;
  const near=walking?.04:Math.max(.08,camera.position.distanceTo(controls.target)/260);
  if(Math.abs(camera.near-near)>.005){camera.near=near;camera.updateProjectionMatrix();}
  updateMechanisms(dt);environment.step(state);updateLabels();renderer.render(scene,camera);frameCount++;
  if(state.time-lastTelemetry>.2){lastTelemetry=state.time;$('rpm-port').textContent=Math.abs(state.rpm[0]).toFixed(1);$('rpm-starboard').textContent=Math.abs(state.rpm[1]).toFixed(1);$('steam-pressure').textContent=state.pressure.toFixed(0);$('firing-value').textContent=Math.round(state.firing*100)+'%';$('telegraph-label').textContent=state.telegraph===0?'STOP':`${Math.round(Math.abs(state.telegraph)*100)}% ${state.telegraph>0?'AHEAD':'ASTERN'}`;$('rudder-value').textContent=Math.abs(state.rudder)<.005?'MIDSHIPS':`${Math.abs(state.rudder*180/Math.PI).toFixed(0)}° ${state.rudder>0?'STBD':'PORT'}`;$('system-warning').textContent=state.warning;$('motion-readout').innerHTML=`${Math.abs(state.speedKnots).toFixed(1)} KN <span class="footer-divider">/</span> EARLY SERVICE · c.1889–1892`;}
}
window.__shipInspection={get ready(){return ready;},get mode(){return mode;},get selectedSpace(){return selectedSpace?.id;},get walking(){return walking;},get frameCount(){return frameCount;},state,loadedParts,doorStates,animated,setMode,selectSpace,toggleDoor,enterSpace,renderer,scene,camera,layout,renderables};
loadRegion('exterior',true).then(()=>{ready=true;$('loading-progress').style.width='100%';$('load-status').textContent='Exterior ready · editable source retained';$('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,550);animate();}).catch(error=>{$('load-status').textContent='The model could not be loaded. '+error.message;$('loading-progress').style.background='#a54939';});
