# Plan: Model Selection Persistence Implementation Plan

## Goal
Ensure that when users to select a model from the dropdown and have a "Save and Restart" button is clicked.

## Problem Statement
Currently, when users select a model from the dropdown in the Hermes interface and click "Save and Restart", their selection does not persist across sessions. Additionally, the OpenRouter/free option may not be available in the model dropdown.

## Solution Overview
Implement a persistence mechanism that saves the user's model selection to a configuration file when the "Save and Restart" button is clicked, and restores this selection when the application starts.

## Implementation Steps

### 1. Identify the relevant files
- Model dropdown component
- Save/Restart button handler
- Application startup/initialization code
- Configuration storage mechanism

### 2. Create a model selection storage mechanism
- Use the existing Hermes configuration system
- Store the selected model ID in ~/.hermes/config.yaml or similar
- Ensure the storage is thread-safe and handles concurrent access

### 3. Modify the model dropdown component
- On application load, read the saved model selection from config
- Set the dropdown to this value if it exists
- On selection change, update the UI immediately (but don't save yet)

### 4. Modify the Save and Restart button handler
- When clicked, save the current dropdown selection to the configuration
- Trigger the application restart process
- Ensure the save happens before the restart

### 5. Ensure OpenRouter/free is available in the dropdown
- Check the model list population logic
- Add OpenRouter/free if it's missing
- Ensure it's properly labeled and functional

### 6. Testing
- Select a model from the dropdown
- Click "Save and Restart"
- Verify the selection persists after restart
- Test with OpenRouter/free specifically
- Test switching between different models
- Verify no breaking changes to existing functionality

## Files to Modify
- Frontend model selection component (likely in src/components/ or similar)
- Save/Restart button handler
- Application initialization code
- Configuration handling code

## Success Criteria
- Model selection persists after save/restart
- OpenRouter/free option is available and functional
- No regression in existing functionality
- Clean, maintainable code implementation