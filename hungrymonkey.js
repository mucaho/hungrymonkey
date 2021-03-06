var W=800;
var H=500;
var FH=40;

Crafty.init(W,H, document.getElementById('game'));
Crafty.pixelart(false);

function setupLevel(levelWidth) {
    var FW=levelWidth;

    Crafty.background('lightblue');
    Crafty.viewport.bounds = {
        min:{x:-10, y:0}, 
        max:{x:FW+10, y:H}
    };
    
    Crafty.e("2D, wall_left")
      .attr({x: -1, y: 0, w: 1, h: H});
      
    Crafty.e("2D, wall_right")
      .attr({x: FW, y: 0, w: 1, h: H});
      
    Crafty.e('Floor, 2D')
      .attr({x: 0, y: H-FH, w: FW, h: FH});
        
    Crafty.e('2D, DOM, Image')
      .attr({x: -10, y: H-FH-20, w: FW+20, h: FH+20, z: 1})
      .image('assets/grass.png', 'repeat-x');
      
    health=healthTotal;
    
    buildArchway(levelWidth);
    var monkey = spawnMonkey(levelWidth);
    var healthUpdater = startHealthUpdater();
    Crafty.one('levelWon', function() {
        $('#victory-box').show();
        freezeGame(healthUpdater, monkey);
    });  
    Crafty.one('levelLost', function() {
        $('#defeat-box').show();
        freezeGame(healthUpdater, monkey);
    });
}

Crafty.bind('KeyDown', function (e) {
    if (e.key == Crafty.keys.ENTER) {
        $('.infobox:visible a').trigger('click');
    }
});

$('#restart-level').click(function(e) {
    e.preventDefault();
    startLevel(currentLevel);
});
$('#start-game').click(function(e) {
    e.preventDefault();
    startLevel(1);
});
$('#next-level').click(function(e) {
    e.preventDefault();
    startLevel(currentLevel+1);
});
function startLevel(level) {
    $('.infobox').hide();
    currentLevel=level;
    Crafty.enterScene("level" + currentLevel);
}
  
/* LOAD ASSETS */
var sprites = {
    _preload1: {w: 256, h: 256, file: 'grass.png'},
	monkey: {w: 256, h: 256, file: "monkey.png", pixelart: true},
	banana1: {w: 40, h: 30, file: "banana1.png", ripeness: 1, cx: 38, cy: 1},
    banana3: {w: 40, h: 30, file: "banana3.png", ripeness: 3, cx: 38, cy: 1},
	banana5: {w: 40, h: 30, file: "banana5.png", ripeness: 5, cx: 38, cy: 1},
    banana6: {w: 40, h: 30, file: "banana6.png", ripeness: 6, cx: 38, cy: 1},
    banana9: {w: 40, h: 30, file: "banana9.png", ripeness: 9, cx: 38, cy: 1},
    banana10: {w: 40, h: 30, file: "banana10.png", ripeness: 10, cx: 38, cy: 1},
	bananas1: {w: 50, h: 34, file: "bananas1.png", ripeness: 1, cx: 40, cy: 1},
	bananas5: {w: 50, h: 34, file: "bananas5.png", ripeness: 5, cx: 40, cy: 1},
	bananatree: {w: 600, h: 529, file: "bananatree2.png"},
    appletree: {w: 415, h: 550, file: "appletree.png"},
    lemontree: {w: 612, h: 800, file: "lemontree.png"},
	giraffe: {w: 335, h: 421, file: "giraffe.png"},
    archway: {w: 47, h: 110, file: "archway.svg", map: {sprite_archway_left:[0,0],
                                                        sprite_archway_right:[1,0]}},
    torch: {w: 47, h: 100, file: "torch.png"}
};

Object.keys(sprites).forEach(function(spriteKey) {
	var s = sprites[spriteKey];
    if (s.hasOwnProperty('map')) {
        var map = s.map;
    } else {
        var map = {}
        map["sprite_"+spriteKey] = [0,0];
    }
    var pixelart = null;
    if (s.hasOwnProperty('pixelart')) {
        pixelart = s.pixelart;
    }
	Crafty.sprite(s.w, s.h, "assets/"+s.file, map, null, null, null, pixelart);
});

// positions relative to connector points of bananas on trees
var trees = {
    bananatree: {
        slots: [
            {x: 246, y: 165},
            {x: 275, y: 205},
            {x: 296, y: 170},
            {x: 321, y: 210},
            {x: 350, y: 179},
        ]
    },
};

/* GAME LOGIC */
var healthTotal = 100;
var health=healthTotal;
var currentLevel = 1;
function healthDelta(banana) {
	var bananaHealthDeltas = [
		-10, // 1 green (poisonous)
		-5, // 2
		0, // 3
		5, // 4
		10, // 5 yellow (most nutrition)
		9, // 6
		7, // 7 brown
		5, // 8 black (still good, but sugary and alcoholic)
		0, // 9
		-5 // 10 black rotten
	];
	return bananaHealthDeltas[banana.ripeness-1];
}
var bananaCount=0;

function freezeGame(healthUpdater, monkey) {
    Crafty.unbind('EnterFrame', healthUpdater);
    var epsilon = 1e-100;
    // freeze the monkey
    monkey
        .twoway(epsilon,0) // 0 doesn't work for the first arg
        .antigravity();
}

/* TODO pixelart has to be enabled for the monkey
   crafty doesn't support that yet.
   see https://github.com/craftyjs/Crafty/issues/882
*/
function spawnMonkey(levelWidth) {
    var monkey = Crafty.e('2D, DOM, Twoway, Gravity, Collision, SolidHitBox')
      .attr({x: 0, y: H-FH-100, w: 50, h: 50, z: 9})
      .twoway(5,17)
      .gravity('Floor')
      .gravityConst(1)
      .collision()
      .onHit("wall_left", function() {
        this.x=0;
      }).onHit("wall_right", function() {
        this.x=levelWidth-this.w;
        Crafty.trigger('levelWon');
      }).onHit("banana", function(hits) {
        var banana = hits[0].obj;
        health += healthDelta(banana);
        banana.destroy();
        bananaCount--;
      }).bind("CheckLanding", function(ground) {
        if (this._y + this._h > ground._y + this._vy) // forbid landing, if player's feet are not above ground
            this.canLand = false;
      });

    Crafty.viewport.follow(monkey, 0, 0);
    return monkey;
}

function startHealthUpdater() {
    var healthTotalMillis = 1000 * 10;
    var healthUpdater = function(d) {
        var timePassedMillis = d.dt;
        var deltaHealth = timePassedMillis * healthTotal / healthTotalMillis;
        health -= deltaHealth;
        if (health <= 0) {
            health = 0;
            Crafty.trigger('levelLost');
        }
        $('#health').html(Math.round(health));
    };
    //Crafty.bind('EnterFrame', healthUpdater);
    $('#health-bar').show();
    return healthUpdater;
}

function newBanana(x, y, spriteKey) {
  var s = sprites[spriteKey];
  Crafty.e('2D, DOM, banana, sprite_'+spriteKey)
    .attr({x: x, y: y, w: s.w, h: s.h, z: 6,
	       ripeness: s.ripeness});
  bananaCount++;
}

function getEntitySize(s, ch) {
    var scale = ch/s.h;
	var w = scale*s.w;
	var h = ch;
	return {w:w,h:h,scale:scale};
}

function plantTree(treeSpec, x) {
    var h = treeSpec.height;
    var treeType = treeSpec.type;
	var s = sprites[treeType];
	var size = getEntitySize(s, h);
    var treeX = x-size.w/2;
    var treeY = H-size.h-FH;
	var tree = Crafty.e('2D, DOM, tree, sprite_'+treeType)
	  .attr({x: treeX, y: treeY, z: 5,
	         w: size.w, h: size.h});
    // bananas
    if (treeSpec.hasOwnProperty('slots')) {
        var slots = trees[treeType].slots;
        treeSpec.slots.forEach(function(slot) {
            var relPos = slots[slot.index];
            var bt = slot.bananaType;
            var itemX = treeX + relPos.x*size.scale - sprites[bt].cx;
            var itemY = treeY + relPos.y*size.scale - sprites[bt].cy;
            newBanana(itemX, itemY, bt);
        });
    }
	return tree;
}

function placeGiraffe(x) {
	var s = sprites["giraffe"];
	var size = getEntitySize(s, 200);
	var giraffe = Crafty.e('2D, DOM, giraffe')
	  .attr({x: x-size.w/2, y: H-size.h-FH, z: 7, 
	         w: size.w, h: size.h});
	// hit boxes need some height to prevent tunneling
    Crafty.e('Floor, 2D, Canvas, SolidHitBox')
      .attr({x: x, y: H-FH-size.h*.425, w: size.h*.25, h: 1});
    Crafty.e('Floor, 2D, Canvas, SolidHitBox')
      .attr({x: x-size.h*.21, y: H-FH-size.h*0.89, w: size.h*0.15, h: 1});
	return giraffe;
}

function buildArchway(levelWidth) {
	var s = sprites["archway"];
	var size = getEntitySize(s, 220);
    var x = levelWidth-size.w*1.82;
    var yoffset = 50;
    var y = H-size.h-FH+yoffset;    
	Crafty.e('2D, DOM, archway_left, sprite_archway_left')
	  .attr({x: x, y: y, z: 8,
	         w: size.w, h: size.h});
	Crafty.e('2D, DOM, archway_right, sprite_archway_right')
	  .attr({x: x+size.w, y: y, z: 10,
	         w: size.w, h: size.h});
    Crafty.e('2D, DOM, Color')
      .attr({x: x+size.w*0.3, y: y+size.h*0.3, z: 0,
             w: size.w, h: size.h*0.5})
      .color('black')
      .css({'animation': 'archway 1s linear infinite alternate'});
    
    var torchSprite = sprites["torch"];
    var torchSize = getEntitySize(torchSprite, 40);
    Crafty.e('2D, DOM, sprite_torch')
      .attr({x: x+size.w*0.65, y: y+size.h*0.4, z: 0,
             w: torchSize.w, h: torchSize.h});
    Crafty.e('2D, DOM, sprite_torch')
      .attr({x: x+size.w*0.9, y: y+size.h*0.37, z: 0,
             w: torchSize.w, h: torchSize.h});
    
    /*
    Crafty.e('2D, Floor, Collision')
      .attr({x: x+10, y: y+20, w: size.w*2, h: 20,
             rotation: 23});
    */
}

// ##################################################
// # Define levels                                  #
// ##################################################
Crafty.defineScene("start", function() {
    Crafty.background('black');
    $('#start-box').show();
});

Crafty.defineScene("level1", function() {
    var levelWidth = 800;
    setupLevel(levelWidth);
    
    var tree1 = {
        type: 'bananatree',
        height: 320,
        slots: [
            {   index: 0,
                bananaType: 'banana1'
            },
            {   index: 2,
                bananaType: 'banana5'
            },
            {   index: 4,
                bananaType: 'banana10'
            }
        ]
    };
    
    var tree2 = {
        type: 'appletree',
        height: 300
    };
    
    var tree3 = {
        type: 'lemontree',
        height: 300
    };
    
    plantTree(tree1, 200);
    plantTree(tree2, 400);
    plantTree(tree3, 600);
    placeGiraffe(500);
});

Crafty.defineScene("level2", function() {
    var levelWidth = 2200;
    setupLevel(levelWidth);
    plantTree(200, 320, "bananatree");
    plantTree(700, 500, "bananatree");
    placeGiraffe(500);
});

Crafty.enterScene("start");
