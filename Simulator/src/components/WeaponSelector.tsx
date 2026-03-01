import React from 'react';
import { WEAPONS, WeaponData } from '../data/weapons';
import { WeaponKey } from '../types/enums';

interface WeaponSelectorProps {
    selectedWeaponId?: string;
    onWeaponSelect: (weapon: WeaponData) => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({ selectedWeaponId, onWeaponSelect }) => {
    const weaponList = Object.values(WEAPONS);

    return (
        <div className="weapon-selector">
            <select 
                value={selectedWeaponId} 
                onChange={(e) => {
                    const key = e.target.value as WeaponKey;
                    const found = WEAPONS[key];
                    if (found) onWeaponSelect(found);
                }}
            >
                <option value="">Select Weapon</option>
                {weaponList.map(weapon => (
                    <option key={weapon.id} value={weapon.id}>
                        {weapon.name} ({weapon.type})
                    </option>
                ))}
            </select>
            {selectedWeaponId && (
                <div className="weapon-info">
                    <p className="description">{WEAPONS[selectedWeaponId as WeaponKey]?.description}</p>
                </div>
            )}
        </div>
    );
};
