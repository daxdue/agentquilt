# Schema Change Review

1. Breaking changes? (field rename, type change, removal)
   - If YES: migration path required, bump major version
2. New required fields? (addition to schema)
   - If YES: default value needed, or plan for existing data
3. Validation completeness?
   - New field has bounds, enum, or type constraint?
4. Backward compatibility?
   - Can old data be read with new schema?
   - Can new data be downgraded?
