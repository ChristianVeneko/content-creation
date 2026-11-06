/* scenarios-f.js: the composable scenario. Its props come from the payload (`props`), drawn from the prop library in props.js. */
'use strict';
defScenario({ id: 'workshop-stage', name: 'Workshop stage (composable)', dynamic: true,
  about: 'A bench scene whose props YOU choose from the prop library (`props: [{ kind, id?, at?, size? }]`, 1-8 items), so any topic can be drawn literally. Themes: bench, sky, grid, night-city.',
  topics: ['anything', 'custom', 'generic', 'any topic', 'literal metaphor', 'compare', 'cause and effect'], keywords: ['workshop', 'custom', 'props', 'generic', 'bench'], time: 'day',
  build: workshopBuild, props: {}, far() {}, mid() {} });
