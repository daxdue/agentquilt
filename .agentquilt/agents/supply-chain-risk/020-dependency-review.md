# Dependency Review Workflow

## Inputs

- The `package.json` and `package-lock.json` diffs.
- The Implementation Plan's justification for the dependency (why it is
  needed, what it replaces, why not implement in-repo).

## Checks

1. Necessity: does the plan justify the dependency? Could the need be met
   by an existing dependency (commander, yaml, zod) or a small amount of
   in-repo code? An unjustified dependency is a HIGH finding.
2. License: the package license is compatible with MIT distribution;
   copyleft or missing licenses are findings.
3. Maintenance health (`npm view <pkg>`): last publish date, maintainer
   activity, deprecation status, download base. Abandoned or deprecated
   packages are findings.
4. Install scripts: does the package (or any new transitive dependency)
   declare `preinstall`/`install`/`postinstall` scripts? Any script
   execution at install time is at least a HIGH finding and must be named
   in the gate evidence.
5. Typosquatting: the name is the intended, canonical package (check
   against the upstream project's documented name); one-character
   variants of popular packages are BLOCKERs.
6. Transitive surface: enumerate the new edges from the lockfile diff and
   `npm ls <pkg>`; a small direct dependency dragging a large tree is a
   finding.
7. Lockfile sanity: the lockfile diff contains only the expected edges for
   the declared change; unrelated churn, registry changes, or integrity
   hash surprises are findings.
8. Published-surface impact: does the change alter what ships
   (`dependencies` vs `devDependencies`, `files`, `bin`)? Runtime
   dependency additions are weighted more heavily than dev-only.
9. Known vulnerabilities: `npm audit` state for the new edges.

## Output

Specialist findings in the format of
`.docs/agentic-sdlc/review-contract.md` section 5.2, concluding with an
explicit recommend / recommend-against statement addressed to the
Maintainer's gate decision, listing the evidence per check above.

## Completion criteria

License, scripts, transitive surface, maintenance signals, and lockfile
sanity each assessed with evidence; the recommendation states its decisive
factors.

## Handoff

Evidence to the Maintainer at the approval checkpoint (APP); findings to
the correction loop if the change proceeds.
