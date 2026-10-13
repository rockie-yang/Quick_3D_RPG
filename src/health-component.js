// Health, experience points and levels. Also updates the player's health bar and stats panel.
//
// `parameters`: health, maxHealth, strength, wisdomness, benchpress, curl, experience, level,
// and updateUserInterface (true only for the player, whose numbers are shown on screen).
export function HealthComponent(parameters) {
  let entity;
  let health = parameters.health;   // current health; 0 means dead
  return {type: 'health', parameters, init, isAlive: () => health > 0};

  function init(owner) {
    entity = owner;
    owner.on('health.damage', onDamage);                 // sent by an attacker's attack controller
    owner.on('health.add-experience', onAddExperience);  // sent by a monster we killed
    updateUserInterface();
  }

  // Write health and stats into the HTML on screen (player only).
  function updateUserInterface() {
    if (!parameters.updateUserInterface) {
      return;
    }
    // The bar at the top left is 200 pixels wide at full health.
    document.getElementById('health-bar').style.width = Math.floor(200 * health / parameters.maxHealth) + 'px';
    for (const stat of ['strength', 'wisdomness', 'benchpress', 'curl', 'experience']) {
      document.getElementById('stats-' + stat).innerText = parameters[stat];
    }
  }

  function onAddExperience({value}) {
    parameters.experience += value;
    // Experience needed for the next level doubles every level: 100, 200, 400, 800, ...
    // Blah just something easy
    if (parameters.experience < Math.round(2 ** (parameters.level - 1) * 100)) {
      return;
    }
    // Level up: every stat grows.
    parameters.level += 1;
    parameters.strength += 1;
    parameters.wisdomness += 1;
    parameters.benchpress += 1;
    parameters.curl += 2;

    // Sparkles around the player.
    entity.findEntity('level-up-spawner').getComponent('levelUpSpawner').spawn(entity.position);
    entity.broadcast({topic: 'health.levelGained', value: parameters.level});
    updateUserInterface();
  }

  function onDamage({value, attacker}) {
    health = Math.max(0.0, health - value);   // never below zero
    if (health == 0) {
      // Reward whoever killed us, then tell our own components (the controller plays the death animation).
      attacker?.broadcast({topic: 'health.add-experience', value: parameters.level * 100});
      entity.broadcast({topic: 'health.death'});
    }
    // The floating health bar listens for this.
    entity.broadcast({topic: 'health.update', health, maxHealth: parameters.maxHealth});
    updateUserInterface();
  }
}
