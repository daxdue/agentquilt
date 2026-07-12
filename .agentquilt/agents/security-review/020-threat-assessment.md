# Threat Assessment

Repository-specific threat model, with the checks and adversarial inputs
to apply where the diff touches the area.

## Path traversal

```javascript
// VULNERABLE (no validation):
const agentPath = path.join(sourceDir, includeName);
// Attacker: include: ../../../../etc/passwd

// SECURE (validates boundary):
const normalized = path.resolve(path.join(sourceDir, includeName));
if (!normalized.startsWith(path.resolve(sourceDir))) {
  throw new ConfigError(`Path escapes sourceDir: ${includeName}`);
}
```

Test to propose as the finding's verification:

```javascript
it("rejects include paths that traverse outside sourceDir", () => {
  expect(() => validateConfig({
    sourceDir: "agents",
    targets: [{
      output: "OUT.md",
      include: ["../../../etc/passwd"]
    }]
  }, tmpDir)).toThrow(ConfigError);
});
```

## YAML injection and untrusted metadata

Front-matter, manifests, and config are user-controlled YAML. Risks to
check whenever parsing or schema code changes:

- Unvalidated front-matter fields overriding compiled metadata.
- Dangerous YAML constructs in attacker-controlled fields, for example a
  manifest carrying a payload like
  `x-evil: !!python/object/apply:os.system ["rm -rf /"]` - the parser must
  treat tags as data, never instantiate them.
- Mitigation to verify: Zod schema validation accepts only known shapes,
  and unknown fields are carried as inert data, never interpreted or
  executed.

## Compiled-prompt injection surface

Fragment bodies are emitted verbatim into compiled agent files by design
(the adapter never transforms user content). What must hold:

- A fragment or manifest field must not be able to alter frontmatter or
  metadata of the compiled output outside its own declared fields.
- Delimiters matter: content that begins with `---` or mimics frontmatter
  must not be parseable as frontmatter in the output position it lands in.
- Any new interpolation of user content into structured output positions
  (frontmatter, lock entries) is a finding unless escaped or validated.

## Platform assumptions

```javascript
// BAD: assumes Unix paths
const p = "/agents/role.md";
// BAD: hard-coded Windows separator
const id = `agents\\role.md`;

// GOOD: uses path.join / path.relative with normalization
const p2 = path.join("agents", "role.md");
const id2 = path.relative(sourceDir, filePath).replace(/\\/g, "/");
```

Hardcoded separators or absolute paths in path-handling diffs are
findings: they break cross-platform hashing and ordering guarantees.
