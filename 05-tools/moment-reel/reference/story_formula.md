# The story formula

How the reference channel (Zack D. Films: 3D story Shorts with a median of about 10M views) tells every narrated story, applied to a sports moment. Measured on 8 of their Shorts: 30-50 s, 90-140 words, 150-180 words a minute, the voice from 0.0 s.

## The six rules

1. **Line 1 is the most surprising physical act, in the past tense, opening with "He"** (or "She", "They"). No name, no date, no setup.
   - "He punched the ball into the net with his left hand, in a World Cup quarter-final."
   - "He volleyed a ball that had been falling for two seconds straight into the top corner."
2. **A chain of cause and effect.** Every sentence after line 1 starts with a hinge word (Then, So, But, Because, Suddenly, Later, And) and is one action you can see.
3. **The context comes late,** usually after "You see,": the date, the place, what was at stake. The what comes before the why.
   - "You see, this was Argentina against England, in Mexico City, in nineteen-eighty-six."
4. **The reveal.** A closer look turns the story: what the officials missed, what the replay showed, what someone said afterwards.
5. **It ends on the consequence,** with no call to action: the result, the record, what happened next.
   - "Four minutes later, he scored the Goal of the Century."
6. **Names are rare.** Use a name only where it pays off (the keeper everyone knows, the quote's speaker). "He" carries the story.

## Writing the lines

- 8 to 12 lines, each one sentence (two very short ones at most), 6 to 18 words.
- Every fact comes from `sources.md`. A line whose fact isn't there doesn't go in.
- Numbers in `say` as words joined with hyphens ("nineteen-eighty-six", "two-one"); `show` gives the caption with digits.
- A quote is the narrator reporting it ("he said it was a little with the head of Maradona..."), never an imitation of the speaker.
- Read the chunks `narrate.py` prints. A chunk that splits a phrase badly ("in a | World Cup") means rephrase the line, not force the chunker.

## Checking a draft

- Does line 1 alone make you want the second line?
- Could each line be one picture? If a line needs three pictures, it's two lines.
- Is anything said before the viewer cares about it? Move it after "You see,".
- Does the last line end the story, not ask for anything?
