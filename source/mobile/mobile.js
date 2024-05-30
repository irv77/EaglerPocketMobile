function isMobile() {
  try {
    document.createEvent("TouchEvent");
    return true;
  } catch (e) {
    return false;
  }
}
if (!isMobile()) { alert("WARNING: This script doesn't play well with non-mobile browsers. Proceed at your own risk!") };

// Used for changing touchmove events to mousemove events
var previousTouchX = null;
var previousTouchY = null;
// Key and mouse events
function keyEvent(name, state) {
  const keyName = name.toUpperCase().charCodeAt(0)
  window.dispatchEvent(new KeyboardEvent(state, {
    key: name,
    keyCode: keyName,
    which: keyName
  }));
}
function shiftKeyEvent(state) {
  window.dispatchEvent(new KeyboardEvent(state, {
    keyCode: 16,
    which: 16
  }));
}
function mouseEvent(number, state, canvas) {
  canvas.dispatchEvent(new PointerEvent(state, { "button": number }))
}
function wheelEvent(canvas, delta) {
  canvas.dispatchEvent(new WheelEvent("wheel", {
    "wheelDeltaY": delta
  }));
}
function setButtonVisibility(pointerLocked) {
  let inGameStyle = document.getElementById('inGameStyle');
  let inMenuStyle = document.getElementById('inMenuStyle');
  inGameStyle.disabled = pointerLocked;
  inMenuStyle.disabled = !pointerLocked;
}

// POINTERLOCK
// When requestpointerlock is called, this dispatches an event, saves the requested element to window.fakelock, and unhides the touch controls
window.fakelock = null;

Element.prototype.requestPointerLock = function () {
  window.fakelock = this
  document.dispatchEvent(new Event('pointerlockchange'));
  console.log("requested pointerlock")
  setButtonVisibility(true);
  return true
}

// Makes pointerLockElement return window.fakelock
Object.defineProperty(document, "pointerLockElement", {
  get: function () {
    return window.fakelock;
  }
});

// When exitPointerLock is called, this dispatches an event, clears the
document.exitPointerLock = function () {
  window.fakelock = null
  document.dispatchEvent(new Event('pointerlockchange'));
  setButtonVisibility(false);
  return true
}

// FULLSCREEN
window.fakefull = null;
// Stops the client from crashing when fullscreen is requested
Element.prototype.requestFullscreen = function () {
  window.fakefull = this
  document.dispatchEvent(new Event('fullscreenchange'));
  return true
}
Object.defineProperty(document, "fullscreenElement", {
  get: function () {
    return window.fakefull;
  }
});
document.exitFullscreen = function () {
  window.fakefull = null
  document.dispatchEvent(new Event('fullscreenchange'));
  return true
}

// FILE UPLOADING
// Safari doesn't recognize the element.click() used to display the file uplaoder as an action performed by the user, so it ignores it.
// This hijacks the element.createElement() function to add the file upload to the DOM, so the user can manually press the button again.
var oldCreate = document.createElement;
document.createElement = function (type) {
  this.oldCreate = oldCreate;
  var element = this.oldCreate(type);
  if (type == "input") {
    var newElement = document.querySelector('input');
    if (!newElement) {
      this.body.appendChild(element);
      newElement = document.querySelector('input');
      newElement.addEventListener('change', function (e) {
        this.hidden = true;
      })
    }
    newElement.value = null;
    newElement.style.cssText = "position:absolute;left:0%;right:100%;top:0%;bottom:100%;width:100%;height:100%;background-color:rgba(255,255,255,0.5);";
    newElement.hidden = false;
    return newElement;
  }
  return this.oldCreate(type);
}

// CSS for touch screen buttons, along with fixing iOS's issues with 100vh ignoring the naviagtion bar, and actually disabling zoom because safari ignores user-scalable=no :(
let customStyle = document.createElement("style");
customStyle.textContent = `
    .mobileControl {
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
    .mobileControl:active {
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
    .crouchButton {
      background:url(mobile/uiCrouch.png) no-repeat center;
      background-size: contain, cover;
    }
    .crouchButton:active {
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
let inGameStyle = document.createElement("style");
inGameStyle.id = "inGameStyle";
inGameStyle.textContent = `
    .inGame {
        display: none;
    }`;
document.documentElement.appendChild(inGameStyle);

let inMenuStyle = document.createElement("style");
inMenuStyle.id = "inMenuStyle";
inMenuStyle.textContent = `
    .inMenu {
        display: none;
    }`;
document.documentElement.appendChild(inMenuStyle);

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
function createTouchButton(buttonClass, buttonDisplay, elementName) {
  var touchButton = document.createElement(elementName ?? 'button');
  touchButton.classList.add(buttonClass);
  touchButton.classList.add(buttonDisplay);
  touchButton.classList.add("mobileControl");
  touchButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  return touchButton;
}

waitForElm('canvas').then(() => { insertCanvasElements() });
function insertCanvasElements() {
  // Translates touchmove events to mousemove events when inGame, and touchmove events to wheele events when inMenu
  var canvas = document.querySelector('canvas');
  canvas.addEventListener("touchmove", (e) => {
    const touch = e.targetTouches[0]; // We can get away with this because every other touch event will be on different elements

    if (!previousTouchX) {
      previousTouchX = touch.pageX;
      previousTouchY = touch.pageY;
    }
    e.movementX = touch.pageX - previousTouchX;
    e.movementY = touch.pageY - previousTouchY;
    var evt = window.fakelock ? new MouseEvent("mousemove", { movementX: e.movementX, movementY: e.movementY }) : new WheelEvent("wheel", { "wheelDeltaY": e.movementY });
    canvas.dispatchEvent(evt);
    previousTouchX = touch.pageX;
    previousTouchY = touch.pageY;
    event.preventDefault();
  }, false);

  canvas.addEventListener("touchend", (e) => {
    previousTouchX = null;
    previousTouchY = null;
  }, false)
  //Updates button visibility on load
  setButtonVisibility(window.fakelock != null);
  // Adds all of the touch screen controls
  // Theres probably a better way to do this but this works for now

  function Strafing(displayStrafe) {
    if (displayStrafe === true) {
      forwardLeftButton.classList.add("show")
      forwardRightButton.classList.add("show")
    }
    else if (displayStrafe === false) {
      forwardLeftButton.classList.remove("show")
      forwardRightButton.classList.remove("show")
    }
  }

  let forwardLeftButton = createTouchButton("forwardLeftButton", "inGame");
  forwardLeftButton.classList.add("minicontrol")
  forwardLeftButton.style.cssText = "left:5.5vh;bottom:22vh;background:url(mobile/uiUpLeft.png) no-repeat center;background-size: contain, cover;"
  forwardLeftButton.addEventListener("touchstart", function (e) { keyEvent("w", "keydown"), keyEvent("a", "keydown"), strafe = true }, false);
  forwardLeftButton.addEventListener("touchend", function (e) { keyEvent("w", "keyup"), keyEvent("a", "keyup"), Strafing(false), strafe = false }, false);
  forwardLeftButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(forwardLeftButton);

  let forwardRightButton = createTouchButton("forwardRightButton", "inGame");
  forwardRightButton.classList.add("minicontrol")
  forwardRightButton.style.cssText = "left:24vh;bottom:22vh;background:url(mobile/uiUpRight.png) no-repeat center;background-size: contain, cover;"
  forwardRightButton.addEventListener("touchstart", function (e) { keyEvent("w", "keydown"), keyEvent("d", "keydown"), strafe = true }, false);
  forwardRightButton.addEventListener("touchend", function (e) { keyEvent("w", "keyup"), keyEvent("d", "keyup"), Strafing(false), strafe = false }, false);
  forwardRightButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(forwardRightButton);

  let forwardButton = createTouchButton("forwardButton", "inGame");
  forwardButton.style.cssText = "left:14vh;bottom:22vh;background:url(mobile/uiUp.png) no-repeat center;background-size: contain, cover;"
  forwardButton.addEventListener("touchstart", function (e) { keyEvent("w", "keydown"), Strafing(true), strafe = false }, false);
  forwardButton.addEventListener("touchend", function (e) { if (strafe === false) { Strafing(false) } keyEvent("w", "keyup") }, false);
  forwardButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(forwardButton);

  let rightButton = createTouchButton("rightButton", "inGame");
  rightButton.style.cssText = "left:24vh;bottom:12vh;background:url(mobile/uiRight.png) no-repeat center;background-size: contain, cover;"
  rightButton.addEventListener("touchstart", function (e) { keyEvent("d", "keydown") }, false);
  rightButton.addEventListener("touchend", function (e) { keyEvent("d", "keyup") }, false);
  rightButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(rightButton);

  let leftButton = createTouchButton("leftButton", "inGame");
  leftButton.style.cssText = "left: 4vh; bottom:12vh;background:url(mobile/uiLeft.png) no-repeat center;background-size: contain, cover;"
  leftButton.addEventListener("touchstart", function (e) { keyEvent("a", "keydown") }, false);
  leftButton.addEventListener("touchend", function (e) { keyEvent("a", "keyup") }, false);
  leftButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(leftButton);

  let backButton = createTouchButton("backButton", "inGame");
  backButton.style.cssText = "left:14vh;bottom:2vh;background:url(mobile/uiDown.png) no-repeat center;background-size: contain, cover;"
  backButton.addEventListener("touchstart", function (e) { keyEvent("s", "keydown") }, false);
  backButton.addEventListener("touchend", function (e) { keyEvent("s", "keyup") }, false);
  backButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(backButton);

  let jumpButton = createTouchButton("jumpButton", "inGame");
  jumpButton.style.cssText = "right:20vh;bottom:20vh;background:url(mobile/uiJump.png) no-repeat center;background-size: contain, cover;"
  jumpButton.addEventListener("touchstart", function (e) { keyEvent(" ", "keydown") }, false);
  jumpButton.addEventListener("touchend", function (e) { keyEvent(" ", "keyup") }, false);
  jumpButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(jumpButton);

  let crouchButton = createTouchButton("crouchButton", "inGame");
  crouchButton.style.cssText = "left:14vh;bottom:12vh;"
  crouchButton.addEventListener("touchstart", function (e) { shiftKeyEvent("keydown"), cshift = false }, false);
  crouchButton.addEventListener("touchend", function (e) { if (cshift === false) { shiftKeyEvent("keyup") } }, false);
  crouchButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  crouchButton.addEventListener("pointerdown", function (e) { ctimer = setTimeout(function (e) { shiftKeyEvent("keydown"), cshift = true }, 1000) }, false);
  crouchButton.addEventListener("pointerup", function (e) { clearTimeout(ctimer) }, false);
  document.body.appendChild(crouchButton);

  let inventoryButton = createTouchButton("inventoryButton", "inGame");
  inventoryButton.classList.add("mini")
  inventoryButton.style.cssText = "right:11.75vw;bottom:0vh;background:url(mobile/uiInventory.png) no-repeat center;background-size: contain, cover;"
  inventoryButton.addEventListener("touchstart", function (e) {
    window.inInventory = (window.fakelock != null)
    keyEvent("e", "keydown");
  }, false);
  inventoryButton.addEventListener("touchend", function (e) { keyEvent("e", "keyup") }, false);
  inventoryButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(inventoryButton);

  let chatButton = createTouchButton("chatButton", "inGame");
  chatButton.classList.add("mini")
  chatButton.style.cssText = "left:44vw;top:0vh;background:url(mobile/uiChat.png) no-repeat center;background-size: contain, cover;"
  chatButton.addEventListener("touchstart", function (e) { keyEvent("t", "keydown") }, false);
  chatButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(chatButton);

  let angleButton = createTouchButton("angleButton", "inGame");
  angleButton.classList.add("mini")
  angleButton.style.cssText = "left:53vw;top:0vh;background:url(mobile/uiAngle.png) no-repeat center;background-size: contain, cover;"
  angleButton.addEventListener("touchstart", function (e) { keyEvent("f", "keydown"), keyEvent("5", "keydown") }, false);
  angleButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(angleButton);

  let exitButton = createTouchButton("exitButton", "inAll");
  exitButton.classList.add("mini")
  exitButton.style.cssText = "left:47vw;top:0vh;background:url(mobile/uiPause.png) no-repeat center;background-size: contain, cover;"
  exitButton.addEventListener("touchstart", function (e) { keyEvent("À", "keydown") }, false);
  exitButton.addEventListener("touchend", function (e) { keyEvent("À", "keyup") }, false);
  exitButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(exitButton);

  let hiddenInput = document.createElement('input');
  hiddenInput.id = "hiddenInput"
  hiddenInput.style.cssText = "opacity:0;z-index:-99999";
  document.body.appendChild(hiddenInput);
  let keyboardButton = createTouchButton("keyboardButton", "inAll");
  keyboardButton.id = "keyboardButton"
  keyboardButton.classList.add("mini")
  keyboardButton.style.cssText = "left:50vw;top:0vh;background:url(mobile/uiKeyboard.png) no-repeat center;background-size: contain, cover;"
  keyboardButton.addEventListener("touchstart", function (e) { e.preventDefault(); hiddenInput.blur() }, false);
  keyboardButton.addEventListener("touchend", function (e) { hiddenInput.select() }, false);
  document.body.appendChild(keyboardButton);

  let sprintButton = createTouchButton("sprintButton", "inGame");
  sprintButton.style.cssText = "right:19vh;bottom:53vh;background:url(mobile/uiSprint.png) no-repeat center;background-size: contain, cover;"
  sprintButton.addEventListener("touchstart", function (e) { keyEvent("r", "keydown") }, false);
  sprintButton.addEventListener("touchend", function (e) { keyEvent("r", "keyup") }, false);
  sprintButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(sprintButton);

  let placeButton = createTouchButton("placeButton", "inGame");
  placeButton.style.cssText = "right:6vh;bottom:37vh;background:url(mobile/uiInteract.png) no-repeat center;background-size: contain, cover;"
  placeButton.addEventListener("touchstart", function (e) { mouseEvent(2, "mousedown", canvas) }, false);
  placeButton.addEventListener("touchend", function (e) { mouseEvent(2, "mouseup", canvas) }, false);
  placeButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(placeButton);

  let breakButton = createTouchButton("breakButton", "inGame");
  breakButton.style.cssText = "right:19vh;bottom:41vh;background:url(mobile/uiAttack.png) no-repeat center;background-size: contain, cover;"
  breakButton.addEventListener("touchstart", function (e) { mouseEvent(0, "mousedown", canvas) }, false);
  breakButton.addEventListener("touchend", function (e) { mouseEvent(0, "mouseup", canvas) }, false);
  breakButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(breakButton);

  let selectButton = createTouchButton("selectButton", "inGame");
  selectButton.style.cssText = "right:6vh;bottom:49vh;background:url(mobile/uiSelector.png) no-repeat center;background-size: contain, cover;"
  selectButton.addEventListener("touchstart", function (e) { mouseEvent(1, "mousedown", canvas) }, false);
  selectButton.addEventListener("touchend", function (e) { mouseEvent(1, "mouseup", canvas) }, false);
  selectButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(selectButton);

  let scrollUpButton = createTouchButton("scrollUpButton", "inGame");
  scrollUpButton.classList.add("mini")
  scrollUpButton.style.cssText = "right:5.25vw;bottom:0vh;background:url(mobile/uiSRight.png) no-repeat center;background-size: contain, cover;"
  scrollUpButton.addEventListener("touchstart", function (e) {
    canvas.dispatchEvent(new WheelEvent("wheel", { "wheelDeltaY": -10 }))
  }, false);
  scrollUpButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(scrollUpButton);

  let scrollDownButton = createTouchButton("scrollDownButton", "inGame");
  scrollDownButton.classList.add("mini")
  scrollDownButton.style.cssText = "right:15vw;bottom:0vh;background:url(mobile/uiSLeft.png) no-repeat center;background-size: contain, cover;"
  scrollDownButton.addEventListener("touchstart", function (e) {
    canvas.dispatchEvent(new WheelEvent("wheel", { "wheelDeltaY": 10 }))
  }, false);
  scrollDownButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(scrollDownButton);

  let throwButton = createTouchButton("throwButton", "inGame");
  throwButton.classList.add("mini")
  throwButton.style.cssText = "right:8.5vw;bottom:0vh;background:url(mobile/uiDrop.png) no-repeat center;background-size: contain, cover;"
  throwButton.addEventListener("touchstart", function (e) {
    window.inInventory = (window.fakelock != null)
    keyEvent("q", "keydown");
  }, false);
  throwButton.addEventListener("touchend", function (e) { keyEvent("q", "keyup") }, false);
  throwButton.addEventListener("touchmove", function (e) { e.preventDefault() }, false);
  document.body.appendChild(throwButton);
}