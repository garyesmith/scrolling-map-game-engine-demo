$(document).ready(function() {

	var game=this;

	// set initial game state (valid states might be 'init', 'wait', 'play', 'modal')
	game.state = 'init';
	
	// object to store game configuration
	game.config = {
		tickSpeed: 100, // how often (in ms) the display is updated, ie. game speed
		zoom: 350, // how much the map is is initially zoomed (percentage)
		initialLevel: 1,
		initialPlayerX: 5,
		initialPlayerY: 4,
		showZoomSelect: true, // show a dropdown select to let player dynamic change the zoom level
		keys: { //  key codes to directional position change
			"37" : { xPos: -1, yPos: 0  }, // left key
			"38" : { xPos: 0, yPos: -1  }, // up key
			"39" : { xPos: 1, yPos: 0  }, // right key
			"40" : { xPos: 0, yPos: 1 }  // down key
		},
		keysCurrentlyDown: [] // tracks keys being held down between keydown and keyup events
	}

	// object to store data about the player
	game.player = {
		xCurr: 0, // current horizontal position (in map cells)
		yCurr: 0, // current vertical position (in map cells)
		xDelta: 0, // direction player is now moving horizontally (1 is right, -1 if left)
		yDelta: 0, // direction player is now moving vertically (1 is down, -1 is up)
		stepDistance: {}, // pixels per step when player moves
		gold: 0,
		image: 'player-stand.gif'
	}

	// load external map data
	game.loadMap = function(levelNum, levelStartX, levelStartY) {
		game.state='init';
		$.getJSON('./json/level'+levelNum+'.json?'+Math.random(), function(level) {
            game.initMap(level, levelStartX, levelStartY);
        }).fail(function(){
            console.log("Could not load map data. Aborting.");
        });
	};

	// render the map cells and define dimensions based on screen proportions
	game.initMap = function(level, levelStartX=-1, levelStartY=-1) {

		game.state='init';

		// make level values globally available
		game.level=level; 

		// display the level name in the score panel
		game.updateScorePanel('level',game.level.levelName);

		// if enabled, populate the zoom select element
		$("#scrollmap .panel .zoom").hide();
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

		// set the zoom level
		game.setMapZoom(game.config.zoom);		

		// empty it first, then append HTML for all the cells into the map container
		$(".map").empty();
		for (const row of game.level.map) {
			for (const cell of row) {
				$(".map").append('<span class="cell-'+cell+'" />');
			}
		}

		// if provided, set the player's initial position
		if (levelStartX && levelStartY) {
			game.player.xCurr=levelStartX; 
			game.player.yCurr=levelStartY; 
		}

		// center the map on the player's current location
		game.recenterMap();

		// set animated walk distance values
		game.setWalkDistances();

		// build and inject css styles for map cells based on level configuration
		var css='';
		$.each(game.level.cellTypes, function(index, data) {
			css+='#scrollmap .cell-'+data.char+' { background-color: ' + data.bgColor +'; ';
			if (typeof data.image != "undefined" && data.image.length) {
				css+=' background-image: url(\'./img/'+data.image+'\'); ';
			}
			css+='} ';
		});
		$("head #scrollmap-level-css").remove();
		$("head").append('<style type="text/css" id="scrollmap-level-css"> '+css+' </style>');

		// build an index of walkable cells that can be checked quickly with each player step
		game.level.walkableIndex=[];
		$.each(game.level.cellTypes, function(index, data) {
			if (data.isWalkable) {
				game.level.walkableIndex.push(data.char);
			}
		});

		// build a graph for the astar pathfinding algorithm (0=wall, 1=walkable)
		game.level.pathGraph=[];
		for (const row of game.level.map) {
			var pathRow=[];
			for (const cell of row) {
				if (game.level.walkableIndex.indexOf(cell)==-1) {
					pathRow.push(0);
				} else {
					pathRow.push(1);
				}
			}
			game.level.pathGraph.push(pathRow);
		}
		console.log(game.level.pathGraph);


		// build an index of action map cells that can be checked quickly with each player step
		game.level.actionIndex=[];
		$.each(game.level.actionCells, function(index, data) {
		  game.level.actionIndex.push(data.x+'-'+data.y);
		});

		// display and position action items on the map
		game.addAndPositionMapItems();

		// fade the player in
		$("#scrollmap .player").fadeIn(1500);

		// put focus on the map so keypresses take effect immediately
		$("#scrollmap .map").trigger("click");

		// create an event resize handler to re-run this function whenever the screen size changes
		$(window).off("resize").on("resize", function() {
			game.recenterMap();
			game.setWalkDistances();
			game.recenterMap();
			game.addAndPositionMapItems();
		});

		// game is ready, change state to play!
		game.state='play';

	}

	// position the map so the player is centered
	game.recenterMap = function() {
		game.cellSize=$(".map").width()*0.02; // size of a map cell (2% of map width)
		var scrollerSize=$("#scrollmap .scroller").width(); // square, height same as width		
		var mapLeft=-(game.cellSize*game.player.xCurr) + (scrollerSize*0.48);
		var mapTop=-(game.cellSize*game.player.yCurr) + (scrollerSize*0.48);
		$("#scrollmap .map").css("left",mapLeft+"px").css("top",mapTop+"px");
		$("#scrollmap .player").css("width",game.cellSize+"px").css("height",game.cellSize+"px");
	};

	// define distance traveled in pixels for each player step
	game.setWalkDistances = function() {
		game.player.stepDistance = {
			"0": "+=0",
			"1": "-="+game.cellSize+"px",
			"-1": "+="+game.cellSize+"px"
		}		
	};

	game.setMapZoom = function(zoom) {
		$("#scrollmap .map").css("width",zoom+"%");
		$("#scrollmap .panel select option[value=\'"+zoom+"\']").attr("selected", "selected");
		$("#scrollmap .panel select").off("change").on("change", function() {
			if (game.state=="play") {
				game.setMapZoom($(this).val());
				game.config.zoom=$(this).val();
				$(window).trigger("resize");
			}
		});		
	};

	// display and position items on the map
	game.addAndPositionMapItems = function() {
		$("#scrollmap .map img.item").remove();
		$.each(game.level.actionCells, function(index, data) {
		  if (data.action.type=="item") {
		  	$("#scrollmap .map").append('<img class="item" src="./img/'+data.action.image+'" id="'+data.x + '-' + data.y+'" style="left: '+ (data.x*game.cellSize) + 'px; top: ' + (data.y*game.cellSize) + 'px; " />');
		  }
		});
	};

	game.initKeyHandlers = function() {

		// when arrow key goes down, start player moving
		$(document).on("keydown", function(e) { 
			if (game.state != "play") return;
			e.preventDefault();
			if ([37,39].indexOf(e.which) != -1) {
				game.player.xDeltaPx=game.config.keys[e.which].xPx;
				game.player.xDelta=game.config.keys[e.which].xPos;
				if (game.config.keysCurrentlyDown.indexOf(e.which)==-1) {
					game.config.keysCurrentlyDown.push(e.which);
				}
			} else if ([38,40].indexOf(e.which) != -1) {
				game.player.yDelta=game.config.keys[e.which].yPos;
				if (game.config.keysCurrentlyDown.indexOf(e.which)==-1) {
					game.config.keysCurrentlyDown.push(e.which);
				}
			}
		});

		// when arrow key comes up, stop player moving
		// but if the opposite direction arrow is still held down, move that direction instead
		$(document).on("keyup", function(e) { 
			if (game.state != "play") return;
			e.preventDefault();
			game.config.keysCurrentlyDown.splice($.inArray(e.which, game.config.keysCurrentlyDown), 1);
			if (e.which==37) { // right
				game.player.xDelta=0;
				if (game.config.keysCurrentlyDown.indexOf(39)!=-1) {
					game.player.xDelta=game.config.keys[39].xPos;
				} 
			} else if (e.which==39) { // left
				game.player.xDelta=0;
				if (game.config.keysCurrentlyDown.indexOf(37)!=-1) {
					game.player.xDelta=game.config.keys[37].xPos; 
				}
			} else if (e.which==38) { // up
				game.player.yDelta=0;
				if (game.config.keysCurrentlyDown.indexOf(40)!=-1) {
					game.player.yDelta=game.config.keys[40].yPos;
				}
			} else if (e.which==40) { // down
				game.player.yDelta=0;
				if (game.config.keysCurrentlyDown.indexOf(38)!=-1) {
					game.player.yDelta=game.config.keys[38].yPos;
				}
			}
		});

	};	

	// check if given x/y coordinates on a map are walkable
	game.isWalkable = function(x, y) {
		return (game.level.walkableIndex.indexOf(game.level.map[y].charAt(x))!==-1);
	};

	game.updateScorePanel = function(field, value) {
		if (typeof field != "undefined" && field.length && typeof value!=undefined && value.toString().length) {
			setTimeout(function() {
				$("#scrollmap .panel ."+field).text(value);
			},1);
		}
	};

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

	// process an action cell (a cell with a special action defined in the level config)
	game.processActionCell = function(cellX, cellY) {
		$.each(game.level.actionCells, function(index, data) {
		  if (data.x==cellX && data.y==cellY) {
		  	if (data.action.type=="new-level") {
				game.state='init';
				game.player.xDelta=0;
				game.player.yDelta=0;
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
		  			$("#scrollmap .map img#"+data.x+'-'+data.y).animate({
		  				top: "-=6%",
		  				opacity: 0
		  			}, 400, function() { 
		  				$(this).remove();
		  			});	  			
		  		} else if (typeof data.action.addToInventory != "undefined") {
		  			// stub for inventory here
		  		}
		  	}
		  }
		});
	};

	// every game tick, update the player position
	game.tickInterval=setInterval(function() { 

		if (game.state != "play") return;

		// update player animation
		game.updateWalkAnimation(game.player.xDelta, game.player.yDelta);

		// if player has an x or y delta (is moving) then attempt to move them
		if (game.player.xDelta!==0 || game.player.yDelta!==0) {

			// determine coordinates of cell player is attempting to walk to
			var reqCellX=game.player.xCurr+game.player.xDelta;
			var reqCellY=game.player.yCurr+game.player.yDelta;		

			// check if player is able to move to requested cell
			if (game.isWalkable(reqCellX, reqCellY)) {
				
				// update the player's current stored position
				game.player.xCurr+=game.player.xDelta;
				game.player.yCurr+=game.player.yDelta;

				// animate the map to move the player relative to the background
				$("#scrollmap .map").animate({
		    		left: game.player.stepDistance[game.player.xDelta],
		    		top: game.player.stepDistance[game.player.yDelta]
		    	}, game.config.tickSpeed*0.95, "linear");

			} 
		}

		// if this cell is action, process the action
		if (game.level.actionIndex.indexOf(reqCellX+"-"+reqCellY)!==-1) {
			game.processActionCell(reqCellX, reqCellY);
		}			

	}, game.config.tickSpeed);

	game.initKeyHandlers();
	game.loadMap(game.config.initialLevel, game.config.initialPlayerX, game.config.initialPlayerY);

});
