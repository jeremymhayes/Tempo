# Tempo Review Redesign Design

## Objective

Rebuild the Tempo review screen into a serious chess game review interface. The page should feel like a chess analysis tool, not an AI assistant, SaaS dashboard, or decorative mockup.

## Approved Direction

Use the Scoreboard Summary direction from the visual companion.

The initial review state shows a fixed right panel with:

- estimated Elo / game rating
- player accuracy
- evaluation graph
- classification counts for Brilliant, Great, Best, Mistake, Blunder, and related review categories

Once the user moves forward or selects a move, the same right panel changes into a move-list state. It must not expand downward below the summary. The panel swaps content in place.

The move-list state shows:

- evaluation graph at the top
- notation table below the graph
- currently selected move highlighted in the notation table
- far-right move icons only for Brilliant, Great, Mistake, and Blunder

Best, book, and ordinary good moves stay visually quiet in the move list.

## Chess Board

Revert the board to the original React-based chess board implementation using `react-chessboard`. Do not keep the custom hand-rendered board from the prior redesign attempt.

The board still needs:

- eval bar on the left
- last-move highlighting
- optional best-move arrow when enabled
- classification badge only when useful
- board sizing that works on desktop and mobile

## Engine UI

The engine UI should be minimal.

- The eval bar remains next to the board.
- Engine customization lives in a gear-triggered popup menu near the board.
- Do not add a persistent engine panel.
- Do not add an assistant/coach area.

The popup should expose the existing settings:

- depth/time mode
- depth or move time
- MultiPV lines
- skill level
- auto-analyze
- show eval bar
- show best move

## Component Direction

Use shadcn/ui components for real UI controls and layout primitives where appropriate. The repo currently has local UI primitives but does not have a full shadcn project config yet, so implementation should initialize or add the needed shadcn components before composing the final screen.

Likely shadcn components:

- Button
- Separator
- Popover
- Select
- Slider
- Switch
- ScrollArea
- Table
- Badge only for real status/classification labels, not decorative pills

Avoid building fake UI blocks by hand when a shadcn component is the right primitive.

## Anti-Slop Rules

Avoid common AI-generated UI patterns:

- no purple or blue gradient backgrounds
- no glassmorphism
- no glowing cards
- no generic floating dashboard cards
- no decorative pills or badges
- no 3D people, avatars, or fake coach blocks
- no bento-grid filler
- no marketing-style hero sections
- no explanatory feature text inside the review tool

Use a restrained black/gray chess-tool palette with green board accents and classification colors only where they carry review meaning.

## State Model

The review screen has two right-panel modes:

1. `summary`: shown at the starting position before the user reviews individual moves.
2. `moves`: shown after the user moves forward, moves backward to a real ply, or selects a move in the notation list.

Returning to the starting position can return the right panel to `summary`.

## Data Flow

Keep the existing review data flow:

- guest games load from session storage
- saved games pass parsed game data into the same review client
- starter review classifications continue to provide initial summary data
- live engine evaluations can refine classifications when available
- navigation remains based on the existing ply cursor helpers

## Testing

Implementation should verify:

- TypeScript compile
- lint
- unit tests
- production build
- browser smoke for guest PGN import to review
- desktop screenshot review of summary state
- desktop screenshot review of move-list state after moving forward
- gear popup interaction
- mobile layout smoke

## Open Decisions

No open product decisions remain for this redesign.

Implementation details can be chosen to match the existing Tempo codebase patterns, with the explicit constraints above.
