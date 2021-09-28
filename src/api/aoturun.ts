import { Reaction } from '../core/reaction';

export function autorun(view: (r: Reaction) => any) {
  debugger
  const reaction = new Reaction(function() {
    this.track(() => view(reaction));
  });
  reaction.schedule();
  return reaction;
}
