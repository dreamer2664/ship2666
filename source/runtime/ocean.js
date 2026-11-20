import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function createEnvironment(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(4500);
  sky.material.uniforms.turbidity.value = 5.2;
  sky.material.uniforms.rayleigh.value = 1.7;
  sky.material.uniforms.mieCoefficient.value = .004;
  sky.material.uniforms.mieDirectionalG.value = .75;
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(67), THREE.MathUtils.degToRad(145));
  sky.material.uniforms.sunPosition.value.copy(sun);
  scene.add(sky);
  const envScene = new THREE.Scene();
  const envSky = sky.clone(); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, .02, .1, 5000);
  scene.environment = target.texture;
  pmrem.dispose();
  const hemi = new THREE.HemisphereLight(0xe2e9e6, 0x68776b, 1.6);scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffeed3, 2.7);key.position.set(80,150,-70);scene.add(key);
  const fill = new THREE.DirectionalLight(0xc6dce0, .9);fill.position.set(-80,35,80);scene.add(fill);
  const geometry = new THREE.PlaneGeometry(2600,2600,220,220);geometry.rotateX(-Math.PI/2);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime:{value:0}, uSea:{value:.65}, uWake:{value:0}, uShaft:{value:0}, uSun:{value:sun}, uShipOffset:{value:0} },
    side:THREE.DoubleSide,
    vertexShader:`
      uniform float uTime,uSea;varying vec3 vWorld;varying float vCrest;
      float wave(vec2 p,float a,float length,float direction,float phase){float k=6.2831853/length;return a*cos(k*dot(p,vec2(cos(direction),sin(direction)))-sqrt(9.81*k)*uTime+phase);}
      void main(){vec3 p=position;vec2 q=vec2(p.x,-p.z);float h=wave(q,.28,42.,.2,0.)+wave(q,.18,24.,1.1,2.)+wave(q,.11,13.,-.5,1.)+wave(q,.075,7.,.8,3.)+wave(q,.035,3.5,1.8,4.);p.y=7.1+h*uSea;vCrest=h;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}
    `,
    fragmentShader:`
      uniform float uTime,uSea,uWake,uShaft,uShipOffset;uniform vec3 uSun;varying vec3 vWorld;varying float vCrest;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec3 N=normalize(cross(dFdy(vWorld),dFdx(vWorld)));if(N.y<0.)N=-N;
        float ripple=sin(vWorld.x*2.1+vWorld.z*1.5-uTime*2.4)*.035+sin(vWorld.z*5.2-vWorld.x*.6+uTime*3.1)*.022;
        N=normalize(N+vec3(ripple,0.,sin(vWorld.z*3.8+uTime*2.)*.04)*(.25+uSea));
        vec3 V=normalize(cameraPosition-vWorld);float fresnel=.0204+.9796*pow(1.-max(dot(N,V),0.),5.);
        vec3 R=reflect(-V,N);vec3 sky=mix(vec3(.55,.65,.66),vec3(.23,.37,.43),pow(clamp(R.y,0.,1.),.55));
        vec3 water=vec3(.017,.074,.087)+vec3(.01,.027,.025)*max(vCrest,0.);
        vec3 color=mix(water,sky,clamp(fresnel*.92+.08,0.,1.));
        float glint=pow(max(dot(reflect(-uSun,N),V),0.),320.);color+=vec3(1.,.91,.72)*glint*.6;
        float d=-vWorld.x-82.;float beam=abs(vWorld.z);
        float kelvin=exp(-pow((beam-(3.4+d*.17))/2.1,2.))*exp(-max(d,0.)/155.)*step(0.,d)*step(d,280.);
        float prop=exp(-pow((beam-2.13)/2.7,2.))*exp(-max(d,0.)/43.)*step(0.,d)*uShaft;
        float bow=exp(-pow((vWorld.x-84.0+beam*.32)/2.5,2.))*exp(-pow((beam-4.2)/4.,2.))*uWake;
        float turbulence=noise(vWorld.xz*1.9+vec2(uTime*1.8,-uTime*.12));
        float crest=smoothstep(.44,.61,vCrest)*uSea*.22;
        float foam=clamp((kelvin*uWake*.7+prop*.5+bow*.7+crest)*smoothstep(.25,.76,turbulence),0.,.88);
        color=mix(color,vec3(.74,.81,.78),foam);
        float distanceFog=1.-exp(-length(cameraPosition-vWorld)*.00065);color=mix(color,vec3(.55,.65,.66),distanceFog*.75);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const ocean = new THREE.Mesh(geometry,material);ocean.name='Multiscale Atlantic — approximation';ocean.frustumCulled=false;scene.add(ocean);
  const volumeMaterial = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.BackSide,
    uniforms:{uTime:{value:0},uLoad:{value:0},uOrigin:{value:new THREE.Vector3()}},
    vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`
      precision highp float;uniform float uTime,uLoad;uniform vec3 uOrigin;varying vec3 vWorld;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float density(vec3 p){float age=max(0.,-p.x/2.9);float r=.6+age*.23;float rise=.74*age;vec2 delta=vec2(p.y-rise,p.z-sin(age*.45)*age*.05);float envelope=exp(-dot(delta,delta)/(r*r))*smoothstep(-1.,.5,age)*(1.-smoothstep(13.,21.,age));float n=noise(p*.5+vec3(uTime*.65,-uTime*.35,uTime*.1))*.65+noise(p*1.15+uTime*.27)*.35;return max(0.,n-.29)*envelope*uLoad*.50;}
      void main(){if(uLoad<.005)discard;vec3 ro=cameraPosition-uOrigin,rd=normalize(vWorld-cameraPosition);vec3 lo=vec3(-62.,-1.,-12.),hi=vec3(3.,23.,12.);vec3 t0=(lo-ro)/rd,t1=(hi-ro)/rd;vec3 nearT=min(t0,t1),farT=max(t0,t1);float entry=max(max(nearT.x,nearT.y),nearT.z),exit=min(min(farT.x,farT.y),farT.z);if(exit<max(entry,0.))discard;float start=max(entry,0.);float stepSize=(exit-start)/30.;float alpha=0.;vec3 color=vec3(0.);
        for(int i=0;i<30;i++){vec3 p=ro+rd*(start+(float(i)+.5)*stepSize);float d=density(p)*stepSize;float a=1.-exp(-d);vec3 soot=mix(vec3(.105,.115,.12),vec3(.26,.28,.28),noise(p*.18+4.));color+=(1.-alpha)*a*soot;alpha+=(1.-alpha)*a;if(alpha>.94)break;}
        if(alpha<.003)discard;gl_FragColor=vec4(color/max(alpha,.0001),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const smoke=[];
  for(const x of [-11.1,20.5]){
    const mat=volumeMaterial.clone();const origin=new THREE.Vector3(x,24.2,0);mat.uniforms.uOrigin.value.copy(origin);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(65,24,24),mat);mesh.position.copy(origin).add(new THREE.Vector3(-29.5,11,0));mesh.renderOrder=5;scene.add(mesh);smoke.push(mesh);
  }
  return {
    ocean,sky,smoke,
    setVisible(visible){ocean.visible=visible;smoke.forEach(m=>m.visible=visible);},
    step(state){material.uniforms.uTime.value=state.time;material.uniforms.uSea.value=state.seaState;material.uniforms.uWake.value=state.wake;material.uniforms.uShaft.value=(Math.abs(state.rpm[0])+Math.abs(state.rpm[1]))/156;for(const m of smoke){m.material.uniforms.uTime.value=state.time;m.material.uniforms.uLoad.value=state.smoke;}},
  };
}
