var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var sleep = require('sleep');

//'use strict';
//let wrap = require('async-class').wrap;

var toRadians = Math.PI /   180;

class Car extends EventEmitter {
  constructor(params) {
    super();
    var self = this;
    this.params = params;
    this.position = this.params.initial_pos;
    self.lastPositionChangeInt = new Date().getTime();
  }

  getPos() {
    var self = this;
    return this.position;
  };

  setPos(pos, force_send) {
    var self = this;
    force_send = typeof force_send !== 'undefined' ? force_send : false;
    if(self.position !== pos){
      //if(Math.round(self.position.x) != Math.round(pos.x) || Math.round(self.position.y) != Math.round(pos.y) || Math.round(self.position.rot) != Math.round(pos.rot)){
      //}
	  var now = new Date().getTime();
      self.position = pos;
      self.emit('positionChange');
      if(self.lastPositionChangeInt <= now - self.params.send_min_interval*1000 || force_send){
        self.lastPositionChangeInt = new Date().getTime();
        self.emit("sendPosition");
      }
      return true;
    } else {
      return false;
    }
  }

  getWheelCenter(){
  	var self = this;
  	var wheels = self.params.car_dimensions.wheels;
  	return {
  		x:Math.cos(self.getPos().rot * Math.PI/180) * wheels + self.getPos().x,
  		y:Math.sin(self.getPos().rot * Math.PI/180) * wheels + self.getPos().y
  	}

  }

  getPositionFromWheels(rot){
  	var self = this;
    var wpos = self.getWheelCenter();
  	var wheels = self.params.car_dimensions.wheels;

    return {
  	   x:wpos.x - Math.cos(rot * Math.PI/180) * wheels,
       y:wpos.y - Math.sin((rot) * Math.PI/180) * wheels
	  }
  }

  getPositionFromArc(wpos, rot, radius){
  	var self = this;

    return {
  	   x:wpos.x - Math.cos(rot * Math.PI/180) * radius,
       y:wpos.y - Math.sin((rot) * Math.PI/180) * radius
	  }

  }

  relativeAngle(angle){
    angle = (360 + angle) % 360;
    if(angle > 180){
      angle = angle * -1;
    }
    return angle;
  }

  absoluteAngle(angle){
    return (360 + angle) % 360;
  }

  makeRect(distance, vel){
    var self = this;
    vel = Math.abs(vel); // Posible bug fixed.
    distance = distance - (distance % self.params.step_lenght); // This will set distance to a multiple of step_lengt
    var fragments = Math.abs(distance) / self.params.step_lenght;

    if(distance >= 0){
      var fragmentDistance = self.params.step_lenght;
    } else {
      var fragmentDistance = self.params.step_lenght * -1;
    }

    var intervalTime = self.params.step_lenght / vel; // LINEAR, NO ACCELERATION! t = x / v; // T IN Seconds!

    var remainingFragments = fragments;
    var step = setInterval(function(){
      self.setPos({
        x: self.getPos().x + fragmentDistance * Math.sin((90 - self.getPos().rot) * toRadians),
        y: self.getPos().y + fragmentDistance * Math.cos((90 - self.getPos().rot) * toRadians),
        rot: self.getPos().rot
      });
      remainingFragments--;
      if(remainingFragments == 0){
        clearInterval(step);
      }
    }, intervalTime * 1000); // *1000 to pass to mseconds
  }

  rotate(finalrot, vel){
  	var self = this;

  	if(finalrot < 0){
		console.log("Error. invalid rotation detected.");
		return;
	}

	if(finalrot == self.getPos().rot){
		console.log("Final position is current position. No need to rotate");
		return;
	}

	finalrot = finalrot % 360;

  	var angle = finalrot - self.getPos().rot;

  	if(angle % self.params.rotate_interval !== 0){
  		console.log("Warning! not exact angle!");
  	}

  	var rotationCenter = self.getWheelCenter();

  	var intervalTime = 1000 / vel; // vel in º/s, passed to period in mSeconds (ms).
  	var fragments = Math.trunc(Math.abs(angle) / self.params.rotate_interval);
  	console.log(fragments);
  	var remainingFragments = fragments;

    var step = setInterval(function(){
      if(angle > 0){
		      var finalRotation = self.getPos().rot + self.params.rotate_interval;
      } else {
		      var finalRotation = self.getPos().rot - self.params.rotate_interval;
      }

      var radius = self.params.car_dimensions.wheels;
      var newPos = self.getPositionFromWheels(finalRotation);
      var forceSend;
	    if(remainingFragments == 1){
		    forceSend = true;
        console.log("force_send true");
	     } else {
         forceSend = false;
       }

      self.setPos({
        x: newPos.x,
        y: newPos.y,
        rot: finalRotation
      }, forceSend);

  		remainingFragments--;
  		if(remainingFragments === 0){
  			clearInterval(step);
  		}
  	}, intervalTime);
  }
}
module.exports = Car;
