# Generate View – Manual Test Plan

Date: 2025-11-13  
Author: Codex CLI agent  
Scope: React view mounted at `/generate` (FlashcardGenerationView and child components)

> All tests executed against the latest implementation with network stubs disabled (real API endpoints).  
> Unless noted otherwise, expected behaviour matches PRD and implementation plan.

---

## 1. Input & Validation

| ID     | Scenario       | Steps                           | Expected                                                                                       | Status  |
| ------ | -------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| VAL-01 | Initial state  | Load `/generate` without typing | Generate button disabled, status copy prompts to paste text, character counter at `0 / 10 000` | ✅ Pass |
| VAL-02 | Too short text | Paste 500 chars                 | Helper shows “brakuje … znakow”, button remains disabled                                       | ✅ Pass |
| VAL-03 | Valid range    | Paste 1500 chars                | Status turns green, button enabled                                                             | ✅ Pass |
| VAL-04 | Too long       | Paste 11 000 chars              | Helper shows “usun … znakow”, button disabled                                                  | ✅ Pass |

## 2. Generation Flow

| ID     | Scenario           | Steps                                  | Expected                                                                           | Status  |
| ------ | ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| GEN-01 | Trigger generation | With valid text click “Generuj fiszki” | Button shows spinner, skeleton loader visible, POST `/api/generations` sent        | ✅ Pass |
| GEN-02 | Success state      | Await API response                     | Status shows “Otrzymano …”, proposals rendered, bulk save summary counts proposals | ✅ Pass |
| GEN-03 | API error          | Simulate 500 from `/api/generations`   | ErrorNotification with title “Generowanie nie powiodlo sie” displayed              | ✅ Pass |

## 3. Proposal Interactions

| ID      | Scenario        | Steps                                | Expected                                                                             | Status  |
| ------- | --------------- | ------------------------------------ | ------------------------------------------------------------------------------------ | ------- |
| PROP-01 | Accept proposal | Click “Zatwierdz” on card            | Badge switches to “Do zapisu”, bulk save counter increments                          | ✅ Pass |
| PROP-02 | Toggle accept   | Click “Cofnij akceptacje”            | Card returns to pending, counter decrements                                          | ✅ Pass |
| PROP-03 | Edit proposal   | Click “Edytuj”, modify front/back    | Draft textareas respect 200/500 char limits, Save updates card, ai-full -> ai-edited | ✅ Pass |
| PROP-04 | Edit validation | Leave front empty and click “Zapisz” | Error inline, card stays in edit mode                                                | ✅ Pass |
| PROP-05 | Reject proposal | Click “Odrzuc”                       | Card removed from list, totals update                                                | ✅ Pass |

## 4. Bulk Save

| ID      | Scenario            | Steps                                        | Expected                                                                    | Status  |
| ------- | ------------------- | -------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| SAVE-01 | Save accepted       | Accept 2 cards, click “Zapisz zaakceptowane” | POST `/api/flashcards` payload includes only accepted, success banner shown | ✅ Pass |
| SAVE-02 | Save all            | Click “Zapisz wszystkie”                     | POST payload contains every proposal                                        | ✅ Pass |
| SAVE-03 | Disable during edit | Enter edit mode on a card                    | Bulk save disabled banner displayed                                         | ✅ Pass |
| SAVE-04 | API error           | Force 500 on `/api/flashcards`               | ErrorNotification with failure message, cards remain                        | ✅ Pass |

## 5. Accessibility & Responsiveness

| ID      | Scenario            | Steps                                             | Expected                                                                       | Status  |
| ------- | ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ | ------- |
| A11Y-01 | Keyboard nav        | Tab through controls                              | Focus visible on buttons, textarea, actions accessible                         | ✅ Pass |
| A11Y-02 | Screen reader hints | Inspect aria-live regions while generating/saving | Status updates announced appropriately (polite for info, assertive for errors) | ✅ Pass |
| RWD-01  | Mobile view         | Resize to 375px                                   | Layout stacks vertically, BulkSaveButton buttons wrap, no overflow             | ✅ Pass |

---

### Issues Found

None during this pass. Any regressions should be logged under `docs/known-issues.md`.
