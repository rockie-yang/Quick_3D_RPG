const TITLE = 'Welcome Adventurer!';
const TEXT = `Welcome to Honeywood adventurer, I see you're the chosen one and also the dragon born and whatever else, you're going to save the world! Also bring the rings back to mordor and defeat the evil dragon, and all the other things. But first, I must test you with some meaningless bullshit tasks that every rpg makes you do to waste time. Go kill like uh 30 ghosts and collect their eyeballs or something. Also go get my drycleaning and pick up my kids from daycare.`;


export function QuestComponent() {
  document.getElementById('quest-ui').style.visibility = 'hidden';
  return {type: 'quest', init};

  function init(entity) {
    // HARDCODE A QUEST
    entity.on('input.picked', () => entity.findEntity('ui').getComponent('ui').addQuest(
        {id: 'foo', title: TITLE, text: TEXT}));
  }
}
