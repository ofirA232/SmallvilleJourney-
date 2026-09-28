import './style.css';
import { MiniMap } from './minimap';
import { StoryScore } from './core/story-music';
import { OpeningMusic } from './core/opening-music';
import { SpeedTrail } from './world/speed-trail';
import { accelerateOccluders } from './core/camera-occlusion';
import { RenderQuality } from './core/render-quality';
import './encounters.css';
import { KryptoniteEffect } from './world/kryptonite';
import { BridgeScene } from './bridge-scene';
import { RoofTearScene } from './roof-tear-scene';
import { FenceChallenge } from './fence-challenge';
import { ScarecrowScene } from './scarecrow-scene';
import { BUS_AFTER_SCENE, BusScene } from './bus-scene';
import { TruckDoorScene } from './truck-door-scene';
import { ValveChallenge } from './valve-challenge';
import { PromScene } from './prom-scene';
import { WallScene } from './wall-scene';
import { LoftScene } from './loft-scene';
import type { StoryScene } from './cutscene';
import { TruckAttack } from './truck-attack';
import { FieldRescue } from './field-rescue';
import * as THREE from 'three';
import { activeEpisode } from './content/episodes';
import { fontsReady, language, localizeEpisode, preferredLanguage, setLanguage, SETTINGS_KEY, t, type Language } from './i18n';
import { locations } from './content/locations';
import { Story, validateEpisode } from './core/story';
import { at, basis, CharacterController, distance, isLocked, surfaceRadius, tangent, UP } from './core/sphere';
import { Navigator } from './core/navigation';
import { CameraRig } from './core/camera';
import { GameAudio } from './core/audio';
import { Input } from './core/input';
import { Countdown } from './core/countdown';
import { EncounterUI } from './encounters';
import { FieldNotes } from './field-notes';
import { World } from './world/world';
import { Character } from './world/character';
import { element, UI } from './ui';
import type { GameSnapshot, LocationId, NpcId, QuestDefinition, Settings } from './types';

let storage: Storage | null = null;
try { storage = localStorage; } catch { /* Private browsing can make local storage unavailable. */ }
// The language is chosen before anything is built, and the whole episode is translated once.
setLanguage(preferredLanguage(storage));
document.title = t('Smallville Journey — Every legend starts somewhere.');
const episode = localizeEpisode(activeEpisode);
const prologue=episode.prologue??[];
const ui = new UI(episode);
const canvas = element<HTMLCanvasElement>('world');
const parameters = new URLSearchParams(location.search);
const story = new Story(episode, storage, locations.map(value => value.id));
story.load();

class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  poison=new KryptoniteEffect(this.scene);
  poisonAmount=0;
  cinematic:StoryScene|null=null;
  fence:FenceChallenge|null=null;
  valve:ValveChallenge|null=null;
  fieldRescue:FieldRescue|null=null;
  truckAttack:TruckAttack|null=null;
  world: World;
  player = new CharacterController();
  clark = new Character('clark');
  carriedActor:Character|null=null;
  carriedId:NpcId|null=null;
  carriedModels=new Map<NpcId,Character>();
  camera = new CameraRig(this.player);
  navigator: Navigator;
  minimap = new MiniMap(()=>this.navigate());
  audio = new GameAudio();
  storyScore = new StoryScore(episode.quests.map(quest => quest.id));
  openingMusic = new OpeningMusic(element<HTMLButtonElement>('opening-music-button'));
  encounters=new EncounterUI(()=>this.pauseInputs(),success=>{this.audio.setPaused(false);this.audio.feedback(success);},()=>{this.world.endPreview();this.renderDirty=true;});
  notes=new FieldNotes(story,()=>this.pauseInputs(),()=>{ui.updateStory(story);this.world.syncMemories(story.memories);this.audio.chime();});
  input: Input;
  sun = new THREE.DirectionalLight('#ffe5b1', 2.8);
  fill = new THREE.HemisphereLight('#e7eff8', '#738566', 2.1);
  mode: 'title' | 'intro' | 'playing' = 'title';
  // Sound is on unless the player turned it off: the title greets them with its music.
  settings: Settings = { sound: true, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, quality: 'auto', language: language() };
  introPage = 0;
  ready = false;
  routeTarget: THREE.Vector3 | null = null;
  routeIsQuest = false;
  action: { id: string; elapsed: number; duration: number } | null = null;
  race=new Countdown();
  focused=document.hasFocus();
  currentLocation: LocationId = 'farm';
  elapsed = 0;
  private lastTime = 0;
  private accumulator = 0;
  private hudTime = 0;
  private shadowTime = 0;
  private contextLost = false;
  private footShadow: THREE.Mesh;
  private trail = new SpeedTrail();

  private renderQuality = new RenderQuality();

  private rendererFrames = 0;
  private fps = 60;
  private fpsTime = 0;
  private occluders: THREE.Object3D[] = [];
  private wasPaused=false;
  private wasAsleep=false;
  private lastRender=0;
  /** When the player last turned or zoomed the camera. */
  private lastLook=0;
  private renderDirty=true;
  constructor() {
    const haze=document.createElement('div');haze.id='kryptonite-haze';haze.setAttribute('aria-hidden','true');document.body.appendChild(haze);
    if(parameters.has('no-webgl'))throw new Error('WebGL 2 is unavailable.');
    validateEpisode(episode, locations.map(location => location.id));
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.sun.position.set(-27, 45, 39); this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 120 });
    this.sun.shadow.bias = -.00015; this.sun.shadow.normalBias = .05; this.sun.shadow.radius = 3;
    this.scene.add(this.fill, this.sun, new THREE.AmbientLight('#e5dec9', .44));
    const backlight=new THREE.DirectionalLight('#b2d8d2',1.5);backlight.position.set(25,-19,-35);this.scene.add(backlight);
    this.world = new World([...episode.quests,...(episode.memories??[])]);this.world.addMemories(episode.memories??[]); this.scene.add(this.world.root, this.clark.root);
    this.world.root.updateWorldMatrix(true,true);
    this.occluders=this.world.scenery.children.filter(child=>child instanceof THREE.Mesh);accelerateOccluders(this.occluders);
    this.navigator = new Navigator(this.world.colliders);
    this.footShadow=new THREE.Mesh(new THREE.CircleGeometry(.29,22),new THREE.MeshBasicMaterial({color:'#1a382a',opacity:.22,transparent:true,depthWrite:false}));
    this.footShadow.geometry.rotateX(-Math.PI/2);this.scene.add(this.footShadow);
    this.scene.add(this.trail.mesh);
    try{const saved=JSON.parse(storage?.getItem(SETTINGS_KEY)??'null');if(saved&&typeof saved.sound==='boolean'&&typeof saved.reducedMotion==='boolean'&&['auto','low','high'].includes(saved.quality))this.settings={...saved,language:language()};}catch{ /* Default preferences are sufficient. */ }
    if(parameters.get('quality')==='low')this.settings.quality='low';
    this.input=new Input(canvas,{
      interact:()=>this.interact(),jump:()=>{if(this.player.jump())this.audio.jump();this.camera.setView('follow');},
      toggleView:()=>this.toggleView(),journal:()=>this.showJournal(),escape:()=>{this.stopRoute();this.action=null;},
      drag:(x,y)=>{this.lastLook=performance.now();if(this.cinematic?.drag)this.cinematic.drag(x,y);else if(!this.truckAttack)this.camera.drag(x,y);},zoom:value=>{this.lastLook=performance.now();if(!this.truckAttack)this.camera.zoom(value);},ground:(x,y)=>this.clickGround(x,y),
      movement:()=>{this.stopRoute();this.camera.setView('follow');},enabled:()=>this.mode==='playing'&&!ui.paused&&!this.action&&!this.truckAttack&&!this.valve,
      menuEnabled:()=>this.mode==='playing'&&!ui.paused,
      dialogue:()=>!!ui.dialogue,nextDialogue:()=>ui.nextDialogue(),
    });
    ui.callbacks={navigate:id=>this.navigate(id),restart:()=>this.newGame(),title:()=>this.returnToTitle(),settings:settings=>void this.setSettings(settings),language:value=>this.changeLanguage(value),pause:()=>this.pauseInputs()};
    element('begin-button').addEventListener('click',()=>story.hadSave?this.resume():this.newGame());
    element('brand-button').addEventListener('click',()=>{if(this.mode==='playing'&&!ui.dialogue)this.returnToTitle();});
    element('intro-next').addEventListener('click',()=>{this.introPage++;if(this.introPage>=prologue.length)this.finishIntro();else this.renderIntro();});
    element('skip-intro').addEventListener('click',()=>this.finishIntro());
    element('interact-button').addEventListener('click',()=>this.interact());
    element('view-button').addEventListener('click',()=>{if(!ui.dialogue)this.toggleView();});
    element('journal-button').addEventListener('click',()=>this.showJournal());
    element('episode-button').addEventListener('click',()=>this.showJournal());
    element('settings-button').addEventListener('click',()=>ui.open('settings'));
    element('help-link').addEventListener('click',()=>ui.open('settings'));
    element('opening-music-button').addEventListener('click',()=>void this.setSettings({...this.settings,sound:!this.openingMusic.playing}));
    element('sound-button').addEventListener('click',()=>void this.setSettings({...this.settings,sound:!this.settings.sound}));
    element('cancel-route').addEventListener('click',()=>this.stopRoute());
    element('retry-button').addEventListener('click',()=>{ui.close('retry');this.restoreCheckpoint();ui.toast(t('One more try'),story.quest?.description??t('Try the current objective again.'));});
    // Closing the ending panel, however it is closed, steps out of the loft into the world.
    element('completion').addEventListener('close',()=>{if(this.cinematic instanceof LoftScene&&story.complete)this.restoreCheckpoint();this.storyScore.release();this.syncStoryMusic();});
    element('keep-exploring').addEventListener('click',()=>{ui.close('completion');if(this.cinematic)this.restoreCheckpoint();ui.toast(t('Make yourself at home'),t('The story is complete. The little world is still yours.'));});
    window.addEventListener('resize',()=>this.resize());
    document.addEventListener('visibilitychange',()=>{this.syncStoryMusic();this.openingMusic.sync(this.mode!=='playing',document.hidden||!this.focused);this.pauseInputs();this.lastTime=performance.now();this.accumulator=0;this.audio.setPaused(document.hidden||ui.paused||this.mode!=='playing');});
    window.addEventListener('blur',()=>{this.focused=false;this.syncStoryMusic();this.openingMusic.sync(this.mode!=='playing',true);this.pauseInputs();this.audio.setPaused(true);});
    window.addEventListener('focus',()=>{this.focused=true;this.syncStoryMusic();this.openingMusic.sync(this.mode!=='playing',document.hidden||ui.paused);this.lastTime=performance.now();this.accumulator=0;});
    window.addEventListener('pagehide',()=>{if(this.mode==='playing')story.save();});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.contextLost=true;this.pauseInputs();this.audio.setPaused(true);showFallback(t('The graphics connection was interrupted. Your last completed objective is saved.'));});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
    this.restoreCheckpoint();ui.setPlaying(false);ui.updateStory(story);ui.syncSettings(this.settings);this.updateContinue();
    this.openingMusic.setEnabled(this.settings.sound);
    this.resize();this.renderer.compile(this.scene,this.camera.camera);
    this.lastTime=performance.now();requestAnimationFrame(time=>this.frame(time));
  }
  // Menus silence the scene. The strength encounters and the closing panel are part of it,
  // so their tracks play on—the last one plays out behind the completion screen.
  syncStoryMusic(){this.storyScore.sync(story.index,ui.dialogue?.id??null,this.mode==='playing',this.settings.sound,document.hidden||!this.focused||!!document.querySelector('dialog[open]:not(#encounter):not(#completion)'));}
  updateContinue(){element('begin-button').querySelector('span')!.textContent=story.hadSave?(story.complete?t('Return to Smallville'):t('Continue your journey')):t('Begin your journey');element('landing-new').hidden=!story.hadSave;}
  /** Saves the new language and reloads, so every part of the game is built in it. The story is saved first. */
  changeLanguage(value:Language){
    if(value===language())return;
    if(this.mode==='playing')story.save();
    try{storage?.setItem(SETTINGS_KEY,JSON.stringify({...this.settings,language:value}));}catch{ /* Without storage the page cannot remember it. */ }
    location.reload();
  }
  async setSettings(settings:Settings){
    if(settings.quality!==this.settings.quality)this.renderQuality.reset();
    this.openingMusic.sync(this.mode!=='playing',document.hidden||!this.focused);this.openingMusic.setEnabled(settings.sound);
    this.settings={...settings};this.syncStoryMusic();const worked=await this.audio.setEnabled(settings.sound);
    if(!worked){this.openingMusic.setEnabled(false);this.settings.sound=false;this.syncStoryMusic();ui.toast(t('Sound is unavailable'),t('You can keep exploring with sound turned off.'));}
    try{storage?.setItem(SETTINGS_KEY,JSON.stringify(this.settings));}catch{ /* A preference should never block play. */ }
    ui.syncSettings(this.settings);this.resize();
  }
  resize(){
    this.renderDirty=true;
    const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight),coarse=matchMedia('(pointer: coarse)').matches;
    const low=this.settings.quality==='low'||(this.settings.quality==='auto'&&(coarse||width<600||this.renderQuality.level>0));
    const budget=low?900_000:1_500_000;
    document.body.classList.toggle('low-graphics',low);
    const ratio=Math.min(devicePixelRatio||1,low?1:1.4,Math.sqrt(budget/(width*height)))*(this.settings.quality==='auto'&&this.renderQuality.level===2?.75:1);
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(width,height,false);this.camera.resize(width,height);
    this.renderer.shadowMap.enabled=!low;this.sun.shadow.mapSize.set(1024,1024);this.renderer.shadowMap.needsUpdate=true;
  }
  pauseInputs(){this.trail.clear();this.input?.clear();this.stopRoute();this.action=null;this.player.speed=0;this.player.moving=false;this.player.superSpeed=false;}
  newGame(){
    this.fence?.dispose();this.fence=null;this.valve?.dispose();this.valve=null;
    this.truckAttack?.dispose();this.truckAttack=null;this.clark.root.visible=true;
    this.fieldRescue?.dispose();this.fieldRescue=null;
    this.cinematic?.dispose();this.cinematic=null;
    this.encounters.cancel();
    ui.cancelDialogue();ui.closeAll();story.newGame();this.pauseInputs();this.restoreCheckpoint();this.mode='intro';this.camera.setView('globe');this.camera.theta=-.3;this.camera.phi=1.05;this.camera.globeZoom=1;
    this.introPage=0;ui.setPlaying(false);element('landing').hidden=true;element('prologue').hidden=false;if(prologue.length)this.renderIntro();else this.finishIntro();ui.updateStory(story);void this.setSettings(this.settings);
  }
  renderIntro(){const page=prologue[this.introPage];element('intro-year').textContent=page.year;element('intro-title').textContent=page.title;element('intro-text').textContent=page.text;element('intro-pages').textContent=prologue.map((_,index)=>index===this.introPage?'●':'○').join('  ');element('intro-next').querySelector('span')!.textContent=this.introPage===prologue.length-1?t('Step into the story'):t('Continue');}
  finishIntro(){element('prologue').hidden=true;this.mode='playing';ui.setPlaying(true);this.camera.setView('follow');this.camera.snap();this.restoreCheckpoint();canvas.focus({preventScroll:true});ui.toast(episode.openingHint?.title??episode.title,episode.openingHint?.text??story.quest?.description??episode.description,4.8);}
  resume(){this.mode='playing';ui.setPlaying(true);this.camera.setView('follow');this.restoreCheckpoint();void this.setSettings(this.settings);canvas.focus({preventScroll:true});ui.toast(story.complete?t('Welcome home'):t('Right where you left off'),story.complete?t('Take your time. There is always more to see.'):story.quest!.title);}
  returnToTitle(){if(ui.dialogue)return;this.fence?.dispose();this.fence=null;this.valve?.dispose();this.valve=null;this.truckAttack?.dispose();this.truckAttack=null;this.clark.root.visible=true;
    this.fieldRescue?.dispose();this.fieldRescue=null;this.cinematic?.dispose();this.cinematic=null;this.pauseInputs();ui.closeAll();if(this.mode==='playing')story.save();this.mode='title';element('prologue').hidden=true;ui.setPlaying(false);this.camera.setView('globe');this.camera.theta=-.33;this.camera.phi=1.06;this.camera.globeZoom=1;this.updateContinue();ui.updateStory(story);}
  restoreCheckpoint(){
    this.fence?.dispose();this.fence=null;this.valve?.dispose();this.valve=null;
    this.truckAttack?.dispose();this.truckAttack=null;this.clark.root.visible=true;
    this.fieldRescue?.dispose();this.fieldRescue=null;
    this.cinematic?.dispose();this.cinematic=null;
    this.pauseInputs();
    this.notes.refresh();this.world.syncMemories(story.memories);
    const quest=story.quest;const location=quest?.checkpointLocation??quest?.location??'farm';
    const point=quest?.checkpoint??(quest?[quest.point[0],quest.point[1]+1.25] as const:[0,3.4] as const);
    const normal=at(location,point);this.player.reset(normal);this.player.forward.copy(basis(normal).north);
    this.camera.snap();this.race.start(quest?.timeLimit??0);this.world.sync(story);this.currentLocation=location;this.updateLocation(location);ui.updateStory(story);
  }
  toggleView(){if(this.cinematic||this.fieldRescue||this.truckAttack)return;this.camera.toggle();element('view-button').setAttribute('aria-pressed',String(this.camera.view==='follow'));document.body.classList.toggle('globe-view',this.camera.view==='globe');}
  showJournal(){if(this.cinematic||this.fieldRescue||this.truckAttack||ui.dialogue||this.mode==='intro')return;ui.updateStory(story);ui.open('journal');}
  stopRoute(){this.navigator?.stop();this.routeTarget=null;element('route-status').hidden=true;}
  navigate(location?:LocationId){
    if(this.cinematic||this.fieldRescue||this.truckAttack)return;
    if(this.mode!=='playing'){ui.toast(t('Your story is waiting'),t('Begin your journey to walk around Smallville.'));return;}
    if(story.restrained){ui.toast(story.quest?.title??t('A moment to wait'),story.quest?.description??t('Use the nearby interaction to continue.'));return;}
    if(ui.dialogue||this.action)return;
    if(location==='metropolis'){ui.toast(t('A future chapter'),t('Metropolis will open as Clark’s story continues.'));return;}
    const quest=story.quest,section=!location?this.fence?.nextTarget():null;const target=section??(location?at(location,[0,2.8]):quest?at(quest.location,quest.point):null);if(!target)return;
    this.setRoute(target,!location,section?t('To the next broken section'):location?t('Wandering to {place}',{place:t(locations.find(value=>value.id===location)!.name)}):t('On your way · {title}',{title:quest!.title}));
  }
  setRoute(target:THREE.Vector3,quest:boolean,label:string){
    if(!this.navigator.plan(this.player.normal,target)){ui.toast(t('A different way around'),t('That spot is hard to reach. Try the nearby path or walk there with the movement controls.'));return;}
    this.routeTarget=target;this.routeIsQuest=quest;this.camera.setView('follow');element('route-label').textContent=label;element('route-status').hidden=false;canvas.focus({preventScroll:true});
  }
  clickGround(x:number,y:number){
    if(this.cinematic||this.fieldRescue||this.truckAttack)return;
    if(story.restrained||this.action)return;
    const bounds=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-bounds.left)/bounds.width*2-1,-(y-bounds.top)/bounds.height*2+1),this.camera.camera);
    const hit=ray.intersectObjects([this.world.terrain,this.world.water],false)[0];if(!hit)return;
    const target=hit.point.clone().normalize();if(isLocked(target)){ui.toast(t('Metropolis · Coming later'),t('There is a bigger world ahead. For now, your story begins in Smallville.'));return;}
    const quest=story.quest;const isQuest=!!quest&&distance(target,at(quest.location,quest.point))<1.8;
    this.setRoute(isQuest?at(quest!.location,quest!.point):target,isQuest,t('Taking the scenic route'));
  }
  get nearby(){const quest=story.quest;return !!quest&&distance(this.player.normal,at(quest.location,quest.point))<(quest.radius??1.65);}
  interact(){
    if(this.cinematic||this.fieldRescue||this.truckAttack||this.valve)return;
    if(this.fence){if(this.mode==='playing'&&!ui.paused)this.fence.interact();return;}
    if(this.mode==='playing'&&!ui.paused&&!this.action&&!this.nearby&&this.notes.observe())return;
    const quest=story.quest;if(this.mode!=='playing'||ui.paused||this.action||!quest||!this.nearby)return;
    if(quest.kind==='strength'&&!story.world.player.abilities.includes('super-strength')){ui.toast(t('A power still to come'),t('Super strength is not available in this part of the story.'));return;}
    if((quest.kind==='strength'||quest.kind==='rescue')&&this.player.weakened){ui.toast(t('A little distance'),t('Step away from the green stone to regain your strength.'));return;}
    this.pauseInputs();this.camera.setView('follow');
    if(quest.id==='truck'){
      this.truckAttack=new TruckAttack(this.player,this.world.dynamic.truck!,this.world.characters.get('jeremy')!,()=>this.mode==='playing'&&!ui.paused&&this.focused&&!document.hidden,()=>{
        this.truckAttack=null;this.clark.root.visible=true;this.camera.camera.fov=42;this.camera.snap();this.pauseInputs();this.completeQuest(quest.id);
      },id=>this.audio.cue(id));this.renderDirty=true;return;
    }
    if(quest.id==='fence'){
      this.fence=new FenceChallenge(this.player,this.world,{cue:id=>this.audio.cue(id),toast:(title,text)=>ui.toast(title,text,2.6),done:()=>{this.fence?.dispose();this.fence=null;this.pauseInputs();this.resolveInteraction(quest);}});
      ui.toast(t('Faster than Dad can see'),t('Drive the posts in at super speed while his back is turned. When he looks, hammer like anyone else.'),5);
      this.renderDirty=true;return;
    }
    if(quest.id==='free-jeremy'){
      // Tear the door off first; the conversation with Jeremy follows.
      const scene=new TruckDoorScene(this.player,this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.camera.handoff(scene.cutscene.target);this.resolveInteraction(quest);});
      this.cinematic=scene;this.renderDirty=true;return;
    }
    if(quest.id==='deduction'&&quest.challenge){
      // The Wall of Weird tells Jeremy's story before Clark shares what he worked out.
      const challenge=quest.challenge,scene=new WallScene(this.player,this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.camera.handoff(scene.cutscene.target);this.encounters.open(challenge,()=>this.resolveInteraction(quest));});
      this.cinematic=scene;this.renderDirty=true;return;
    }
    if(quest.id==='sprinklers'){
      // Three full turns of the valve wheel, against the clock.
      this.valve=new ValveChallenge({active:()=>this.mode==='playing'&&!ui.paused&&this.focused&&!document.hidden,cue:id=>this.audio.cue(id),done:()=>{this.valve=null;this.pauseInputs();this.resolveInteraction(quest);}},this.world.valveWheel);
      this.renderDirty=true;return;
    }
    if(quest.id==='loft'&&quest.dialogue&&episode.dialogues['loft-after']){
      // The finale plays in Clark's loft: the conversation, the last dance, and the daydream ending.
      const scene=new LoftScene(this.player,this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>({dialogue:ui.dialogue?.id??null,index:ui.lineIndex,speaker:ui.dialogueLines[ui.lineIndex]?.speaker??null}),{hold:held=>ui.holdDialogue(held),next:()=>ui.nextDialogue()});
      this.cinematic=scene;this.renderDirty=true;
      ui.startDialogue(episode.dialogues[quest.dialogue],()=>{this.syncStoryMusic();scene.dance(()=>{ui.startDialogue(episode.dialogues['loft-after'],()=>{this.syncStoryMusic();scene.stars(()=>this.completeQuest(quest.id));});this.syncStoryMusic();});});
      this.syncStoryMusic();return;
    }
    if(quest.id==='call-for-help'){
      this.fieldRescue=new FieldRescue(this.world.characters.get('lex')!,()=>{
        this.fieldRescue=null;this.renderDirty=true;this.resolveInteraction(quest);
      });this.renderDirty=true;return;
    }
    if(quest.id==='bridge-moment'){this.player.reset(at('bridge'));this.camera.snap();}
    if(quest.challenge)this.encounters.open(quest.challenge,()=>this.resolveInteraction(quest));
    else if(quest.holdSeconds){this.action={id:quest.id,elapsed:0,duration:quest.holdSeconds};this.audio.strength();}
    else this.resolveInteraction(quest);
  }
  resolveInteraction(quest:QuestDefinition){
    const done=()=>{this.syncStoryMusic();
      if(quest.id==='bridge-moment'){
        this.pauseInputs();this.renderDirty=true;
        const scene=new BridgeScene(this.player,this.world.dynamic.car!,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.completeQuest(quest.id);this.camera.handoff(scene.cutscene.target);});
        this.cinematic=scene;
      }else if(quest.id==='fence'){
        // The bus pulls away while Clark reaches the gate; the race to school starts after it.
        this.completeQuest(quest.id);
        if(story.quest?.id==='friends'){const scene=new BusScene(this.player,this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.camera.handoff(scene.cutscene.target);});this.cinematic=scene;this.renderDirty=true;}
      }else if(quest.id==='cemetery'){
        // Clark asks Lana to the formal; the objective completes when the scene ends.
        this.pauseInputs();this.renderDirty=true;
        const scene=new PromScene(this.player,this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.completeQuest(quest.id);this.camera.handoff(scene.cutscene.target);});
        this.cinematic=scene;
      }else if(quest.id==='whitney'){
        // Night falls on Riley Field before Clark's conversation with Jeremy.
        this.completeQuest(quest.id);
        if(story.quest?.id==='jeremy-field'){const scene=new ScarecrowScene(this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.camera.handoff(scene.cutscene.target);});this.cinematic=scene;this.renderDirty=true;}
      }else if(quest.id==='car-door'){
        this.pauseInputs();this.renderDirty=true;
        const scene=new RoofTearScene(this.player,this.world,()=>this.settings.reducedMotion,id=>this.audio.cue(id),()=>{this.cinematic=null;this.completeQuest(quest.id);this.camera.handoff(scene.cutscene.target);});
        this.cinematic=scene;
      }else this.completeQuest(quest.id);
    };
    if(quest.dialogue){ui.startDialogue(episode.dialogues[quest.dialogue],done);this.syncStoryMusic();}else done();
  }
  completeQuest(id:string){
    const previous=story.quest; if(!story.advance(id))return;
    this.renderDirty=true;
    this.action=null;this.world.sync(story);this.race.start(story.quest?.timeLimit??0);ui.updateStory(story);this.audio.chime(story.complete);
    const entry=story.quest?.enterAt;if(entry){this.player.reset(at(entry.location,entry.point));this.camera.snap();}
    if(story.complete){element('interaction-area').hidden=true;element('completion-places').textContent=String(story.discoveries.size);ui.open('completion');return;}
    if(previous?.chapter!==story.quest?.chapter)ui.toast(t('Chapter {number}',{number:String(story.quest!.chapter+1).padStart(2,'0')}),episode.chapters[story.quest!.chapter].title,4.8);
    else if(previous?.completionToast)ui.toast(previous.completionToast.title,previous.completionToast.text);
  }
  updateLocation(id:LocationId){const location=locations.find(value=>value.id===id)!;element('location-subtitle').textContent=t(location.subtitle);element('location-name').textContent=t(location.name);element('location-description').textContent=t(location.description);}
  tick(dt:number){
    const playing=this.mode==='playing'&&!ui.paused&&!document.hidden&&this.focused;
    if(!playing){this.player.moving=false;return;}
    if(this.cinematic||this.fieldRescue||this.truckAttack)return;
    const kryptonite=this.world.kryptoniteNormals(story);
    this.player.weakened=kryptonite.some(normal=>distance(normal,this.player.normal)<2.5);
    this.player.locked=story.restrained||!!this.action||!!this.fence?.working;
    if(this.action){
      this.action.elapsed+=dt;
      if(this.action.elapsed>=this.action.duration){const quest=story.quest;const id=this.action.id;this.action=null;if(quest?.id===id)this.resolveInteraction(quest);}
      return;
    }
    const axes=this.input.axes();if(axes.length()>1)axes.normalize();
    const camera=this.camera.camera;
    const right=tangent(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),this.player.normal);
    const forward=tangent(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),this.player.normal);
    let direction=right.multiplyScalar(axes.x).addScaledVector(forward,axes.y);
    let running=this.input.running;
    if(this.navigator.active){
      if(this.routeTarget&&distance(this.player.normal,this.routeTarget)<(this.fence&&this.routeIsQuest?.35:this.routeIsQuest?Math.min(1.05,(story.quest?.radius??1.65)*.65):.4)){
        this.stopRoute();if(this.routeIsQuest&&!this.fence)ui.toast(t('You have arrived'),story.quest?.arrivalText??t('Use the gold prompt to take the next step.'),2.4);
      }else{direction=this.navigator.direction(this.player.normal);running=story.quest?.kind==='race';if(!this.navigator.active)this.stopRoute();}
    }
    this.player.update(dt,direction,running&&story.world.player.abilities.includes('super-speed'),this.world.colliders);
    this.fence?.update(dt);
    for(const location of locations.filter(value=>!value.locked))if(distance(this.player.normal,at(location.id))<6.3){
      if(this.currentLocation!==location.id){this.currentLocation=location.id;this.updateLocation(location.id);}
      if(story.discover(location.id))ui.updateStory(story);
      break;
    }
  }
  updateCharacter(dt:number){
    const normal=story.restrained?at('cornfield',[0,.24]):this.player.normal;
    this.clark.root.position.copy(normal).multiplyScalar(surfaceRadius(normal)+this.player.height+(story.restrained?.34:this.player.swimming?-.28:.035));
    const forward=story.restrained?basis(normal).north.negate():tangent(this.player.forward,normal),right=new THREE.Vector3().crossVectors(normal,forward).normalize();
    this.clark.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,normal,forward));
    this.clark.update(dt,this.player.moving?this.player.speed:0,this.player.swimming,story.restrained,this.settings.reducedMotion,{strength:!!this.action||!!this.encounters.power||!!story.world.player.carrying||!!this.cinematic?.strength||!!this.fence?.working||!!this.valve,airborne:this.player.height>.12&&!this.player.swimming});
    if(this.action||this.encounters.power||this.cinematic?.strength||this.fence?.working||this.valve){this.clark.arms.forEach(arm=>{arm.rotation.x=-1.25;});this.clark.torso.rotation.x=.12;}
    this.clark.necklace.visible=story.restrained;
    const carrying=story.world.player.carrying??this.cinematic?.carry??null;
    if(carrying!==this.carriedId){
      if(this.carriedActor)this.clark.root.remove(this.carriedActor.root);
      this.carriedId=carrying;
      // Carried at full size, the same scale as the actor in the world.
      if(carrying&&!this.carriedModels.has(carrying))this.carriedModels.set(carrying,new Character(carrying,.95));
      this.carriedActor=carrying?this.carriedModels.get(carrying)!:null;
      // Across Clark's forearms, face up: feet on his right, head on his left, centred in front of his chest.
      if(this.carriedActor){this.carriedActor.root.position.set(-.56,.86,.44);this.carriedActor.root.rotation.set(-Math.PI/2,0,-1.35);this.clark.root.add(this.carriedActor.root);}
    }
    this.footShadow.position.copy(normal).multiplyScalar(surfaceRadius(normal)+.035);this.footShadow.quaternion.setFromUnitVectors(UP,normal);this.footShadow.visible=!this.player.swimming;this.footShadow.scale.setScalar(story.restrained?.7:1+this.player.height*.2);
    this.trail.update(this.clark.root.position,this.player.superSpeed,this.settings.reducedMotion);
  }
  project(position:THREE.Vector3){const point=position.clone().project(this.camera.camera);const front=position.dot(this.camera.camera.position.clone().sub(position))>0;return{x:(point.x*.5+.5)*innerWidth,y:(-.5*point.y+.5)*innerHeight,visible:front&&point.z<1&&point.z>-1&&Math.abs(point.x)<1.03&&Math.abs(point.y)<1.03};}
  /** The title screen's text, top bar and bottom bar, which globe labels must never cover. */
  private titleObstacles(){
    if(this.mode!=='title')return [];
    return ['#landing','.topbar','.bottom-bar'].map(selector=>document.querySelector(selector)?.getBoundingClientRect()).filter((rect):rect is DOMRect=>!!rect&&rect.width>0&&rect.height>0);
  }
  /** Where the globe fits on the title screen: beside the text on wide screens, above it on narrow ones. */
  private landingFrame(){
    if(this.mode!=='title')return null;
    const width=innerWidth,height=innerHeight,text=element('landing').getBoundingClientRect();
    const top=(document.querySelector('.topbar')?.getBoundingClientRect().bottom??0)+8,bar=document.querySelector('.bottom-bar')?.getBoundingClientRect();
    const bottom=bar&&bar.height>0&&bar.top>height*.5?bar.top-8:height-12;
    const rtl=document.documentElement.dir==='rtl';
    const frame=text.width>width*.6?{x0:12,y0:top,x1:width-12,y1:text.top-10}:rtl?{x0:16,y0:top,x1:text.left-20,y1:bottom}:{x0:text.right+20,y0:top,x1:width-16,y1:bottom};
    return Math.min(frame.x1-frame.x0,frame.y1-frame.y0)>140?frame:null;
  }
  updateLabels(){
    const obstacles=this.titleObstacles();
    for(const label of document.querySelectorAll<HTMLElement>('.world-label')){
      const id=label.dataset.location as LocationId,position=this.world.landmarkAnchors.get(id)!;const screen=this.project(position);
      const allowed=this.camera.view==='globe'&&this.mode!=='intro'&&!ui.dialogue&&screen.visible;
      // Hide a label wherever it would sit on the title text or the bars around it.
      const halfWidth=label.offsetWidth/2+6,halfHeight=label.offsetHeight/2+6;
      const covered=obstacles.some(rect=>screen.x+halfWidth>rect.left&&screen.x-halfWidth<rect.right&&screen.y+halfHeight>rect.top&&screen.y-halfHeight<rect.bottom);
      label.style.opacity=allowed&&!covered?'1':'0';label.style.transform=`translate(${screen.x}px,${screen.y}px) translate(-50%,-50%)`;
    }
    const quest=story.quest;
    const label=element('target-label');
    if(!quest||this.mode!=='playing'||ui.paused||this.nearby||this.fence){label.hidden=true;return;}
    const normal=at(quest.location,quest.point);const screen=this.project(normal.clone().multiplyScalar(surfaceRadius(normal)+2.5));label.hidden=!screen.visible;label.style.transform=`translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;label.querySelector('strong')!.textContent=quest.action;
  }
  snapshot():GameSnapshot{return{ready:this.ready,mode:this.mode,questId:story.quest?.id??null,questIndex:story.index,nearby:this.nearby,moving:this.player.moving,speed:Number(this.player.speed.toFixed(3)),superSpeed:this.player.superSpeed,swimming:this.player.swimming,weakened:this.player.weakened,height:Number(this.player.height.toFixed(3)),normal:this.player.normal.toArray(),routeActive:this.navigator.active,dialogueOpen:!!ui.dialogue,completed:story.complete,view:this.camera.view,location:this.currentLocation};}
  updateHud(){
    this.minimap.update(this.player.normal,this.player.forward,this.currentLocation,story.quest,this.mode==='playing'&&!ui.paused&&!this.nearby&&!story.restrained&&!this.cinematic&&!this.fieldRescue&&!this.truckAttack&&!this.fence);
    this.hudTime=0;
    const note=this.mode==='playing'&&!ui.paused&&!this.action&&!story.restrained&&!this.nearby?(episode.memories??[]).find(value=>!story.memories.has(value.id)&&distance(this.player.normal,at(value.location,value.point))<1.5):undefined;
    this.notes.show(note??null);
    if(this.fence&&story.quest)ui.updateInteraction({...story.quest,action:this.fence.phase==='watching'?t('Hammer it in'):t('Drive it in at super speed')},this.mode==='playing'&&!ui.paused&&(!!this.fence.working||this.fence.site!==null),this.fence.progress);
    else ui.updateInteraction(story.quest,this.mode==='playing'&&this.nearby&&!ui.paused&&!this.cinematic&&!this.fieldRescue&&!this.truckAttack&&!this.valve,this.action?this.action.elapsed/this.action.duration:0);
    if(this.fence)this.fence.panel.hidden=this.mode!=='playing'||ui.paused;
    element('weakness').hidden=this.mode!=='playing'||!this.player.weakened||ui.paused;
    element('race-status').hidden=this.mode!=='playing'||story.quest?.kind!=='race'||ui.paused;
    element('race-status').querySelector('span')!.textContent=story.quest?.timerLabel??t('THE DANCE STARTS IN');
    element('race-clock').textContent=`${Math.floor(Math.ceil(this.race.remaining)/60)}:${String(Math.ceil(this.race.remaining)%60).padStart(2,'0')}`;
    element('telemetry').textContent=JSON.stringify({...this.snapshot(),trailVisible:this.trail.mesh.visible,trailSamples:this.trail.sampleCount,reducedMotion:this.settings.reducedMotion,poisonExposure:this.poisonAmount,truckAttack:this.truckAttack?.phase??null,bridgeScene:this.cinematic instanceof BridgeScene,loft:this.cinematic instanceof LoftScene?{phase:this.cinematic.phase,lana:this.world.characters.get('lana')!.root.visible,porch:this.cinematic.porch>=0}:null,truckCab:{door:this.world.truckCab.door.visible,driver:this.world.truckCab.driver.visible,tornDoor:this.world.tornDoor.anchor.visible},bus:this.world.bus.visible,valve:this.valve?{phase:this.valve.phase,turns:Number((this.valve.angle/(Math.PI*2)).toFixed(2)),remaining:Number(this.valve.remaining.toFixed(1))}:null,fence:this.fence?{phase:this.fence.phase,fixed:this.fence.count,strikes:this.fence.strikes,working:!!this.fence.working,site:this.fence.site}:null,porsche:{roof:this.world.porsche.roof.visible,driver:this.world.porsche.driver.visible,tornRoof:this.world.tornRoof.anchor.visible},cutscene:this.cinematic?{id:this.cinematic.id,elapsed:Number(this.cinematic.elapsed.toFixed(2))}:null,fieldRescue:!!this.fieldRescue,restrained:story.restrained,restraintHeight:story.restrained?.34:0,characterModel:this.clark.modelStatus,characterMotion:this.clark.imported?.motion??null,carriedActor:this.carriedActor?{id:this.carriedId,model:this.carriedActor.modelStatus,attached:this.carriedActor.root.parent===this.clark.root}:null,actors:Object.fromEntries([...this.world.characters].map(([id,actor])=>[id,{model:actor.modelStatus,visible:actor.root.visible,necklace:actor.necklace.visible,at:actor.root.position.toArray().map(value=>Number(value.toFixed(2)))}])),camera:this.camera.camera.position.toArray().map(value=>Number(value.toFixed(2))),fps:this.fps,qualityLevel:this.renderQuality.level,pixelRatio:this.renderer.getPixelRatio(),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles});
  }
  frame(time:number){
    requestAnimationFrame(next=>this.frame(next));
    this.encounters.update(Math.max(0,(time-this.lastTime)/1000));
    this.syncStoryMusic();
    this.openingMusic.sync(this.mode!=='playing',document.hidden||!this.focused||ui.paused);
    const paused=ui.paused||!this.focused;
    const pauseChanged=paused!==this.wasPaused;
    // Keep HTML state current even when one paused screen replaces another. The 3D scene sleeps
    // behind menus and in the background, but stays live in conversations: characters keep moving
    // and the camera can be turned while they talk.
    const asleep=!this.focused||(!!document.querySelector('dialog[open]')&&!this.encounters.power);
    if(asleep&&this.wasAsleep&&!this.renderDirty){
      this.hudTime+=Math.max(0,(time-this.lastTime)/1000);this.lastTime=time;
      if(this.hudTime>.12)this.updateHud();
      ui.updateToast();return;
    }
    // Conversations stay live but light: up to 30 fps, or a few frames a second on a device that is
    // already struggling, unless the player is turning the camera or a scene is mid-shot.
    const talking=!!ui.dialogue&&!asleep&&!this.renderDirty&&!pauseChanged&&performance.now()-this.lastLook>700;
    if(talking&&time-this.lastRender<(this.fps<20&&!this.cinematic?.live?400:33)){
      this.hudTime+=Math.max(0,(time-this.lastTime)/1000);this.lastTime=time;
      if(this.hudTime>.12)this.updateHud();
      ui.updateToast();return;
    }
    this.lastRender=time;
    this.wasPaused=paused;this.wasAsleep=asleep;this.renderDirty=false;
    const elapsed=Math.max(0,(time-this.lastTime)/1000),dt=Math.min(.12,elapsed);this.lastTime=time;
    if(document.hidden||this.contextLost)return;
    if(story.quest?.kind==='race'&&this.race.update(elapsed,this.mode!=='playing'||ui.paused||!this.focused||!!this.cinematic)){this.pauseInputs();ui.open('retry');}
    this.elapsed+=dt;
    // Story scenes use real active elapsed time, independently of capped physics
    // catch-up steps, so a slow renderer cannot stretch a short scene indefinitely.
    // Scenes keep running under their own conversations (the loft), but not behind menus.
    if(this.cinematic&&this.mode==='playing'&&!document.querySelector('dialog[open]')&&this.focused)this.cinematic.update(elapsed);
    if(this.truckAttack&&this.mode==='playing'&&!ui.paused&&this.focused)this.truckAttack.update(elapsed);
    if(this.valve&&this.mode==='playing'&&!ui.paused&&this.focused)this.valve.update(elapsed);
    this.accumulator+=dt;let steps=0;
    while(this.accumulator>=1/60&&steps<6){this.tick(1/60);this.accumulator-=1/60;steps++;}
    if(steps===6)this.accumulator=0;
    this.updateCharacter(dt);
    this.cinematic?.pose?.(this.clark.root);
    this.clark.root.visible=!this.truckAttack;
    if(this.truckAttack){this.footShadow.visible=false;this.world.marker.visible=false;}
    if(this.cinematic){this.footShadow.visible=false;this.world.marker.visible=false;}
    const power=this.encounters.power;
    if(power?.definition.prop)this.world.previewPower(power.definition.prop,power.held?power.charge:power.hits/power.definition.beats.length*.55,power.definition.lift??.1,dt,this.settings.reducedMotion?0:this.elapsed);
    if(this.mode==='title'&&!this.settings.reducedMotion&&this.input.pointerMap.size===0)this.camera.theta+=dt*.012;
    const speaker=ui.dialogue?ui.dialogueLines[ui.lineIndex]?.speaker??null:null;
    this.world.update(dt,this.elapsed,this.settings.reducedMotion,this.mode==='intro'&&prologue[this.introPage]?.effect==='meteors',[this.fieldRescue?'lex':undefined,this.cinematic?.actor,this.fence?'jonathan':undefined],this.mode==='playing'?this.player.normal:null,speaker);
    if(this.fieldRescue&&this.mode==='playing'&&!ui.paused&&this.focused)this.fieldRescue.update(elapsed);
    this.poisonAmount=this.poison.update(this.player.normal,this.world.kryptoniteNormals(story),[...this.world.characters.values(),this.clark],this.mode==='playing');
    if(story.restrained)this.world.markerDiamond.position.y=2.55;
    if(this.mode==='playing')this.world.facePlayer(this.player.normal,dt,this.fence?'jonathan':undefined);
    this.camera.landingFrame=this.landingFrame();
    this.camera.update(dt,this.mode!=='playing',this.settings.reducedMotion,this.occluders);
    this.truckAttack?.camera(this.camera.camera);
    this.cinematic?.camera(this.camera.camera);
    // During the run to school the bus drives the road, arriving as the clock runs out.
    if(!(this.cinematic instanceof BusScene)){const quest=story.quest,limit=quest?.timeLimit??0;this.world.setBus(quest?.id==='friends'&&this.mode==='playing'&&limit>0?BUS_AFTER_SCENE+(1-BUS_AFTER_SCENE)*(1-this.race.remaining/limit):null);}
    const night=this.world.isNight&&this.mode==='playing';
    this.sun.intensity=THREE.MathUtils.damp(this.sun.intensity,night?1.4:2.8,2,dt);this.fill.intensity=THREE.MathUtils.damp(this.fill.intensity,night?1.6:2.1,2,dt);
    this.audio.setPaused(this.mode!=='playing'||(ui.paused&&!this.encounters.active)||!this.focused);if(!this.encounters.active)this.audio.update(dt,this.player.speed,this.player.swimming);
    this.shadowTime+=dt;if(this.shadowTime>.14){this.renderer.shadowMap.needsUpdate=true;this.shadowTime=0;}
    this.renderer.render(this.scene,this.camera.camera);this.updateLabels();ui.updateToast();
    this.hudTime+=dt;
    if(this.hudTime>.12||!this.ready||pauseChanged){
      this.updateHud();
    }
    this.rendererFrames++;this.fpsTime+=elapsed;if(this.fpsTime>1){this.fps=Math.round(this.rendererFrames/this.fpsTime);this.rendererFrames=0;this.fpsTime=0;}
    if(this.renderQuality.update(elapsed,this.settings.quality==='auto'&&!paused&&this.ready&&this.mode!=='intro'))this.resize();
    if(!this.ready){this.ready=true;canvas.dataset.ready='true';element('loading').classList.add('fade');setTimeout(()=>element('loading').hidden=true,650);}
  }
}

function showFallback(detail:string){element('fallback').hidden=false;element('fallback-detail').textContent=detail;element('loading').hidden=true;}

// Let the loading view paint before generating the procedural world.
requestAnimationFrame(()=>requestAnimationFrame(async()=>{
  await fontsReady();
  try{
    const game=new Game();
    if(import.meta.env.DEV){
      Object.defineProperty(window,'__smallville',{value:{snapshot:()=>game.snapshot(),navigationTo:(id:LocationId)=>game.navigate(id)},configurable:true});
    }
  }catch(error){console.error('Smallville could not start:',error);showFallback(error instanceof Error?error.message:t('The world could not be created. Please try again.'));}
}));
