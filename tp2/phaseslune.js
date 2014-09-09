var earthCanvas = document.getElementById("earthcanvas");
var earthContext = earthCanvas.getContext("2d");
var moonCanvas = document.getElementById("mooncanvas");
var moonContext = moonCanvas.getContext("2d");
var mainCanvas = document.getElementById("maincanvas");
var mainContext = mainCanvas.getContext("2d");
var moonPhaseCanvas = document.getElementById("moonphasecanvas");
var moonPhaseContext = moonPhaseCanvas.getContext("2d");
var debug = document.getElementById("debug");
var moonImg = document.getElementById("moonphase");
var obsHour = document.getElementById("hour");
var obsMinute = document.getElementById("minute");
var moonPhaseName = document.getElementById("phasenamep");
var moonPosition = document.getElementById("moonposp");

var leftPadding = 100;
var centerx = leftPadding + mainCanvas.height / 2;
var centery = mainCanvas.height / 2;

var earthPeriod = 24 * 3600;       // One complete rotation in 24h
var earthTheta = 0;                // Initial angular position for Earth
var earthOmega = 2 * Math.PI / earthPeriod  // Angular speed for Earth
var earthRadius = 35;

var moonRadius = 10;
var moonOrbitRadius = 200;
var moonPeriod = 29.5 * 24 * 3600; // One complete rotation in 29.5 days
var moonOrbitalTheta = Math.PI;    // Initial position: new Moon
var moonOmega = 2 * Math.PI / moonPeriod  // Angular speed for Moon
var moonx, moony;

var timer;

// Listeners for interaction with mouse
moonCanvas.addEventListener('mousedown', mouseDown, false);
moonCanvas.addEventListener('mousemove', mouseMove, false);
document.addEventListener('mouseup', mouseUp, false);   // button release could occur outside canvas
moonCanvas.addEventListener('touchstart', mouseDown, false);
moonCanvas.addEventListener('touchmove', mouseMove, false);
document.addEventListener('touchend', mouseUp, false);
var mouseIsDown = false;
var selectedObject;

// Load and draw images
var earth = new Image();
earth.src = "assets/earth_north.jpg";
var moon = new Image();
moon.src = "assets/moon_north.jpg";
var moonphase = new Image();
moonphase.src = "assets/Full_Moon_Luc_Viatour.jpg";
window.addEventListener("load", initFigure); 

// Used for manually rotating Earth
var savedEarthTheta;

function getPosition(canvas, evt)
{
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX-rect.left)/(rect.right-rect.left)*canvas.width,
        y: (evt.clientY-rect.top)/(rect.bottom-rect.top)*canvas.height
    };
}

function mouseDown(e) {
    e.preventDefault();
    mouseIsDown = true;
    var pos = getPosition(moonCanvas, e);
    var x = pos.x;
    var y = pos.y;
    //debug.innerHTML = "mouse down on " + x + ", " + y + "<br />";
    if ((x - moonx) * (x - moonx) + (y - moony) * (y - moony) <
            2 * moonRadius * moonRadius) {
            selectedObject = "moon";
            //debug.innerHTML = "mouse down on Moon" + "<br />";
    }
    else if ((x - centerx) * (x - centerx) +
             (y- centery) * (y - centery) < 3*earthRadius * earthRadius) {
            selectedObject = "earth";
            savedEarthTheta = earthTheta + Math.atan2(y - centery,
                                                      x - centerx);
            //debug.innerHTML = "mouse down on Earth" + "<br />";
    }
    else {
        selectedObject = "";
        mouseIsDown = false;
        //debug.innerHTML += "mouse down on nothing" + "<br />";
    }
}

function mouseMove(e) {
    e.preventDefault();
    var pos = getPosition(moonCanvas, e);
    var x = pos.x;
    var y = pos.y;
    if (mouseIsDown) {
        if (selectedObject == "earth") {
            // Rotate Earth
            earthTheta = savedEarthTheta - Math.atan2(y - centery,
                                    x - centerx);
            drawEarth();
        }
        else if (selectedObject == "moon") {
            moonx = x - centerx;
            moony = y - centery;
            var r = Math.sqrt(moonx * moonx + moony * moony);
            moonx *= moonOrbitRadius / r;
            moony *= moonOrbitRadius / r;
            moonOrbitalTheta = Math.atan2(-moony, moonx);
            //debug.innerHTML = "move Moon to " + moonx + ", " + moony + "<br />";
            drawMoon();
        }
    }
}

function mouseUp(e) {
    mouseIsDown = false;
}

function initFigure() {
    // Draw Moon's orbit
    mainContext.beginPath();
    mainContext.strokeStyle = "#ddd";
    mainContext.lineWidth = 1;
    mainContext.arc(centerx, centery, moonOrbitRadius, 0, 2 * Math.PI);
    mainContext.stroke();

    // Draw Sun light rays
    for (var y = 50; y < 500; y += 100) {
        mainContext.beginPath();
        mainContext.strokeStyle = "#ffdb58";
        mainContext.lineCap = "round";
        mainContext.lineWidth = 5;
        mainContext.moveTo(20, y);
        mainContext.lineTo(80, y);
        mainContext.moveTo(75, y + 5);
        mainContext.lineTo(80, y);
        mainContext.moveTo(75, y - 5);
        mainContext.lineTo(80, y);
        mainContext.stroke();
    }

    // Draw Moon
    moon.onload = drawMoon();

    // Draw Earth
    earth.onload = drawEarth();

    drawMoonPhase();
}

function drawEarth() {
    earthContext.clearRect(0, 0, earthCanvas.width, earthCanvas.height);
    earthContext.save();
    earthContext.translate(centerx, centery);
    // Minus sign to rotate in the right direction, ie, counterclockwise.
    earthContext.rotate(-earthTheta);
    earthContext.translate(-centerx, -centery);
    earthContext.beginPath();
    earthContext.moveTo(centerx - earthRadius - 10, centery);
    earthContext.lineTo(centerx - earthRadius - 20, centery);
    earthContext.arc(centerx - earthRadius - 25, centery, 5, 0, 2 * Math.PI);
    earthContext.moveTo(centerx - earthRadius - 10, centery);
    earthContext.lineTo(centerx - earthRadius, centery + 5);
    earthContext.moveTo(centerx - earthRadius - 10, centery);
    earthContext.lineTo(centerx - earthRadius, centery - 5);
    earthContext.moveTo(centerx - earthRadius - 15, centery);
    earthContext.lineTo(centerx - earthRadius - 18, centery - 8);
    earthContext.moveTo(centerx - earthRadius - 15, centery);
    earthContext.lineTo(centerx - earthRadius - 18, centery + 8);
    earthContext.strokeStyle = "white";
    earthContext.stroke();
    earthContext.drawImage(earth, centerx - earthRadius, centery - earthRadius,
                           2 * earthRadius, 2 * earthRadius);
    earthContext.restore();

    // Draw shadow on Earth
    earthContext.beginPath();
    earthContext.fillStyle = "rgba(0, 0, 0, 0.5)";
    earthContext.lineWidth = 2;
    earthContext.arc(centerx, centery, earthRadius, 1.5 * Math.PI, 0.5 * Math.PI);
    earthContext.moveTo(centerx, centery - earthRadius);
    earthContext.lineTo(centerx, centery + earthRadius);
    earthContext.fill();

    // Uptime time of day
    angleToHour(earthTheta);

    updateObsMoonPos();
}

function angleToHour(theta) {
    // From a angle, determine time of day in hh:mm format.
    var nbHours = ((12 + (theta % (2 * Math.PI)) * 24 / (2 * Math.PI))) % 24;
    while (nbHours < 0) {
        nbHours += 24;
    }
    var hour = Math.floor(nbHours).toFixed(0);
    var minutes = pad(1, 2, (nbHours - hour).toFixed(0));
    obsHour.innerHTML = hour;
    obsMinute.innerHTML = "00";
}

function updateObsMoonPos() {
    // Compute the position of the Moon in the observer's sky
    moonOrbitalTheta %= 2 * Math.PI;
    earthTheta %= 2 * Math.PI;
    while (moonOrbitalTheta < 0) {
        moonOrbitalTheta += 2 * Math.PI;
    }
    while (earthTheta < 0) {
        earthTheta += 2 * Math.PI;
    }

    var dtheta = (moonOrbitalTheta + Math.PI) % (2 * Math.PI) - earthTheta;
    while (dtheta < 0) {
        dtheta += 2 * Math.PI
    }
    if (dtheta < 0.1) {
        moonPosition.innerHTML = "Au zénith";
    }
    else if (dtheta < 0.5 * Math.PI - 0.3) {
        moonPosition.innerHTML = "Haut dans l'est";
    }
    else if (dtheta < 0.5 * Math.PI + 0.1) {
        moonPosition.innerHTML = "Proche de l'horizon est";
    }
    else if (dtheta < 1.5 * Math.PI - 0.1) {
        moonPosition.innerHTML = "Sous l'horizon";
    }
    else if (dtheta < 1.5 * Math.PI + 0.3) {
        moonPosition.innerHTML = "Proche de l'horizon ouest";
    }
    else if (dtheta < 2 * Math.PI - 0.1) {
        moonPosition.innerHTML = "Haut dans l'ouest";
    }
    else {
        moonPosition.innerHTML = "Au zénith";
    }
}

function pad(n, width, z) {
    // Pad a number with n leading zeros
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function drawMoon() {
    moonContext.clearRect(0, 0, moonCanvas.width, moonCanvas.height);
    // Position Moon on its orbit
    moonx = centerx + moonOrbitRadius * Math.cos(-moonOrbitalTheta);
    moony = centery + moonOrbitRadius * Math.sin(-moonOrbitalTheta);
    //moonContext.drawImage(moon, moonx - moonRadius, moony - moonRadius,
                          //2 * moonRadius, 2 * moonRadius);

    // Rotate Moon on its axis
    moonContext.save();
    moonContext.translate(moonx, moony);
    var moonTheta = moonOrbitalTheta - Math.PI;
    moonContext.rotate(-moonTheta);
    moonContext.translate(-moonx, -moony);
    moonContext.drawImage(moon, moonx - moonRadius, moony - moonRadius,
                          2 * moonRadius, 2 * moonRadius);
    moonContext.restore();

    drawMoonPhase();
    //var cycleAngle = (Math.PI - moonOrbitalTheta) % (2 * Math.PI);
    //while (cycleAngle < 0) {
        //cycleAngle += 2 * Math.PI;
    //}
    //var cycleFrac = 2 * Math.round((1 - cycleAngle/(2 * Math.PI)) * 180);
    //moonImg.innerHTML = '<img src="assets/moon/m' + pad(cycleFrac, 3) + '.gif" alt="Image de la Lune" />'
    
    // Draw shadow on Moon
    moonContext.beginPath();
    moonContext.fillStyle = "rgba(0, 0, 0, 0.5)";
    moonContext.lineWidth = 2;
    moonContext.arc(moonx, moony, moonRadius, 1.5 * Math.PI, 0.5 * Math.PI);
    moonContext.moveTo(moonx, moony - moonRadius);
    moonContext.lineTo(moonx, moony + moonRadius);
    moonContext.fill();

    updateObsMoonPos();
}

var scaleFactorX;

function drawMoonPhase() {
    moonPhaseContext.clearRect(0, 0, moonPhaseCanvas.width, moonPhaseCanvas.height);
    moonPhaseContext.drawImage(moonphase, 0, 0, 200, 200);
    moonPhaseContext.save();
    scaleFactorX = (Math.abs(moonx - centerx)) / moonOrbitRadius;

    if (moony - centery >= 0 && moonx - centerx <= 0) {
        // Waxing crescent
        moonPhaseContext.scale(scaleFactorX, 1);
        moonPhaseContext.beginPath();
        moonPhaseContext.fillStyle = "rgba(0, 0, 0, 0.8)";
        moonPhaseContext.arc(moonPhaseCanvas.width / 2 / scaleFactorX,
                             moonPhaseCanvas.height / 2,
                             90, 1.5 * Math.PI, 0.5 * Math.PI);
        moonPhaseContext.restore();
        moonPhaseContext.fill();

        moonPhaseContext.beginPath();
        moonPhaseContext.fillStyle = "rgba(0, 0, 0, 0.8)";
        moonPhaseContext.rect(0, 0, moonPhaseCanvas.width / 2,
                              moonPhaseCanvas.height);
        moonPhaseContext.fill();
        if (Math.abs(moony - centery) > 10) {
            if (Math.abs(moonx - centerx) > 10) {
                moonPhaseName.innerHTML = "Premier croissant";
            }
            else {
                moonPhaseName.innerHTML = "Premier quartier";
            }
        }
        else {
            moonPhaseName.innerHTML = "Nouvelle Lune";
        }
    }
    else if (moony - centery > 0) {
        // Waxing gibbous
        moonPhaseContext.scale(scaleFactorX, 1);
        moonPhaseContext.beginPath();
        moonPhaseContext.fillStyle = "rgba(0, 0, 0, 0.8)";
        moonPhaseContext.moveTo(0, moonPhaseCanvas.height);
        moonPhaseContext.lineTo(moonPhaseCanvas.width / 2 / scaleFactorX, 190);
        moonPhaseContext.arc(moonPhaseCanvas.width / 2 / scaleFactorX,
                             moonPhaseCanvas.height / 2,
                             90, 0.5 * Math.PI, 1.5 * Math.PI);
        moonPhaseContext.restore();
        moonPhaseContext.lineTo(0, 0);
        moonPhaseContext.closePath();
        moonPhaseContext.fill();
        if (Math.abs(moony - centery) > 10) {
            if (Math.abs(moonx - centerx) > 10) {
                moonPhaseName.innerHTML = "Gibbeuse croissante";
            }
            else {
                moonPhaseName.innerHTML = "Premier quartier";
            }
        }
        else {
            moonPhaseName.innerHTML = "Pleine Lune";
        }
    }
    else if (moonx - centerx > 0) {
        // Waning gibbous
        moonPhaseContext.scale(scaleFactorX, 1);
        moonPhaseContext.beginPath();
        moonPhaseContext.fillStyle = "rgba(0, 0, 0, 0.8)";
        moonPhaseContext.moveTo(moonPhaseCanvas.width, 0);
        moonPhaseContext.lineTo(moonPhaseCanvas.width / 2 / scaleFactorX, 10);
        moonPhaseContext.arc(moonPhaseCanvas.width / 2 / scaleFactorX,
                             moonPhaseCanvas.height / 2,
                             90, 1.5 * Math.PI, 0.5 * Math.PI);
        moonPhaseContext.restore();
        moonPhaseContext.lineTo(moonPhaseCanvas.width, moonPhaseCanvas.height, 0);
        moonPhaseContext.lineTo(moonPhaseCanvas.width, 0);
        moonPhaseContext.closePath();
        moonPhaseContext.fill();
        if (Math.abs(moony - centery) > 10) {
            if (Math.abs(moonx - centerx) > 10) {
                moonPhaseName.innerHTML = "Gibbeuse décroissante";
            }
            else {
                moonPhaseName.innerHTML = "Dernier quartier";
            }
        }
        else {
            moonPhaseName.innerHTML = "Pleine Lune";
        }
    }
    else {
        // Waning crescent
        moonPhaseContext.scale(scaleFactorX, 1);
        moonPhaseContext.beginPath();
        moonPhaseContext.fillStyle = "rgba(0, 0, 0, 0.8)";
        moonPhaseContext.arc(moonPhaseCanvas.width / 2 / scaleFactorX,
                             moonPhaseCanvas.height / 2,
                             90, 0.5 * Math.PI, 1.5 * Math.PI);
        moonPhaseContext.restore();
        moonPhaseContext.fill();

        moonPhaseContext.beginPath();
        moonPhaseContext.fillStyle = "rgba(0, 0, 0, 0.8)";
        moonPhaseContext.rect(moonPhaseCanvas.width / 2, 0, moonPhaseCanvas.width / 2,
                              moonPhaseCanvas.height);
        moonPhaseContext.fill();
        if (Math.abs(moony - centery) > 10) {
            if (Math.abs(moonx - centerx) > 10) {
                moonPhaseName.innerHTML = "Dernier croissant";
            }
            else {
                moonPhaseName.innerHTML = "Dernier quartier";
            }
        }
        else {
            moonPhaseName.innerHTML = "Nouvelle Lune";
        }
    }
}

function animate() {
    var dt = Number(speedSlider.value);
    earthTheta += (earthOmega * dt);
    earthTheta %= (2 * Math.PI);
    moonOrbitalTheta += (moonOmega * dt);
    moonOrbitalTheta %= (2 * Math.PI);
    drawEarth();
    drawMoon();

    timer = window.setTimeout(animate, 50);
}

function launchAnimation() {
    window.clearTimeout(timer);
    animate();
}

function pause() {
    window.clearTimeout(timer);
}

/* Script by: www.jtricks.com 
 * Version: 20090221 
 * Latest version: 
 * www.jtricks.com/javascript/blocks/showinghiding.html 
 */  
function togglePageElementVisibility(what)  
{  
    var obj = typeof what == 'object'  
        ? what : document.getElementById(what);  
  
    if (obj.style.display == 'none')  
        obj.style.display = 'block';  
    else  
        obj.style.display = 'none';  
    return false;  
}  

initFigure();
