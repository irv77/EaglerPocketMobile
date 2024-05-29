// ==UserScript==
// @name			Eagler Mobile
// @description		Allows eaglercraft to run on mobile, adds touch controls, and fixes a few mobile-related crashes
// @author			FlamedDogo99
// @namespace		http://github.com/FlamedDogo99
// @downloadURL		https://raw.githubusercontent.com/FlamedDogo99/EaglerMobile/main/eaglermobile.js
// @license			Apache License 2.0 - http://www.apache.org/licenses/
// @match			https://eaglercraft.com/mc/*
// @grant			none
// @version			1.1
// @updateURL		https://raw.githubusercontent.com/FlamedDogo99/EaglerMobile/main/eaglermobile.js
// @run-at			document-start
// ==/UserScript==


// Hides inventory button
window.inInventory = false;
// Used for changing touchmove events to mousemove events
var previousX = null;
var previousY = null;
// Key and mouse events
function keyEvent(name, state) {
    const keyName = name.toUpperCase().charCodeAt(0)
    window.dispatchEvent(new KeyboardEvent(state, {
      key: name,
        keyCode: keyName,
      which: keyName
    }));
}
function shiftKey(state) {
    window.dispatchEvent(new KeyboardEvent(state, {
        keyCode: 16,
      which: 16
    }));
}
function mouseEvent(number, state, canvas) {
  canvas.dispatchEvent(new PointerEvent(state, {"button": number}))
}
// POINTERLOCK
// When requestpointerlock is called, this dispatches an event, saves the requested element to window.fakelock, and unhides the touch controls
window.fakelock = null;

Element.prototype.requestPointerLock = function() {
  window.fakelock = this
  document.dispatchEvent(new Event('pointerlockchange'));
  console.log("requested pointerlock")
  var hideButtonStyleDOM = document.getElementById('hideButtonStyle');
  var hideInventoryStyleDOM = document.getElementById('hideInventoryStyle');
  hideButtonStyleDOM.disabled = true;
  hideInventoryStyleDOM.disabled = true;
  return true
}


// Makes pointerLockElement return window.fakelock
Object.defineProperty(document, "pointerLockElement", {
  get: function() {
    return window.fakelock;
  }
});
// When exitPointerLock is called, this dispatches an event, clears the
document.exitPointerLock = function() {
    window.fakelock = null
    document.dispatchEvent(new Event('pointerlockchange'));
    var hideButtonStyleDOM = document.getElementById('hideButtonStyle');
	var hideInventoryStyleDOM = document.getElementById('hideInventoryStyle');
	hideButtonStyleDOM.disabled = false;
	hideInventoryStyleDOM.disabled = window.inInventory;
    return true
}

// FULLSCREEN
window.fakefull = null;
// Stops the client from crashing when fullscreen is requested
Element.prototype.requestFullscreen = function() {
  window.fakefull = this
  document.dispatchEvent(new Event('fullscreenchange'));
  return true
}
Object.defineProperty(document, "fullscreenElement", {
  get: function() {
    return window.fakefull;
  }
});
document.exitFullscreen = function() {
    window.fakefull = null
    document.dispatchEvent(new Event('fullscreenchange'));
    return true
}

// FILE UPLOADING
// Safari doesn't recognize the element.click() used to display the file uplaoder as an action performed by the user, so it ignores it.
// This hijacks the element.createElement() function to add the file upload to the DOM, so the user can manually press the button again.
var oldCreate = document.createElement;
document.createElement = function(type) {
  this.oldCreate = oldCreate;
  var element = this.oldCreate(type);
  if(type == "input") {
    var newElement = document.querySelector('input');
    if(!newElement) {
      this.body.appendChild(element);
      newElement = document.querySelector('input');
      newElement.addEventListener('change', function(e) {
           this.hidden = true;
      })
    }
    newElement.value = null;
    newElement.style.cssText ="position:absolute;left:0%;right:100%;top:0%;bottom:100%;width:100%;height:100%;background-color:rgba(255,255,255,0.5);";
    newElement.hidden = false;
    return newElement;
  }
  return this.oldCreate(type);
}
// CSS for touch screen buttons, along with fixing iOS's issues with 100vh ignoring the naviagtion bar, and actually disabling zoom because safari ignores user-scalable=no :(
let customStyle = document.createElement("style");
customStyle.textContent = `
    button {
        position: absolute; 
        width: 9vh;
        height: 9vh;
        font-size:4vh;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
        line-height: 0px;
        padding:0px;
        color: ##252525;
        text-shadow: 0.35vh 0.35vh #000000;
        box-sizing: content-box;
        image-rendering: pixelated;
        background: url(mobile/uiButtonCap.png) no-repeat right center, url(mobile/uiButton.png) no-repeat left center;
        background-size: contain, cover;
        outline:none;
		    box-shadow: none;
		    border: none;
        margin: 1vh;
        opacity: .5;
        font-weight: 900;
    }
    button:active {
      opacity: .75;
    }
    .mini {
      width: 3.5vw;
      height: 3.5vw;
      margin: 1vh 0vh;
    }
    .crouch {
      background:url(mobile/uiCrouch.png) no-repeat center;
      background-size: contain, cover;
    }
    .crouch:active {
      background:url(mobile/uiCrouchSel.png) no-repeat center;
      background-size: contain, cover;
    }
    html, body {
      height: -webkit-fill-available !important;
      touch-action: pan-x pan-y;
    }
    `;
document.documentElement.appendChild(customStyle);

// Lazy way to hide touch controls through CSS.
let hideButtonStyle = document.createElement("style");
hideButtonStyle.id = "hideButtonStyle";
hideButtonStyle.textContent = `
    #hideButton {
        display: none;
    }`;
document.documentElement.appendChild(hideButtonStyle);
let hideInventoryStyle = document.createElement("style");
hideInventoryStyle.id = "hideInventoryStyle";
hideInventoryStyle.textContent = `
    #hideInventory {
        display: none;
    }`;
document.documentElement.appendChild(hideInventoryStyle);  

// The canvas is created by the client after it finishes unzipping and loading. When the canvas is created, this applies any necessary event listeners
function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

waitForElm('canvas').then(() => {insertCanvasElements()});
function insertCanvasElements() {    
    // Translates touchmove events to mousemove events
    var canvas = document.querySelector('canvas');
    canvas.addEventListener("touchmove", (e) => {
        const touch = e.targetTouches[0]; // We can get away with this because every other touch event will be on different elements

        if (!previousX) {
            previousX = touch.pageX;
            previousY = touch.pageY;
        }
        e.movementX = touch.pageX - previousX;
        e.movementY = touch.pageY - previousY;
        var evt = new MouseEvent("mousemove", {
            movementX: e.movementX,
            movementY: e.movementY
        });
        canvas.dispatchEvent(evt);
        previousX = touch.pageX;
        previousY = touch.pageY;
        event.preventDefault();
    }, false);

    canvas.addEventListener("touchend", (e) => {
        previousX = null;
        previousY = null; 
    }, false)
    // Adds all of the touch screen controls
    // Theres probably a better way to do this but this works for now
    var forwardButton = document.createElement('button');
	forwardButton.id = "hideButton"
	forwardButton.style.cssText = "left:14vh;bottom:22vh;background:url(mobile/uiUp.png) no-repeat center;background-size: contain, cover;"
	forwardButton.addEventListener("touchstart", function(e){keyEvent("w", "keydown")}, false);
	forwardButton.addEventListener("touchend", function(e){keyEvent("w", "keyup")}, false);
	forwardButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(forwardButton);

	var rightButton = document.createElement('button');
	rightButton.id = "hideButton"
	rightButton.style.cssText = "left:24vh;bottom:12vh;background:url(mobile/uiRight.png) no-repeat center;background-size: contain, cover;"
	rightButton.addEventListener("touchstart", function(e){keyEvent("d", "keydown")}, false);
	rightButton.addEventListener("touchend", function(e){keyEvent("d", "keyup")}, false);
	rightButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(rightButton);

	var leftButton = document.createElement('button');
	leftButton.id = "hideButton"
	leftButton.style.cssText = "left: 4vh; bottom:12vh;background:url(mobile/uiLeft.png) no-repeat center;background-size: contain, cover;"
	leftButton.addEventListener("touchstart", function(e){keyEvent("a", "keydown")}, false);
	leftButton.addEventListener("touchend", function(e){keyEvent("a", "keyup")}, false);
	leftButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(leftButton);

	var backButton = document.createElement('button');
	backButton.id = "hideButton"
	backButton.style.cssText = "left:14vh;bottom:2vh;background:url(mobile/uiDown.png) no-repeat center;background-size: contain, cover;"
	backButton.addEventListener("touchstart", function(e){keyEvent("s", "keydown")}, false);
	backButton.addEventListener("touchend", function(e){keyEvent("s", "keyup")}, false);
	backButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(backButton);

	var jumpButton = document.createElement('button');
	jumpButton.id = "hideButton"
	jumpButton.style.cssText = "right:20vh;bottom:20vh;background:url(mobile/uiJump.png) no-repeat center;background-size: contain, cover;"
	jumpButton.addEventListener("touchstart", function(e){keyEvent(" ", "keydown")}, false);
	jumpButton.addEventListener("touchend", function(e){keyEvent(" ", "keyup")}, false);
	jumpButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(jumpButton);

	var crouchButton = document.createElement('button');
	crouchButton.id = "hideButton"
  crouchButton.classList = "crouch"
	crouchButton.style.cssText = "left:14vh;bottom:12vh;"
	crouchButton.addEventListener("touchstart", function(e){shiftKey("keydown")}, false);
	crouchButton.addEventListener("touchend", function(e){shiftKey("keyup")}, false);
	crouchButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(crouchButton);

	var inventoryButton = document.createElement('button');
	inventoryButton.id = "hideInventory"
  inventoryButton.classList = "mini"
	inventoryButton.style.cssText = "right:11vw;bottom:0vh;background:url(mobile/uiInventory.png) no-repeat center;background-size: contain, cover;"
	inventoryButton.addEventListener("touchstart", function(e){
		window.inInventory = (window.fakelock != null)
		keyEvent("e", "keydown");
	}, false);
	inventoryButton.addEventListener("touchend", function(e){keyEvent("e", "keyup")}, false);
	inventoryButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(inventoryButton);

	var chatButton = document.createElement('button');
	chatButton.id = "hideButton"
  chatButton.classList = "mini"
	chatButton.style.cssText = "left:43.5vw;top:0vh;background:url(mobile/uiChat.png) no-repeat center;background-size: contain, cover;"
	chatButton.addEventListener("touchstart", function(e){keyEvent("t", "keydown")}, false);
	chatButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(chatButton);

  var angleButton = document.createElement('button');
	angleButton.id = "hideButton"
  angleButton.classList = "mini"
	angleButton.style.cssText = "left:51.5vw;top:0vh;background:url(mobile/uiAngle.png) no-repeat center;background-size: contain, cover;"
	angleButton.addEventListener("touchstart", function(e){keyEvent("f", "keydown"), keyEvent("5", "keydown")}, false);
	angleButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(angleButton);

	var exitButton = document.createElement('button');
	exitButton.id = "hideButton"
  exitButton.classList = "mini"
	exitButton.style.cssText = "left:47.5vw;top:0vh;background:url(mobile/uiPause.png) no-repeat center;background-size: contain, cover;"
	exitButton.addEventListener("touchstart", function(e){keyEvent("À", "keydown")}, false);
	exitButton.addEventListener("touchend", function(e){keyEvent("À", "keyup")}, false);
	exitButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(exitButton);

	var placeButton = document.createElement('button');
	placeButton.id = "hideButton"
	placeButton.textContent = "⊹";
	placeButton.style.cssText = "right:5vh;bottom:35vh;"
	placeButton.addEventListener("touchstart", function(e){mouseEvent(2, "mousedown", canvas)}, false);
	placeButton.addEventListener("touchend", function(e){mouseEvent(2, "mouseup", canvas)}, false);
	placeButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(placeButton);

	var breakButton = document.createElement('button');
	breakButton.id = "hideButton"
	breakButton.textContent = "🗡";
	breakButton.style.cssText = "right:25vh;bottom:45vh;"
	breakButton.addEventListener("touchstart", function(e){mouseEvent(0, "mousedown", canvas)}, false);
	breakButton.addEventListener("touchend", function(e){mouseEvent(0, "mouseup", canvas)}, false);
	breakButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(breakButton);

	var scrollUpButton = document.createElement('button');
	scrollUpButton.id = "hideButton"
  scrollUpButton.classList = "mini"
	scrollUpButton.textContent = "⇨";
	scrollUpButton.style.cssText = "right:3vw;bottom:0vh;"
	scrollUpButton.addEventListener("touchstart", function(e){
		canvas.dispatchEvent(new WheelEvent("wheel", {"wheelDeltaY": -10}))
	}, false);
	scrollUpButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(scrollUpButton);

	var scrollDownButton = document.createElement('button');
	scrollDownButton.id = "hideButton"
  scrollDownButton.classList = "mini"
	scrollDownButton.textContent = "⇦";
	scrollDownButton.style.cssText = "right:15vw;bottom:0vh;"
	scrollDownButton.addEventListener("touchstart", function(e){
		canvas.dispatchEvent(new WheelEvent("wheel", {"wheelDeltaY": 10}))
	}, false);
	scrollDownButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(scrollDownButton);

	var throwButton = document.createElement('button');
	throwButton.id = "hideButton"
  throwButton.classList = "mini"
	throwButton.textContent = "Q";
	throwButton.style.cssText = "right:7vw;bottom:0vh;"
	throwButton.addEventListener("touchstart", function(e){
		window.inInventory = (window.fakelock != null)
		keyEvent("q", "keydown");
	}, false);
	throwButton.addEventListener("touchend", function(e){keyEvent("q", "keyup")}, false);
	throwButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(throwButton);
}