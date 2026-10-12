export function UIController() {
  const quests = {};
  const panels = {
    inventory: document.getElementById('inventory'),
    stats: document.getElementById('stats'),
    quests: document.getElementById('quest-journal'),
  };
  return {type: 'ui', init, addQuest};

  function init() {
    for (const name in panels) {
      document.getElementById('icon-bar-' + name).onclick = () => toggle(name);
    }
    hideUI();
  }

  function addQuest(quest) {
    if (quest.id in quests) {
      return;
    }
    const e = document.createElement('DIV');
    e.className = 'quest-entry';
    e.id = 'quest-entry-' + quest.id;
    e.innerText = quest.title;
    e.onclick = () => onQuestSelected(e.id);
    panels.quests.appendChild(e);

    quests[quest.id] = quest;
    onQuestSelected(quest.id);
  }

  function onQuestSelected(id) {
    const quest = quests[id];
    document.getElementById('quest-ui').style.visibility = '';
    document.getElementById('quest-text').innerText = quest.text;
    document.getElementById('quest-text-title').innerText = quest.title;
  }

  function hideUI() {
    for (const p of Object.values(panels)) {
      p.style.visibility = 'hidden';
    }
  }

  function toggle(name) {
    const visibility = panels[name].style.visibility;
    hideUI();
    panels[name].style.visibility = visibility ? '' : 'hidden';
  }
}
