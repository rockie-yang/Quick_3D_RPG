// 24 backpack slots plus 8 equipment slots, with drag and drop between them.
// Each slot matches an HTML element in index.html with the same id.

// All items in the game. The `icon` is in resources/icons/weapons, the `model` in resources/weapons/OBJ.
export const ITEMS = {
	Sword: { name: 'Sword', damage: 3, icon: 'pointy-sword-64.png', model: 'Sword' },
	Axe: { name: 'Axe', damage: 3, icon: 'war-axe-64.png', model: 'Axe' },
};

// `onEquip(item)` is called when an item is dropped into an equipment slot.
export function createInventory(onEquip) {
	// slot id -> { type: 'inventory' or 'equip', item: the item name in it, or null }
	const slots = {};
	for (let index = 1; index <= 24; ++index) {
		slots['inventory-' + index] = { type: 'inventory', item: null };
	}
	for (let index = 1; index <= 8; ++index) {
		slots['inventory-equip-' + index] = { type: 'equip', item: null };
	}

	// Browser drag and drop: remember which slot the drag started from, and swap the two slots on drop.
	for (const slotId in slots) {
		const element = document.getElementById(slotId);
		element.ondragstart = (event) => event.dataTransfer.setData('text/plain', slotId);
		element.ondragover = (event) => event.preventDefault();   // needed to allow dropping here
		element.ondrop = (event) => {
			event.preventDefault();
			swap(event.dataTransfer.getData('text/plain'), slotId);
		};
	}

	return { add, equip };

	// Put an item in the first empty backpack slot.
	function add(itemName) {
		const slotId = Object.keys(slots).find(id => slots[id].type == 'inventory' && !slots[id].item);
		if (slotId) {
			setSlot(slotId, itemName);
		}
	}

	// Move an item into the first equipment slot and use it.
	function equip(itemName) {
		const from = Object.keys(slots).find(id => slots[id].item == itemName);
		swap(from, 'inventory-equip-1');
	}

	function swap(fromSlotId, toSlotId) {
		const moved = slots[fromSlotId].item;
		setSlot(fromSlotId, slots[toSlotId].item);
		setSlot(toSlotId, moved);
		if (slots[toSlotId].type == 'equip' && moved) {
			onEquip(ITEMS[moved]);
		}
	}

	// Put an item in a slot and show its icon (or clear the icon if the slot is now empty).
	function setSlot(slotId, itemName) {
		slots[slotId].item = itemName;
		document.getElementById(slotId).style.backgroundImage =
			itemName ? `url('./resources/icons/weapons/${ITEMS[itemName].icon}')` : '';
	}
}
