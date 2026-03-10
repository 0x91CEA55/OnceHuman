import { useState, useMemo, useCallback, useEffect } from 'react'
import { CalculationConsole } from './components/CalculationConsole'
import { BuildBreakdown } from './components/BuildBreakdown'
import { DamageDashboard } from './components/DamageDashboard'
import { EncounterConditionsPanel } from './components/EncounterConditionsPanel'
import { createWeaponComponent, createArmorComponent, createModComponent } from './ecs/factories'
import { World } from './ecs/world'
import { runStatAggregation } from './ecs/systems/stat-aggregator-system'
import { StatsComponent, FlagComponent, LoadoutComponent, ResourceComponent } from './ecs/types'
import { SubstatData } from './data/substats'
import { SimulationLogEntry } from './engine/simulation-runner'
import { ARMOR } from './data/armor'
import { DEFAULT_SUBSTATS, MODS } from './data/mods'
import { telemetry, useTelemetry } from './engine/audit-log'
import { StatType, ArmorSlot, WeaponSlot, WeaponKey, ArmorKey, ModKey, GearSlot, CalibrationStyle, AmmunitionType } from './types/enums'
import { EncounterConditions, IEffect } from './types/common'
import { ACTIVE_REGISTRY } from './data/generated/registry'

// Diegetic Components
import { GearHub } from './components/GearHub'
import { TechnicalSchematic } from './components/TechnicalSchematic'
import { DynamicStatDisplay } from './components/DynamicStatDisplay'
import { StaticDamagePreview } from './components/StaticDamagePreview'
import { TerminalFooter } from './components/TerminalFooter'
import { DiegeticFrame } from './components/DiegeticFrame'

// shadcn/ui components
import { CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Terminal, Info } from 'lucide-react'

function App() {
  const telemetryEntries = useTelemetry();
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string>>({});
  const [selectedModIds, setSelectedModIds] = useState<Record<string, string>>({});
  const [selectedSubstats, setSelectedSubstats] = useState<Record<string, [SubstatData, SubstatData, SubstatData, SubstatData]>>({});
  const [starLevels, setStarLevels] = useState<Record<string, number>>({ [WeaponSlot.Main]: 6 });
  const [tierLevels, setTierLevels] = useState<Record<string, number>>({ [WeaponSlot.Main]: 5 });
  const [selectedAmmunition, setSelectedAmmunition] = useState<AmmunitionType>(AmmunitionType.TungstenAP);

  // Calibration State (Weapon only for now)
  const [calibrationLevel, setCalibrationLevel] = useState(0); // Level 0-10
  const [calibrationStyle, setCalibrationStyle] = useState<CalibrationStyle>(CalibrationStyle.None);
  const [weaponDamageBonus, setWeaponDamageBonus] = useState(0);
  const [secondaryStatType, setSecondaryStatType] = useState<StatType>(StatType.CritDamagePercent);
  const [secondaryStatValue, setSecondaryStatValue] = useState(0);

  const [activeSlot, setActiveSlot] = useState<GearSlot>(WeaponSlot.Main);
  const [simLogs, setSimLogs] = useState<SimulationLogEntry[]>([]);

  const [conditions, setConditions] = useState<EncounterConditions>(new EncounterConditions());

  const loadoutComponent = useMemo(() => {
    const l: LoadoutComponent = {};
    const wId = selectedItemIds[WeaponSlot.Main] as WeaponKey;
    if (wId && ACTIVE_REGISTRY[wId]) {
      const modId = selectedModIds[WeaponSlot.Main] as ModKey;
      const substats = (selectedSubstats[WeaponSlot.Main] || DEFAULT_SUBSTATS) as [SubstatData, SubstatData, SubstatData, SubstatData];
      const star = starLevels[WeaponSlot.Main] || 1;
      const tier = tierLevels[WeaponSlot.Main] || 5;
      const mod = (modId && MODS[modId]) ? createModComponent(modId, substats) : undefined;
      
      l.weapon = createWeaponComponent(
        wId, 
        star, 
        tier, 
        calibrationLevel, 
        calibrationStyle, 
        weaponDamageBonus, 
        secondaryStatType, 
        secondaryStatValue,
        mod
      );
    }

    for (const slot of Object.values(ArmorSlot)) {
      const itemId = selectedItemIds[slot] as ArmorKey;
      if (itemId && ARMOR[itemId]) {
        const modId = selectedModIds[slot] as ModKey;
        const substats = (selectedSubstats[slot] || DEFAULT_SUBSTATS) as [SubstatData, SubstatData, SubstatData, SubstatData];
        const star = starLevels[slot] || 1;
        const tier = tierLevels[slot] || 5;
        const mod = (modId && MODS[modId]) ? createModComponent(modId, substats) : undefined;
        const armor = createArmorComponent(itemId, star, tier, 0, mod);
        if (slot === ArmorSlot.Helmet) l.helmet = armor;
        else if (slot === ArmorSlot.Mask) l.mask = armor;
        else if (slot === ArmorSlot.Top) l.top = armor;
        else if (slot === ArmorSlot.Gloves) l.gloves = armor;
        else if (slot === ArmorSlot.Pants) l.pants = armor;
        else if (slot === ArmorSlot.Boots) l.boots = armor;
      }
    }
    return l;
  }, [selectedItemIds, selectedModIds, selectedSubstats, starLevels, tierLevels, calibrationLevel, calibrationStyle, weaponDamageBonus, secondaryStatType, secondaryStatValue]);

  const handleItemSelect = (slot: string, id: string) => setSelectedItemIds(prev => ({ ...prev, [slot]: id }));
  const handleModSelect = (slot: string, id: string) => {
    setSelectedModIds(prev => ({ ...prev, [slot]: id }));
    if (id) setSelectedSubstats(prev => ({ ...prev, [slot]: DEFAULT_SUBSTATS as [SubstatData, SubstatData, SubstatData, SubstatData] }));
  };
  const handleSubstatChange = (slot: string, subs: [SubstatData, SubstatData, SubstatData, SubstatData]) => setSelectedSubstats(prev => ({ ...prev, [slot]: subs }));

  const [scrubbedStats, setScrubbedStats] = useState<Record<StatType, number> | null>(null);
  const [scrubbedBuffs, setScrubbedBuffs] = useState<{ name: string, stacks: number }[]>([]);
  const [scrubbedEffects, setScrubbedEffects] = useState<IEffect[] | null>(null);
  const [scrubbedIndex, setScrubbedIndex] = useState(0);

  const handleScrub = useCallback((stats: Record<StatType, number> | null, buffs: { name: string, stacks: number }[], effects?: IEffect[], index?: number) => {
    setScrubbedStats(stats);
    setScrubbedBuffs(buffs);
    if (effects) setScrubbedEffects(effects);
    if (index !== undefined) setScrubbedIndex(index);
  }, []);

  const worldInfo = useMemo(() => {
    const w = new World();
    const pid = w.createEntity('player');
    
    const stats: StatsComponent = { snapshot: {} as Record<StatType, number> };
    const flags: FlagComponent = { activeFlags: new Set() };
    const resources: ResourceComponent = {
        sanity: conditions.playerSanity,
        maxSanity: conditions.maxPlayerSanity,
        deviantPower: conditions.playerDeviantPower,
        maxDeviantPower: conditions.maxPlayerDeviantPower
    };

    w.addComponent(pid, 'loadout', loadoutComponent);
    w.addComponent(pid, 'stats', stats);
    w.addComponent(pid, 'flags', flags);
    w.addComponent(pid, 'resources', resources);
    w.addComponent(pid, 'status', { activeBuffs: [], activeDoTs: [] });

    telemetry.clear();
    const activeEffects: IEffect[] = [];
    runStatAggregation(w, conditions, 1.0, selectedAmmunition, activeEffects);
    const baseSnapshot = { ...stats.snapshot };
    
    return { world: w, playerId: pid, baseStatsSnapshot: baseSnapshot, activeEffects };
  }, [loadoutComponent, conditions, selectedAmmunition]);

  const { world, playerId, baseStatsSnapshot, activeEffects: memoActiveEffects } = worldInfo;
  const currentStats = scrubbedStats || world.getComponent(playerId, 'stats')!.snapshot;
  const currentEffects = scrubbedEffects || memoActiveEffects;

  // Initial weapon selection
  useEffect(() => {
    const wId = WeaponKey.OctopusGrilledRings;
    if (wId && ACTIVE_REGISTRY[wId]) {
      setSelectedItemIds(prev => ({ ...prev, [WeaponSlot.Main]: wId }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground pb-12 overflow-x-hidden">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container-fluid mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(77,184,255,0.4)]">
              <span className="text-primary-foreground font-bold -rotate-45">H</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight italic">ONCE HUMAN <span className="text-primary not-italic">SIMULATOR</span></h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] -mt-1 font-bold">Reactive Combat Theorycrafting Engine</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary uppercase tracking-tighter bg-primary/5 px-3">v0.5.0-ergo [TRI-COL]</Badge>
        </div>
      </header>

      <main className="container-fluid mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Config & Gear */}
          <div className="xl:col-span-3 space-y-6 lg:sticky lg:top-24">
            <DiegeticFrame title="01. Encounter" subTitle="Combat Parameters">
              <EncounterConditionsPanel
                conditions={conditions}
                onChange={setConditions}
              />
            </DiegeticFrame>

            <DiegeticFrame title="02. Loadout" subTitle="Master Grid">
              <GearHub 
                activeSlot={activeSlot} 
                onSlotSelect={setActiveSlot} 
                loadout={loadoutComponent} 
              />
            </DiegeticFrame>
          </div>

          {/* Column 2: Stats & Details */}
          <div className="xl:col-span-5 space-y-6">
            <DynamicStatDisplay baseStats={baseStatsSnapshot} currentStats={currentStats} />

            <StaticDamagePreview 
              stats={world.getComponent(playerId, 'stats')!} 
              flags={world.getComponent(playerId, 'flags')!} 
              loadout={loadoutComponent}
              conditions={conditions} 
            />

            <DiegeticFrame title="03. Tuning Matrix" subTitle={`${activeSlot.replace('_', ' ').toUpperCase()} CONFIG`}>
              <TechnicalSchematic
                key={activeSlot}
                slot={activeSlot}
                selectedItemId={selectedItemIds[activeSlot]}
                selectedModId={selectedModIds[activeSlot]}
                selectedSubstats={selectedSubstats[activeSlot]}
                onItemSelect={(id) => handleItemSelect(activeSlot, id)}
                onModSelect={(id) => handleModSelect(activeSlot, id)}
                onSubstatChange={(subs) => handleSubstatChange(activeSlot, subs)}
                starLevel={starLevels[activeSlot] || 1}
                onStarLevelChange={(star) => setStarLevels(prev => ({ ...prev, [activeSlot]: star }))}
                tierLevel={tierLevels[activeSlot] || 5}
                onTierLevelChange={(tier) => setTierLevels(prev => ({ ...prev, [activeSlot]: tier }))}
                calibrationLevel={calibrationLevel}
                onCalibrationLevelChange={setCalibrationLevel}
                calibrationStyle={calibrationStyle}
                onCalibrationStyleChange={setCalibrationStyle}
                weaponDamageBonus={weaponDamageBonus}
                onWeaponDamageBonusChange={setWeaponDamageBonus}
                secondaryStatType={secondaryStatType}
                onSecondaryStatTypeChange={setSecondaryStatType}
                secondaryStatValue={secondaryStatValue}
                onSecondaryStatValueChange={setSecondaryStatValue}
                selectedAmmunition={selectedAmmunition}
                onAmmunitionChange={setSelectedAmmunition}
              />
            </DiegeticFrame>

            <DiegeticFrame title="Bonus Matrix" subTitle="Integrated Logic">
              <div className="flex flex-col h-full">
                {scrubbedBuffs.length > 0 && (
                  <div className="flex gap-1.5 mb-4 animate-flicker">
                    {scrubbedBuffs.map((b, i) => (
                      <Badge key={i} className="bg-primary text-black text-[8px] font-black px-1.5 h-4 rounded-none">
                        {b.name.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}
                <ScrollArea className="h-[250px] pr-4 font-mono">
                  <BuildBreakdown effects={currentEffects} />
                </ScrollArea>
              </div>
            </DiegeticFrame>
          </div>

          {/* Column 3: Analytics */}
          <div className="md:col-span-2 xl:col-span-4 space-y-6">
            <DiegeticFrame className="p-0 overflow-hidden" title="04. Analytics" subTitle="Telemetry Stream">
              <Tabs defaultValue="dashboard" className="w-full">
                <div className="px-6 pt-2 flex items-center justify-between">
                  <TabsList className="bg-black/40 border border-primary/10 h-8">
                    <TabsTrigger value="dashboard" className="text-[9px] font-bold h-6">DASHBOARD</TabsTrigger>
                    <TabsTrigger value="logs" className="text-[9px] font-bold h-6 flex gap-1 items-center"><Terminal className="w-3 h-3" /> RAW LOGS</TabsTrigger>
                    <TabsTrigger value="diagnostics" className="text-[9px] font-bold h-6 flex gap-1 items-center"><Info className="w-3 h-3" /> ENGINE</TabsTrigger>
                  </TabsList>
                </div>
                <CardContent className="pt-6">
                  <TabsContent value="dashboard" className="mt-0 outline-none">
                    <DamageDashboard 
                      world={world} 
                      playerId={playerId} 
                      conditions={conditions} 
                      selectedAmmunition={selectedAmmunition}
                      onScrub={handleScrub} 
                      onLogsUpdate={setSimLogs} 
                    />
                  </TabsContent>
                  <TabsContent value="logs" className="mt-0 outline-none">
                    <div className="bg-black/40 rounded border border-white/5 overflow-hidden">
                      <ScrollArea className="h-[500px] p-4 font-mono text-[10px] leading-relaxed">
                        {simLogs.length === 0 && <p className="text-muted-foreground italic">Execute simulation to generate tactical logs...</p>}
                        {simLogs.map((log, i) => (
                          <div key={i} onClick={() => handleScrub(log.statsSnapshot, log.activeBuffs.map(b => ({ name: b.name, stacks: b.stacks })), log.activeEffects, i)} className={`mb-1 grid grid-cols-[60px_80px_100px_1fr] gap-2 border-b border-white/5 pb-1 last:border-0 cursor-pointer transition-colors px-1 -mx-1 ${i === scrubbedIndex ? 'bg-primary/20 text-primary border-primary/20 shadow-[inset_0_0_10px_rgba(77,184,255,0.1)]' : 'hover:bg-white/5'}`}>
                            <span className={i === scrubbedIndex ? 'text-primary font-black' : 'text-muted-foreground/50'}>{log.timestamp.toFixed(2)}s</span>
                            <span className="font-bold uppercase text-primary/60">[{log.event.toUpperCase()}]</span>
                            <span className="text-right pr-4 font-black">
                              {log.damage !== undefined ? `${Math.round(log.damage).toLocaleString()}` : '--'}
                            </span>
                            <span className={i === scrubbedIndex ? 'text-foreground font-medium' : 'text-foreground/70'}>{log.description}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </TabsContent>
                  <TabsContent value="diagnostics" className="mt-0 outline-none">
                    <div className="rounded-md border border-primary/10 bg-black/60 p-1">
                      <CalculationConsole entries={telemetryEntries} />
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </DiegeticFrame>

            <div className="bg-primary/5 border border-primary/10 p-4 rounded-sm italic">
              <p className="text-[9px] text-muted-foreground leading-relaxed uppercase tracking-wider font-medium">
                * All calculations derived from the Reactive Event Bus. Real-time deltas reflect snapshot-integrated combat logic at precisely T+Seconds.
              </p>
            </div>
          </div>
        </div>
      </main>
      <TerminalFooter logs={simLogs} />
    </div>
  )
}

export default App
