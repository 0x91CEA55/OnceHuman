import React from 'react';
import { WEAPON_DB, WeaponData } from '../data/weapons';

interface WeaponSelectorProps {
    selectedWeaponId?: string;
    onSelect: (weaponData: WeaponData) => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({ selectedWeaponId, onSelect }) => {
    return (
        <div className="weapon-selector">
            <label htmlFor="weapon-select">Weapon</label>
            <select 
                id="weapon-select" 
                value={selectedWeaponId || ''} 
                onChange={(e) => {
                    const found = WEAPON_DB.find(w => w.id === e.target.value);
                    if (found) onSelect(found);
                }}
            >
                <option value="" disabled>Select a weapon...</option>
                {WEAPON_DB.map(weapon => (
                    <option key={weapon.id} value={weapon.id}>
                        [{weapon.rarity.toUpperCase()}] {weapon.name}
                    </option>
                ))}
            </select>
            
            {selectedWeaponId && (
                <div className="selection-details">
                    <p className="description">{WEAPON_DB.find(w => w.id === selectedWeaponId)?.description}</p>
                </div>
            )}
        </div>
    );
};
