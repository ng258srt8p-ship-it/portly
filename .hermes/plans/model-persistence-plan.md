# Plan: Model Selection Persistence Feature

## Objective
Ensure that when users select a model from the dropdown and click "Save and Restart", their selection persists across sessions.

## Current State Analysis
Based on the context, it appears:
1. There's a model dropdown in the Hermes UI
2. Users can select models (including OpenRouter/free)
3. There's a "Save and Restart" button
4. Currently, selections are not persisting

## Implementation Plan

### Phase 1: Investigation
1. Locate the model dropdown component in the Hermes frontend
2. Find where the selection change is handled
3. Locate the "Save and Restart" button handler
4. Identify where model preferences are currently stored (if at all)
5. Check if OpenRouter/free is already in the dropdown options

### Phase 2: Design Solution
1. Create a persistent storage mechanism for model selection
2. Modify dropdown onChange handler to save selection immediately
3. Modify "Save and Restart" button to:
   - Save current selection (if not already saved)
   - Trigger application restart
4. On app load, read saved selection and set dropdown accordingly
5. Ensure OpenRouter/free option is present in dropdown

### Phase 3: Implementation Details
Storage options:
- LocalStorage (simplest, client-side only)
- Hermes configuration system (more integrated)
- Custom JSON file in ~/.hermes/

Recommended: Use Hermes configuration system for consistency

Key files to modify:
- Frontend model selection component
- Save/restart button handler
- Application startup initialization
- Model dropdown population

### Phase 4: Testing
1. Select a model from dropdown
2. Click "Save and Restart"
3. Verify selection persists after restart
4. Test with OpenRouter/free option specifically
5. Test switching between different models

### Phase 5: Documentation
- Update any relevant documentation
- Add comments to code explaining the persistence mechanism

## Dependencies
- Existing model dropdown component
- Existing save/restart functionality
- Hermes configuration system (if used)

## Risks
- Conflicting with existing state management
- Storage quota limits (unlikely for simple string)
- Race conditions during startup

## Success Criteria
- Model selection persists after save/restart
- OpenRouter/free option is selectable and persistable
- No breaking changes to existing functionality