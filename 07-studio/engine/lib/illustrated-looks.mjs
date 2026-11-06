// Look ids of the illustrated kit (a leaf module: lib/illustration-schema.mjs needs them while the kit modules load).
/**
 * Art-style looks (each is also a template id): painted, printed, cut and drawn media with their own textures,
 * entrances, cameras and transitions (src/illustrated/artstyles.tsx). References: 00-docs/template-styles.md.
 */
export const ART_LOOKS = ["watercolor", "paper-collage", "chalkboard", "risograph", "ukiyo-e", "pop-comic"];
/**
 * Templates drawn with the illustrated kit, and the look each one uses. A look is the whole visual and motion
 * language of a template (palette defaults, fonts, panels, entrances, camera, background, cut effect, transition).
 * The look comes from the template defaults (`theme.look`); the `illustrated` template keeps the original blueprint look.
 */
/**
 * Format looks with depth (src/illustrated/formats2d.tsx): dark-grid UI cards, flat-shaded 2.5D scenes in
 * perspective, pastel glass cards, a numbered host tutorial on warm paper, a glass checklist with a mascot and a
 * cinematic spotlight narrative, and the data-atlas documentary (layered illustrated scenes, 2.5D parallax). Each is also a template id.
 */
export const FORMAT_2D_LOOKS = ["ui-cards", "flat-depth", "soft-gradient", "host-tutorial", "checklist-glass", "spotlight-narrative", "data-atlas"];
export const LOOKS = ["blueprint", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers", ...ART_LOOKS, ...FORMAT_2D_LOOKS];
