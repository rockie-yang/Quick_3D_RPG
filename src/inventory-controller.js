export function InventoryController() {
  let entity;
  const slots = {};
  for (let i = 1; i <= 24; ++i) {
    slots['inventory-' + i] = {type: 'inventory', value: null};
  }
  for (let i = 1; i <= 8; ++i) {
    slots['inventory-equip-' + i] = {type: 'equip', value: null};
  }
  return {type: 'inventory', init, getItemByName};

  function init(e) {
    entity = e;
    e.on('inventory.add', onInventoryAdded);
    for (const id in slots) {
      const element = document.getElementById(id);
      element.ondragstart = (ev) => ev.dataTransfer.setData('text/plain', id);
      element.ondragover = (ev) => ev.preventDefault();
      element.ondrop = (ev) => {
        ev.preventDefault();
        onItemDropped(ev.dataTransfer.getData('text/plain'), id);
      };
    }
  }

  function onItemDropped(oldId, newId) {
    const oldValue = slots[oldId].value;
    setItemAtSlot(oldId, slots[newId].value);
    setItemAtSlot(newId, oldValue);
    if (slots[newId].type == 'equip') {
      entity.broadcast({topic: 'inventory.equip', value: oldValue, added: false});
    }
  }

  function setItemAtSlot(slot, itemName) {
    const item = entity.findEntity(itemName)?.getComponent('item');
    document.getElementById(slot).style.backgroundImage =
        item ? `url('./resources/icons/weapons/${item.params.renderParams.icon}')` : '';
    slots[slot].value = itemName;
  }

  function onInventoryAdded(msg) {
    const slot = Object.keys(slots).find(k => !slots[k].value && slots[k].type == 'inventory');
    if (slot) {
      msg.added = true;
      setItemAtSlot(slot, msg.value);
    }
  }

  function getItemByName(name) {
    return Object.values(slots).some(s => s.value == name) ? entity.findEntity(name) : null;
  }
}

export const InventoryItem = (params) => ({type: 'item', params});
