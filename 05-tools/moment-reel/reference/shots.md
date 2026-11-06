# The shots

The picture changes with every caption chunk (2-4 words, about 1-1.5 s): a new framing, a new action or a camera move. A 40 s reel has 25-40 shots, and nothing ever holds still: a shot longer than a second keeps the camera moving to its last frame (a slow push, a drift, an arc), because a subject that finishes its move (a keeper landing, a frozen moment) leaves a still picture, and `check.py` fails any stretch over 1 s. Many changes are continuous camera moves, not hard cuts.

## The shot types (`type` in shots.json)

| type | what it is | use it for |
|---|---|---|
| `macro_insert` | an extreme close-up of the key act. In the cartoon: zoom 2-3.5 on it, the background swapped for a comic burst (`C.burst`) with speed lines and an impact star, the camera drifting in (a freeze) | the fist on the ball, the boot on the ball, a glove, the whistle, the ball crossing the line |
| `hero_low_angle` | a wide lens at waist height, the player or team facing the camera, floodlights or sky above | the scorer before the act, the line-ups, the celebration |
| `tracked_object` | the camera follows a flying object over a blurred crowd | a cross, a long shot, a ball looping over the keeper |
| `top_down` | straight down on the pitch, a body or a route, then a slow rotate or push | the positions before the act, the ball in the net, a player on the ground |
| `over_shoulder` | behind one character, looking at the other | the referee's view, the keeper watching the ball come |
| `wide` | the whole scene from a drone or the stand | the stadium, the moment in context |
| `tv_replay` | a CRT TV in a dim room shows the event; people lean in; an orange arrow is drawn on the TV picture | "when they watched the replay..." (the reveal) |
| `thought_bubble` | a cloud ring opens in the sky with the hoped-for outcome | what the team was playing for |
| `text_3d` | big extruded 3D numbers or words lying in the scene, seen from above | the year, the score, a distance (only numbers from `sources.md`) |

## The transitions (`transition`)

| transition | what the renderer does | sound (added by plan.py) |
|---|---|---|
| `cut` | a hard cut | none |
| `whip` | a fast 90-degree camera swing with heavy motion blur, 6-8 frames across the cut. It reaches its end framing by 70 % of the shot and holds on the content: a shot never ends mid-blur | a whoosh just before |
| `smash_zoom` | a fast push-in with a radial zoom blur, on the word that matters | an impact and a short whoosh |
| `move` | the camera keeps moving from the last shot into the new framing | none |
| `flash` | one white frame | a shutter |

## The highlights

- `glow`: the object being named glows yellow or orange (emission and a rim) on its word, then fades. A shimmer plays.
- `text_3d`: the text pops into the scene. A pop plays.

## Rules for the picture

- The famous player is a caricature of what's public (hair, build, kit, number), never a traced photo or a realistic face. Everyone else gets a generic cartoon face.
- No logos anywhere: plain kits in the right colours, plain boards, no league, club, maker, sponsor or broadcaster marks.
- No gore close-ups.
- The key instant is a freeze: the moment held while the camera drifts, with a burst, speed lines or a glow. Simple action (a run, a kick, a dive) reads fine in a cartoon; keep it short and clear.
- Crowds are dense, in the teams' colours, waving slowly.
