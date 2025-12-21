
# Redesign Login Page for Theme Compatibility

The current login page uses hardcoded gradients and styles. We need to refactor it to use the global CSS variables so it supports Light and Dark modes properly.

## Changes:
1.  **Refactor `Login.tsx`**:
    *   Remove inline styles for background and layout.
    *   Use `page-container` or specific login classes.
    *   Add Logo.
    *   Ensure all text colors use `var(--text-primary)` etc.

2.  **Update `index.css`**:
    *   Add `.login-container` class that handles the full-height centering and background.
    *   In Light mode: Use a subtle gradient or solid color based on palette.
    *   In Dark mode: Use dark background.

## Detailed Plan:
1.  Modify `index.css` to add:
    ```css
    .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: var(--bg-color);
        background-image: radial-gradient(circle at 50% 50%, var(--primary-color) 0%, transparent 50%); /* Subtle glow? */
        /* OR keep it simple with var(--bg-color) */
    }
    ```
    Actually, let's make it look nicer. usage of `var(--bg-color)` is good base.

2.  Modify `Login.tsx` to incorporate the logo and improved structure.
