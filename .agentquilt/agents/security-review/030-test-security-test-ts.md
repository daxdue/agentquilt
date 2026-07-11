# test-security.test.ts
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

## YAML Injection Check

```yaml
