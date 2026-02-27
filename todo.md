# OnceHuman — Action Items

## Pending Review

- [ ] **Review Phase 0+1 low-level doc depth** (`Simulator/docs/phase-0-1-data-engine.md`)
  - Flag any assumptions to challenge
  - Validate damage formulas against in-game training dummy (see §5 of the doc for specific test cases)
  - Confirm or reject: is crit × weakspot multiplicative or additive?

## In-Game Validation Needed

- [ ] Hit training dummy on weakspot with a crit — compare observed damage to both formula models
- [ ] Equip a mod with `attack_%` bonus — check if it stacks additively with `weapon_damage_%`
- [ ] Apply Bull's Eye + Vulnerability Amplifier — measure if vulnerability is a separate multiplicative bucket
- [ ] Verify whether `status_damage_%` applies to physical bullet damage or elemental only
- [ ] Verify weapon scaling: do ALL base stats scale with star/level/calibration, or only damage?
