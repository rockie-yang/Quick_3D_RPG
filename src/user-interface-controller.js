// Handles the icon bar (stats, inventory, quests) and the quest journal on screen.
// The panels themselves are plain HTML in index.html; this code only shows/hides them and fills in text.
export function UserInterfaceController() {
  const quests = {};   // quests already received, by id
  // The three panels, by the same name as their icon ('icon-bar-stats' opens 'stats', ...).
  const panels = {
    inventory: document.getElementById('inventory'),
    stats: document.getElementById('stats'),
    quests: document.getElementById('quest-journal'),
  };
  return {type: 'userInterface', init, addQuest};

  function init() {
    for (const name in panels) {
      document.getElementById('icon-bar-' + name).onclick = () => toggle(name);
    }
    hideAllPanels();
  }

  // Add a quest to the journal (only once per quest id) and show its text.
  function addQuest(quest) {
    if (quest.id in quests) {
      return;
    }
    // A clickable line in the quest journal.
    const entry = document.createElement('DIV');
    entry.className = 'quest-entry';
    entry.id = 'quest-entry-' + quest.id;
    entry.innerText = quest.title;
    entry.onclick = () => onQuestSelected(entry.id);
    panels.quests.appendChild(entry);

    quests[quest.id] = quest;
    onQuestSelected(quest.id);
  }

  // Show the quest text box with this quest's title and text.
  function onQuestSelected(id) {
    const quest = quests[id];
    document.getElementById('quest-ui').style.visibility = '';
    document.getElementById('quest-text').innerText = quest.text;
    document.getElementById('quest-text-title').innerText = quest.title;
  }

  function hideAllPanels() {
    for (const panel of Object.values(panels)) {
      panel.style.visibility = 'hidden';
    }
  }

  // Open the panel, or close it if it was already open. Only one panel is open at a time.
  // (An empty visibility string means "visible".)
  function toggle(name) {
    const visibility = panels[name].style.visibility;
    hideAllPanels();
    panels[name].style.visibility = visibility ? '' : 'hidden';
  }
}
