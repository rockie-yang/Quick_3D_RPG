// 24 backpack slots plus 8 equipment slots, with drag and drop between them.
// Each slot matches an HTML element in index.html with the same id.
export function InventoryController() {
  let entity;
  // slot id -> {type: 'inventory' or 'equip', value: name of the item entity in it, or null}
  const slots = {};
  for (let index = 1; index <= 24; ++index) {
    slots['inventory-' + index] = {type: 'inventory', value: null};
  }
  for (let index = 1; index <= 8; ++index) {
    slots['inventory-equip-' + index] = {type: 'equip', value: null};
  }
  return {type: 'inventory', init, getItemByName};

  function init(owner) {
    entity = owner;
    owner.on('inventory.add', onInventoryAdded);
    // Browser drag and drop: remember which slot the drag started from, and swap on drop.
    for (const slotId in slots) {
      const element = document.getElementById(slotId);
      element.ondragstart = (event) => event.dataTransfer.setData('text/plain', slotId);
      element.ondragover = (event) => event.preventDefault();   // needed to allow dropping here
      element.ondrop = (event) => {
        event.preventDefault();
        onItemDropped(event.dataTransfer.getData('text/plain'), slotId);
      };
    }
  }

  // Swap the contents of the two slots. Dropping into an equipment slot equips the item.
  function onItemDropped(fromSlotId, toSlotId) {
    const movedValue = slots[fromSlotId].value;
    setItemAtSlot(fromSlotId, slots[toSlotId].value);
    setItemAtSlot(toSlotId, movedValue);
    if (slots[toSlotId].type == 'equip') {
      entity.broadcast({topic: 'inventory.equip', value: movedValue, added: false});
    }
  }

  // Put an item in a slot and show its icon (or clear the icon if the slot is now empty).
  function setItemAtSlot(slotId, itemName) {
    const item = entity.findEntity(itemName)?.getComponent('item');
    document.getElementById(slotId).style.backgroundImage =
        item ? `url('./resources/icons/weapons/${item.parameters.renderParameters.icon}')` : '';
    slots[slotId].value = itemName;
  }

  // Put a new item in the first empty backpack slot (if there is one).
  function onInventoryAdded(message) {
    const slotId = Object.keys(slots).find(id => !slots[id].value && slots[id].type == 'inventory');
    if (slotId) {
      message.added = true;
      setItemAtSlot(slotId, message.value);
    }
  }

  // The item entity with this name, if it is anywhere in the inventory; otherwise null.
  function getItemByName(name) {
    return Object.values(slots).some(slot => slot.value == name) ? entity.findEntity(name) : null;
  }
}

// An item (like a sword) is an entity with just this component holding its data:
// {type: 'weapon', damage, renderParameters: {name of the model file, scale, icon picture}}.
export const InventoryItem = (parameters) => ({type: 'item', parameters});
