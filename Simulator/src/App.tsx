import { useState, useMemo } from 'react'
import { EquipmentSlot } from './components/EquipmentSlot'
import { CalculationConsole } from './components/CalculationConsole'
import { BuildBreakdown } from './components/BuildBreakdown'
import { DamageDashboard } from './components/DamageDashboard'
import { EncounterConditionsPanel } from './components/EncounterConditionsPanel'
import { createWeaponFromDb, WEAPON_DB } from './data/weapons'
import { createArmorFromDb, ARMOR_DB } from './data/armor'
import { createModFromDb, MOD_DB } from './data/mods'
import { Player, PlayerStats } from './models/player'
import { Loadout } from './models/equipment'
import { StatAggregator } from './engine/stat-aggregator'
import { auditLog } from './engine/audit-log'
import { StatType, ArmorSlot, WeaponSlot, EnemyType } from './types/enums'
import { EncounterConditions } from './types/common'

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

function App() {
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string>>({});
  const [selectedModIds, setSelectedModIds] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<EncounterConditions>({
    enemyType: EnemyType.Normal,
    targetDistanceMeters: 10,
    playerHpPercent: 100,
    isTargetVulnerable: false,
    weakspotHitRate: 0.5
  });
  
  // Create loadout based on selections
  const loadout = useMemo(() => {
    const l = new Loadout();
    
    // Weapon
    const wId = selectedItemIds[WeaponSlot.Main];
    if (wId) {
        const wData = WEAPON_DB.find(w => w.id === wId);
        if (wData) {
            const modId = selectedModIds[WeaponSlot.Main];
            const modData = MOD_DB.find(m => m.id === modId);
            const mod = modData ? createModFromDb(modData) : undefined;
            l.weapon = createWeaponFromDb(wData, 1, 1, 0, mod);
        }
    }

    // Armor Slots
    const armorSlots: ArmorSlot[] = [
        ArmorSlot.Helmet, ArmorSlot.Mask, ArmorSlot.Top, 
        ArmorSlot.Gloves, ArmorSlot.Pants, ArmorSlot.Boots
    ];

    for (const slot of armorSlots) {
        const itemId = selectedItemIds[slot];
        if (itemId) {
            const itemData = ARMOR_DB.find(a => a.id === itemId);
            if (itemData) {
                const modId = selectedModIds[slot];
                const modData = MOD_DB.find(m => m.id === modId);
                const mod = modData ? createModFromDb(modData) : undefined;
                
                const armor = createArmorFromDb(itemData);
                armor.mod = mod;
                l[slot] = armor;
            }
        }
    }

    return l;
  }, [selectedItemIds, selectedModIds]);

  // Create a fresh player object for calculations
  const player = useMemo(() => {
    const p = new Player(loadout, new PlayerStats(), 100);
    StatAggregator.aggregate(p);
    return p;
  }, [loadout]);

  const handleItemSelect = (slot: string, id: string) => {
    setSelectedItemIds(prev => ({ ...prev, [slot]: id }));
  };

  const handleModSelect = (slot: string, id: string) => {
    setSelectedModIds(prev => ({ ...prev, [slot]: id }));
  };

  // Helper for displaying stats
  const getStat = (type: StatType) => player.stats.get(type)?.value ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-sm rotate-45 flex items-center justify-center">
              <span className="text-primary-foreground font-bold -rotate-45">H</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ONCE HUMAN <span className="text-primary">SIMULATOR</span></h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] -mt-1 font-semibold">Theorycrafting & DPS Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 text-primary">v0.2.0-alpha</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Build Planner */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-primary/10 bg-card/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary inline-block"></span>
                  ENCOUNTER SETUP
                </CardTitle>
                <CardDescription>Adjust combat conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <EncounterConditionsPanel 
                  conditions={conditions} 
                  onChange={setConditions} 
                />
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary inline-block"></span>
                  LOADOUT PLANNER
                </CardTitle>
                <CardDescription>Select your gear and mods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <EquipmentSlot 
                  label="Weapon Main" 
                  slot={WeaponSlot.Main} 
                  selectedItemId={selectedItemIds[WeaponSlot.Main]}
                  selectedModId={selectedModIds[WeaponSlot.Main]}
                  onItemSelect={(id) => handleItemSelect(WeaponSlot.Main, id)}
                  onModSelect={(id) => handleModSelect(WeaponSlot.Main, id)}
                />

                <Separator className="bg-primary/5" />

                <div className="space-y-4">
                  {[ArmorSlot.Helmet, ArmorSlot.Mask, ArmorSlot.Top, ArmorSlot.Gloves, ArmorSlot.Pants, ArmorSlot.Boots].map(slot => (
                    <EquipmentSlot 
                        key={slot}
                        label={slot.charAt(0).toUpperCase() + slot.slice(1)} 
                        slot={slot} 
                        selectedItemId={selectedItemIds[slot]}
                        selectedModId={selectedModIds[slot]}
                        onItemSelect={(id) => handleItemSelect(slot, id)}
                        onModSelect={(id) => handleModSelect(slot, id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column: Stats & Breakdown */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-primary/20 bg-card/50 sticky top-24">
              <CardHeader className="pb-3 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  TOTAL ATTRIBUTES
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-1">
                {[
                  { label: "Base Damage", value: getStat(StatType.DamagePerProjectile), suffix: "" },
                  { label: "Fire Rate", value: getStat(StatType.FireRate), suffix: " RPM" },
                  { label: "Magazine", value: getStat(StatType.MagazineCapacity), suffix: "" },
                  { label: "Crit Rate", value: getStat(StatType.CritRatePercent), suffix: "%", color: "text-blue-400" },
                  { label: "Crit Damage", value: getStat(StatType.CritDamagePercent), suffix: "%", color: "text-blue-400" },
                  { label: "Weakspot DMG", value: getStat(StatType.WeakspotDamagePercent), suffix: "%", color: "text-yellow-400" },
                  { label: "Weapon DMG", value: getStat(StatType.WeaponDamagePercent), suffix: "%", color: "text-orange-400" },
                  { label: "Attack Bonus", value: getStat(StatType.AttackPercent), suffix: "%", color: "text-orange-400" },
                  { label: "Psi Intensity", value: getStat(StatType.PsiIntensity), suffix: "", color: "text-purple-400" },
                ].map((stat, idx) => (
                  <div key={idx} className="flex justify-between py-1.5 border-b border-white/5 last:border-0 group hover:bg-primary/5 px-2 -mx-2 transition-colors rounded">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</span>
                    <span className={`text-sm font-mono font-bold ${stat.color || 'text-foreground'}`}>
                      {stat.value}{stat.suffix}
                    </span>
                  </div>
                ))}

                <div className="mt-8 pt-4 border-t border-primary/10">
                  <BuildBreakdown effects={player.activeEffects} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Dashboard & Logs */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-primary/10 bg-card/30 overflow-hidden">
              <Tabs defaultValue="dashboard" className="w-full">
                <div className="px-6 pt-6 flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary inline-block"></span>
                    SIMULATION RESULTS
                  </CardTitle>
                  <TabsList className="bg-muted/50 border border-primary/5">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">DASHBOARD</TabsTrigger>
                    <TabsTrigger value="diagnostics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">DIAGNOSTICS</TabsTrigger>
                  </TabsList>
                </div>
                <CardContent className="pt-6">
                  <TabsContent value="dashboard" className="mt-0 outline-none">
                    <DamageDashboard player={player} conditions={conditions} />
                  </TabsContent>
                  <TabsContent value="diagnostics" className="mt-0 outline-none">
                    <div className="rounded-md border border-primary/10 bg-black/40 p-1">
                      <CalculationConsole entries={auditLog.getEntries()} />
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            <Card className="border-primary/10 bg-card/20 opacity-50">
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Coming Soon</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground pb-4 italic">
                Monte Carlo time-series visualization and full magazine dump simulation will appear here in Phase 3.
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  )
}

export default App
