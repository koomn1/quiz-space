# Asset transparency audit — 2026-08-15

The original generated avatar and frame files are fully opaque (alpha 255 everywhere). The first rembg pass was rejected because visible banded backgrounds remained. The deterministic GrabCut pass produced non-zero transparency, but visual inspection of football and music avatars still showed retained blue/purple background regions. These files are not approved for catalog replacement yet. The next pass must combine foreground segmentation with border-color flood removal and must be visually inspected before publication.

A checkerboard composite preview confirmed the deterministic football and music outputs are genuinely transparent around the characters. The earlier apparent backgrounds came from viewing the raw RGBA WebP without compositing it over a checkerboard. These previews are suitable for visual approval; frame previews still need inspection before replacement.

The checkerboard composite confirmed the comet frame is a true transparent ring with a transparent center. The studying avatar is transparent around the student while retaining the intended desk/books/educational scene; this is acceptable as an activity illustration rather than a flat background. The raw RGBA viewer should not be used to judge transparency.
