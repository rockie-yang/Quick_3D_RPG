import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';


// Loads the equipped weapon's 3D model and attaches it to a bone in the character's hand.
// `anchor` is the bone's name, e.g. 'RightHandIndex1'.
export function EquipWeapon({anchor}) {
  let entity;
  let bones;                // the character's skeleton, name -> bone (arrives with 'load.character')
  let weaponModel = null;   // the currently loaded weapon model
  // `name` is the item entity's name of the weapon in hand; the attack controller reads it.
  const equip = {type: 'equip', name: null, init};
  return equip;

  function init(owner) {
    entity = owner;
    owner.on('load.character', (message) => {
      bones = message.bones;
      attach();
    });
    owner.on('inventory.equip', onEquip);
  }

  // The character and the weapon load at different times; attach only once both are ready.
  // Adding the weapon as a child of the hand bone makes it follow the hand automatically.
  function attach() {
    if (bones && weaponModel) {
      bones[anchor].add(weaponModel);
    }
  }

  function onEquip({value}) {
    if (value == equip.name) {
      return;   // already holding it
    }
    // Remove the old weapon from the hand.
    // Probably need to free the memory properly, whatever
    weaponModel?.parent.remove(weaponModel);
    weaponModel = null;
    equip.name = value;
    // Look up the item entity through the inventory and load its model.
    load(entity.getComponent('inventory').getItemByName(value).getComponent('item').parameters.renderParameters);
  }

  function load({name, scale}) {
    const loader = new FBXLoader();
    loader.setPath('./resources/weapons/FBX/');
    loader.load(name + '.fbx', (model) => {
      weaponModel = model;
      weaponModel.scale.setScalar(scale);
      // Turn the weapon so it sits nicely in the grip.
      weaponModel.rotateY(Math.PI);
      weaponModel.rotateX(-Math.PI / 3);
      weaponModel.rotateY(-1);
      weaponModel.traverse(child => child.castShadow = child.receiveShadow = true);
      attach();
      entity.broadcast({topic: 'load.weapon', model: weaponModel, bones});
    });
  }
}
