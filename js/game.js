$(document).ready(function() {

	var game=this;

	// set initial game state (valid states might be 'init', 'wait', 'play', 'modal')
	game.state = 'init';
	
	// object to store game configuration
	game.config = {
		tickSpeed: 120, // how often (in ms) the display is updated, ie. game speed
		zoom: 350, // how much the map is is initially zoomed (percentage)
		initialLevel: 1, // first level to load
		initialPlayerX: 5, // horizontal cell position of player when first level loads
		initialPlayerY: 4, // vertical cell position of player when first level loads
		showZoomSelect: true, // show a dropdown select to let player dynamically change the zoom level
		keysCurrentlyDown: [] // tracks keys being held down between keydown and keyup events
	}

	// object to store data about the player
	game.player = {
		xCurr: 0, // current horizontal position (in map cells)
		yCurr: 0, // current vertical position (in map cells)
		stepDistance: {}, // pixels per step when player moves
		gold: 0, // a common game stat associated with a play
		image: 'player-stand.gif' // initial image to use to render the player
	}

	// load external map data
	game.loadMap = function(levelNum, levelStartX, levelStartY) {
		game.state='init';
		$.getJSON('./json/level'+levelNum+'.json?'+Math.random(), function(level) {
            game.initLevel(level, levelStartX, levelStartY);
        }).fail(function(){
            console.log("Could not load map data. Aborting.");
        });
	};

	// render the map and prepare the level to be played
	game.initLevel = function(level, levelStartX=-1, levelStartY=-1) {

		game.state='init';

		// make level values globally available
		game.level=level; 

		// display the level name in the score panel
		game.updateScorePanel('level',game.level.levelName);

		// if enabled, populate a select element with zoom values
		game.populateZoomSelect();
		
		// set the zoom level
		game.setMapZoom(game.config.zoom);		

		// inject the map HTML and CSS into the page
		game.renderMap(game.level, levelStartX, levelStartY);

		// center the map on the player's current location
		game.sizeAndCenterMap();

		// set animated walk distance values
		game.setStepDistances();

		// build an index of walkable cell types that can be checked quickly with each player step
		game.level.walkableIndex=game.buildWalkableIndex(game.level.cellTypes);

		// build an index of action map cells that can be checked quickly with each player step
		game.level.actionIndex=game.buildActionIndex(game.level.actionCells);

		// display and position action items on the map
		game.addAndPositionMapItems();

		// initialize easystar pathfinding algorithm
		game.initPathfinding(game.level);		

		// fade the player in
		$("#scrollmap .player").fadeIn(1500);

		// put focus on the map so keypresses take effect immediately
		$("#scrollmap .map").trigger("click");

		// create an event resize handler to re-run this function whenever the screen size changes
		$(window).off("resize").on("resize", function() {
			game.player.path=[];
			game.sizeAndCenterMap();
			game.addAndPositionMapItems();
			game.setStepDistances();
			game.initTapHandlers();
		});

		// activate the event handlers that listen for keypresses and map click/taps
		game.initKeyHandlers();
		game.initTapHandlers();

		// let's play!
		game.state='play';

	}

	// render map HTML and CSS into the page
	game.renderMap = function(level, startX, startY) {

		// inject the HTML for map cells
		$(".map").empty();
		for (y=0; y<level.map.length; y++) {
			for (x=0; x<level.map[y].length; x++) {
				$(".map").append('<span class="cell-'+level.map[y][x]+'" data-coords="'+x+'-'+y+'" />');
			}
		}

		// if provided, set the player's initial position
		if (startX && startY) {
			game.player.xCurr=startX; 
			game.player.yCurr=startY; 
		}

		// build and inject css styles for map cells based on level configuration
		var css='';
		$.each(level.cellTypes, function(index, data) {
			css+='#scrollmap .cell-'+data.char+' { background-color: ' + data.bgColor +'; ';
			if (typeof data.image != "undefined" && data.image.length) {
				css+=' background-image: url(\'./img/'+data.image+'\'); ';
			}
			css+='} ';
		});
		$("head #scrollmap-level-css").remove();
		$("head").append('<style type="text/css" id="scrollmap-level-css"> '+css+' </style>');

	};

	// build an index of walkable cell types that can be checked quickly with each player step
	game.buildWalkableIndex = function(cellTypes) {
		var walkableIndex=[];
		$.each(cellTypes, function(index, data) {
			if (data.isWalkable) {
				walkableIndex.push(data.char);
			}
		});		
		return walkableIndex;
	};

	// build an index of action map cells that can be checked quickly with each player step
	game.buildActionIndex = function(actionCells) {
		var actionIndex=[];
		$.each(actionCells, function(index, data) {
		  actionIndex.push(data.x+'-'+data.y);
		});		
		return actionIndex;
	};

	// initialize easystar pathfinding algorithm
	game.initPathfinding = function(level) {
		var pathGraph=[]; // build a pathfinding graph from the map (0=not-walkable, 1=walkable)
		for (const row of level.map) {
			var pathRow=[];
			for (const cell of row) {
				if (level.walkableIndex.indexOf(cell)==-1) {
					pathRow.push(0);
				} else {
					pathRow.push(1);
				}
			}
			pathGraph.push(pathRow);
		}
		game.pathfinder = new EasyStar.js();
		game.pathfinder.setGrid(pathGraph);
		game.pathfinder.setAcceptableTiles([1]);
		game.pathfinder.setIterationsPerCalculation(1500);
	};

	// position the map so the player is centered
	game.sizeAndCenterMap = function() {
		game.cellSize=$(".map").width()*0.02; // size of a map cell (2% of map width)
		var scrollerSize=$("#scrollmap .scroller").width(); // square, height same as width		
		var mapLeft=-(game.cellSize*game.player.xCurr) + (scrollerSize*0.48);
		var mapTop=-(game.cellSize*game.player.yCurr) + (scrollerSize*0.48);
		$("#scrollmap .map").css("left",mapLeft+"px").css("top",mapTop+"px");
		$("#scrollmap .player").css("width",game.cellSize+"px").css("height",game.cellSize+"px");
	};

	// define distance traveled in pixels for each player step
	game.setStepDistances = function() {
		game.player.stepDistance = {
			"0": "+=0",
			"1": "-="+game.cellSize+"px",
			"-1": "+="+game.cellSize+"px"
		}		
	};

	// if enabled, populate a select element with zoom values
	game.populateZoomSelect = function() {
		$("#scrollmap .panel .zoom").empty().hide();
		if (game.config.showZoomSelect) {
			for (zoom=200; zoom<=500; zoom+=50) {
				var option='<option value="'+zoom+'"';
				if (zoom==game.config.zoom) {
					option+=' selected="selected"';
				}
				option+='>'+zoom+'%</option>';
				
				$("#scrollmap .panel .zoom").append(option);
			}
			$("#scrollmap .panel .zoom").show();
		}
	};

	// set the initial map zoom level, and define event handler for when the zoom select changes
	game.setMapZoom = function(zoom) {
		$("#scrollmap .map").css("width",zoom+"%");
		$("#scrollmap .panel select option[value=\'"+zoom+"\']").attr("selected", "selected");
		$("#scrollmap .panel select").off("change").on("change", function() {
			if (game.state=="play") {
				game.setMapZoom($(this).val());
				game.config.zoom=$(this).val();
				$(window).trigger("resize");
				$(this).blur(); // unfocus the select so arrow keypresses don't cause it to keep changing
			}
		});		
	};

	// display and position items on the map
	game.addAndPositionMapItems = function() {
		$("#scrollmap .map img.item").remove();
		$.each(game.level.actionCells, function(index, data) {
			if (typeof data.action != "undefined" && data.action.type=="item") {
				$("#scrollmap .map").append('<img class="item" src="./img/'+data.action.image+'" data-coords="'+data.x + '-' + data.y+'" style="left: '+ (data.x*game.cellSize) + 'px; top: ' + (data.y*game.cellSize) + 'px; " />');
			}
		});
	};

	// define event handlers for key presses
	// here we simply track which arrow keys are down, then the tickInterval moves the player accordingly 
	game.initKeyHandlers = function() {

		// track when an arrow key goes down
		$(document).off("keydown").on("keydown", function(e) { 
			if (game.state != "play") return;
			if ([37,38,39,40].indexOf(e.which)!=-1 && game.config.keysCurrentlyDown.indexOf(e.which)==-1) {
				e.preventDefault();
				game.config.keysCurrentlyDown.push(e.which);
			}
		});

		// track when an arrow key comes up
		$(document).off("keyup").on("keyup", function(e) { 
			if (game.state != "play") return;
			if ([37,38,39,40].indexOf(e.which)!=-1 && game.config.keysCurrentlyDown.indexOf(e.which)!=-1) {
				e.preventDefault();
				game.config.keysCurrentlyDown.splice($.inArray(e.which, game.config.keysCurrentlyDown), 1); // removes from the array
			}
		});	

	};	

	// define even handler for a tap or click on the map
	// this uses the pathfinding algorithm to generate a path of cells to move through
	game.initTapHandlers = function() {
		$("#scrollmap .map span, #scrollmap .map img").off("click").on("click", function(e) {
			e.preventDefault();
			var coords=$(this).attr("data-coords").split("-");
			var xDest=parseInt(coords[0],10);
			var yDest=parseInt(coords[1],10);
			if (game.isWalkable(xDest, yDest)) {
				game.pathfinder.findPath(game.player.xCurr, game.player.yCurr, xDest, yDest, function(path) {
					if (path !== null) {
						game.player.path=path;
					}
				});
			}
		});
		// pathfinding calculations are done piecemeal in an interval to prevent long blocking delays
		setInterval(function() { 
			game.pathfinder.calculate();
		}, 25);
	};

	// check if given x/y coordinates on a map are walkable
	game.isWalkable = function(x, y) {
		return (game.level.walkableIndex.indexOf(game.level.map[y][x])!==-1);
	};

	// update a display value on the scroing panel beneath the map
	game.updateScorePanel = function(field, value) {
		if (typeof field != "undefined" && field.length && typeof value!=undefined && value.toString().length) {
			setTimeout(function() {
				$("#scrollmap .panel ."+field).text(value);
			},1);
		}
	};

	// change the player's animated gif depending on which way they are "facing"
	game.updateWalkAnimation = function(xDelta, yDelta) {
		var img='';
		if (xDelta<0) {
			img='player-left.gif';
		} else if (xDelta>0) {
			img='player-right.gif';
		} else if (yDelta<0) {
			img='player-up.gif';
		} else if (yDelta>0) {
			img='player-down.gif';
		} else {
			img='player-stand.gif';
		}
		if (game.player.image!=img) {
			game.player.image=img;
			$("#scrollmap .player").css("background-image", "url('./img/"+img+"')");
		}
	};

	// process an action cell (cells that have a special action defined in the level config)
	game.processActionCell = function(cellX, cellY) {
		$.each(game.level.actionCells, function(index, data) {
		  if (data.x==cellX && data.y==cellY && typeof data.action != "undefined") {
		  	if (data.action.type=="new-level") {
				game.state='init';
				game.config.keysCurrentlyDown=[];
				var newLevel=data.action;
				$("#scrollmap .player").fadeOut(500, function() {
					game.loadMap(newLevel.level, newLevel.startX, newLevel.startY);
					return;
				});
			} else if (data.action.type=="item") {
		  		if (typeof data.action.addGold != "undefined") {
		  			game.player.gold+=parseInt(data.action.addGold,10);
		  			game.updateScorePanel('gold',game.player.gold);
		  			game.level.actionCells[index]={};
		  			$("#scrollmap .map img[data-coords='"+data.x+"-"+data.y+"']").animate({
		  				top: "-=6%",
		  				opacity: 0
		  			}, 400, function() { 
		  				$(this).remove();
		  			});	  			
		  		} else if (typeof data.action.addToInventory != "undefined") {
		  			// stub for future inventory handling
		  		}
		  	}
		  }
		});
	};

	// every game tick, update the player position based on paths from pathfinder or keys held down
	game.tickInterval=setInterval(function() { 

		if (game.state != "play") return;

		// if any arrow keys are currently down, set the player path accordingly
		if (game.config.keysCurrentlyDown.length) {
			game.player.path=[{"x": game.player.xCurr, "y": game.player.yCurr}];
			if (game.config.keysCurrentlyDown.indexOf(39)!=-1) { //right
				game.player.path[0].x++;
			} else if (game.config.keysCurrentlyDown.indexOf(37)!=-1) { // left
				game.player.path[0].x--;
			} 
			if (game.config.keysCurrentlyDown.indexOf(38)!=-1) { // up
				game.player.path[0].y--;
			} else if (game.config.keysCurrentlyDown.indexOf(40)!=-1) { // down
				game.player.path[0].y++;
			}
		}

		// determine step to move to next destination in the current walk path
		xDelta=0;
		yDelta=0;		
		if (typeof game.player.path != "undefined" && game.player.path.length) {
			var next=game.player.path.shift();
			xDelta=next.x-game.player.xCurr;
			yDelta=next.y-game.player.yCurr;
		}

		// update player animation
		game.updateWalkAnimation(xDelta, yDelta);

		// if player has an x or y delta (is moving) then attempt to move them
		if (xDelta!==0 || yDelta!==0) {

			// determine coordinates of cell player is attempting to walk to
			var reqCellX=game.player.xCurr+xDelta;
			var reqCellY=game.player.yCurr+yDelta;		

			// make sure player is able to move to requested cell
			if (game.isWalkable(reqCellX, reqCellY)) {
				
				// update the player's current stored position
				game.player.xCurr+=xDelta;
				game.player.yCurr+=yDelta;

				// animate the map to move the player relative to the background
				$("#scrollmap .map").animate({
		    		left: game.player.stepDistance[xDelta],
		    		top: game.player.stepDistance[yDelta]
		    	}, game.config.tickSpeed*0.95, "linear");

			} 
		}

		// if this cell has an action, process it
		if (game.level.actionIndex.indexOf(reqCellX+"-"+reqCellY)!==-1) {
			game.processActionCell(reqCellX, reqCellY);
		}			

	}, game.config.tickSpeed);

	// kick things off here
	game.loadMap(game.config.initialLevel, game.config.initialPlayerX, game.config.initialPlayerY);

});
