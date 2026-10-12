export function HealthComponent(params) {
  let entity, health = params.health;
  return {type: 'health', params, init, isAlive: () => health > 0};

  function init(e) {
    entity = e;
    e.on('health.damage', onDamage);
    e.on('health.add-experience', onAddExperience);
    updateUI();
  }

  function updateUI() {
    if (!params.updateUI) {
      return;
    }
    document.getElementById('health-bar').style.width = Math.floor(200 * health / params.maxHealth) + 'px';
    for (const stat of ['strength', 'wisdomness', 'benchpress', 'curl', 'experience']) {
      document.getElementById('stats-' + stat).innerText = params[stat];
    }
  }

  function onAddExperience({value}) {
    params.experience += value;
    // Blah just something easy
    if (params.experience < Math.round(2 ** (params.level - 1) * 100)) {
      return;
    }
    params.level += 1;
    params.strength += 1;
    params.wisdomness += 1;
    params.benchpress += 1;
    params.curl += 2;

    entity.findEntity('level-up-spawner').getComponent('spawner').spawn(entity.position);
    entity.broadcast({topic: 'health.levelGained', value: params.level});
    updateUI();
  }

  function onDamage({value, attacker}) {
    health = Math.max(0.0, health - value);
    if (health == 0) {
      attacker?.broadcast({topic: 'health.add-experience', value: params.level * 100});
      entity.broadcast({topic: 'health.death'});
    }
    entity.broadcast({topic: 'health.update', health, maxHealth: params.maxHealth});
    updateUI();
  }
}
