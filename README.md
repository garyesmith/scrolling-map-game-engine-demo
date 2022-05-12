# Scrolling Map Game Engine Demo (jQuery)

An implementation of a top-down scrolling map game engine, in a style reminiscent of the RPG exploration games I enjoyed as a kid in the 1980s. Implemented entirely client-side with jQuery, HTML, CSS, JSON configuration files, and some image assets. 

Live Demo: <a href="https://www.garysmith.ca/demos/scrolling-map-demo/" target="_blank">https://www.garysmith.ca/demos/scrolling-map-demo/</a>

<a href="https://www.garysmith.ca/demos/scrolling-map-demo/" target="_blank"><img src="https://www.garysmith.ca/assets/demo-scroll-map-screen-grabs.png" /></a>

There are two ways to navigate the game map: 

 - Use the keyboard arrows keys (desktop)
 - Tap or click on any walkable map location to walk to that cell (desktop or mobile)

Level maps are rendered dynamically at runtime based on JSON [level configuration files](https://github.com/garyesmith/scrolling-map-game-engine-demo/tree/master/json). 

The demo includes two sample interconnected levels. The code is designed to be human readable, well-commented, and comprehensible by developers interested in using this as a base to build a fully-functional game with their own maps, artwork and additional logic.


### Dependencies

- jQuery v3.6.0 
- [EasyStar.js](https://github.com/prettymuchbryce/easystarjs) HTML5/Javascript Pathfinding Library


### Installation

If you already have a webserver up and running, simply clone this repo into a subfolder in your doc root, then open `index.html` in a modern browser.


### Project structure

```
.
├── css
│   ├── style.css           # All static game styles
├── img                     # All image assets
├── js                     
│   ├── game.js             # Main game logic
│   ├── easystar.js         # EasyStar pathfinding library
├── json                    # Definition files for game levels
├── index.html              # HTML elements and start page
```

`index.html` contains the HTML for this app. The page head includes `/js/game.js` and `/css/style.css` as well as the jQuery library from a CDN service, and EasyStar.js library locally. 

The page body defines empty container elements to hold the map, score panel, and other elements that are populated by Javascript. 

`game.js` initializes when the document has loaded. This file loads and renders the maps from the [configuration files](https://github.com/garyesmith/scrolling-map-game-engine-demo/tree/master/json) in the `/json` subfolder, and defines event handlers for keypresses and map clicks/taps. 

jQuery animations are used to smoothly scroll the full map within a larger container. The player "walking" animations are implemented with animated GIFs, which are swapped into the page as necessary whenever the player movement direction changes.


#### Game Configuration

A configuration block at the top of `game.js` can be used to set initial values for the game:
- `tickSpeed`: an integer (default `100`) that defines the number of ms between each game "tick" that updates the map. The smaller this value, the faster the game will run. A balance should be found between speed and performance, keeping in mind that on client-side code the performance will always depend on the player's computer specs.
- `zoom`: An integer (default `350`) that defines how much the map is zoomed as a percentage of its scrolling container. For example, a value of 200 means the map is twice as wide as the viewing area. A larger zoom means the map cells will be rendered larger, so the quality of the artwork will need to consider that.
- `showZoomSelect`: a boolean value (default `true`) that defines whether a dropdown select element will be populated into the scoring panel to permit players to dynamically change the map zoom level themselves. This is intended as a testing or debugging feature and probably wouldn't be left visible for a production game.
- `initialLevel`: an integer (default `1`) that determines which map level is loaded first. This integer must match the name of a config file in the `/json` subfolder; for example, level `1` will mean the loader expects a file called `level1.json` to be present. (Also see the [level config README](https://github.com/garyesmith/scrolling-map-game-engine-demo/tree/master/json).) 
- `initialPlayerX`: an integer (default `5`) that defines the initial horizontal position of the player, in map cells, starting from 0.
- `initialPlayerY`: an integer (default `4`) that defines the initial verticial position of the player, in map cells, starting from 0.


#### Level Configuration

Detailed documentation related to level creation and configuration is available in the [level config README](https://github.com/garyesmith/scrolling-map-game-engine-demo/tree/master/json).


### Current Game Features
- Fully responsive layout.
- Two 50 x 50 level maps with a variety of backgrounds.
- A larger map that scrolls smoothly within a smaller window, at a customizable zoom level.
- Ability for the player to move between multiple maps with exit/entrance cells.
- Ability for the player to retrieve items that impact a player statistic (ie. `gold`)
- Simple walking animation that uses animated GIFs.
- Keyboard arrow navigation for desktop computers, and tap/click pathfinding navigation for all devices.

### Future Enhancements
- Add ability for the player to collect items in an inventory, and then have those objects be 'used' at a later point.
- Add an interface for modal pop-ups, to communicate text, images or additional details to the player, and receive responses by button click.
- Add additional game states to enable a title page and game introduction sequences.
- Make map modifications persistent, so items do not reappear when a level is revisited.
- Enable game state saving and reloading.
- Add enemy characters that roam the map and can be interacted with or fought.
- Add a socket server to enable multiple humans to play and interact on the same maps.
- Add a browser-based level editor that reads and writes from the map level JSON files, to make it easier to create attractive and functional levels.