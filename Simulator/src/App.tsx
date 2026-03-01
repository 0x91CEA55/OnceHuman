import { useState, useMemo, useCallback } from 'react'
import { EquipmentSlot } from './components/EquipmentSlot'
import { CalculationConsole } from './components/CalculationConsole'
import { BuildBreakdown } from './components/BuildBreakdown'
import { DamageDashboard } from './components/DamageDashboard'
import { EncounterConditionsPanel } from './components/EncounterConditionsPanel'
import { createWeapon, WEAPONS } from './data/weapons'
import { createArmor, ARMOR } from './data/armor'
import { createModInstance, DEFAULT_SUBSTATS, MODS } from './data/mods'
import { Player, PlayerStats } from './models/player'
import { Loadout } from './models/equipment'
import { StatAggregator } from './engine/stat-aggregator'
import { auditLog } from './engine/audit-log'
import { StatType, ArmorSlot, WeaponSlot, WeaponKey, ArmorKey, ModKey } from './types/enums'
import { EncounterConditions } from './types/common'
import { Substat } from './models/substat'
import { BaseEffect } from './models/effect'

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

function App() {
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string>>({});
  const [selectedModIds, setSelectedModIds] = useState<Record<string, string>>({});
  const [selectedSubstats, setSelectedSubstats] = useState<Record<string, [Substat, Substat, Substat, Substat]>>({});

  const [conditions, setConditions] = useState<EncounterConditions>({
    enemyType: WEAPONS[selectedItemIds[WeaponSlot.Main] as WeaponKey]?.type === 'sniper_rifle' ? 'Elite' : 'Normal' as any, // Placeholder logic
    targetDistanceMeters: 10,
    playerHpPercent: 100,
    isTargetVulnerable: false,
    weakspotHitRate: 0.5
  });

  // Re-sync conditions when weapon changes if needed, but for now keep manual
  
  // Create loadout based on selections
  const loadout = useMemo(() => {
    const l = new Loadout();
    
    // Weapon
    const wId = selectedItemIds[WeaponSlot.Main] as WeaponKey;
    if (wId && WEAPONS[wId]) {
        const modId = selectedModIds[WeaponSlot.Main] as ModKey;
        const substats = selectedSubstats[WeaponSlot.Main] || DEFAULT_SUBSTATS;
        const mod = (modId && MODS[modId]) ? createModInstance(modId, substats) : undefined;
        l.weapon = createWeapon(wId, 1, 1, 0, mod);
    }

    // Armor Slots
    const armorSlots = Object.values(ArmorSlot);

    for (const slot of armorSlots) {
        const itemId = selectedItemIds[slot] as ArmorKey;
        if (itemId && ARMOR[itemId]) {
            const modId = selectedModIds[slot] as ModKey;
            const substats = selectedSubstats[slot] || DEFAULT_SUBSTATS;
            const mod = (modId && MODS[modId]) ? createModInstance(modId, substats) : undefined;
            
            const armor = createArmor(itemId, 1, 1, 0, mod);
            
            // Type-safe assignment to loadout slots
            if (slot === ArmorSlot.Helmet) l.helmet = armor;
            else if (slot === ArmorSlot.Mask) l.mask = armor;
            else if (slot === ArmorSlot.Top) l.top = armor;
            else if (slot === ArmorSlot.Gloves) l.gloves = armor;
            else if (slot === ArmorSlot.Pants) l.pants = armor;
            else if (slot === ArmorSlot.Boots) l.boots = armor;
        }
    }

    return l;
  }, [selectedItemIds, selectedModIds, selectedSubstats]);

  const handleItemSelect = (slot: string, id: string) => {
    setSelectedItemIds(prev => ({ ...prev, [slot]: id }));
  };

  const handleModSelect = (slot: string, id: string) => {
    setSelectedModIds(prev => ({ ...prev, [slot]: id }));
    if (id) {
        setSelectedSubstats(prev => ({ ...prev, [slot]: DEFAULT_SUBSTATS }));
    }
  };

  const handleSubstatChange = (slot: string, substats: [Substat, Substat, Substat, Substat]) => {
    setSelectedSubstats(prev => ({ ...prev, [slot]: substats }));
  };

  const [scrubbedStats, setScrubbedStats] = useState<Record<StatType, number> | null>(null);
  const [scrubbedBuffs, setScrubbedBuffs] = useState<{ name: string, stacks: number }[]>([]);
  const [scrubbedEffects, setScrubbedEffects] = useState<BaseEffect[] | null>(null);

  const handleScrub = useCallback((stats: Record<StatType, number> | null, buffs: { name: string, stacks: number }[], effects?: BaseEffect[]) => {
    setScrubbedStats(stats);
    setScrubbedBuffs(buffs);
    if (effects) setScrubbedEffects(effects);
  }, []);

  // Create a fresh player object for calculations
  const player = useMemo(() => {
    const p = new Player(loadout, new PlayerStats(), 100);
    StatAggregator.aggregate(p, conditions);
    return p;
  }, [loadout, conditions]);

  // Helper for displaying stats - prioritize scrubbed stats from simulation
  const getStat = (type: StatType) => {
    if (scrubbedStats && scrubbedStats[type] !== undefined) {
        return scrubbedStats[type];
    }
    return player.stats.get(type)?.value ?? 0;
  };

  // List of ALL stats to display in the matrix
  const statDisplayList = [
    { label: "Base Damage", type: StatType.DamagePerProjectile, suffix: "", category: "Core" },
    { label: "Fire Rate", type: StatType.FireRate, suffix: " RPM", category: "Core" },
    { label: "Magazine", type: StatType.MagazineCapacity, suffix: "", category: "Core" },
    { label: "Attack Bonus", type: StatType.AttackPercent, suffix: "%", category: "Core", color: "text-orange-400" },
    { label: "Crit Rate", type: StatType.CritRatePercent, suffix: "%", category: "Crit", color: "text-blue-400" },
    { label: "Crit Damage", type: StatType.CritDamagePercent, suffix: "%", category: "Crit", color: "text-blue-400" },
    { label: "Weakspot DMG", type: StatType.WeakspotDamagePercent, suffix: "%", category: "Core", color: "text-yellow-400" },
    { label: "Weapon DMG", type: StatType.WeaponDamagePercent, suffix: "%", category: "Core", color: "text-orange-400" },
    { label: "Psi Intensity", type: StatType.PsiIntensity, suffix: "", category: "Elemental", color: "text-purple-400" },
    { label: "Status DMG", type: StatType.StatusDamagePercent, suffix: "%", category: "Elemental", color: "text-purple-300" },
    { label: "Elemental DMG", type: StatType.ElementalDamagePercent, suffix: "%", category: "Elemental", color: "text-purple-300" },
    { label: "Burn DMG", type: StatType.BurnDamagePercent, suffix: "%", category: "Keywords", color: "text-red-400" },
    { label: "Frost Vortex DMG", type: StatType.FrostVortexDamagePercent, suffix: "%", category: "Keywords", color: "text-blue-300" },
    { label: "Power Surge DMG", type: StatType.PowerSurgeDamagePercent, suffix: "%", category: "Keywords", color: "text-yellow-200" },
    { label: "Shrapnel DMG", type: StatType.ShrapnelDamagePercent, suffix: "%", category: "Keywords", color: "text-slate-300" },
    { label: "Unstable Bomber DMG", type: StatType.UnstableBomberDamagePercent, suffix: "%", category: "Keywords", color: "text-orange-600" },
    { label: "Bounce DMG", type: StatType.BounceDamagePercent, suffix: "%", category: "Keywords", color: "text-green-300" },
    { label: "Bull's Eye DMG", type: StatType.BullsEyeDamagePercent, suffix: "%", category: "Keywords", color: "text-blue-500" },
    { label: "KW Crit Rate", type: StatType.KeywordCritRatePercent, suffix: "%", category: "Crit", color: "text-blue-500" },
    { label: "KW Crit DMG", type: StatType.KeywordCritDamagePercent, suffix: "%", category: "Crit", color: "text-blue-500" },
    { label: "Max Burn Stacks", type: StatType.MaxBurnStacks, suffix: "", category: "Keywords", color: "text-red-500" },
    { label: "Burn Duration", type: StatType.BurnDurationPercent, suffix: "%", category: "Keywords", color: "text-red-300" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 text-primary uppercase tracking-tighter bg-primary/5 px-3">v0.3.0-beta [TRI-COL]</Badge>
          </div>
        </div>
      </header>

      <main className="container-fluid mx-auto px-6 py-6">
        {/* 3-Column Layout: Pilot (3), Attributes (4), Analytics (5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: The PILOT (Inputs) - xl:span-3 */}
          <div className="xl:col-span-3 space-y-6">
            <Card className="border-primary/10 bg-card/30 backdrop-blur-sm">
              <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                <CardTitle className="text-[10px] font-black flex items-center gap-2 tracking-[0.2em] uppercase text-muted-foreground">
                  <span className="w-1 h-3 bg-primary inline-block"></span>
                  01. Encounter Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <EncounterConditionsPanel conditions={conditions} onChange={setConditions} />
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/30 backdrop-blur-sm">
              <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                <CardTitle className="text-[10px] font-black flex items-center gap-2 tracking-[0.2em] uppercase text-muted-foreground">
                  <span className="w-1 h-3 bg-primary inline-block"></span>
                  02. Loadout Planner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <EquipmentSlot 
                  label="Weapon Main" slot={WeaponSlot.Main} 
                  selectedItemId={selectedItemIds[WeaponSlot.Main]}
                  selectedModId={selectedModIds[WeaponSlot.Main]}
                  selectedSubstats={selectedSubstats[WeaponSlot.Main]}
                  onItemSelect={(id) => handleItemSelect(WeaponSlot.Main, id)}
                  onModSelect={(id) => handleModSelect(WeaponSlot.Main, id)}
                  onSubstatChange={(subs) => handleSubstatChange(WeaponSlot.Main, subs)}
                />
                <Separator className="bg-primary/5" />
                <ScrollArea className="h-[calc(100vh-600px)] min-h-[300px] pr-4">
                  <div className="space-y-4">
                    {Object.values(ArmorSlot).map(slot => (
                      <EquipmentSlot 
                          key={slot} label={slot.charAt(0).toUpperCase() + slot.slice(1)} slot={slot} 
                          selectedItemId={selectedItemIds[slot]}
                          selectedModId={selectedModIds[slot]}
                          selectedSubstats={selectedSubstats[slot]}
                          onItemSelect={(id) => handleItemSelect(slot, id)}
                          onModSelect={(id) => handleModSelect(slot, id)}
                          onSubstatChange={(subs) => handleSubstatChange(slot, subs)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: The HUD (Attribute Matrix & Bonuses) - xl:span-4 */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="border-primary/20 bg-card/50 shadow-2xl shadow-primary/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
              <CardHeader className="pb-3 border-b border-primary/10 flex flex-row items-center justify-between bg-primary/5">
                <CardTitle className="text-[10px] font-black flex items-center gap-2 text-primary tracking-[0.2em] uppercase">
                  03. Combat Attribute HUD
                </CardTitle>
                {scrubbedBuffs.length > 0 && (
                  <div className="flex gap-1.5 animate-pulse">
                    {scrubbedBuffs.map((b, i) => (
                      <Badge key={i} className="bg-primary text-black text-[8px] font-black px-1.5 h-4 rounded-none">
                        {b.name.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-1">
                  {statDisplayList.map((stat, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-white/5 group hover:bg-primary/5 px-2 -mx-2 transition-all rounded">
                      <span className="text-[9px] text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tighter">{stat.label}</span>
                      <span className={`text-[10px] font-mono font-black ${stat.color || 'text-foreground'}`}>
                        {getStat(stat.type)}{stat.suffix}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-6 bg-primary/10" />
                
                <ScrollArea className="h-[calc(100vh-500px)] min-h-[250px] pr-4">
                  <BuildBreakdown effects={scrubbedEffects || player.activeEffects} />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: The ANALYTICS (Sim Results & Logs) - xl:span-5 */}
          <div className="md:col-span-2 xl:col-span-5 space-y-6">
            <Card className="border-primary/10 bg-card/30 overflow-hidden backdrop-blur-sm shadow-xl">
              <Tabs defaultValue="dashboard" className="w-full">
                <div className="px-6 pt-4 flex items-center justify-between border-b border-white/5 bg-white/5 pb-4">
                  <CardTitle className="text-[10px] font-black flex items-center gap-2 tracking-[0.2em] uppercase text-muted-foreground">
                    <span className="w-1 h-3 bg-primary inline-block"></span>
                    04. Simulation Analytics
                  </CardTitle>
                  <TabsList className="bg-black/40 border border-primary/10 h-8">
                    <TabsTrigger value="dashboard" className="text-[9px] font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-6">DASHBOARD</TabsTrigger>
                    <TabsTrigger value="diagnostics" className="text-[9px] font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-6">DIAGNOSTICS</TabsTrigger>
                  </TabsList>
                </div>
                <CardContent className="pt-6">
                  <TabsContent value="dashboard" className="mt-0 outline-none">
                    <DamageDashboard 
                        player={player} 
                        conditions={conditions} 
                        onScrub={handleScrub}
                    />
                  </TabsContent>
                  <TabsContent value="diagnostics" className="mt-0 outline-none">
                    <div className="rounded-md border border-primary/10 bg-black/60 p-1">
                      <CalculationConsole entries={auditLog.getEntries()} />
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
            
            {/* Legend / Info Card */}
            <Card className="border-primary/5 bg-primary/5 p-4">
              <p className="text-[9px] text-muted-foreground leading-relaxed uppercase tracking-wider font-medium italic">
                * All calculations derived from the Reactive Event Bus. Real-time deltas reflect snapshot-integrated combat logic at precisely T+Seconds.
              </p>
            </Card>
          </div>

        </div>
      </main>
    </div>
  )
}

export default App
