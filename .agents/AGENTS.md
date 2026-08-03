# Agent Instructions

## Semantic HTML & Accessibility (Step 2)
Whenever you are creating or modifying JSX/HTML in this project:
- Prioritize semantic HTML5 elements (`<main>`, `<section>`, `<article>`, `<nav>`, `<aside>`, `<header>`, `<footer>`) over arbitrary `<div>` containers.
- Ensure all forms use proper `<form>` wrappers rather than relying solely on `onClick` handlers.
- Add strict `autoComplete` attributes (e.g., `autoComplete="email"`, `autoComplete="current-password"`) to all inputs so browser autofill/password managers work flawlessly.
- Bind all `<label>`s to inputs using `htmlFor` and explicit `id`s. Add `aria-labels` or `sr-only` text for buttons and interactive elements without visible text.

## Performance & Animation Optimization (Step 4)
Whenever you are implementing animations or adding interactive elements:
- Use `style={{ willChange: "transform, opacity" }}` on continuously running animations or heavy layout transitions to hardware-accelerate them and prevent lag.
- Avoid animating dimensions (`width`, `height`, `margin`, `padding`) which trigger expensive browser reflows; stick to `transform` (scale, translate) and `opacity`.
- Ensure Framer Motion `<AnimatePresence>` unmounts smoothly without causing layout thrashing.
