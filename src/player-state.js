import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


function play(fsm, name, prev, {fade, once, sync}) {
  const action = fsm.animations[name].action;
  if (prev) {
    const prevAction = fsm.animations[prev.name].action;
    if (once) {
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.enabled = true;
      if (prev.name == sync) {
        action.time = prevAction.time * action.getClip().duration / prevAction.getClip().duration;
      } else {
        action.time = 0.0;
        action.setEffectiveTimeScale(1.0);
        action.setEffectiveWeight(1.0);
      }
    }
    action.crossFadeFrom(prevAction, fade, true);
  }
  action.play();
  return action;
}

const noop = () => {};

export function DeathState(fsm) {
  const state = {name: 'death', action: null, exit: noop, update: noop, enter};
  return state;

  function enter(prev) {
    state.action = play(fsm, 'death', prev, {fade: 0.2, once: true});
  }
}

export function AttackState(fsm) {
  const state = {name: 'attack', action: null, exit: cleanup, update: noop, enter};
  return state;

  function enter(prev) {
    state.action = fsm.animations.attack.action;
    state.action.getMixer().addEventListener('finished', finished);
    play(fsm, 'attack', prev, {fade: 0.2, once: true});
  }

  function finished() {
    cleanup();
    fsm.setState('idle');
  }

  function cleanup() {
    state.action?.getMixer().removeEventListener('finished', finished);
  }
}

function MoveState(name, other, switchTo) {
  return (fsm) => ({
    name,
    exit: noop,
    enter: (prev) => play(fsm, name, prev, {fade: 0.1, sync: other}),
    update(_, {keys}) {
      if (!keys.forward && !keys.backward) {
        fsm.setState('idle');
      } else if (switchTo(keys)) {
        fsm.setState(other);
      }
    },
  });
}

export const WalkState = MoveState('walk', 'run', (keys) => keys.shift);
export const RunState = MoveState('run', 'walk', (keys) => !keys.shift);

export function IdleState(fsm) {
  return {
    name: 'idle',
    exit: noop,
    enter: (prev) => play(fsm, 'idle', prev, {fade: 0.25}),
    update(_, {keys}) {
      if (keys.forward || keys.backward) {
        fsm.setState('walk');
      } else if (keys.space) {
        fsm.setState('attack');
      }
    },
  };
}
