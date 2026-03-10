# Damage Formula Engine Abstraction

Every underlying damage formula in Once Human is well-known to follow linear polynomial form:

```
DMG = PRODUCT{Ci}, where Ci is any individual source constant, and i=1..n
```

Each Ci is derived from a DMG 'source', which can be loosely categorized as:
- Weapon
- Elemental (Blaze, Frost, Shock, Blast)
- Status
- Keyword (Power Surge, Burn, Frost Vortex, Unstable Bomber, Bounce, Shrapnel) 
   - Only these KWs are noted to have a "Factor" formula including a "DMG Factor Bonus" and a "Final DMG Bonus"
- Crit
- Weakspot
- Target (Enemy Type: Normal, Elite, Boss aka Great Ones)
- Final
- Ultimate??? (Translation error meaning "Final DMG Bonus"?)

All DMG values are known to follow a multiplicative factor approach to scale a BaseDMG value:
1. Attack = "damage dealth by a single bullet from ranged weapon or a single strike from melee weapon"
2. WeaponDMG = "direct damage dealth by attacking with weapons. Its base value is determined by Attack of the weapon. This is the main type of damage dealt when using a weapon DMG build.
1. Elemental builds have their KwDmg scale off PsiIntensity: 
    - `DMG = (KwIntrinsicScaling * PsiIntensity) * PRODUCT{PFi=2..n}`
2. Non-Elemental builds have their KwDmg scale off AttackDMG:
    - `DMG = (KwIntrinsicScaling * AttackDMG) * PRODUCT{PFi=2..n}`

The topology should be **pure data all the way down**. Buckets are data. Contributors are data. Conditions are data. One generic system evaluates everything. No lambdas in the registry.
