# Scrolling Map Game Engine Demo (jQuery)


[General documentation for this repository is here](https://github.com/garyesmith/scrolling-map-game-engine-demo/tree/master/).

## Level Configuration files

This folder contains JSON level configuration files named with the convention `levelN.json` where `N` is an integer representing the unique level number. The file must be in valid JSON format with the following fields:

#### levelNumber

This value is an integer and unique primary key for the level, and must match the integer in the level's filename, as described above. This integer value will be passed as the first parameter to the `game.loadLevel()` function when the level is loaded and rendered in the game.

#### levelName

This value is a string defining the name of the level. This may be displayed to the player in various places during game play, such as in the scoring panel or in modals.

#### map

This is a Javascript array of strings that defines the cells of the map to be used for this level. The array must consist of exactly 50 strings, each with a length of 50 characters, as in this example:

```
 [
	"11111111111111111111111111111111111111111111111111",
	"11111000000001110000000000000001111111110000011111",
	"11100000000000000000000555000000000000000000000011",
	"11002220000000000000000000000000000000000000000011",
	"10022222222222222222222222222220000500000000000011",
	"10002220000000000000000000000020000000000000000001",
	"10000000000000000000000000000020000000000000000001",
	"11100000000000000000000000000020000000000050000001",
	"11111111505000000005550000000020000000000000000001",
	"11110001111110500000005000000020000000000000000001",
	"11100000000011100000000000000020000000000000000001",
	"11000000000000111110000000011161110000000000000001",
	"11000000000000000111111111110020011111000000000011",
	"10000000000000000000000000000020000111111100000011",
	"10000000050000000000000000000020000000111111111111",
	"10000000000000000000000000000020000000000001111111",
	"11000000000000000000000000000020000000000000000111",
	"11000000000000000000005000000022222200050000000011",
	"11000000000000000000000000000000005200000000000011",
	"10000000005500000000000000000000000200000000000011",
	"10000000000000000000000000000000000200000000000011",
	"10000000000000000000000000000000000200000000000001",
	"10000000000000000000011111110000000200000005000001",
	"10000000000000000111111111111111000200000000000001",
	"10000000000001111111111111111111100200000000000001",
	"10005000011111111111111111111110000200000000000001",
	"10000000001111111111111111111110000200000000000001",
	"10000000000001111111111111115000000200000000000001",
	"10000000000000000111111115550000000200000000000001",
	"10000000500000001111111111555500000200000000000001",
	"11000000000000011111111111111111000200000000000001",
	"11000000000000000011111111111000000200000000000011",
	"11111110000000011111111111100000000200000000000011",
	"11111111110000111111111110000000000222220000000111",
	"11111111111111111115500000000000000000020000000111",
	"11111111111111133333500000050000000000022222000111",
	"11111111333333333300000000050000000000000002000011",
	"11111000003333333500000000000000000000000002000011",
	"11133050000073355000005000000000000000000002000011",
	"11330000003333355055000000000000000000000002000011",
	"13300000003333330055005000005000000000000002000001",
	"13300050000330000005000000000055550000533302000001",
	"13000000000300000000000000000000055005334332000001",
	"10000000003330000000000000000000000550222222000011",
	"10000000333333300000050000000000000000222222000011",
	"11000003333333330005000000000000000000000000000111",
	"11000333333333333000000000000000000000000000011111",
	"11003333333333333333300000000000000000000001111111",
	"111111#3333333333333333000000000000001111111111111",
	"11111111111111111111111111111111111111111111111111"
]
```

Each character in the array strings represents one square on the map, and must a unique alphanumeric character (ie. `0`-`9` or `A`-`Z`). These characters are used to form CSS style classes, and therefore special characters such as spaces, underscores, punctuation, etc. are not permitted in the map array.

#### cellTypes

This is a JSON object that describes a type of cell used in the `map` array, as in this example:

```
{
	"char": "0",
	"label": "Grass",
	"bgColor": "#bad684",
	"image": "texture.png",
	"isWalkable": true
}
```

- `char` - The character used to represent this cell type in the `map` array
- `label` - A string used to describe this cell type (not generally displayed in the game but useful for humans reading and modifying the map definition).
- `bgColor` - A hexidecimal color value beginning with `#` to specify the background color to be used for this cell type.
- `image` - A filename of an image located in the `/img` subfolder to display on top of the cell. This image must be perfectly square (same width and height) to prevent distortion. The image can be semi-transparent PNG or GIF to permit the background color to show though.
- `isWalkable` - A boolean value to specify whether the player can move through this type of cell. The boundaries at the top, bottom, left and right edges of the map should be populated with non-walkable cells, to ensure the player cannot attempt to "leave" the map area and trigger an error.

#### actionCells

This is a JSON object that defines actions that occur when the player moves to specific coordinates on the map, as in this example:

```
{
	"x": 40,
	"y": 42,
	"action": {
		"type": "new-level",
		"level": 2,
		"startX": 25,
		"startY": 18
	}
}
```

- `x` - An integer between `0` and `49` representing the horizontal cell where the action should occur.
- `y` - An integer between `0` and `49` representing the vertical cell where the action should occur.
- `action.type` - A string describing the action to occur. Current valid action types are `new-level` and `item`, to be further configured as follows:

- **New Level actions**
    - `type` - `new-level`
    - `level` - An integer representing the new level to load.
    - `startX` - An integer between `0` and `49` representing the horizontal cell where the player should be positioned when the new level loads.
    - `startY` - An integer between `0` and `49` representing the vertical cell where the player should be positioned when the new level loads.    

- **Item actions**
    - `type` - `item`
    - `image` - A filename of an image located in the `/img` subfolder to display on top of the cell. This image should represent an item to be retrieved by the player and should have a transparent background so the base cell is visible behind it.
    - `addGold` - An integer value representing the amount to increment the player's `gold` attribute.

In the future, additional action types and behaviours can be easily added by customizing the `game.processActionCell()` function defined in `game.js`.