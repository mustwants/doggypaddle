# Understanding the `shouldOfferCompletionListForField` error

When the browser console reports errors like:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'control')
    at shouldOfferCompletionListForField (.../content_script.js:1:422984)
    at elementWasFocused (.../content_script.js:1:423712)
    at focusInEventHandler (.../content_script.js:1:423069)
```

it means a content script is iterating over a list of form fields and assumes each entry has a `control` property. One of the entries in that list is `undefined` or otherwise missing the `control` property, so the script crashes when it tries to read it.

## Why this happens

Many autocomplete or form-helper extensions attach event listeners (e.g., `focus` and `input` handlers) and scan `document.forms` or other collections of fields. If the extension encounters a node that is not an actual form control—such as a custom calendar widget or a detached element—the collection can contain `undefined` entries. Accessing `field.control` without a defensive null check triggers the `TypeError` seen above.

## How to address it

1. **Add a guard before reading `control`:** Update the content script to skip any entries that are falsy or lack the `control` property. For example:
   ```js
   const validFields = fields.filter((field) => field && field.control);
   const shouldOffer = validFields.some((field) => shouldShowCompletion(field.control));
   ```
   or at minimum, use optional chaining inside the `some` callback: `fields.some((field) => field?.control && ...)`.
2. **Harden event handlers:** Wherever the content script processes focus or input events, verify the event target is a supported form element before invoking completion logic.
3. **Check custom widgets:** If the page uses custom components that mimic inputs (e.g., a date picker), ensure the extension ignores them or only inspects the actual underlying `<input>` elements.

Implementing these guards prevents the extension from throwing when it encounters unexpected nodes, allowing autocomplete logic to continue working without breaking page interactions.
