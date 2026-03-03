import React from 'react';
import { RAW_WEAPONS } from '../data/weapons';
import { WeaponKey } from '../types/enums';
import { RawWeaponData } from '@/types/data-sources';

interface WeaponSelectorProps {
    selectedWeaponId?: string;
    onWeaponSelect: (weapon: RawWeaponData) => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({ selectedWeaponId, onWeaponSelect }) => {
    const weaponList = Object.values(RAW_WEAPONS);

    return (
        <div className="weapon-selector">
            <select
                value={selectedWeaponId}
                onChange={(e) => {
                    const key = e.target.value as WeaponKey;
                    const found = RAW_WEAPONS[key];
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
                    <p className="description">{RAW_WEAPONS[selectedWeaponId as WeaponKey]?.description}</p>
                </div>
            )}
        </div>
    );
};
