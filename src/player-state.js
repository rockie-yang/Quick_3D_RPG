import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


// Start the animation for `name`, smoothly blending (cross-fading) from the previous state's animation.
// once: play one time and freeze on the last frame (attack, death).
// sync: if coming from this state, continue at the same point in the stride (walk <-> run).
function playAnimation(stateMachine, name, previousState, {fadeSeconds, once, sync}) {
  const action = stateMachine.animations[name].action;
  if (previousState) {
    const previousAction = stateMachine.animations[previousState.name].action;
    if (once) {
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.enabled = true;
      if (previousState.name == sync) {
        action.time = previousAction.time * action.getClip().duration / previousAction.getClip().duration;
      } else {
        action.time = 0.0;
        action.setEffectiveTimeScale(1.0);
        action.setEffectiveWeight(1.0);
      }
    }
    action.crossFadeFrom(previousAction, fadeSeconds, true);
  }
  action.play();
  return action;
}

const doNothing = () => {};

// Plays the death animation once and stays dead forever.
export function DeathState(stateMachine) {
  const state = {name: 'death', action: null, exit: doNothing, update: doNothing, enter};
  return state;

  function enter(previousState) {
    state.action = playAnimation(stateMachine, 'death', previousState, {fadeSeconds: 0.2, once: true});
  }
}

// Plays the swing once, then goes back to idle when the animation reports "finished".
export function AttackState(stateMachine) {
  const state = {name: 'attack', action: null, exit: cleanup, update: doNothing, enter};
  return state;

  function enter(previousState) {
    state.action = stateMachine.animations.attack.action;
    // The animation mixer fires 'finished' when a play-once animation reaches its end.
    state.action.getMixer().addEventListener('finished', finished);
    playAnimation(stateMachine, 'attack', previousState, {fadeSeconds: 0.2, once: true});
  }

  function finished() {
    cleanup();
    stateMachine.setState('idle');
  }

  // Stop listening, so a later attack doesn't trigger this old state.
  function cleanup() {
    state.action?.getMixer().removeEventListener('finished', finished);
  }
}

// Walk and run are the same except for which way shift switches them.
function MoveState(name, other, shouldSwitch) {
  return (stateMachine) => ({
    name,
    exit: doNothing,
    enter: (previousState) => playAnimation(stateMachine, name, previousState, {fadeSeconds: 0.1, sync: other}),
    // `_` is the time, which these states don't need; `keys` comes from the input (real or pretend).
    update(_, {keys}) {
      if (!keys.forward && !keys.backward) {
        stateMachine.setState('idle');
      } else if (shouldSwitch(keys)) {
        stateMachine.setState(other);
      }
    },
  });
}

// Walk: Shift switches to run.  Run: releasing Shift switches back to walk.
export const WalkState = MoveState('walk', 'run', (keys) => keys.shift);
export const RunState = MoveState('run', 'walk', (keys) => !keys.shift);

// Standing still: W/S starts walking, Space attacks.
export function IdleState(stateMachine) {
  return {
    name: 'idle',
    exit: doNothing,
    enter: (previousState) => playAnimation(stateMachine, 'idle', previousState, {fadeSeconds: 0.25}),
    update(_, {keys}) {
      if (keys.forward || keys.backward) {
        stateMachine.setState('walk');
      } else if (keys.space) {
        stateMachine.setState('attack');
      }
    },
  };
}
