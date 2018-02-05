var movementController = (function(){
  "use strict";
  var keysDown = {};
  var keyCodes = {
    38 : "up",
    37 : "left",
    39 : "right",
    40 : "down"
  };

  return {
    friction : 0.97,
    accelleration : 0.3,
    fuel : 100,
    maxFuel : 100,

    init : function(){
      $(document).keydown(function(event){
        if( keyCodes[ event.which ] !== undefined ){
          keysDown[ keyCodes[ event.which ] ] = true;
        }
      });

      $(document).keyup(function(event){
        if( keyCodes[ event.which ] !== undefined ){
          keysDown[ keyCodes[ event.which ] ] = false;
        }
      });
    },

    velocity : [0,0],
    force    : [0,0],

    applyForce : function(){
      this.velocity[0] += this.force[0];
      this.velocity[1] += this.force[1];
      this.fuel -= Math.abs( this.force[0] ) + Math.abs( this.force[1] );
    },

    updateVelocity : function(){
      this.force = [0,0];
      
      if( keysDown.up && !keysDown.down){
        this.force[1] -= this.accelleration;
      }else if( keysDown.down && !keysDown.up ){
        this.force[1] += this.accelleration;
      }
      
      if( keysDown.right && !keysDown.left ){
        this.force[0] += this.accelleration;
      }else if( keysDown.left && !keysDown.right ){
        this.force[0] -= this.accelleration;
      }

      this.force[1] *= Math.min( 1, this.fuel / ( this.maxFuel / 10 ) );
      this.force[0] *= Math.min( 1, this.fuel / ( this.maxFuel / 10 ) );

      this.applyForce();

      this.velocity[0] *= this.friction;
      this.velocity[1] *= this.friction;
    }
  };
})();

$(function(){
  "use strict";
  var cnv = $("#canvas")[0];
  $(cnv).attr("width", 512);
  $(cnv).attr("height", 512);
  var ctx = cnv.getContext("2d");
  var w = $(cnv).width();
  var h = $(cnv).height();

  var mapSize = (1024 * 16);

  var playerCoords = [0,0];
  var rockCoords = [ 0, -128 ];
  
  movementController.init();

  function toCanvasCoords( coords ){
    return [ coords[0] + w/2 - playerCoords[0], coords[1] + h/2 - playerCoords[1] ] ;
  }

  function zoom( coords, center, z ){
    return [ z * ( coords[0] - center[0] ), z * ( coords[1] - center[1] ) ];
  }

  function circle( ctx, coords, radius ){
    coords = toCanvasCoords( coords );
    ctx.beginPath();
    ctx.arc( 
      coords[0], 
      coords[1],
      radius,
      0,
      2 * Math.PI,
      false
    );
    ctx.closePath();
    ctx.fill();
  }

  function rect( ctx, coords, width, height ){
    coords = toCanvasCoords( coords );
    ctx.fillRect( 
      coords[0] - width/2, 
      coords[1] - height/2,
      width,
      height
    );
    ctx.fill();
  }

  function line( ctx, from, to ){
    from = toCanvasCoords( from );
    to = toCanvasCoords( to );
    ctx.beginPath();
    ctx.moveTo( from[0], from[1] );
    ctx.lineTo( to[0],   to[1] );
    ctx.stroke();
  }

  function move(){
    movementController.updateVelocity();
    playerCoords[0] += movementController.velocity[0];
    playerCoords[1] += movementController.velocity[1];
  }

  function makeStars( count, drawFn ){
    var objects = [];
    for( var i = 0; i < count; i ++ ){
      var x = ( Math.random() * mapSize ) - mapSize/2;
      var y = ( Math.random() * mapSize ) - mapSize/2;
      var d = ( Math.random() * 2 ) - 1;
      var s = 3 * Math.pow( (d + 1), 2 );
      objects.push(
        {
          coords : [ x, y ],
          size : s,
          dist : d,
          draw : drawFn,
          color : "rgba(255,"+parseInt(155+Math.random()*100)+","+parseInt(155+Math.random()*100)+","+(Math.random()*0.25).toFixed(2)+")"
        }
      );
    }
    return objects;
  }

  function makeFuelCans( count, drawFn ){
    var objects = [];
    for( var i = 0; i < count; i ++ ){
      var x = ( Math.random() * mapSize ) - mapSize/2;
      var y = ( Math.random() * mapSize ) - mapSize/2;
      objects.push(
        {
          width : 10,
          height : 16,
          coords : zoom( [ x, y ], playerCoords, 0.5 ),
          draw : drawFn
        }
      );
    }
    return objects;
  }

  function isOnScreen( coords ){
    return (
      coords[0] - playerCoords[0] > w/-2 
      && 
      coords[0] - playerCoords[0] < w/2
      &&
      coords[1] - playerCoords[1] > h/-2
      &&
      coords[1] - playerCoords[1] < h/2
    );
  }

  var fuelCans = makeFuelCans(
    1000,
    function( ctx ){
      if( isOnScreen( this.coords ) ){
        ctx.fillStyle = "blue";
        rect( ctx, this.coords, this.width, this.height ) ;
      }
    }
  );

  var objects = makeStars( 
    20000,
    function( ctx ){
      var zoomed = zoom( this.coords, playerCoords, this.dist );
      if( isOnScreen( zoomed ) ){
        ctx.fillStyle = this.color;
        circle( ctx, zoomed, this.size );
      }
    }
  ).concat( fuelCans );
  objects.push({
    coords : playerCoords,
    size : 5,
    dist : 1,
    draw : function( ctx ){
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      var exhaustSize = 50;
      var exhaustCoords = [ this.coords[0] - movementController.force[0] * exhaustSize, this.coords[1] - movementController.force[1] * exhaustSize ];
      line( ctx, this.coords, exhaustCoords );
      ctx.fillStyle = "green";
      circle( ctx, this.coords, this.size );
    }
  });


  function frame( ctx ){

    move();

    ctx.fillStyle = "black";
    ctx.fillRect( 0,0, w,h );
    objects.forEach( function( object ){
      object.draw( ctx );
    } );
    ctx.fillStyle = "red";
    var fuelHeight = (movementController.fuel / movementController.maxFuel) * h;
    fuelCans.forEach( function( fuelCan ){
      if( 
        Math.abs( fuelCan.coords[0] - playerCoords[0] ) < (fuelCan.width/2)+5 
        &&
        Math.abs( fuelCan.coords[1] - playerCoords[1] ) < (fuelCan.height/2)+5 
      ){
        movementController.fuel = Math.min( movementController.maxFuel, movementController.fuel + 10 );
        fuelCans.splice( fuelCans.indexOf( fuelCan ), 1 );
        objects.splice( objects.indexOf( fuelCan ), 1 );
      }
    });
    ctx.fillRect( 0, h - fuelHeight, 10, fuelHeight );
  }

  setInterval( frame.bind(this,ctx), 16.6 );

});