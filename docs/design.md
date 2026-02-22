# Design System

The application features a modern, "dark ocean" aesthetic with consistent
styling.

## Colors

Defined in `src/app.css` as CSS variables:

- **Background**: `#0f0f0f` (`--color-bg`) - Deep dark base.
- **Surface**: `#1a1a1a` (`--color-surface`) - Card and element backgrounds.
- **Primary**: `#2dd4bf` (`--color-primary`) - Teal-400, used for actions and
  highlights.
- **Accent**: `#34d399` (`--color-accent`) - emerald-400.
- **Text**: `#e5e5e5` (`--color-text`) - High contrast for readability.
- **Text Muted**: `#888` (`--color-text-muted`) - Secondary information.
- **Border**: `#333` (`--color-border`).

## Typography

- **Primary Font**: `Noto Sans JP` (Google Fonts) - Main UI font for clarity and
  Japanese character support.
- **Title/Decor Font**: `Yuji Syuku` (Google Fonts) - Used for the main
  "魚ですよ" header and decorative elements for a traditional feel.

## Dimensions & Layout

- **Max Width**: `max-w-6xl` (approx 1152px) for the main container.
- **Spacing**: Generous padding (`px-4 py-8`) and "space-y-8" vertical rhythm.
- **Share Card**: Fixed width of `800px` for consistent image generation.
