import { useState, useMemo, useCallback } from 'react'
import { CalculationConsole } from './components/CalculationConsole'
import { BuildBreakdown } from './components/BuildBreakdown'
import { DamageDashboard } from './components/DamageDashboard'
import { EncounterConditionsPanel } from './components/EncounterConditionsPanel'
import { createWeapon, RAW_WEAPONS } from './data/weapons'
import { createArmor, ARMOR } from './data/armor'
import { createModInstance, DEFAULT_SUBSTATS, MODS } from './data/mods'
import { Player, PlayerStats } from './models/player'
import { Loadout } from './models/equipment'
import { StatAggregator } from './engine/stat-aggregator'
import { auditLog } from './engine/audit-log'
import { StatType, ArmorSlot, WeaponSlot, WeaponKey, ArmorKey, ModKey, GearSlot, CalibrationStyle, AmmunitionType } from './types/enums'
import { EncounterConditions } from './types/common'
import { Substat } from './models/substat'
import { BaseEffect } from './models/effect'
import { TelemetryTrack, SimulationLogEntry } from './engine/damage-engine'

// Diegetic Components
import { SlotDock } from './components/SlotDock'
import { TechnicalSchematic } from './components/TechnicalSchematic'
import { DynamicStatDisplay } from './components/DynamicStatDisplay'
import { TerminalFooter } from './components/TerminalFooter'
import { DiegeticFrame } from './components/DiegeticFrame'

// shadcn/ui components
import { CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Terminal, Info } from 'lucide-react'

function App() {
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string>>({});
  const [selectedModIds, setSelectedModIds] = useState<Record<string, string>>({});
  const [selectedSubstats, setSelectedSubstats] = useState<Record<string, [Substat, Substat, Substat, Substat]>>({});
  const [starLevels, setStarLevels] = useState<Record<string, number>>({ [WeaponSlot.Main]: 6 });
  const [tierLevels, setTierLevels] = useState<Record<string, number>>({ [WeaponSlot.Main]: 5 });
  const [selectedAmmunition, setSelectedAmmunition] = useState<AmmunitionType>(AmmunitionType.TungstenAP);

  // Calibration State (Weapon only for now)
  const [calibrationStyle, setCalibrationStyle] = useState<CalibrationStyle>(CalibrationStyle.None);
  const [weaponDamageBonus, setWeaponDamageBonus] = useState(0);
  const [secondaryStatType, setSecondaryStatType] = useState<StatType>(StatType.CritDamagePercent);
  const [secondaryStatValue, setSecondaryStatValue] = useState(0);

  const [activeSlot, setActiveSlot] = useState<GearSlot>(WeaponSlot.Main);
  const [simLogs, setSimLogs] = useState<SimulationLogEntry[]>([]);

  const [conditions, setConditions] = useState<EncounterConditions>(new EncounterConditions());

  const loadout = useMemo(() => {
    const l = new Loadout();
    const wId = selectedItemIds[WeaponSlot.Main] as WeaponKey;
    if (wId && RAW_WEAPONS[wId]) {
      const modId = selectedModIds[WeaponSlot.Main] as ModKey;
      const substats = selectedSubstats[WeaponSlot.Main] || DEFAULT_SUBSTATS;
      const star = starLevels[WeaponSlot.Main] || 1;
      const tier = tierLevels[WeaponSlot.Main] || 5;
      const mod = (modId && MODS[modId]) ? createModInstance(modId, substats) : undefined;
      const weapon = createWeapon(wId, star, tier, 10, mod);

      // Apply Calibration Matrix
      weapon.calibrationMatrix.style = calibrationStyle;
      weapon.calibrationMatrix.weaponDamageBonus = weaponDamageBonus;
      weapon.calibrationMatrix.secondaryStatType = secondaryStatType;
      weapon.calibrationMatrix.secondaryStatValue = secondaryStatValue;

      l.weapon = weapon;
    }

    for (const slot of Object.values(ArmorSlot)) {
      const itemId = selectedItemIds[slot] as ArmorKey;
      if (itemId && ARMOR[itemId]) {
        const modId = selectedModIds[slot] as ModKey;
        const substats = selectedSubstats[slot] || DEFAULT_SUBSTATS;
        const star = starLevels[slot] || 1;
        const tier = tierLevels[slot] || 5;
        const mod = (modId && MODS[modId]) ? createModInstance(modId, substats) : undefined;
        const armor = createArmor(itemId, star, tier, 10, mod);
        if (slot === ArmorSlot.Helmet) l.helmet = armor;
        else if (slot === ArmorSlot.Mask) l.mask = armor;
        else if (slot === ArmorSlot.Top) l.top = armor;
        else if (slot === ArmorSlot.Gloves) l.gloves = armor;
        else if (slot === ArmorSlot.Pants) l.pants = armor;
        else if (slot === ArmorSlot.Boots) l.boots = armor;
      }
    }
    return l;
  }, [selectedItemIds, selectedModIds, selectedSubstats, starLevels, tierLevels, calibrationStyle, weaponDamageBonus, secondaryStatType, secondaryStatValue]);

  const handleItemSelect = (slot: string, id: string) => setSelectedItemIds(prev => ({ ...prev, [slot]: id }));
  const handleModSelect = (slot: string, id: string) => {
    setSelectedModIds(prev => ({ ...prev, [slot]: id }));
    if (id) setSelectedSubstats(prev => ({ ...prev, [slot]: DEFAULT_SUBSTATS }));
  };
  const handleSubstatChange = (slot: string, subs: [Substat, Substat, Substat, Substat]) => setSelectedSubstats(prev => ({ ...prev, [slot]: subs }));

  const [scrubbedStats, setScrubbedStats] = useState<Record<StatType, number> | null>(null);
  const [scrubbedBuffs, setScrubbedBuffs] = useState<{ name: string, stacks: number }[]>([]);
  const [scrubbedEffects, setScrubbedEffects] = useState<BaseEffect[] | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryTrack | undefined>(undefined);
  const [scrubbedIndex, setScrubbedIndex] = useState(0);

  const handleScrub = useCallback((stats: Record<StatType, number> | null, buffs: { name: string, stacks: number }[], effects?: BaseEffect[], index?: number) => {
    setScrubbedStats(stats);
    setScrubbedBuffs(buffs);
    if (effects) setScrubbedEffects(effects);
    if (index !== undefined) setScrubbedIndex(index);
  }, []);

  const { player, baseStatsSnapshot } = useMemo(() => {
    const p = new Player(loadout, new PlayerStats(), 100);
    p.selectedAmmunition = selectedAmmunition;

    StatAggregator.aggregate(p, conditions, 1.0, true, true);
    const baseSnapshot = p.stats.snapshot();
    StatAggregator.aggregate(p, conditions, 1.0, true, false);
    return { player: p, baseStatsSnapshot: baseSnapshot };
  }, [loadout, conditions, selectedAmmunition]);

  const currentStats = scrubbedStats || player.stats.snapshot();
  const slotStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    Object.keys(selectedItemIds).forEach(slot => { if (selectedItemIds[slot]) status[slot] = true; });
    return status;
  }, [selectedItemIds]);

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
          <Badge variant="outline" className="border-primary/20 text-primary uppercase tracking-tighter bg-primary/5 px-3">v0.4.0-diegetic [TRI-COL]</Badge>
        </div>
      </header>

      <main className="container-fluid mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-3 space-y-6 lg:sticky lg:top-24">
            <DiegeticFrame title="01. Encounter" subTitle="Combat Parameters">
              <EncounterConditionsPanel
                conditions={conditions}
                onChange={setConditions}
                selectedAmmunition={selectedAmmunition}
                onAmmunitionChange={setSelectedAmmunition}
              />
            </DiegeticFrame>

            <DiegeticFrame title="02. Loadout" subTitle="Hardware Config">
              <div className="space-y-6">
                <SlotDock activeSlot={activeSlot} onSlotSelect={setActiveSlot} slotStatus={slotStatus} />
                <Separator className="bg-primary/5" />
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
                  calibrationStyle={calibrationStyle}
                  onCalibrationStyleChange={setCalibrationStyle}
                  weaponDamageBonus={weaponDamageBonus}
                  onWeaponDamageBonusChange={setWeaponDamageBonus}
                  secondaryStatType={secondaryStatType}
                  onSecondaryStatTypeChange={setSecondaryStatType}
                  secondaryStatValue={secondaryStatValue}
                  onSecondaryStatValueChange={setSecondaryStatValue}
                />
              </div>
            </DiegeticFrame>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <DynamicStatDisplay baseStats={baseStatsSnapshot} currentStats={currentStats} telemetry={telemetry} scrubbedIndex={scrubbedIndex} />

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
                <ScrollArea className="h-[calc(100vh-500px)] min-h-[250px] pr-4">
                  <BuildBreakdown effects={scrubbedEffects || player.activeEffects} />
                </ScrollArea>
              </div>
            </DiegeticFrame>
          </div>

          <div className="md:col-span-2 xl:col-span-5 space-y-6">
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
                    <DamageDashboard player={player} conditions={conditions} onScrub={handleScrub} onTelemetryCalculated={setTelemetry} onLogsUpdate={setSimLogs} />
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
                      <CalculationConsole entries={auditLog.getEntries()} />
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
