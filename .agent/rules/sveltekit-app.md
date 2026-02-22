---
trigger: always_on
---

# Tech Stack

- TypeScript
- SvelteKit with Svelte 5
- Tailwind 4 for styling
- Bun package manager
- Zod for schema validation
- Playwright for end to end testing
- Vite for bundling & dev

# General Rules

- When adding a new library or calling a new method or API, always check the
  most up-to-date docs on the web to ensure you are using the correct syntax.
- When writing E2E tests with Playwright, use the Page Object Pattern for
  maximum reusability. Basically, instead of using locators directly in the
  .spec.ts test files, first define a .ts file in the tests/pages folder,
  defining a class with getters for locators & methods for performing actions on
  that page. This way, if more than one E2E need to act on the same page, they
  will all use the common Page interface.
- When writing Svelte code, use the `svelte-autofixer` MCP to check all the
  components are issue free. Trust the autofixer, it knows best.

# Code Style

- Always specify strict types for function arguments and return values. Use
  generics when possible to enhance reusability.
- Prefer arrow functions (const myFunc = (args) => { }) to using the "function"
  keyword.
- Always add a concise docstring when defining a function, stating its general
  purpose. If the function is supposed to be reused across several files, also
  add an example of usage in the docstring.
- Keep components brief, ideally under 200 lines of code, by splitting code into
  different files: helper .ts files for functions, and smaller .svelte
  components.
- Follow the "single responsability principle" for both functions and
  components. Each function and component should be designed to do just a thing,
  and do it well. Plan for this from the start.

# Svelte Reactivity

- Use Svelte 5 runes to handle reactivity. Specifically:
    1. $state() to define a reactive variable. Changes to reactive variables
       will trigger a rerender.
    2. $derived() to define a reactive variable that is always computed from an
       expression.

        Example: let count = $state(0); let doubled = $derived(count \* 2);

        You can assign a new value to a $derived var (e.g. doubled = 6), but
        when the variables it depends on change (e.g. count = 2), this value
        will be overridden by the $derived recomputation. In any case, manual
        reassigning can be useful to handle optimistic updates (e.g. you use
        $derived to compute something from a component prop. Then you handle an
        update within the component, and override the $derived value with the
        optimistic value. But when the async update completes, the component
        props are updated by the parent: if everything went right, then nothing
        will change, otherwise the $derived will recompute and reset).

    3. $effect should be used very sparingly. It's mainly reserved to trigger
       async logic or DOM updates (e.g. autoscroll a chat when a new message
       arrives). It should NOT be used to update state reactively (use $derived
       for that!).

# Code of conduct

- When chatting with the user, be concise and to the point. Skip introductions
  like "That's exactly right!".
- Be a harsh critic. Always look for how things could go wrong, and point that
  out during the design phase. Do not assume the user to always be right.

# Style Preferences

- Do NOT use emoji
- Minimal over fancy
- Subtle over glaring
