# 5. Walkthroughs

Step-by-step stories of what the code does when something happens in the game.
Follow along in the files named in **bold**.

---

## 5.1 You press W

1. The browser fires `keydown` with `event.code == 'KeyW'`. **`input.js`** sets `keys.forward = true`.
2. Next frame, **`main.js`** `frame` calls **`player.js`** `updatePlayer`.
3. The player is not attacking, W is held, Shift is not → `setState(player, 'walk')` (**`character.js`**).
4. `moveCharacter` adds 50 × seconds to `player.speed`, takes away some friction, and works out the next
   spot along the facing direction. No tree or living character is too close → `player.position` changes.
5. `setState` started the walk animation, cross-fading from idle over 0.15 s (**`animation.js`**). `animate` copies the
   position and facing onto the knight's node and moves the animation forward, which turns his bones.
6. **`camera.js`** `updateCamera` glides after the player.
7. **`renderer.js`** draws the frame: the knight's node has moved, so his skin, his bones and the sword in his hand are all drawn in the new spot.

When you let go of W, the state becomes `idle` and friction slows the knight to a stop.

## 5.2 You press Space next to a monster

```mermaid
sequenceDiagram
    participant Keyboard
    participant Player as updatePlayer
    participant Attack as updateAttack (character.js)
    participant Monster as monster object
    participant World as world.onHealthChanged / onLevelUp

    Keyboard->>Player: keys.space = true
    Player->>Player: setState(player, 'attack')
    loop every frame of the swing
        Player->>Attack: the slash animation plays
    end
    Note over Attack: animation time passes hitTime (0.7 s)
    Attack->>Attack: grid.findNear: monsters within 7 units and in front?
    Attack->>Monster: damage 50 × 3 = 150 → health 0 → setState(monster, 'death')
    Attack->>Player: gainExperience(100) → level 2, stats grow
    Attack->>World: onLevelUp(player) → sparkles; onHealthChanged → stats on screen
    Note over Attack: slash animation finished → setState(player, 'idle')
```

- The dead monster plays its death animation, its floating health bar slides to empty and disappears
  (**`overlay.js`**), and it no longer blocks movement (only *living* characters do).

## 5.3 A monster attacks you

Every frame, **`monster.js`** `updateMonster`:

1. Is the player alive and within 100 units? If not, stand still.
2. Turn to face the player (`angleTowards`) and walk (`moveCharacter`).
3. If the next step is blocked — usually by the player, 4 units away — `setState(monster, 'attack')`.
4. **`character.js`** `updateAttack`: at 0.35 s the bite lands: 2 damage, if the player is within 6 units
   and in front. `onHealthChanged` shrinks the health bar at the top left.

At 0 health the knight falls over, keys no longer do anything, and the monsters stop chasing.

## 5.4 You level up

1. The first kill gives 100 experience; level 1 needs 100 → level up.
2. `gainExperience` raises level, strength, wisdomness, benchpress (+1) and curl (+2).
3. `world.onLevelUp(player)` → **`main.js`** adds 300 particles from **`sparkles.js`** `createSparkles`.
4. Each frame `updateSparkles` moves and ages them; **`overlay.js`** draws them as glowing circles.
5. The next level needs 200 points, then 400, and so on.

## 5.5 You click the girl

1. **`input.js`** passes the click position to the function given in **`main.js`**.
2. That always hides the quest text first (so clicking anywhere else closes it).
3. `isOnGirl` asks the renderer where her feet and the top of her head are on screen (`renderer.project`),
   and checks whether the click is inside that rectangle.
4. If yes: **`user-interface.js`** `giveQuest` adds "Welcome Adventurer!" to the journal (only once) and shows the text.

## 5.6 You drag the axe into an equipment slot

1. At start-up **`main.js`** called `inventory.add('Axe')`, `inventory.add('Sword')` and `inventory.equip('Sword')`.
2. Open the backpack (middle icon) and drag the axe. `ondragstart` remembers which slot it came from.
3. Drop it on an equipment slot: `swap` exchanges the two slots' contents and icons.
4. The target is an equipment slot → `onEquip(ITEMS.Axe)` → **`main.js`** `equipWeapon`:
   `player.weapon` becomes the axe, `Axe.glb` is loaded, and it replaces the sword on the `RightHandIndex1` bone.
5. The next hit uses the axe's `damage`.
