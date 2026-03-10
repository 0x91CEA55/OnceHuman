import React from 'react';
import { ACTIVE_REGISTRY } from '../data/generated/registry';
import { WeaponKey } from '../types/enums';
import { WeaponComponent } from '../ecs/types';
import { createWeaponComponent } from '../ecs/factories';

interface WeaponSelectorProps {
    selectedWeapon?: WeaponComponent;
    onWeaponSelect: (weapon: WeaponComponent) => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({ selectedWeapon, onWeaponSelect }) => {
    const weaponList = Object.values(ACTIVE_REGISTRY);

    return (
        <div className="weapon-selector">
            <select
                value={selectedWeapon?.id}
                onChange={(e) => {
                    const key = e.target.value as WeaponKey;
                    const found = ACTIVE_REGISTRY[key];
                    if (found) {
                        // Creating a component on selection for compatibility
                        const component = createWeaponComponent(key);
                        onWeaponSelect(component);
                    }
                }}
            >
                <option value="">Select Weapon</option>
                {weaponList.map(weapon => (
                    <option key={weapon.key} value={weapon.key}>
                        {weapon.name} ({weapon.type})
                    </option>
                ))}
            </select>
            {selectedWeapon && (
                <div className="weapon-info">
                    <p className="description">{selectedWeapon.name}</p>
                </div>
            )}
        </div>
    );
};
