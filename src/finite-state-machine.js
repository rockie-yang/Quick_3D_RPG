// A finite state machine is "exactly one state at a time" (idle, walk, run, attack, death).
//
// `states` maps a name to a function that builds that state, e.g. {idle: IdleState, walk: WalkState}.
// `animations` maps a name to {clip, action}; the states use it to play the right animation.
//
// Every state is an object with:
//   name               - e.g. 'walk'
//   enter(previous)    - called when we switch to it
//   update(seconds, input) - called every frame while it is current; may call setState
//   exit()             - called when we switch away from it
export function FiniteStateMachine(states, animations) {
  const stateMachine = {current: null, animations, setState, update};
  return stateMachine;

  function setState(name) {
    const previousState = stateMachine.current;
    if (previousState) {
      if (previousState.name == name) {
        return;               // already in that state, nothing to do
      }
      previousState.exit();
    }
    stateMachine.current = states[name](stateMachine);   // build a fresh state object
    stateMachine.current.enter(previousState);
  }

  function update(secondsElapsed, input) {
    stateMachine.current?.update(secondsElapsed, input);
  }
}
