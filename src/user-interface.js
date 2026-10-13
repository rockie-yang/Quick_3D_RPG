// The HTML parts of the screen (all defined in index.html): the health bar, the statistics panel,
// the three icons that open the panels, and the quest journal and quest text box.

const QUEST = {
	id: 'welcome',
	title: 'Welcome Adventurer!',
	text: `Welcome to Honeywood adventurer, I see you're the chosen one and also the dragon born and whatever else, you're going to save the world! Also bring the rings back to mordor and defeat the evil dragon, and all the other things. But first, I must test you with some meaningless bullshit tasks that every rpg makes you do to waste time. Go kill like uh 30 ghosts and collect their eyeballs or something. Also go get my drycleaning and pick up my kids from daycare.`,
};

export function createUserInterface() {
	const quests = {};   // quests already received, by id
	// The three panels, by the same name as their icon ('icon-bar-stats' opens 'stats', ...).
	const panels = {
		inventory: document.getElementById('inventory'),
		stats: document.getElementById('stats'),
		quests: document.getElementById('quest-journal'),
	};
	for (const name in panels) {
		document.getElementById('icon-bar-' + name).onclick = () => toggle(name);
	}
	hideAllPanels();
	hideQuestText();

	return { showStats, giveQuest: () => addQuest(QUEST), hideQuestText };

	// Health bar (200 pixels wide when full) and the numbers in the statistics panel.
	function showStats(stats) {
		document.getElementById('health-bar').style.width = Math.floor(200 * stats.health / stats.maxHealth) + 'px';
		for (const stat of ['strength', 'wisdomness', 'benchpress', 'curl', 'experience']) {
			document.getElementById('stats-' + stat).innerText = stats[stat];
		}
	}

	// Add a quest to the journal (only once) and show its text.
	function addQuest(quest) {
		if (!(quest.id in quests)) {
			quests[quest.id] = quest;
			const entry = document.createElement('div');
			entry.className = 'quest-entry';
			entry.innerText = quest.title;
			entry.onclick = () => showQuestText(quest);
			panels.quests.appendChild(entry);
		}
		showQuestText(quest);
	}

	function showQuestText(quest) {
		document.getElementById('quest-ui').style.visibility = '';
		document.getElementById('quest-text-title').innerText = quest.title;
		document.getElementById('quest-text').innerText = quest.text;
	}

	function hideQuestText() {
		document.getElementById('quest-ui').style.visibility = 'hidden';
	}

	function hideAllPanels() {
		for (const panel of Object.values(panels)) {
			panel.style.visibility = 'hidden';
		}
	}

	// Open the panel, or close it if it was already open. Only one panel is open at a time.
	function toggle(name) {
		const wasOpen = panels[name].style.visibility != 'hidden';
		hideAllPanels();
		panels[name].style.visibility = wasOpen ? 'hidden' : '';
	}
}
