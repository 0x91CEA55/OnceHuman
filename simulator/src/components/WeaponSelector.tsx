import React from 'react';
import { ACTIVE_REGISTRY } from '../data/generated/registry';
import { WeaponKey } from '../types/enums';
import { WeaponBlueprint } from '../types/materialization';

interface WeaponSelectorProps {
    selectedWeaponId?: string;
    onWeaponSelect: (weapon: WeaponBlueprint) => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({ selectedWeaponId, onWeaponSelect }) => {
    const weaponList = Object.values(ACTIVE_REGISTRY);

    return (
        <div className="weapon-selector">
            <select
                value={selectedWeaponId}
                onChange={(e) => {
                    const key = e.target.value as WeaponKey;
                    const found = ACTIVE_REGISTRY[key];
                    if (found) onWeaponSelect(found);
                }}
            >
                <option value="">Select Weapon</option>
                {weaponList.map(weapon => (
                    <option key={weapon.key} value={weapon.key}>
                        {weapon.name} ({weapon.type})
                    </option>
                ))}
            </select>
            {selectedWeaponId && (
                <div className="weapon-info">
                    <p className="description">{ACTIVE_REGISTRY[selectedWeaponId as WeaponKey]?.name}</p>
                </div>
            )}
        </div>
    );
};
