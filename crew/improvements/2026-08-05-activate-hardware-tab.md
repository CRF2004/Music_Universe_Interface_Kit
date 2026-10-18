# Activate the hardware test tab

## Evidence

CDP key events reached the product window, but held movement produced no visible
frames. The newly created product tab was behind Chrome's first-run tab, so its
`requestAnimationFrame` loop was paused while audio continued.

## Change

Every hardware-browser command activates the Music Universe target before
capturing or sending input. This is browser setup, not product-state access.

## Acceptance

A held movement key must visibly change player/world composition in consecutive
screenshots before a black-box run may infer proximity.
