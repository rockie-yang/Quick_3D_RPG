export function FiniteStateMachine(states, animations) {
  const fsm = {current: null, animations, setState, update};
  return fsm;

  function setState(name) {
    const prev = fsm.current;
    if (prev) {
      if (prev.name == name) {
        return;
      }
      prev.exit();
    }
    fsm.current = states[name](fsm);
    fsm.current.enter(prev);
  }

  function update(timeElapsed, input) {
    fsm.current?.update(timeElapsed, input);
  }
}
