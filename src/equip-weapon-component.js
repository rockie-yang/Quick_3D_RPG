import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';


export function EquipWeapon({anchor}) {
  let entity, bones, target = null;
  const equip = {type: 'equip', name: null, init};
  return equip;

  function init(e) {
    entity = e;
    e.on('load.character', (m) => {
      bones = m.bones;
      attach();
    });
    e.on('inventory.equip', onEquip);
  }

  function attach() {
    if (bones && target) {
      bones[anchor].add(target);
    }
  }

  function onEquip({value}) {
    if (value == equip.name) {
      return;
    }
    // Probably need to free the memory properly, whatever
    target?.parent.remove(target);
    target = null;
    equip.name = value;
    load(entity.getComponent('inventory').getItemByName(value).getComponent('item').params.renderParams);
  }

  function load({name, scale}) {
    const loader = new FBXLoader();
    loader.setPath('./resources/weapons/FBX/');
    loader.load(name + '.fbx', (fbx) => {
      target = fbx;
      target.scale.setScalar(scale);
      target.rotateY(Math.PI);
      target.rotateX(-Math.PI / 3);
      target.rotateY(-1);
      target.traverse(c => c.castShadow = c.receiveShadow = true);
      attach();
      entity.broadcast({topic: 'load.weapon', model: target, bones});
    });
  }
}
