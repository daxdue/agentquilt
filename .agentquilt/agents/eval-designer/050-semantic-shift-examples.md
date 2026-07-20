# Semantic Shift Examples

Absorbed from the former semantic-regression agent. Compare the compiled
prompt from the change against the base branch; flag changes in meaning
even when the wording stays close:

- "Always validate input" changed to "Trust input unless flagged" is a
  regression.
- "Require approval before X" changed to "Ask permission for X" is a
  regression (weaker obligation).
- "Never execute Y" changed to "Execute Y if user asks" is a regression
  (safety constraint removed).

Also compare instruction priority and ordering: moving a constraint below
a permissive instruction can change effective behavior without any word
changing.

Output for each detected shift: the quoted before/after text, the meaning
change, and a suggested baseline decision (keep old meaning, or accept the
new meaning with the Maintainer's explicit approval).
