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
    console.log("hide ui")
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
    .minicontrol {
      width: 7.5vh;
      height: 7.5vh;
      display: none;
    }
    .show {
      display: block;
    }
    .mini {
      width: 6vh;
      height: 6vh;
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
    }
    .minicontrol {
      display: none;
    }`;
document.documentElement.appendChild(hideButtonStyle);

let hideInventoryStyle = document.createElement("style");
hideInventoryStyle.id = "hideInventoryStyle";
hideInventoryStyle.textContent = `
    #hideInventory {
        display: none;
    }
    .inventory {
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
            movementX: e.movementX * 2,
            movementY: e.movementY * 2
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

    function showStrafe() {
      forwardLeftButton.classList.add("show")
      forwardRightButton.classList.add("show")
    }

    function hideStrafe() {
      forwardLeftButton.classList.remove("show")
      forwardRightButton.classList.remove("show")
    }

  var forwardLeftButton = document.createElement('button');
  forwardLeftButton.classList = "minicontrol"
  forwardLeftButton.style.cssText = "left:5.5vh;bottom:22vh;background:url(mobile/uiUpLeft.png) no-repeat center;background-size: contain, cover;"
  forwardLeftButton.addEventListener("touchstart", function(e){keyEvent("w", "keydown"),keyEvent("a", "keydown"), strafe=true}, false);
  forwardLeftButton.addEventListener("touchend", function(e){keyEvent("w", "keyup"),keyEvent("a", "keyup"), hideStrafe(), strafe=false}, false);
  forwardLeftButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
  document.body.appendChild(forwardLeftButton);

  var forwardRightButton = document.createElement('button');
  forwardRightButton.classList = "minicontrol hidden"
  forwardRightButton.style.cssText = "left:24vh;bottom:22vh;background:url(mobile/uiUpRight.png) no-repeat center;background-size: contain, cover;"
  forwardRightButton.addEventListener("touchstart", function(e){keyEvent("w", "keydown"),keyEvent("d", "keydown"), strafe=true}, false);
  forwardRightButton.addEventListener("touchend", function(e){keyEvent("w", "keyup"),keyEvent("d", "keyup"), hideStrafe(), strafe=false}, false);
  forwardRightButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
  document.body.appendChild(forwardRightButton);

  var forwardButton = document.createElement('button');
	forwardButton.id = "hideButton"
	forwardButton.style.cssText = "left:14vh;bottom:22vh;background:url(mobile/uiUp.png) no-repeat center;background-size: contain, cover;"
	forwardButton.addEventListener("touchstart", function(e){keyEvent("w", "keydown"), showStrafe(), strafe=false}, false);
	forwardButton.addEventListener("touchend", function(e){if (strafe===false) {hideStrafe()} keyEvent("w", "keyup")}, false);
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
	crouchButton.addEventListener("touchstart", function(e){shiftKey("keydown"), cshift=false}, false);
	crouchButton.addEventListener("touchend", function(e){if (cshift===false) {shiftKey("keyup")}}, false);
	crouchButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
  crouchButton.addEventListener("pointerdown", function(e){ctimer = setTimeout(function(e){shiftKey("keydown"), cshift=true}, 1000)}, false);
  crouchButton.addEventListener("pointerup", function(e){clearTimeout(ctimer)}, false);
	document.body.appendChild(crouchButton);

	var inventoryButton = document.createElement('button');
	inventoryButton.id = "hideInventory"
  inventoryButton.classList = "mini"
	inventoryButton.style.cssText = "right:11.75vw;bottom:0vh;background:url(mobile/uiInventory.png) no-repeat center;background-size: contain, cover;"
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
	chatButton.style.cssText = "left:44.5vw;top:0vh;background:url(mobile/uiChat.png) no-repeat center;background-size: contain, cover;"
	chatButton.addEventListener("touchstart", function(e){keyEvent("t", "keydown")}, false);
	chatButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(chatButton);

  var angleButton = document.createElement('button');
	angleButton.id = "hideButton"
  angleButton.classList = "mini"
	angleButton.style.cssText = "left:50.5vw;top:0vh;background:url(mobile/uiAngle.png) no-repeat center;background-size: contain, cover;"
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

  var sprintButton = document.createElement('button');
	sprintButton.id = "hideButton"
	sprintButton.style.cssText = "right:6vh;bottom:54vh;background:url(mobile/uiSprint.png) no-repeat center;background-size: contain, cover;"
	sprintButton.addEventListener("touchstart", function(e){keyEvent("r", "keydown")}, false);
  sprintButton.addEventListener("touchend", function(e){keyEvent("r", "keyup")}, false);
	sprintButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(sprintButton);

	var placeButton = document.createElement('button');
	placeButton.id = "hideButton"
	placeButton.style.cssText = "right:6vh;bottom:38vh;background:url(mobile/uiInteract.png) no-repeat center;background-size: contain, cover;"
	placeButton.addEventListener("touchstart", function(e){mouseEvent(2, "mousedown", canvas)}, false);
	placeButton.addEventListener("touchend", function(e){mouseEvent(2, "mouseup", canvas)}, false);
	placeButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(placeButton);

	var breakButton = document.createElement('button');
	breakButton.id = "hideButton"
	breakButton.style.cssText = "right:20vh;bottom:43vh;background:url(mobile/uiAttack.png) no-repeat center;background-size: contain, cover;"
	breakButton.addEventListener("touchstart", function(e){mouseEvent(0, "mousedown", canvas)}, false);
	breakButton.addEventListener("touchend", function(e){mouseEvent(0, "mouseup", canvas)}, false);
	breakButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(breakButton);

	var scrollUpButton = document.createElement('button');
	scrollUpButton.id = "hideButton"
  scrollUpButton.classList = "mini"
	scrollUpButton.style.cssText = "right:5.25vw;bottom:0vh;background:url(mobile/uiSRight.png) no-repeat center;background-size: contain, cover;"
	scrollUpButton.addEventListener("touchstart", function(e){
		canvas.dispatchEvent(new WheelEvent("wheel", {"wheelDeltaY": -10}))
	}, false);
	scrollUpButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(scrollUpButton);

	var scrollDownButton = document.createElement('button');
	scrollDownButton.id = "hideButton"
  scrollDownButton.classList = "mini"
	scrollDownButton.style.cssText = "right:15vw;bottom:0vh;background:url(mobile/uiSLeft.png) no-repeat center;background-size: contain, cover;"
	scrollDownButton.addEventListener("touchstart", function(e){
		canvas.dispatchEvent(new WheelEvent("wheel", {"wheelDeltaY": 10}))
	}, false);
	scrollDownButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(scrollDownButton);

	var throwButton = document.createElement('button');
	throwButton.id = "hideButton"
  throwButton.classList = "mini"
	throwButton.style.cssText = "right:8.5vw;bottom:0vh;background:url(mobile/uiDrop.png) no-repeat center;background-size: contain, cover;"
	throwButton.addEventListener("touchstart", function(e){
		window.inInventory = (window.fakelock != null)
		keyEvent("q", "keydown");
	}, false);
	throwButton.addEventListener("touchend", function(e){keyEvent("q", "keyup")}, false);
	throwButton.addEventListener("touchmove", function(e){e.preventDefault()}, false);
	document.body.appendChild(throwButton);
}