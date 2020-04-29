/*********  Known Issues  ******
iPad doesn't fire onclick with every touch (only fires with a touch on something recognized
as clickable), so touching away from a drop down button doesn't take focus away from it, so
current method doesn't allow cursor to move until a menu option is selected.  The first
time menu items are touched, they are focused (as if they'd been rolled over), then on the
second touch they are selected (onclick is fired).  Also some of the labels are recognized
as phone numbers.  Also caching would be nice.

Changing color scheme doesn't change the color of the outer isoradii lines, since they must be
hard coded, or the color of the heliocentric symbol, since its a gif.

Translucent drop downs may look messy over info layers.

"Main Sequence" squished-looking on some screens
********************************/


dojo.require("dijit.form.Button");
dojo.require("dijit.Dialog");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.Menu");

//variables to refer to HTML elements
var canvas;
var background;  //info layers
var exercises;   //containers
var lumOutput;     //areas for display
var radiusOutput;  //of current
var tempOutput;    //values and units  
var currentLum;     //values
var currentRadius;  //to
var currentTemp;    //display
var sunLabel;
var lumScales = [];   //sets of spans
var tempScales = [];  //containing
var radScales = [];   //labels for
var MSLabels = [];    //various axis
//var mobileBrowser = false;
//var screenWidth;
//var screenHeight;
var colorScheme = "green";  //color for all lines and labels

var context;
var width;   //of the canvas, which should
var height;  //always match the window 
var regionHeight;  //dimensions of the graph
var regionWidth;   //in which the cursor may lie
var regionMarginLeft = 40;    //space around the edge of
var regionMarginRight = 20;   //the graph where the
var regionMarginTop = 20;     //lables and rulings
var regionMarginBottom = 55;  //can lie
var starTemp;  //temp and lum
var starLum;   //of cursor star
var radius;  //radius of cursor star in solar radii
var picRadius;  //logarithmically scaled radius of the cursor star in pixels
var sunRadius;  //radius of drawn sun in pixels
var centerX;  //coordinates in the
var centerY;  //window of the cursor star
var sunCenterX;  //coordinates in the
var sunCenterY;  //window of the sun
var radLineSeparationX;  //distance between isoradii
var radLineSeparationY;  //lines (for gradation)

var dragging = false;  //whether or not the mouse is down/touch started
//these three conditions are used to prevent clicks/touches
//on the menus from moving the star
var infoOpen = false;  //are any pull
var plotOpen = false;  //down menus open
var layerOpen = false;  //are any info layers open
var constrained = 0;  //limit star movement (1 -> move only x)(2 -> move only y)

var brightTempAndLum = [];           //list of temps, lums, Xs, and Ys of bright stars
var nearbyTempAndLum = [];           //nearby stars
var brightAndNearbyTempAndLum = [];  //and the overlap
var drawBright = false;   //flags whether
var drawOverlap = false;  //or not to display
var drawNearby = false;   //star groups


window.onload = function() {
	canvas = document.getElementById("myCanvas");
    context = canvas.getContext("2d");
    
    //Set initial location of cursor here.  Everything else calculates itself
    starTemp = 5800;   //2300 through 40000 Kelvin
    starLum = 1;    //.0001 through 1000000 solar luminosities
    radius = Math.sqrt(starLum) / Math.pow(starTemp / 5800, 2);
	
	//turn huge arrays of star data into just needed values
	createPlotLists();
	
	dojo.byId("body").style.color = colorScheme;
	
	//attach container elements to variables
    background = document.getElementById("background");
    exercises = document.getElementById("exercises");
	lumOutput = dojo.byId("lumOutput");
	radiusOutput = dojo.byId("radiusOutput");
	tempOutput = dojo.byId("tempOutput");
	currentLum = dojo.byId("currentLum");
	currentRadius = dojo.byId("currentRadius");
	currentTemp = dojo.byId("currentTemp");
	sunLabel = dojo.byId("sunLabel");
	for(i = 0; i <=10; i++){
		lumScales[i] = dojo.byId("lScale" + String(i));
		lumScales[i].style.left = "2px";
	}
	for(i = 0; i <=6; i++){
		radScales[i] = dojo.byId("rScale" + String(i));
		if(i < 5) radScales[i].style.left = String(regionMarginLeft + 2) + "px";
		else radScales[i].style.top = String(regionMarginTop + 2) + "px";
	}
	for(i = 0; i <=4; i++){
		tempScales[i] = dojo.byId("tScale" + String(i));
		tempScales[i].style.bottom = "25px";
	}
	tempScales[0].style.left = String(regionMarginLeft - 25) + "px";
	tempScales[4].style.right = "2px";
	for(i = 0; i <= 11; i++) MSLabels[i] = dojo.byId("MSLabel" + String(i));
	
    //make sure everything is drawn correctly for the current orientation/dimensions
    layout();
	/*if(navigator.userAgent.match(/Mobile/i)){
		mobileBrowser = true;
		if(window.innerHeight > window.innerWidth){
			screenHeight = window.outerHeight;
			screenWidth = window.innerWidth;
		}
		else{
			screenHeight = window.innerWidth;
			screenWidth = window.outerHeight;
		}
		layout();
	}*/
	
    //create buttons to close layers
    var closeBackgroundButton = new dijit.form.Button(
        {
            label: "Close",
            name: "closeBackgroundButton",
            onClick: function(){
				background.style.display = "none";
				layerOpen = false;
			}
        },
        "closeBackground"
    );
    var closeExerciseButton = new dijit.form.Button(
        {
            label: "Close",
            name: "closeExerciseButton",
            onClick: function(){
				exercises.style.display = "none";
				layerOpen = false;
			}
        },
        "closeExercises"
    );
    
    //create button and menu of plot options
    var plotMenu = new dijit.Menu({style: "display: none;"});
    plotMenu.addChild(plotMenuItem("None", false, false, false));
    plotMenu.addChild(plotMenuItem("Brightest", true, true, false));
    plotMenu.addChild(plotMenuItem("Closest", false, true, true));
    plotMenu.addChild(plotMenuItem("Both", true, true, true));
    plotMenu.addChild(plotMenuItem("Overlap", false, true, false));
    var plotMenuButton = new dijit.form.DropDownButton({
        label: "Plots",
        name: "plotMenuButton",
        dropDown: plotMenu,
        id: "plotMenuButton",
		onClick:function(){plotOpen = true;},
		onBlur:function(){plotOpen = false;}
    });
    var plotMenuButtonDiv = dojo.byId("plotMenuButton");
	plotMenuButtonDiv.appendChild(plotMenuButton.domNode);
	plotMenuButtonDiv.style.paddingTop = String(regionMarginTop + 3) + "px";
	plotMenuButtonDiv.style.paddingRight = String(regionMarginRight + 3) + "px";
    
    //create button and menu of info options
    var infoMenu = new dijit.Menu({style: "display: none;"});
    var backgroundButton = new dijit.MenuItem({
        label: "Background",
        onClick: function() {
			layerOpen = true;
            background.style.display = "block";
            exercises.style.display = "none";
        }
    });
    infoMenu.addChild(backgroundButton);
    var exercisesButton = new dijit.MenuItem({
        label: "Esercises",
        onClick: function() {
			layerOpen = true;
            exercises.style.display = "block";
            background.style.display = "none";
        }
    });
    infoMenu.addChild(exercisesButton);
    var infoMenuButton = new dijit.form.DropDownButton({
        label: "Info",
        name: "infoMenuButton",
        dropDown: infoMenu,
        id: "infoMenuButton",
		onClick:function(){infoOpen = true;},
		onBlur:function(){infoOpen = false;}
    });
    var infoMenuButtonDiv = dojo.byId("infoMenuButton");
	infoMenuButtonDiv.appendChild(infoMenuButton.domNode);
	infoMenuButtonDiv.style.paddingTop = String(regionMarginTop + 3) + "px";
	infoMenuButtonDiv.style.paddingRight = "3px";
    
    //when cursor lowers, if it is within the graph, start dragging star and update its location
    dojo.connect(dojo.doc, "onmousedown", touch);
    dojo.connect(dojo.doc, "ontouchstart", touch);
    
    //when cursor moves, if it is dragging the star, update its location
    dojo.connect(dojo.doc, "onmousemove", function(e){
		if (dragging){
			e.preventDefault();
			updateLocation(e)
		}
	});
    dojo.connect(dojo.doc, "ontouchmove", function(e){
		e.preventDefault();
		if (dragging) updateLocation(e)
	});
    dojo.connect(dojo.doc, "ondragstart", function(e){return false;});
	
    //when cursor lifts, stop dragging star
    dojo.connect(dojo.doc, "onmouseup", function(e){
		dragging = false;
		constrained = 0;
	});
    dojo.connect(dojo.doc, "ontouchend", function(e){
		dragging = false;
		constrained = 0;
	});
    
    //when window is scaled/rotated, recalculate positions and redraw
    dojo.connect(window, "onresize", function(e){
        layout();
        //even though layout calls drawPieces, it doesn't draw the shadows
        //unless it is called both here and there
        drawPieces();
    });
}


function layout(){
    //make canvas fill window
	/*if(mobileBrowser){
		canvas.width = 5;
		canvas.height = 5;
		if(window.innerHeight > window.innerWidth) canvas.height = screenHeight;
		else canvas.height = screenWidth;
		window.scrollTo(0, 1);
	}
    else*/ canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    width = canvas.width;
    height = canvas.height;
    
    //make graph as big as it can be
    regionWidth = width - regionMarginRight - regionMarginLeft;
    regionHeight = height - regionMarginTop - regionMarginBottom;
    
    //move star and sun to where they should be in the new dimensions
    centerX = width - regionMarginRight - (Math.LOG10E * Math.log(starTemp) - 3.3617278) * regionWidth / 1.24033;
    centerY = height - regionMarginBottom - (Math.LOG10E * Math.log(starLum) + 4) * regionHeight / 10;
    sunCenterX = width - regionMarginRight - .325 * regionWidth;
    sunCenterY = height - regionMarginBottom - .4 * regionHeight;
    
	picRadius = Math.pow(10, Math.pow(2, Math.LOG10E * Math.log(radius) / 3)) * 2;
	sunRadius = 20;
		
    //determine isoraddii line separation (for gradation)
    var AR = regionWidth / regionHeight;
    radLineSeparationX = regionHeight / (20 * AR + 5 / AR);
    radLineSeparationY = regionWidth / (10 * AR + 2.5 / AR);
	
	//for all stars in lists, calculate appropriate X and Y coodinates
	//in the window as functions of temp, lum, and window size
	for (S in brightTempAndLum){
		var star = brightTempAndLum[S];
		star.xPos = (width - regionMarginRight - (star.temperature - 3.3617278) / 1.24033 * regionWidth).toPrecision(4);
		star.yPos = (height - regionMarginBottom - (star.luminosity + 4) / 10 * regionHeight).toPrecision(4);
	}
	for (S in nearbyTempAndLum){
		var star = nearbyTempAndLum[S];
		star.xPos = (width - regionMarginRight - (star.temperature - 3.3617278) / 1.24033 * regionWidth).toPrecision(4);
		star.yPos = (height - regionMarginBottom - (star.luminosity + 4) / 10 * regionHeight).toPrecision(4);
	}
	for (S in brightAndNearbyTempAndLum){
		var star = brightAndNearbyTempAndLum[S];
		star.xPos = (width - regionMarginRight - (star.temperature - 3.3617278) / 1.24033 * regionWidth).toPrecision(4);
		star.yPos = (height - regionMarginBottom - (star.luminosity + 4) / 10 * regionHeight).toPrecision(4);
	}
    
	lumOutput.style.left = String(regionMarginLeft + 2) + "px";
	lumOutput.style.bottom = String(regionMarginBottom + 24) + "px";
	tempOutput.style.left = String(regionWidth / 2 - 100) + "px";
	radiusOutput.style.left = String(regionMarginLeft + 2) + "px";
	radiusOutput.style.bottom = String(regionMarginBottom + 2) + "px";
	
	for(i in lumScales)
		lumScales[i].style.top = String(regionMarginTop + i * regionHeight / 10 - 13) + "px";
	tempScales[1].style.left = String(regionMarginLeft + .24 * regionWidth - 25) + "px";
	tempScales[2].style.left = String(regionMarginLeft + .48 * regionWidth - 25) + "px";
	tempScales[3].style.left = String(regionMarginLeft + .73 * regionWidth - 20) + "px";
	radScales[0].style.bottom = String(regionMarginBottom + 2 + .14 * regionHeight) + "px";
	radScales[1].style.bottom = String(regionMarginBottom + 2 + .34 * regionHeight) + "px";
	radScales[2].style.bottom = String(regionMarginBottom + 2 + .54 * regionHeight) + "px";
	radScales[3].style.bottom = String(regionMarginBottom + 2 + .74 * regionHeight) + "px";
	radScales[4].style.bottom = String(regionMarginBottom + 2 + .94 * regionHeight) + "px";
	radScales[5].style.right = String(regionMarginRight + 2 + .72 * regionWidth) + "px";
	radScales[6].style.right = String(regionMarginRight + 2 + .32 * regionWidth) + "px";
	
	//draw vague main sequence line and label
	xOff = .07;
	yOff = .15;
	for(i in MSLabels){
		if(i == 3) MSLabels[i].style.left = String(regionMarginLeft + (xOff - .01) * regionWidth) + "px";
		else MSLabels[i].style.left = String(regionMarginLeft + xOff * regionWidth) + "px";
		MSLabels[i].style.bottom = String(regionMarginBottom + regionHeight * (1 - yOff)) + "px";
		xOff += .02;
		yOff += .01;
	}
	
	sunLabel.style.bottom = String(height - sunCenterY + sunRadius) + "px";
	sunLabel.style.left = String(sunCenterX - sunRadius) + "px";
	
    //draw stars and graph
    drawPieces();
}


function drawPieces(){
    //clear the canvas
    //unfortunately must clear the whole screen to
    //account for star reaching outside graph
    context.clearRect(0, 0, width, height);
	context.strokeStyle = colorScheme;
	context.lineWidth = 2;
	
	drawStars();
    drawMainSequence();
	
	//if any plots are to be drawn, do so
	//all available plotting options invlove the overlap
	//group, so it serves as a flag whether to call the function
	if (drawOverlap) drawPlots();
	
	context.lineWidth = 3;
	context.lineCap = "butt";
	context.strokeStyle = colorScheme;
	
    //draw outer edge
    context.beginPath();
    context.rect(regionMarginLeft, regionMarginTop, regionWidth, regionHeight);
    context.stroke();
    context.closePath();
	
	drawSliders();
	drawLumScale();
	context.lineWidth = 2;
    drawTempScale();
    drawIsoradii();
    drawOutput();
}

function drawStars(){
    //draw larger star in front
    if (radius < 1){
		context.moveTo(sunCenterX + 100, sunCenterY);
		context.beginPath();
		context.arc(sunCenterX, sunCenterY, sunRadius, 0, Math.PI * 2);
		context.fillStyle = "rgb(255, 242, 231)";
		context.fill();
		context.closePath();
		context.shadowColor = "black";
		context.shadowBlur = 5;
		context.moveTo(centerX + picRadius, centerY);
		context.beginPath();
		context.arc(centerX, centerY, picRadius, 0, Math.PI * 2);
		context.fillStyle = getColorFromTemp(starTemp);
		context.fill();
		context.closePath();
    }
    else{
		context.moveTo(centerX + picRadius, centerY);
		context.beginPath();
		context.arc(centerX, centerY, picRadius, 0, Math.PI * 2);
		context.fillStyle = getColorFromTemp(starTemp);
		context.fill();
		context.closePath();
		context.shadowColor = "black";
		context.shadowBlur = 5;
		context.moveTo(sunCenterX + 100, sunCenterY);
		context.beginPath();
		context.arc(sunCenterX, sunCenterY, sunRadius, 0, Math.PI * 2);
		context.fillStyle = "rgb(255, 242, 231)";
		context.fill();
		context.closePath();
    }
	//draw cursor X at center of star (sans shadow)
	context.beginPath();
	//context.strokeStyle = "green";
	context.shadowBlur = 0;
	context.moveTo(centerX + 5, centerY + 5);
	context.lineTo(centerX - 5, centerY - 5);
	context.moveTo(centerX - 5, centerY + 5);
	context.lineTo(centerX + 5, centerY - 5);
	context.stroke();
	context.closePath();
}

function drawMainSequence(){
	//draw Main Sequence line
	context.beginPath();
	context.strokeStyle = "rgba(0, 255, 0, .25)";
	context.moveTo(regionMarginLeft, regionMarginTop);
	//curve from top left corner, flattening out to just above the 1 solar radius line,
	//then curve down to the bottom right corner
	context.bezierCurveTo(regionMarginLeft + .1 * regionWidth, regionMarginTop + .25 * regionHeight,
						  regionMarginLeft + .90 * regionWidth, regionMarginTop + .6 * regionHeight,
						  width - regionMarginRight, height - regionMarginBottom);
	//wide, transparent, rounded line to represent vagueness
	context.lineWidth = 30;
	context.lineCap = "round";
	context.stroke();
	context.closePath();
}

function drawPlots(){
	
	//draw each category of stars set to be drawn
	if(drawBright){
		context.fillStyle = "cyan";
		for (S in brightTempAndLum){
			var star = brightTempAndLum[S];
			context.beginPath();
			context.arc(star.xPos, star.yPos, 3, 0, Math.PI * 2);
			context.fill();
			context.closePath();
		}
	}
	
	if(drawOverlap){
		//draw overlapping stars blue unless
		//drawing only nearby stars
		if(drawNearby){
			if(drawBright) context.fillStyle = "purple";
			else context.fillStyle = "red";
		}
		else{
			if (drawBright) context.fillStyle = "cyan";
			else context.fillStyle = "purple";
		}
		for (S in brightAndNearbyTempAndLum){
			var star = brightAndNearbyTempAndLum[S];
			context.beginPath();
			context.arc(star.xPos, star.yPos, 3, 0, Math.PI * 2);
			context.fill();
			context.closePath();
		}
	}
	
	if(drawNearby){
		context.fillStyle = "red";
		for (S in nearbyTempAndLum){
			var star = nearbyTempAndLum[S];
			context.beginPath();
			context.arc(star.xPos, star.yPos, 3, 0, Math.PI * 2);
			context.fill();
			context.closePath();
		}
	}
}

function drawLumScale(){
    var tickHeight = regionHeight / 10;
    var tickX = regionMarginLeft - 5;
    //draw verticle ruling pattern at intervals
    //of one tenth of the graph height
    for (var i = 0; i < 10; i++){
        var tickTop = regionMarginTop + i * tickHeight;
        
        //draw top tick mark longer and thicker than others
        context.beginPath();
        context.moveTo(regionMarginLeft - 10, tickTop);
        context.lineWidth = 2;
        context.lineTo(regionMarginLeft, tickTop);
        context.stroke();
        context.closePath();
        
        //draw smaller tick marks at appropriate locations
        context.beginPath();
        context.moveTo(tickX, tickTop + .05 * tickHeight);
        context.lineWidth = 1;
        context.lineTo(regionMarginLeft, tickTop + .05 * tickHeight);
        context.moveTo(tickX, tickTop + .1 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .1 * tickHeight);
        context.moveTo(tickX, tickTop + .16 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .16 * tickHeight);
        context.moveTo(tickX, tickTop + .22 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .22 * tickHeight);
        context.moveTo(tickX, tickTop + .3 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .3 * tickHeight);
        context.moveTo(tickX, tickTop + .4 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .4 * tickHeight);
        context.moveTo(tickX, tickTop + .52 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .52 * tickHeight);
        context.moveTo(tickX, tickTop + .7 * tickHeight);
        context.lineTo(regionMarginLeft, tickTop + .7 * tickHeight);
        context.stroke();
        context.closePath();
    }
    
    //draw bottom tick mark
    context.beginPath();
    context.lineWidth = 2;
    context.moveTo(regionMarginLeft - 10, height - regionMarginBottom);
    context.lineTo(regionMarginLeft, height - regionMarginBottom);
}

function drawTempScale(){
    //draw horizontal tick marks and associated labels at appropritate locations 
    var tickY2 = height - regionMarginBottom;
    var tickY1 = tickY2 + 10;
    context.moveTo(regionMarginLeft, tickY1);
    context.lineTo(regionMarginLeft, tickY2);
    var tickX = regionMarginLeft + .24 * regionWidth;
    context.moveTo(tickX, tickY1);
    context.lineTo(tickX, tickY2);
    tickX = regionMarginLeft + .48 * regionWidth;
    context.moveTo(tickX, tickY1);
    context.lineTo(tickX, tickY2);
    tickX = regionMarginLeft + .73 * regionWidth;
    context.moveTo(tickX, tickY1);
    context.lineTo(tickX, tickY2);
    tickX = width - regionMarginRight;
    context.moveTo(tickX, tickY1);
    context.lineTo(tickX, tickY2);
    context.stroke();
    context.closePath();
}

function drawIsoradii(){
    //draw isoradii lines and labels
    context.beginPath();
    //define a linear gradient perpendicular to the lines, centered at the cursor,
    //which fades from completely translucent, to solid, and back to translucent green
    //over the distance from a line and a half before the cursor to a line and a half after
    //(either separation calculation or gradient syntax is erroneous, so twice the desired
    //length of gradient must be used)
    var grd = context.createLinearGradient(centerX - 3 * radLineSeparationX, centerY + 3 * radLineSeparationY,
                                           centerX + 3 * radLineSeparationX, centerY - 3 * radLineSeparationY);
    grd.addColorStop(0, "rgba(0, 255, 0, 0)");
    grd.addColorStop(.5, colorScheme);
    grd.addColorStop(1, "rgba(0, 255, 0, 0)");
    context.strokeStyle = grd;
    
    //draw lines and labels only if they are close enough to cursor to be visible
    if (radius < .05){
        context.moveTo(regionMarginLeft + .28 * regionWidth, height - regionMarginBottom);
        context.lineTo(regionMarginLeft, regionMarginTop + .86 * regionHeight);
		radScales[0].style.display = "inline";
    }
	else radScales[0].style.display = "none";
    if (.0003 < radius && radius < .5){
        context.moveTo(regionMarginLeft + .68 * regionWidth, height - regionMarginBottom);
        context.lineTo(regionMarginLeft, regionMarginTop + .66 * regionHeight);
		radScales[1].style.display = "inline";
    }
	else radScales[1].style.display = "none";
    if (.003 < radius && radius < 5){
        context.moveTo(width - regionMarginRight, regionMarginTop + .96 * regionHeight);
        context.lineTo(regionMarginLeft, regionMarginTop + .46 * regionHeight);
		radScales[2].style.display = "inline";
    }
	else radScales[2].style.display = "none";
    if (.03 < radius && radius < 50){
        context.moveTo(width - regionMarginRight, regionMarginTop + .76 * regionHeight);
        context.lineTo(regionMarginLeft, regionMarginTop + .26 * regionHeight);
		radScales[3].style.display = "inline";
    }
	else radScales[3].style.display = "none";
    if (.3 < radius && radius < 500){
        context.moveTo(width - regionMarginRight, regionMarginTop + .56 * regionHeight);
        context.lineTo(regionMarginLeft, regionMarginTop + .06 * regionHeight);
		radScales[4].style.display = "inline";
    }
	else radScales[4].style.display = "none";
    if (3 < radius && radius < 5000){
        context.moveTo(width - regionMarginRight, regionMarginTop + .36 * regionHeight);
        context.lineTo(regionMarginLeft + .28 * regionWidth, regionMarginTop);
		radScales[5].style.display = "inline";
    }
	else radScales[5].style.display = "none";
    if (30 < radius){
        context.moveTo(width - regionMarginRight, regionMarginTop + .16 * regionHeight);
        context.lineTo(regionMarginLeft + .68 * regionWidth, regionMarginTop);
		radScales[6].style.display = "inline";
    }
	else radScales[6].style.display = "none";
    context.stroke();
    context.closePath();
}

function drawSliders(){
	context.beginPath();
	context.moveTo(centerX, regionMarginTop + regionHeight);
	context.lineTo(centerX + 10, regionMarginTop + regionHeight - 20);
	context.lineTo(centerX - 10, regionMarginTop + regionHeight - 20);
	context.lineTo(centerX, regionMarginTop + regionHeight);
	context.moveTo(regionMarginLeft, centerY);
	context.lineTo(regionMarginLeft + 20, centerY + 10);
	context.lineTo(regionMarginLeft + 20, centerY - 10);
	context.lineTo(regionMarginLeft, centerY);
	context.stroke();
	context.closePath();
}

function drawOutput(){
	var displayLuminosity = starLum;
	var power = 0;
	if (displayLuminosity >= 99.5){
		while (displayLuminosity >= 99.5){
			displayLuminosity /= 10;
			power++;
		}
		displayLuminosity = Math.round(displayLuminosity) * Math.pow(10, power);
	}
	else displayLuminosity = starLum.toPrecision(2);
	
	var displayRadius = radius;
	power = 0;
	if (displayRadius >= 99.5){
		while (displayRadius >= 99.5){
			displayRadius /= 10;
			power++;
		}
		displayRadius = Math.round(displayRadius) * Math.pow(10, power);
	}
	else displayRadius = radius.toPrecision(2);
	
	var displayTemp = starTemp;
	power = 0;
	while (displayTemp >= 99.5){
		displayTemp /= 10;
		power++;
	}
	displayTemp = Math.round(displayTemp) * Math.pow(10, power);
	
    currentLum.innerText = displayLuminosity;
    currentRadius.innerText = displayRadius;
    currentTemp.innerText = displayTemp;
}


function touch(evt){
	if(!(infoOpen || plotOpen || layerOpen)){
		regionState = isCursorInRegion(evt);
		if(regionState >0){
			dragging = true;
			if(regionState < 3) constrained = regionState;
			updateLocation(evt);
		}
	}
}

function isCursorInRegion(e){
    var x;
    var y;
    if (!e) var e = window.event;
    //to account for varius browsers,
    //must check for different locations
    if (e.pageX || e.pageY) {
        x = e.pageX;
        y = e.pageY;
    }
    else if (e.clientX || e.clientY) {
        x = e.clientX + document.body.scrollLeft
            + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop
            + document.documentElement.scrollTop;
    }
    else if (e.touches[0].pageX || e.touches.pageY) {
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
    }
	
    if(regionMarginTop + regionHeight < y ||
	   (regionMarginTop + regionHeight - 20 < y && y < regionMarginTop + regionHeight &&
       centerX - 10 < x && x < centerX + 10)) return 1;
	
    if(regionMarginLeft > x ||
	   (regionMarginLeft < x && x < regionMarginLeft + 20 &&
       centerY - 10 < y && y < centerY + 10)) return 2;
	   
    //if event is within the graph
    if(regionMarginLeft < x && x < regionMarginLeft + regionWidth &&
       regionMarginTop < y && y < regionMarginTop + regionHeight){
		var buttonRight = width - regionMarginRight - 7
		var buttonTop = regionMarginTop + 7;
		var buttonBottom = regionMarginTop + 37;
		if (buttonBottom > y && y > buttonTop)
			if(buttonRight - 133 < x)
				if(x < buttonRight - 74 || buttonRight - 64 < x && x < buttonRight)
					return 0;
        return 3;
    }
	
    return 0;
}

function updateLocation(e){
    var x;
	var y;
    if (!e) var e = window.event;
    //get cursor location for any browser
    if (e.pageX || e.pageY) {
        x = e.pageX;
        y = e.pageY;
    }
    else if (e.clientX || e.clientY) {
        x = e.clientX + document.body.scrollLeft
            + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop
            + document.documentElement.scrollTop;
    }
    else if (e.touches[0].pageX || e.touches.pageY) {
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
    }
    
	
	if(constrained != 2) centerX = x;
	if(constrained != 1) centerY = y;
	
    //if mouse/touch is dragging outside the
    //graph, constrain center of star to graph
	if (centerX > regionWidth + regionMarginLeft) centerX = regionWidth + regionMarginLeft;
	else if (centerX < regionMarginLeft) centerX = regionMarginLeft;
	if (centerY > regionHeight + regionMarginTop) centerY = regionHeight + regionMarginTop;
	else if (centerY < regionMarginTop) centerY = regionMarginTop;
    
    //convert cursor location to temp, lum, and radius
    starTemp = Math.pow(10, (((width - centerX - regionMarginRight) / regionWidth * 1.24033) + 3.3617278));
    starLum = Math.pow(10,(((height - centerY - regionMarginBottom) / regionHeight * 10) - 4));
    radius = Math.sqrt(starLum) / Math.pow(starTemp / 5800, 2);
    
    //scale picture radii as logarithm of acutal radii
    if (width < height){
        picRadius = Math.pow(10, Math.pow(2, Math.LOG10E * Math.log(radius) / 3)) * 2;
        sunRadius = 20;
    }
    else{
        picRadius = Math.pow(10, Math.pow(2, Math.LOG10E * Math.log(radius) / 3)) * 2;
        sunRadius = 20;
    }
    
    //draw the stars and graph
    drawPieces();
}


function plotMenuItem(Label, a, b, c){
    item = new dijit.MenuItem({
        label: Label,
		filter: "alpha(opacity=85) !important",
		opacity: "0.85 !important",
        onClick: function() {
            drawBright = a;
			drawOverlap = b;
			drawNearby = c;
			plotOpen = false;
			drawPieces();
        }
    });
	return item;
}

function createPlotLists(){
	{// The nearbyStarsList comes from the following source: 
	//        THE ONE HUNDRED NEAREST STAR SYSTEMS 
	//        brought to you by RECONS (Research Consortium on Nearby Stars) 
	//        http://www.chara.gsu.edu/RECONS/TOP100.htm 
	//        catalog date of 01 October 2006 
	// A few entries have been removed since they were either planets, L or T type dwarfs, or had 
	// no spectral type in this catalog or in simbad; thus not all sysNums are represented. 
	// NOTE: STARS THAT ARE AMONG THE BRIGHTEST STARS OR THAT ARE WHITE DWARFS HAVE BEEN COMMENTED OUT.

	var nearbyStarsList = [{sysNum: 1, appVisMag: 11.09, absVisMag: 15.53, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.11, plx: 0.76887, name: "GJ 551", altName: "Proxima Centauri"}, 
		/*{sysNum: 1, appVisMag: 0.01, absVisMag: 4.38, type: 42, lumNum: 5, typeStr: "G2   V", mass: 1.14, plx: 0.74723, name: "GJ 559 A", altName: "alpha Centauri A"},*/ 
		/*{sysNum: 1, appVisMag: 1.34, absVisMag: 5.71, type: 50, lumNum: 5, typeStr: "K0   V", mass: 0.92, plx: 0.74723, name: "GJ 559 B", altName: "alpha Centauri B"},*/ 
		{sysNum: 2, appVisMag: 9.53, absVisMag: 13.22, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.17, plx: 0.54698, name: "GJ 699", altName: "Barnard's Star"}, 
		{sysNum: 3, appVisMag: 13.44, absVisMag: 16.55, type: 66, lumNum: 5, typeStr: "M6.0 V", mass: 0.09, plx: 0.4191, name: "GJ 406", altName: "Wolf 359"}, 
		{sysNum: 4, appVisMag: 7.47, absVisMag: 10.44, type: 62, lumNum: 5, typeStr: "M2.0 V", mass: 0.46, plx: 0.39342, name: "GJ 411", altName: "Lalande 21185"}, 
		/*{sysNum: 5, appVisMag: -1.43, absVisMag: 1.47, type: 21, lumNum: 5, typeStr: "A1   V", mass: 1.99, plx: 0.38002, name: "GJ 244 A", altName: "Sirius"},*/ 
		/*{sysNum: 5, appVisMag: 8.44, absVisMag: 11.34, type: null, lumNum: 7, typeStr: "DA2", mass: 0.5, plx: 0.38002, name: "GJ 244 B", altName: "Sirius B"},*/ 
		{sysNum: 6, appVisMag: 12.54, absVisMag: 15.4, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.11, plx: 0.3737, name: "GJ 65 A", altName: "BL Ceti"}, 
		{sysNum: 6, appVisMag: 12.99, absVisMag: 15.85, type: 66, lumNum: 5, typeStr: "M6.0 V", mass: 0.1, plx: 0.3737, name: "GJ 65 B", altName: "UV Ceti"}, 
		{sysNum: 7, appVisMag: 10.43, absVisMag: 13.07, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.17, plx: 0.3369, name: "GJ 729", altName: "Ross 154"}, 
		{sysNum: 8, appVisMag: 12.29, absVisMag: 14.79, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.12, plx: 0.316, name: "GJ 905", altName: "Ross 248"}, 
		{sysNum: 9, appVisMag: 3.73, absVisMag: 6.19, type: 52, lumNum: 5, typeStr: "K2   V", mass: 0.85, plx: 0.30999, name: "GJ 144", altName: "epsilon Eridani"}, 
		{sysNum: 10, appVisMag: 7.34, absVisMag: 9.75, type: 61.5, lumNum: 5, typeStr: "M1.5 V", mass: 0.53, plx: 0.30364, name: "GJ 887", altName: "Lacaille 9352"}, 
		{sysNum: 11, appVisMag: 11.13, absVisMag: 13.51, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.16, plx: 0.29872, name: "GJ 447", altName: "Ross 128"}, 
		{sysNum: 12, appVisMag: 13.33, absVisMag: 15.64, type: 65, lumNum: 5, typeStr: "M5.0 V J", mass: 0.11, plx: 0.2895, name: "GJ 866 A", altName: "EZ Aquarii A"}, 
		{sysNum: 12, appVisMag: 13.27, absVisMag: 15.58, type: 65, lumNum: 5, typeStr: "M5e", mass: 0.11, plx: 0.2895, name: "GJ 866 B", altName: "EZ Aquarii B"}, 
		/*{sysNum: 13, appVisMag: 0.38, absVisMag: 2.66, type: 35, lumNum: 4.5, typeStr: "F5 IV-V", mass: 1.57, plx: 0.28605, name: "GJ 280 A", altName: "Procyon"},*/ 
		/*{sysNum: 13, appVisMag: 10.7, absVisMag: 12.98, type: null, lumNum: 7, typeStr: "DA", mass: 0.5, plx: 0.28605, name: "GJ 280 B", altName: "Procyon B"},*/ 
		{sysNum: 14, appVisMag: 5.21, absVisMag: 7.49, type: 55, lumNum: 5, typeStr: "K5.0 V", mass: 0.7, plx: 0.28604, name: "GJ 820 A", altName: "61 Cygni A"}, 
		{sysNum: 14, appVisMag: 6.03, absVisMag: 8.31, type: 57, lumNum: 5, typeStr: "K7.0 V", mass: 0.63, plx: 0.28604, name: "GJ 820 B", altName: "61 Cygni B"}, 
		{sysNum: 15, appVisMag: 8.9, absVisMag: 11.16, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.35, plx: 0.283, name: "GJ 725 A", altName: ""}, 
		{sysNum: 15, appVisMag: 9.69, absVisMag: 11.95, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.26, plx: 0.283, name: "GJ 725 B", altName: ""}, 
		{sysNum: 16, appVisMag: 8.08, absVisMag: 10.32, type: 61.5, lumNum: 5, typeStr: "M1.5 V", mass: 0.49, plx: 0.28059, name: "GJ 15 A", altName: "GX Andromedae"}, 
		{sysNum: 16, appVisMag: 11.06, absVisMag: 13.3, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.16, plx: 0.28059, name: "GJ 15 B", altName: "GQ Andromedae"}, 
		{sysNum: 17, appVisMag: 4.69, absVisMag: 6.89, type: 55, lumNum: 5, typeStr: "K5   Ve", mass: 0.77, plx: 0.27584, name: "GJ 845 A", altName: "epsilon Indi A"}, 
		{sysNum: 18, appVisMag: 14.78, absVisMag: 16.98, type: 66.5, lumNum: 5, typeStr: "M6.5 V", mass: 0.09, plx: 0.2758, name: "GJ 1111", altName: "DX Cancri"}, 
		{sysNum: 19, appVisMag: 3.49, absVisMag: 5.68, type: 48, lumNum: 5, typeStr: "G8   Vp", mass: 0.92, plx: 0.27439, name: "GJ 71", altName: "tau Ceti"}, 
		{sysNum: 20, appVisMag: 13.09, absVisMag: 15.26, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.11, plx: 0.27201, name: "GJ 1061", altName: "Henry et al. 1997 & 2006"}, 
		{sysNum: 21, appVisMag: 12.02, absVisMag: 14.17, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.14, plx: 0.26884, name: "GJ 54.1", altName: "YZ Ceti"}, 
		{sysNum: 22, appVisMag: 9.86, absVisMag: 11.97, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.26, plx: 0.26376, name: "GJ 273", altName: "Luyten's Star"}, 
		{sysNum: 23, appVisMag: 15.14, absVisMag: 17.22, type: 67, lumNum: 5, typeStr: "M7.0 V", mass: 0.08, plx: 0.26063, name: "SO 0253+1652", altName: "Henry et al. 2006"}, 
		{sysNum: 24, appVisMag: 17.4, absVisMag: 19.42, type: 68.5, lumNum: 5, typeStr: "M8.5 V", mass: 0.07, plx: 0.25945, name: "SCR 1845-6357", altName: "Henry et al. 2006"}, 
		{sysNum: 25, appVisMag: 8.84, absVisMag: 10.87, type: 61.5, lumNum: 5, typeStr: "M1.5 V", mass: 0.39, plx: 0.25527, name: "GJ 191", altName: "Kapteyn's Star"}, 
		{sysNum: 26, appVisMag: 6.67, absVisMag: 8.69, type: 60, lumNum: 5, typeStr: "M0.0 V", mass: 0.6, plx: 0.25343, name: "GJ 825", altName: "AX Microscopii"}, 
		{sysNum: 27, appVisMag: 9.79, absVisMag: 11.76, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.28, plx: 0.24806, name: "GJ 860 A", altName: "Kruger 60 A"}, 
		{sysNum: 27, appVisMag: 11.41, absVisMag: 13.38, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.16, plx: 0.24806, name: "GJ 860 B", altName: "Kruger 60 B"}, 
		{sysNum: 28, appVisMag: 17.39, absVisMag: 19.37, type: 68.5, lumNum: 5, typeStr: "M8.5 V", mass: 0.07, plx: 0.24771, name: "DEN 1048-3956", altName: "Jao et al. 2005, Costa et al. 2005"}, 
		{sysNum: 29, appVisMag: 11.15, absVisMag: 13.09, type: 64.5, lumNum: 5, typeStr: "M4.5 V J", mass: 0.17, plx: 0.24434, name: "GJ 234 A", altName: "Ross 614 A"}, 
		{sysNum: 29, appVisMag: 14.23, absVisMag: 16.17, type: 68, lumNum: 5, typeStr: "M8V", mass: 0.1, plx: 0.24434, name: "GJ 234 B", altName: "Ross 614 B"}, 
		{sysNum: 30, appVisMag: 10.07, absVisMag: 11.93, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.26, plx: 0.23601, name: "GJ 628", altName: "Wolf 1061"}, 
		/*{sysNum: 31, appVisMag: 12.38, absVisMag: 14.21, type: null, lumNum: 7, typeStr: "DZ7", mass: 0.5, plx: 0.23188, name: "GJ 35", altName: "WD 0046+051"},*/ 
		{sysNum: 32, appVisMag: 8.55, absVisMag: 10.35, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.48, plx: 0.2292, name: "GJ 1", altName: ""}, 
		{sysNum: 33, appVisMag: 13.18, absVisMag: 14.97, type: 65.5, lumNum: 5, typeStr: "M5.5 V J", mass: 0.12, plx: 0.2279, name: "GJ 473 A", altName: "Wolf 424 A"}, 
		{sysNum: 33, appVisMag: 13.17, absVisMag: 14.96, type: 67, lumNum: 5, typeStr: "M7", mass: 0.12, plx: 0.2279, name: "GJ 473 B", altName: "Wolf 424 B"}, 
		{sysNum: 34, appVisMag: 12.27, absVisMag: 14.03, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.14, plx: 0.2248, name: "GJ 83.1", altName: "TZ Arietis"}, 
		{sysNum: 35, appVisMag: 9.17, absVisMag: 10.89, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.39, plx: 0.22049, name: "GJ 687", altName: ""}, 
		{sysNum: 36, appVisMag: 15.6, absVisMag: 17.32, type: 66.5, lumNum: 5, typeStr: "M6.5 V", mass: 0.08, plx: 0.2203, name: "LHS 292", altName: ""}, 
		{sysNum: 37, appVisMag: 9.38, absVisMag: 11.09, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.36, plx: 0.22025, name: "GJ 674", altName: ""}, 
		{sysNum: 38, appVisMag: 13.46, absVisMag: 15.17, type: 65.5, lumNum: 5, typeStr: "M5.5 V J", mass: 0.11, plx: 0.2202, name: "GJ 1245 A", altName: "G 208-044 A"}, 
		{sysNum: 38, appVisMag: 14.01, absVisMag: 15.72, type: 66, lumNum: 5, typeStr: "M6.0 V", mass: 0.1, plx: 0.2202, name: "GJ 1245 B", altName: "G 208-045"}, 
		{sysNum: 38, appVisMag: 16.75, absVisMag: 18.46, type: 65.5, lumNum: 5, typeStr: "M5.5", mass: 0.07, plx: 0.2202, name: "GJ 1245 C", altName: "G 208-044 B"}, 
		/*{sysNum: 39, appVisMag: 11.5, absVisMag: 13.18, type: null, lumNum: 7, typeStr: "DQ6", mass: 0.5, plx: 0.21657, name: "GJ 440", altName: "WD 1142-645"},*/ 
		{sysNum: 40, appVisMag: 13.76, absVisMag: 15.4, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.11, plx: 0.213, name: "GJ 1002", altName: ""}, 
		{sysNum: 41, appVisMag: 10.17, absVisMag: 11.81, type: 63.5, lumNum: 5, typeStr: "M3.5 V J", mass: 0.27, plx: 0.21259, name: "GJ 876 A", altName: "Ross 780"}, 
		{sysNum: 42, appVisMag: 13.9, absVisMag: 15.51, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.11, plx: 0.20895, name: "LHS 288", altName: "Henry et al. 2006"}, 
		{sysNum: 43, appVisMag: 8.77, absVisMag: 10.34, type: 61, lumNum: 5, typeStr: "M1.0 V", mass: 0.48, plx: 0.20602, name: "GJ 412 A", altName: ""}, 
		{sysNum: 43, appVisMag: 14.48, absVisMag: 16.05, type: 65.5, lumNum: 5, typeStr: "M5.5 V", mass: 0.1, plx: 0.20602, name: "GJ 412 B", altName: "WX Ursae Majoris"}, 
		{sysNum: 44, appVisMag: 6.59, absVisMag: 8.16, type: 57, lumNum: 5, typeStr: "K7.0 V", mass: 0.64, plx: 0.20581, name: "GJ 380", altName: ""}, 
		{sysNum: 45, appVisMag: 9.32, absVisMag: 10.87, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.39, plx: 0.2046, name: "GJ 388", altName: ""}, 
		{sysNum: 46, appVisMag: 8.66, absVisMag: 10.2, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.5, plx: 0.20278, name: "GJ 832", altName: ""}, 
		{sysNum: 47, appVisMag: 18.5, absVisMag: 20.02, type: 69, lumNum: 5, typeStr: "M9.0 V", mass: 0.07, plx: 0.2014, name: "LP 944-020", altName: ""}, 
		{sysNum: 49, appVisMag: 10.95, absVisMag: 12.45, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.21, plx: 0.19965, name: "GJ 682", altName: ""}, 
		{sysNum: 50, appVisMag: 4.43, absVisMag: 5.92, type: 51, lumNum: 5, typeStr: "K1   Ve", mass: 0.89, plx: 0.199, name: "GJ 166 A", altName: "omicron 2 Eridani"}, 
		/*{sysNum: 50, appVisMag: 9.52, absVisMag: 11.01, type: null, lumNum: 7, typeStr: "DA4", mass: 0.5, plx: 0.199, name: "GJ 166 B", altName: ""},*/ 
		{sysNum: 50, appVisMag: 11.19, absVisMag: 12.68, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.2, plx: 0.199, name: "GJ 166 C", altName: ""}, 
		{sysNum: 51, appVisMag: 10.22, absVisMag: 11.7, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.29, plx: 0.19804, name: "GJ 873", altName: "EV Lacertae"}, 
		{sysNum: 52, appVisMag: 4.2, absVisMag: 5.66, type: 50, lumNum: 5, typeStr: "K0   Ve", mass: 0.92, plx: 0.19596, name: "GJ 702 A", altName: "70 Ophiuchi A"}, 
		{sysNum: 53, appVisMag: 6.05, absVisMag: 7.51, type: 55, lumNum: 5, typeStr: "K5   Ve", mass: 0.7, plx: 0.19596, name: "GJ 702 B", altName: "70 Ophiuchi B"}, 
		/*{sysNum: 53, appVisMag: 0.77, absVisMag: 2.22, type: 27, lumNum: 4.5, typeStr: "A7 IV-V", mass: 1.71, plx: 0.19497, name: "GJ 768", altName: "Altair"},*/ 
		{sysNum: 54, appVisMag: 14.06, absVisMag: 15.47, type: 65.5, lumNum: 5, typeStr: "M5.5 V J", mass: 0.11, plx: 0.1912, name: "GJ 1116 A", altName: "EI Cancri"}, 
		{sysNum: 54, appVisMag: 14.92, absVisMag: 16.33, type: 65.5, lumNum: 5, typeStr: "M5.5", mass: 0.1, plx: 0.1912, name: "GJ 1116 B", altName: ""}, 
		{sysNum: 55, appVisMag: 11.31, absVisMag: 12.71, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.19, plx: 0.19093, name: "G 099-049", altName: "Henry et al. 2006"}, 
		{sysNum: 56, appVisMag: 12.22, absVisMag: 13.59, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.15, plx: 0.18792, name: "LHS 1723", altName: "Henry et al. 2006"}, 
		{sysNum: 57, appVisMag: 10.79, absVisMag: 12.14, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.24, plx: 0.18584, name: "GJ 445", altName: ""}, 
		{sysNum: 58, appVisMag: 8.46, absVisMag: 9.79, type: 61.5, lumNum: 5, typeStr: "M1.5 V", mass: 0.53, plx: 0.18421, name: "GJ 526", altName: "Wolf 498"}, 
		{sysNum: 59, appVisMag: 11.41, absVisMag: 12.71, type: 65, lumNum: 5, typeStr: "MV", mass: 0.19, plx: 0.18215, name: "LP 816-060", altName: ""}, 
		{sysNum: 60, appVisMag: 11.04, absVisMag: 12.32, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.22, plx: 0.18063, name: "GJ 169.1 A", altName: "Stein 2051"}, 
		/*{sysNum: 60, appVisMag: 12.44, absVisMag: 13.72, type: null, lumNum: 7, typeStr: "DC5", mass: 0.5, plx: 0.18063, name: "GJ 169.1 B", altName: ""},*/ 
		{sysNum: 61, appVisMag: 10.02, absVisMag: 11.29, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.33, plx: 0.17958, name: "GJ 251", altName: ""}, 
		{sysNum: 62, appVisMag: 18.27, absVisMag: 19.5, type: 68.5, lumNum: 5, typeStr: "M8.5 V", mass: 0.07, plx: 0.1765, name: "2MA 1835+3259", altName: ""}, 
		{sysNum: 63, appVisMag: 7.95, absVisMag: 9.17, type: 61.5, lumNum: 5, typeStr: "M1.5 V", mass: 0.57, plx: 0.17517, name: "GJ 205", altName: "Wolf 1453"}, 
		{sysNum: 65, appVisMag: 4.68, absVisMag: 5.88, type: 50, lumNum: 5, typeStr: "K0   V", mass: 0.89, plx: 0.17359, name: "GJ 764", altName: "sigma Draconis"}, 
		{sysNum: 66, appVisMag: 8.12, absVisMag: 9.31, type: 61, lumNum: 5, typeStr: "M1.0 V", mass: 0.56, plx: 0.17317, name: "GJ 229 A", altName: ""}, 
		{sysNum: 67, appVisMag: 10.75, absVisMag: 11.92, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.26, plx: 0.17169, name: "GJ 693", altName: ""}, 
		{sysNum: 68, appVisMag: 9.11, absVisMag: 10.28, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.49, plx: 0.17101, name: "GJ 752 A", altName: "Wolf 1055"}, 
		{sysNum: 68, appVisMag: 17.5, absVisMag: 18.67, type: 68, lumNum: 5, typeStr: "M8.0 V", mass: 0.07, plx: 0.17101, name: "GJ 752 B", altName: "van Biesbroeck 10"}, 
		{sysNum: 69, appVisMag: 11.51, absVisMag: 12.67, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.2, plx: 0.17037, name: "GJ 213", altName: "Ross 47"}, 
		{sysNum: 70, appVisMag: 5.75, absVisMag: 6.9, type: 55, lumNum: 5, typeStr: "K5   Ve", mass: 0.76, plx: 0.16985, name: "GJ 570 A", altName: ""}, 
		{sysNum: 70, appVisMag: 8.28, absVisMag: 9.43, type: 61, lumNum: 5, typeStr: "M1.0 V J", mass: 0.55, plx: 0.16985, name: "GJ 570 B", altName: ""}, 
		{sysNum: 70, appVisMag: 10.05, absVisMag: 11.2, type: 63, lumNum: 5, typeStr: "M3V", mass: 0.35, plx: 0.16985, name: "GJ 570 C", altName: ""}, 
		{sysNum: 71, appVisMag: 12.23, absVisMag: 13.37, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.16, plx: 0.16903, name: "GJ 754", altName: "Jao et al. 2005"}, 
		{sysNum: 72, appVisMag: 8.99, absVisMag: 10.12, type: 61, lumNum: 5, typeStr: "M1.0 V", mass: 0.51, plx: 0.16851, name: "GJ 908", altName: ""}, 
		{sysNum: 73, appVisMag: 3.45, absVisMag: 4.58, type: 43, lumNum: 5, typeStr: "G3   V", mass: 1.11, plx: 0.16838, name: "GJ 34 A", altName: "eta Cassiopei A"}, 
		{sysNum: 73, appVisMag: 7.51, absVisMag: 8.64, type: 57, lumNum: 5, typeStr: "K7.0 V", mass: 0.6, plx: 0.16838, name: "GJ 34 B", altName: "eta Cassiopei B"}, 
		{sysNum: 74, appVisMag: 9.31, absVisMag: 10.44, type: 63, lumNum: 5, typeStr: "M3.0 V", mass: 0.46, plx: 0.16836, name: "GJ 588", altName: ""}, 
		{sysNum: 75, appVisMag: 11.58, absVisMag: 12.93, type: 64, lumNum: 5, typeStr: "M4.0 V J", mass: 0.18, plx: 0.16806, name: "GJ 1005 A", altName: ""}, 
		{sysNum: 76, appVisMag: 11.19, absVisMag: 12.31, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.23, plx: 0.16754, name: "GJ 285", altName: "Ross 882"}, 
		{sysNum: 77, appVisMag: 5.07, absVisMag: 6.19, type: 51, lumNum: 5, typeStr: "K1   Ve", mass: 0.85, plx: 0.16751, name: "GJ 663 A", altName: "36 Ophiuchi A"}, 
		{sysNum: 77, appVisMag: 5.08, absVisMag: 6.2, type: 51, lumNum: 5, typeStr: "K1   Ve", mass: 0.85, plx: 0.16751, name: "GJ 663 B", altName: "36 Ophiuchi B"}, 
		{sysNum: 77, appVisMag: 6.33, absVisMag: 7.45, type: 55, lumNum: 5, typeStr: "K5   Ve", mass: 0.71, plx: 0.16751, name: "GJ 664", altName: "36 Ophiuchi C"}, 
		{sysNum: 78, appVisMag: 5.32, absVisMag: 6.41, type: 53, lumNum: 5, typeStr: "K3   V", mass: 0.82, plx: 0.16533, name: "GJ 783 A", altName: ""}, 
		{sysNum: 78, appVisMag: 11.5, absVisMag: 12.59, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.2, plx: 0.16533, name: "GJ 783 B", altName: ""}, 
		{sysNum: 79, appVisMag: 4.26, absVisMag: 5.35, type: 45, lumNum: 5, typeStr: "G5   V", mass: 0.97, plx: 0.16501, name: "GJ 139", altName: "82 Eridani"}, 
		/*{sysNum: 80, appVisMag: 14.12, absVisMag: 15.2, type: null, lumNum: 7, typeStr: "DXP9", mass: 0.5, plx: 0.1647, name: "GJ 1221", altName: ""},*/ 
		{sysNum: 81, appVisMag: 3.56, absVisMag: 4.63, type: 48, lumNum: 5, typeStr: "G8   V", mass: 1.1, plx: 0.16378, name: "GJ 780", altName: "delta Pavonis"}, 
		{sysNum: 82, appVisMag: 12.05, absVisMag: 13.11, type: 64.5, lumNum: 5, typeStr: "M4.5 V J", mass: 0.17, plx: 0.16293, name: "GJ 268 A", altName: "QY Aurigae A"}, 
		{sysNum: 82, appVisMag: 12.45, absVisMag: 13.51, type: 66, lumNum: 5, typeStr: "M6V", mass: 0.16, plx: 0.16293, name: "GJ 268 B", altName: "QY Aurigae B"}, 
		{sysNum: 83, appVisMag: 11.31, absVisMag: 12.37, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.22, plx: 0.16286, name: "GJ 555", altName: "HN Librae"}, 
		{sysNum: 85, appVisMag: 7.62, absVisMag: 8.67, type: 60, lumNum: 5, typeStr: "M0.0 V", mass: 0.6, plx: 0.16213, name: "GJ 338 A", altName: ""}, 
		{sysNum: 85, appVisMag: 7.71, absVisMag: 8.76, type: 57, lumNum: 5, typeStr: "K7.0 V", mass: 0.6, plx: 0.16213, name: "GJ 338 B", altName: ""}, 
		{sysNum: 86, appVisMag: 7.96, absVisMag: 9, type: 60, lumNum: 5, typeStr: "M0.0 V", mass: 0.58, plx: 0.16118, name: "GJ 784", altName: ""}, 
		{sysNum: 87, appVisMag: 10.56, absVisMag: 11.57, type: 62.5, lumNum: 5, typeStr: "M2.5 V", mass: 0.3, plx: 0.15929, name: "GJ 581", altName: "Wolf 562"}, 
		{sysNum: 88, appVisMag: 10.26, absVisMag: 11.25, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.34, plx: 0.15772, name: "GJ 896 A", altName: "EQ Pegasi"}, 
		{sysNum: 88, appVisMag: 12.4, absVisMag: 13.39, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.16, plx: 0.15772, name: "GJ 896 B", altName: ""}, 
		{sysNum: 89, appVisMag: 16.1, absVisMag: 17.07, type: 66, lumNum: 5, typeStr: "M6.0 V", mass: 0.09, plx: 0.15687, name: "LHS 2090", altName: "Henry et al. 2006"}, 
		{sysNum: 90, appVisMag: 12.75, absVisMag: 13.73, type: 64, lumNum: 5, typeStr: "M4.0 V", mass: 0.15, plx: 0.15678, name: "LHS 337", altName: "Henry et al. 2006"}, 
		{sysNum: 91, appVisMag: 9.93, absVisMag: 10.9, type: 63, lumNum: 5, typeStr: "M3.0 V J", mass: 0.39, plx: 0.15632, name: "GJ 661 A", altName: ""}, 
		{sysNum: 91, appVisMag: 10.35, absVisMag: 11.32, type: 63, lumNum: 5, typeStr: "M3", mass: 0.33, plx: 0.15632, name: "GJ 661 B", altName: ""}, 
		{sysNum: 92, appVisMag: 17.05, absVisMag: 18.02, type: 67, lumNum: 5, typeStr: "M7.0 V", mass: 0.08, plx: 0.1563, name: "LHS 3003", altName: ""}, 
		{sysNum: 93, appVisMag: 14.79, absVisMag: 15.76, type: 65, lumNum: 5, typeStr: "M5", mass: 0.1, plx: 0.156, name: "G 180-060", altName: ""}, 
		/*{sysNum: 94, appVisMag: 14.45, absVisMag: 15.4, type: null, lumNum: 7, typeStr: "DZ9", mass: 0.5, plx: 0.155, name: "GJ 223.2", altName: "WD 0552-041"},*/ 
		{sysNum: 95, appVisMag: 9.72, absVisMag: 10.67, type: 62.5, lumNum: 5, typeStr: "M2.5 V J", mass: 0.43, plx: 0.15497, name: "GJ 644 A", altName: "Wolf 630 A"}, 
		{sysNum: 95, appVisMag: 10.54, absVisMag: 11.49, type: 64, lumNum: 5, typeStr: "M4", mass: 0.31, plx: 0.15497, name: "GJ 644 B", altName: "Wolf 630 B"}, 
		{sysNum: 95, appVisMag: 16.8, absVisMag: 17.75, type: 67, lumNum: 5, typeStr: "M7.0 V", mass: 0.08, plx: 0.15497, name: "GJ 644 C", altName: "van Biesbroeck 8"}, 
		{sysNum: 95, appVisMag: 10.63, absVisMag: 11.58, type: 66.5, lumNum: 5, typeStr: "M6.5", mass: 0.3, plx: 0.15497, name: "GJ 644 D", altName: "Wolf 630 C"}, 
		{sysNum: 95, appVisMag: 11.74, absVisMag: 12.69, type: 63.5, lumNum: 5, typeStr: "M3.5 V", mass: 0.19, plx: 0.15497, name: "GJ 643", altName: "Wolf 629"}, 
		{sysNum: 96, appVisMag: 5.56, absVisMag: 6.49, type: 53, lumNum: 5, typeStr: "K3   V", mass: 0.81, plx: 0.15341, name: "GJ 892", altName: ""}, 
		{sysNum: 97, appVisMag: 12.74, absVisMag: 13.66, type: 64.5, lumNum: 5, typeStr: "M4.5 V", mass: 0.15, plx: 0.15305, name: "GJ 1128", altName: "Jao et al. 2005"}, 
		{sysNum: 98, appVisMag: 13.8, absVisMag: 14.72, type: 65, lumNum: 5, typeStr: "M5.0 V", mass: 0.12, plx: 0.1529, name: "GJ 1156", altName: "GL Virginis"}, 
		{sysNum: 99, appVisMag: 10.1, absVisMag: 11.01, type: 61.5, lumNum: 5, typeStr: "M1.5 V", mass: 0.37, plx: 0.15179, name: "GJ 625", altName: ""}, 
		{sysNum: 100, appVisMag: 10.02, absVisMag: 10.9, type: 62.5, lumNum: 5, typeStr: "M2.5 V", mass: 0.39, plx: 0.15016, name: "GJ 408", altName: "Ross 104"}]; 
	}

	{// This brightStarsList array consists of ~150 bright stars from the Bright Star 
	// Catalogue, 5th Revised Ed. (Hoffleit+, 1991). NOTE: THE STARS THAT ARE ALSO 
	// AMONG THE ~100 NEAREST HAVE BEEN COMMENTED OUT. The absVisMag property for most 
	// stars was derived using the parallax as reported by Simbad. Exceptions are 
	// HR 4731 and HR 4730 where the absVisMag comes from wikipedia, and 
	// the star HR 5958 (T CrB) which has been removed since it is a recurrent nova. 

	var brightStarsList = [ 
		/*{HR: 2491, appVisMag: -1.46, absVisMag: 1.45, plx: 379.21, BV: 0, type: 21, lumNum: 5, typeStr: "A1Vm"},*/ 
		{HR: 2326, appVisMag: -0.72, absVisMag: -5.65, plx: 10.43, BV: 0.15, type: 30, lumNum: 2, typeStr: "F0II"}, 
		{HR: 5340, appVisMag: -0.04, absVisMag: -0.30, plx: 88.85, BV: 1.23, type: 51.5, lumNum: 3, typeStr: "K1.5IIIFe-0.5"}, 
		/*{HR: 5459, appVisMag: -0.01, absVisMag: 4.36, plx: 742.24, BV: 0.71, type: 42, lumNum: 5, typeStr: "G2V"},*/ 
		{HR: 7001, appVisMag: 0.03, absVisMag: 0.58, plx: 128.93, BV: 0, type: 20, lumNum: 5, typeStr: "A0Va"}, 
		{HR: 1708, appVisMag: 0.08, absVisMag: -0.48, plx: 77.29, BV: 0.8, type: 45, lumNum: 3, typeStr: "G5IIIe+G0III"}, 
		{HR: 1713, appVisMag: 0.12, absVisMag: -6.78, plx: 4.22, BV: -0.03, type: 18, lumNum: 1, typeStr: "B8Ia:"}, 
		/*{HR: 2943, appVisMag: 0.38, absVisMag: 2.67, plx: 285.93, BV: 0.42, type: 35, lumNum: 4.5, typeStr: "F5IV-V"},*/ 
		{HR: 472, appVisMag: 0.46, absVisMag: -2.77, plx: 22.68, BV: -0.16, type: 13, lumNum: 5, typeStr: "B3Vpe"}, 
		{HR: 2061, appVisMag: 0.5, absVisMag: -5.11, plx: 7.63, BV: 1.85, type: 61.5, lumNum: 1.05, typeStr: "M1-2Ia-Iab"}, 
		{HR: 5267, appVisMag: 0.61, absVisMag: -5.45, plx: 6.21, BV: -0.23, type: 11, lumNum: 3, typeStr: "B1III"}, 
		/*{HR: 7557, appVisMag: 0.77, absVisMag: 2.22, plx: 194.45, BV: 0.22, type: 27, lumNum: 5, typeStr: "A7V"},*/ 
		{HR: 1457, appVisMag: 0.85, absVisMag: -0.66, plx: 50.09, BV: 1.54, type: 55, lumNum: 3, typeStr: "K5+III"}, 
		{HR: 6134, appVisMag: 0.96, absVisMag: -5.40, plx: 5.4, BV: 1.83, type: 61.5, lumNum: 1.05, typeStr: "M1.5Iab-Ib+B4Ve"}, 
		{HR: 5056, appVisMag: 0.98, absVisMag: -3.56, plx: 12.44, BV: -0.23, type: 11, lumNum: 3.5, typeStr: "B1III-IV+B2V"}, 
		{HR: 2990, appVisMag: 1.14, absVisMag: 1.07, plx: 96.74, BV: 1, type: 50, lumNum: 3, typeStr: "K0IIIb"}, 
		{HR: 8728, appVisMag: 1.16, absVisMag: 1.73, plx: 130.08, BV: 0.09, type: 23, lumNum: 5, typeStr: "A3V"}, 
		{HR: 7924, appVisMag: 1.25, absVisMag: -8.77, plx: 1.01, BV: 0.09, type: 22, lumNum: 1, typeStr: "A2Ia"}, 
		{HR: 4853, appVisMag: 1.25, absVisMag: -3.94, plx: 9.25, BV: -0.23, type: 10.5, lumNum: 3, typeStr: "B0.5III"}, 
		{HR: 4730, appVisMag: 1.33, absVisMag: -4.19, BV: -0.24, type: 10.5, lumNum: 4, typeStr: "B0.5IV"}, 
		/*{HR: 5460, appVisMag: 1.33, absVisMag: 5.70, plx: 742.22, BV: 0.88, type: 51, lumNum: 5, typeStr: "K1V"},*/ 
		{HR: 3982, appVisMag: 1.35, absVisMag: -0.54, plx: 42.09, BV: -0.11, type: 17, lumNum: 5, typeStr: "B7V"}, 
		{HR: 2618, appVisMag: 1.5, absVisMag: -4.13, plx: 7.57, BV: -0.21, type: 12, lumNum: 2, typeStr: "B2II"}, 
		{HR: 6527, appVisMag: 1.63, absVisMag: -5.06, plx: 4.64, BV: -0.22, type: 12, lumNum: 4, typeStr: "B2IV+B"}, 
		{HR: 4763, appVisMag: 1.63, absVisMag: -0.53, plx: 37.09, BV: 1.59, type: 63.5, lumNum: 3, typeStr: "M3.5III"}, 
		{HR: 1790, appVisMag: 1.64, absVisMag: -2.74, plx: 13.42, BV: -0.22, type: 12, lumNum: 3, typeStr: "B2III"}, 
		{HR: 1791, appVisMag: 1.65, absVisMag: -1.38, plx: 24.89, BV: -0.13, type: 17, lumNum: 3, typeStr: "B7III"}, 
		{HR: 3685, appVisMag: 1.68, absVisMag: -0.99, plx: 29.34, BV: 0, type: 22, lumNum: 4, typeStr: "A2IV"}, 
		{HR: 1903, appVisMag: 1.7, absVisMag: -6.40, plx: 2.43, BV: -0.19, type: 10, lumNum: 1, typeStr: "B0Ia"}, 
		{HR: 4731, appVisMag: 1.73, absVisMag: -3.79, BV: -0.26, type: 11, lumNum: 5, typeStr: "B1V"}, 
		{HR: 8425, appVisMag: 1.74, absVisMag: -0.73, plx: 32.16, BV: -0.13, type: 17, lumNum: 4, typeStr: "B7IV"}, 
		{HR: 4905, appVisMag: 1.77, absVisMag: -0.21, plx: 40.3, BV: -0.02, type: 20, lumNum: 5, typeStr: "A0pCr"}, 
		{HR: 3207, appVisMag: 1.78, absVisMag: -5.30, plx: 3.88, BV: -0.22, type: 9, lumNum: 1.05, typeStr: "O9I"}, 
		{HR: 1017, appVisMag: 1.79, absVisMag: -4.53, plx: 5.51, BV: 0.48, type: 35, lumNum: 1.1, typeStr: "F5Ib"}, 
		{HR: 4301, appVisMag: 1.79, absVisMag: -1.12, plx: 26.38, BV: 1.07, type: 50, lumNum: 3, typeStr: "K0IIIa"}, 
		{HR: 2693, appVisMag: 1.84, absVisMag: -6.89, plx: 1.82, BV: 0.68, type: 38, lumNum: 1, typeStr: "F8Ia"}, 
		{HR: 6879, appVisMag: 1.85, absVisMag: -1.40, plx: 22.55, BV: -0.03, type: 19.5, lumNum: 3, typeStr: "B9.5III"}, 
		{HR: 5191, appVisMag: 1.86, absVisMag: -0.60, plx: 32.39, BV: -0.19, type: 13, lumNum: 5, typeStr: "B3V"}, 
		{HR: 3307, appVisMag: 1.86, absVisMag: -4.60, plx: 5.16, BV: 1.28, type: 53, lumNum: 3, typeStr: "K3III+B2:V"}, 
		{HR: 6553, appVisMag: 1.87, absVisMag: -2.75, plx: 11.99, BV: 0.4, type: 31, lumNum: 2, typeStr: "F1II"}, 
		{HR: 2088, appVisMag: 1.9, absVisMag: -0.11, plx: 39.72, BV: 0.03, type: 22, lumNum: 4, typeStr: "A2IV"}, 
		{HR: 6217, appVisMag: 1.92, absVisMag: -3.63, plx: 7.85, BV: 1.44, type: 52, lumNum: 2.5, typeStr: "K2IIb-IIIa"}, 
		{HR: 2421, appVisMag: 1.93, absVisMag: -0.61, plx: 31.12, BV: 0, type: 20, lumNum: 4, typeStr: "A0IV"}, 
		{HR: 7790, appVisMag: 1.94, absVisMag: -1.82, plx: 17.8, BV: -0.2, type: 12, lumNum: 4, typeStr: "B2IV"}, 
		{HR: 3485, appVisMag: 1.96, absVisMag: 0.01, plx: 40.9, BV: 0.04, type: 21, lumNum: 5, typeStr: "A1V"}, 
		{HR: 2891, appVisMag: 1.98, absVisMag: 1.07, plx: 66, BV: 0.03, type: 21, lumNum: 5, typeStr: "A1V"}, 
		{HR: 2294, appVisMag: 1.98, absVisMag: -3.97, plx: 6.53, BV: -0.23, type: 11, lumNum: 2.5, typeStr: "B1II-III"}, 
		{HR: 3748, appVisMag: 1.98, absVisMag: -1.71, plx: 18.4, BV: 1.44, type: 53, lumNum: 2.5, typeStr: "K3II-III"}, 
		{HR: 617, appVisMag: 2, absVisMag: 0.47, plx: 49.48, BV: 1.15, type: 52, lumNum: 3, typeStr: "K2-IIICa-1"}, 
		{HR: 7121, appVisMag: 2.02, absVisMag: -2.18, plx: 14.54, BV: -0.22, type: 12.5, lumNum: 5, typeStr: "B2.5V"}, 
		{HR: 424, appVisMag: 2.02, absVisMag: -3.61, plx: 7.56, BV: 0.6, type: 37, lumNum: 1.5, typeStr: "F7:Ib-II"}, 
		{HR: 188, appVisMag: 2.04, absVisMag: -0.31, plx: 34.04, BV: 1.02, type: 49.5, lumNum: 3, typeStr: "G9.5IIICH-1"}, 
		{HR: 1948, appVisMag: 2.05, absVisMag: -1.25, plx: 22, BV: -0.21, type: 9.7, lumNum: 1.1, typeStr: "O9.7Ib"}, 
		{HR: 2004, appVisMag: 2.06, absVisMag: -4.69, plx: 4.52, BV: -0.17, type: 10.5, lumNum: 1, typeStr: "B0.5Ia"}, 
		{HR: 15, appVisMag: 2.06, absVisMag: -0.32, plx: 33.6, BV: -0.11, type: 18, lumNum: 4, typeStr: "B8IVpMnHg"}, 
		{HR: 5288, appVisMag: 2.06, absVisMag: 0.70, plx: 53.52, BV: 1.01, type: 50, lumNum: 3, typeStr: "K0-IIIb"}, 
		{HR: 337, appVisMag: 2.06, absVisMag: -1.89, plx: 16.36, BV: 1.58, type: 60, lumNum: 3, typeStr: "M0+IIIa"}, 
		{HR: 6556, appVisMag: 2.08, absVisMag: 1.30, plx: 69.84, BV: 0.15, type: 25, lumNum: 3, typeStr: "A5III"}, 
		{HR: 5563, appVisMag: 2.08, absVisMag: -0.87, plx: 25.79, BV: 1.47, type: 54, lumNum: 3, typeStr: "K4-III"}, 
		{HR: 8636, appVisMag: 2.1, absVisMag: -1.50, plx: 19.17, BV: 1.6, type: 65, lumNum: 3, typeStr: "M5III"}, 
		{HR: 936, appVisMag: 2.12, absVisMag: -0.16, plx: 35.14, BV: -0.05, type: 18, lumNum: 5, typeStr: "B8V"}, 
		{HR: 4534, appVisMag: 2.14, absVisMag: 1.91, plx: 90.16, BV: 0.09, type: 23, lumNum: 5, typeStr: "A3V"}, 
		{HR: 4819, appVisMag: 2.17, absVisMag: -0.85, plx: 25.01, BV: -0.01, type: 21, lumNum: 4, typeStr: "A1IV"}, 
		{HR: 7796, appVisMag: 2.2, absVisMag: -6.18, plx: 2.14, BV: 0.68, type: 38, lumNum: 1.1, typeStr: "F8Ib"}, 
		{HR: 3634, appVisMag: 2.21, absVisMag: -4.04, plx: 5.69, BV: 1.66, type: 54.5, lumNum: 1.5, typeStr: "K4.5Ib-II"}, 
		{HR: 5793, appVisMag: 2.23, absVisMag: 0.42, plx: 43.65, BV: -0.02, type: 20, lumNum: 5, typeStr: "A0V+G5V"}, 
		{HR: 168, appVisMag: 2.23, absVisMag: -2.01, plx: 14.27, BV: 1.17, type: 50, lumNum: 3, typeStr: "K0IIIa"}, 
		{HR: 6705, appVisMag: 2.23, absVisMag: -1.06, plx: 22.1, BV: 1.52, type: 55, lumNum: 3, typeStr: "K5III"}, 
		{HR: 1852, appVisMag: 2.23, absVisMag: -5.04, plx: 3.56, BV: -0.22, type: 9.5, lumNum: 2, typeStr: "O9.5II"}, 
		{HR: 3699, appVisMag: 2.25, absVisMag: -4.41, plx: 4.71, BV: 0.18, type: 28, lumNum: 1.1, typeStr: "A8Ib"}, 
		{HR: 3165, appVisMag: 2.25, absVisMag: -5.95, plx: 2.33, BV: -0.26, type: 5, lumNum: 5, typeStr: "O5f"}, 
		{HR: 603, appVisMag: 2.26, absVisMag: -2.94, plx: 9.19, BV: 1.37, type: 53, lumNum: 2, typeStr: "K3-IIb"}, 
		{HR: 5054, appVisMag: 2.27, absVisMag: 0.36, plx: 41.73, BV: 0.02, type: 21, lumNum: 5, typeStr: "A1VpSrSi"}, 
		{HR: 21, appVisMag: 2.27, absVisMag: 1.15, plx: 59.89, BV: 0.34, type: 32, lumNum: 3.5, typeStr: "F2III-IV"}, 
		{HR: 6241, appVisMag: 2.29, absVisMag: 0.77, plx: 49.85, BV: 1.15, type: 52.5, lumNum: 3, typeStr: "K2.5III"}, 
		{HR: 5469, appVisMag: 2.3, absVisMag: -3.85, plx: 5.95, BV: -0.2, type: 11.5, lumNum: 3, typeStr: "B1.5III/Vn"}, 
		{HR: 5132, appVisMag: 2.3, absVisMag: -3.03, plx: 8.68, BV: -0.22, type: 11, lumNum: 3, typeStr: "B1III"}, 
		{HR: 5440, appVisMag: 2.31, absVisMag: -2.59, plx: 10.57, BV: -0.19, type: 11.5, lumNum: 5, typeStr: "B1.5Vne"}, 
		{HR: 5953, appVisMag: 2.32, absVisMag: -3.15, plx: 8.12, BV: -0.12, type: 10.3, lumNum: 4, typeStr: "B0.3IV"}, 
		{HR: 4295, appVisMag: 2.37, absVisMag: 0.43, plx: 41.07, BV: -0.02, type: 21, lumNum: 5, typeStr: "A1V"}, 
		{HR: 99, appVisMag: 2.39, absVisMag: 0.51, plx: 42.14, BV: 1.09, type: 50, lumNum: 3, typeStr: "K0III"}, 
		{HR: 8308, appVisMag: 2.39, absVisMag: -4.21, plx: 4.85, BV: 1.53, type: 52, lumNum: 1.1, typeStr: "K2Ib"}, 
		{HR: 6580, appVisMag: 2.41, absVisMag: -3.38, plx: 7.03, BV: -0.22, type: 11.5, lumNum: 3, typeStr: "B1.5III"}, 
		{HR: 8775, appVisMag: 2.42, absVisMag: -1.53, plx: 16.37, BV: 1.67, type: 62.5, lumNum: 2.5, typeStr: "M2.5II-III"}, 
		{HR: 6378, appVisMag: 2.43, absVisMag: 0.36, plx: 38.77, BV: 0.06, type: 22, lumNum: 5, typeStr: "A2V"}, 
		{HR: 4554, appVisMag: 2.44, absVisMag: 0.39, plx: 38.99, BV: 0, type: 20, lumNum: 5, typeStr: "A0Ve"}, 
		{HR: 8162, appVisMag: 2.44, absVisMag: 1.56, plx: 66.84, BV: 0.22, type: 27, lumNum: 5, typeStr: "A7V"}, 
		{HR: 2827, appVisMag: 2.45, absVisMag: -7.55, plx: 1.02, BV: -0.08, type: 15, lumNum: 1, typeStr: "B5Ia"}, 
		{HR: 7949, appVisMag: 2.46, absVisMag: 0.73, plx: 45.26, BV: 1.03, type: 50, lumNum: 3, typeStr: "K0-III"}, 
		{HR: 264, appVisMag: 2.47, absVisMag: -3.93, plx: 5.32, BV: -0.15, type: 10, lumNum: 4, typeStr: "B0IVe"}, 
		{HR: 8781, appVisMag: 2.49, absVisMag: -0.68, plx: 23.36, BV: -0.04, type: 19, lumNum: 5, typeStr: "B9V"}, 
		{HR: 3734, appVisMag: 2.5, absVisMag: -3.62, plx: 6.05, BV: -0.18, type: 12, lumNum: 4.5, typeStr: "B2IV-V"}, 
		{HR: 911, appVisMag: 2.53, absVisMag: -1.63, plx: 14.82, BV: 1.64, type: 61.5, lumNum: 3, typeStr: "M1.5IIIa"}, 
		{HR: 5231, appVisMag: 2.55, absVisMag: -2.83, plx: 8.48, BV: -0.22, type: 12.5, lumNum: 4, typeStr: "B2.5IV"}, 
		{HR: 4357, appVisMag: 2.56, absVisMag: 1.32, plx: 56.52, BV: 0.12, type: 24, lumNum: 5, typeStr: "A4V"}, 
		{HR: 6175, appVisMag: 2.56, absVisMag: -3.20, plx: 7.12, BV: 0.02, type: 9.5, lumNum: 5, typeStr: "O9.5Vn"}, 
		{HR: 1865, appVisMag: 2.58, absVisMag: -5.43, plx: 2.54, BV: 0.21, type: 30, lumNum: 1.1, typeStr: "F0Ib"}, 
		{HR: 4662, appVisMag: 2.59, absVisMag: -0.94, plx: 19.78, BV: -0.11, type: 18, lumNum: 3, typeStr: "B8IIIpHgMn"}, 
		{HR: 7194, appVisMag: 2.6, absVisMag: 0.41, plx: 36.61, BV: 0.08, type: 22, lumNum: 3, typeStr: "A2III+A4IV"}, 
		{HR: 4621, appVisMag: 2.6, absVisMag: -2.84, plx: 8.25, BV: -0.12, type: 12, lumNum: 4, typeStr: "B2IVne"}, 
		{HR: 5685, appVisMag: 2.61, absVisMag: -0.86, plx: 20.38, BV: -0.11, type: 18, lumNum: 5, typeStr: "B8V"}, 
		{HR: 4057, appVisMag: 2.61, absVisMag: -0.33, plx: 25.96, BV: 1.15, type: 51, lumNum: 3, typeStr: "K1-IIIbFe-0.5"}, 
		{HR: 2095, appVisMag: 2.62, absVisMag: -1.02, plx: 18.83, BV: -0.08, type: 20, lumNum: 5, typeStr: "A0pSi"}, 
		{HR: 5984, appVisMag: 2.62, absVisMag: -3.46, plx: 6.15, BV: -0.07, type: 11, lumNum: 5, typeStr: "B1V"}, 
		{HR: 553, appVisMag: 2.64, absVisMag: 1.33, plx: 54.74, BV: 0.13, type: 25, lumNum: 5, typeStr: "A5V"}, 
		{HR: 1956, appVisMag: 2.64, absVisMag: -1.95, plx: 12.16, BV: -0.12, type: 17, lumNum: 4, typeStr: "B7IVe"}, 
		{HR: 4786, appVisMag: 2.65, absVisMag: -0.52, plx: 23.34, BV: 0.89, type: 45, lumNum: 2, typeStr: "G5II"}, 
		{HR: 5854, appVisMag: 2.65, absVisMag: 0.89, plx: 44.54, BV: 1.17, type: 52, lumNum: 3, typeStr: "K2IIIbCN1"}, 
		{HR: 403, appVisMag: 2.68, absVisMag: 0.25, plx: 32.81, BV: 0.13, type: 25, lumNum: 3.5, typeStr: "A5III-IV"}, 
		{HR: 5571, appVisMag: 2.68, absVisMag: -3.37, plx: 6.23, BV: -0.22, type: 12, lumNum: 3.5, typeStr: "B2III/IV"}, 
		{HR: 5235, appVisMag: 2.68, absVisMag: 2.41, plx: 88.17, BV: 0.58, type: 40, lumNum: 4, typeStr: "G0IV"}, 
		{HR: 6508, appVisMag: 2.69, absVisMag: -3.34, plx: 6.29, BV: -0.22, type: 12, lumNum: 4, typeStr: "B2IV"}, 
		{HR: 4798, appVisMag: 2.69, absVisMag: -2.19, plx: 10.67, BV: -0.2, type: 12, lumNum: 4.5, typeStr: "B2IV-V"}, 
		{HR: 4216, appVisMag: 2.69, absVisMag: -0.07, plx: 28.18, BV: 0.9, type: 45, lumNum: 3, typeStr: "G5III+G2V"}, 
		{HR: 1577, appVisMag: 2.69, absVisMag: -3.31, plx: 6.37, BV: 1.53, type: 53, lumNum: 2, typeStr: "K3II"}, 
		{HR: 5506, appVisMag: 2.7, absVisMag: -1.75, plx: 13, BV: 0.97, type: 50, lumNum: 2.5, typeStr: "K0-II-III"}, 
		{HR: 2773, appVisMag: 2.7, absVisMag: -4.96, plx: 2.98, BV: 1.62, type: 53, lumNum: 1.1, typeStr: "K3Ib"}, 
		{HR: 6859, appVisMag: 2.7, absVisMag: -2.18, plx: 10.67, BV: 1.38, type: 53, lumNum: 3, typeStr: "K3-IIIa*"}, 
		{HR: 7525, appVisMag: 2.72, absVisMag: -3.05, plx: 7.08, BV: 1.52, type: 53, lumNum: 2, typeStr: "K3II"}, 
		{HR: 6132, appVisMag: 2.74, absVisMag: 0.58, plx: 37.18, BV: 0.91, type: 48, lumNum: 3, typeStr: "G8-IIIab"}, 
		{HR: 6056, appVisMag: 2.74, absVisMag: -0.86, plx: 19.16, BV: 1.58, type: 60.5, lumNum: 3, typeStr: "M0.5III"}, 
		{HR: 5028, appVisMag: 2.75, absVisMag: 1.47, plx: 55.64, BV: 0.04, type: 22, lumNum: 5, typeStr: "A2V"}, 
		{HR: 5531, appVisMag: 2.75, absVisMag: 0.87, plx: 42.25, BV: 0.15, type: 23, lumNum: 4, typeStr: "A3IV"}, 
		{HR: 4199, appVisMag: 2.76, absVisMag: -2.91, plx: 7.43, BV: -0.22, type: 10, lumNum: 5, typeStr: "B0Vp"}, 
		{HR: 6148, appVisMag: 2.77, absVisMag: -0.52, plx: 22.07, BV: 0.94, type: 47, lumNum: 3, typeStr: "G7IIIa"}, 
		{HR: 6603, appVisMag: 2.77, absVisMag: 0.76, plx: 39.78, BV: 1.16, type: 52, lumNum: 3, typeStr: "K2III"}, 
		{HR: 1899, appVisMag: 2.77, absVisMag: -5.31, plx: 2.46, BV: -0.24, type: 9, lumNum: 3, typeStr: "O9III"}, 
		{HR: 5776, appVisMag: 2.78, absVisMag: -3.45, plx: 5.75, BV: -0.2, type: 12, lumNum: 4, typeStr: "B2IV"}, 
		{HR: 1666, appVisMag: 2.79, absVisMag: 0.61, plx: 36.71, BV: 0.13, type: 23, lumNum: 3, typeStr: "A3III"}, 
		{HR: 6536, appVisMag: 2.79, absVisMag: -2.45, plx: 9.02, BV: 0.98, type: 42, lumNum: 1.5, typeStr: "G2Ib-IIa"}, 
		{HR: 4656, appVisMag: 2.8, absVisMag: -2.46, plx: 8.96, BV: -0.23, type: 12, lumNum: 4, typeStr: "B2IV"}, 
		{HR: 98, appVisMag: 2.8, absVisMag: 3.43, plx: 133.78, BV: 0.62, type: 42, lumNum: 4, typeStr: "G2IV"}, 
		{HR: 3185, appVisMag: 2.81, absVisMag: 1.38, plx: 51.99, BV: 0.43, type: 36, lumNum: 2, typeStr: "F6IIpDel Del"}, 
		{HR: 6212, appVisMag: 2.81, absVisMag: 2.64, plx: 92.64, BV: 0.65, type: 40, lumNum: 4, typeStr: "G0IV"}, 
		{HR: 6913, appVisMag: 2.81, absVisMag: 0.93, plx: 42.2, BV: 1.04, type: 51, lumNum: 3, typeStr: "K1+IIIb"}, 
		{HR: 6165, appVisMag: 2.82, absVisMag: -2.80, plx: 7.59, BV: -0.25, type: 10, lumNum: 5, typeStr: "B0V"}, 
		{HR: 39, appVisMag: 2.83, absVisMag: -2.24, plx: 9.79, BV: -0.23, type: 12, lumNum: 4, typeStr: "B2IV"}, 
		{HR: 4932, appVisMag: 2.83, absVisMag: 0.34, plx: 31.9, BV: 0.94, type: 48, lumNum: 3, typeStr: "G8IIIab"}, 
		{HR: 1829, appVisMag: 2.84, absVisMag: -0.62, plx: 20.49, BV: 0.82, type: 45, lumNum: 2, typeStr: "G5II"}, 
		{HR: 1203, appVisMag: 2.85, absVisMag: -4.57, plx: 3.32, BV: 0.12, type: 11, lumNum: 1.1, typeStr: "B1Ib"}, 
		{HR: 5897, appVisMag: 2.85, absVisMag: 2.40, plx: 81.24, BV: 0.29, type: 32, lumNum: 3, typeStr: "F2III"}, 
		{HR: 6461, appVisMag: 2.85, absVisMag: -3.51, plx: 5.41, BV: 1.46, type: 53, lumNum: 1.5, typeStr: "K3Ib-IIa"}, 
		{HR: 591, appVisMag: 2.86, absVisMag: 1.15, plx: 45.74, BV: 0.28, type: 30, lumNum: 5, typeStr: "F0V"}, 
		{HR: 8502, appVisMag: 2.86, absVisMag: -1.08, plx: 16.42, BV: 1.39, type: 53, lumNum: 3, typeStr: "K3III"}, 
		{HR: 8322, appVisMag: 2.87, absVisMag: 2.50, plx: 84.58, BV: 0.29, type: 27, lumNum: 3, typeStr: "A7III"}, 
		{HR: 1165, appVisMag: 2.87, absVisMag: -2.41, plx: 8.87, BV: -0.09, type: 17, lumNum: 3, typeStr: "B7IIIe"}, 
		{HR: 7528, appVisMag: 2.87, absVisMag: -0.74, plx: 19.07, BV: -0.03, type: 19.5, lumNum: 4, typeStr: "B9.5IV+F1V"}, 
		{HR: 2890, appVisMag: 2.88, absVisMag: 1.97, plx: 66, BV: 0.04, type: 22, lumNum: 5, typeStr: "A2Vm"}, 
		{HR: 2286, appVisMag: 2.88, absVisMag: -1.40, plx: 14.07, BV: 1.64, type: 63, lumNum: 3, typeStr: "M3IIIab"}];         
	}

	{// The brightAndNearbyStarsList consists of the stars that are in both of the nearby and bright star lists. 
	// The HR and BV values come from the bright star list, otherwise the properties are from the nearby star 
	// list (there is little difference in values). 

	var brightAndNearbyStarsList = [{sysNum: 53, HR: 7557, BV: 0.22, appVisMag: 0.77, absVisMag: 2.22, type: 27, lumNum: 4.5, typeStr: "A7 IV-V", mass: 1.71, plx: 0.19497, name: "GJ 768", altName: "Altair"}, 
		{sysNum: 5, HR: 2491, BV: 0, appVisMag: -1.43, absVisMag: 1.47, type: 21, lumNum: 5, typeStr: "A1 V", mass: 1.99, plx: 0.38002, name: "GJ 244 A", altName: "Sirius"}, 
		{sysNum: 13, HR: 2943, BV: 0.42, appVisMag: 0.38, absVisMag: 2.66, type: 35, lumNum: 4.5, typeStr: "F5 IV-V", mass: 1.57, plx: 0.28605, name: "GJ 280 A", altName: "Procyon"}, 
		{sysNum: 1, HR: 5459, BV: 0.71, appVisMag: 0.01, absVisMag: 4.38, type: 42, lumNum: 5, typeStr: "G2 V", mass: 1.14, plx: 0.74723, name: "GJ 559 A", altName: "alpha Centauri A"}, 
		{sysNum: 1, HR: 5460, BV: 0.88, appVisMag: 1.34, absVisMag: 5.71, type: 50, lumNum: 5, typeStr: "K0 V", mass: 0.92, plx: 0.74723, name: "GJ 559 B", altName: "alpha Centauri B"}]; 
	}
	
	var temp;
	var lum;
	
	//for all original lists, pull out temp and lum and store in smaller lists
	for (S in brightStarsList){
		var star = brightStarsList[S];
		temp = getLogTempFromType(star.type);
		lum = getLogLumFromAbsVisMag(star.absVisMag, getBCFromLogTemp(temp));
		brightTempAndLum[S] = {temperature: temp, luminosity: lum};
	}
	
	for (S in nearbyStarsList){
		var star = nearbyStarsList[S];
		temp = getLogTempFromType(star.type);
		lum = getLogLumFromAbsVisMag(star.absVisMag, getBCFromLogTemp(temp));
		nearbyTempAndLum[S] = {temperature: temp, luminosity: lum};
	}
	
	for (S in brightAndNearbyStarsList){
		var star = brightAndNearbyStarsList[S];
		temp = getLogTempFromType(star.type);
		lum = getLogLumFromAbsVisMag(star.absVisMag, getBCFromLogTemp(temp));
		brightAndNearbyTempAndLum[S] = {temperature: temp, luminosity: lum};
	}
}


function getColorFromTemp(temp){ 
	// - this function takes a temperature and returns the associated blackbody color 
	// - the polynomial coefficients were derived from the blackbody curve color data 
	//   found at http://www.vendian.org/mncharity/dir3/blackbody/ 

	if (temp<1000) temp = 1000; 
	else if (temp>40000) temp = 40000; 

	var logT = Math.log(temp)/Math.LN10; 
	var logT2 = logT*logT; 
	var logT3 = logT*logT2; 

	var r = 22686.34111 - logT*15082.52755 + logT2*3375.333832 - logT3*252.4073853;
	if (r<0) r = 0; 
	else if (r>255) r = 255; 

	if (temp<=6500) var g = -811.6499145 + logT*36.97365953 + logT2*160.7861677 - logT3*25.57573664; 
	else var g = 13836.23586 - logT*9069.078214 + logT2*2015.254756 - logT3*149.7766966; 

	var b = -11545.34298 + logT*8529.658165 - logT2*2150.198586 + logT3*190.0306573; 
	if (b<0) b = 0; 
	else if (b>255) b = 255;

	return "rgb(" + String(Math.round(r)) + ", " + String(Math.round(g)) + ", " + String(Math.round(b)) + ")"; 
}

function getLogTempFromType(x) { 
	if (x<8.5167) return 4.7009+x*(-0.01000+x*(0.0000392+x*-0.000142470)); 
	else if (x<16.1000) return 4.4348+x*(0.08374+x*(-0.0109670+x*0.000288299)); 
	else if (x<23.2167) return 6.0516+x*(-0.21754+x*(0.0077460+x*-0.000099133)); 
	else if (x<34.1833) return 5.0538+x*(-0.08861+x*(0.0021924+x*-0.000019396)); 
	else if (x<50.5108) return 4.7553+x*(-0.06241+x*(0.0014259+x*-0.000011922)); 
	else if (x<57.9775) return 1.1584+x*(0.15122+x*(-0.0028034+x*0.000015988)); 
	else if (x<64.3942) return 26.4612+x*(-1.15805+x*(0.0197790+x*-0.000113846)); 
	else return -115.7858+x*(5.46896+x*(-0.0831343+x*0.000418879)); 
}

function getBCFromLogTemp(x) { 
        if (x<3.5880) return -1873.0763+x*(1364.8081+x*(-328.11949+x*25.958485)); 
        else if (x<3.6978) return -4208.8678+x*(3317.8110+x*(-872.43468+x*76.526600)); 
        else if (x<3.7957) return -2920.8124+x*(2272.8215+x*(-589.83737+x*51.052264)); 
        else if (x<3.9030) return 1749.5431+x*(-1418.5107+x*(382.67484+x*-34.353217)); 
        else if (x<4.1317) return -2011.2742+x*(1472.2021+x*(-357.96384+x*28.900577)); 
        else return 123.5421+x*(-77.8864+x*(17.20884+x*-1.367489)); 
}

function getLogLumFromAbsVisMag(absVis, BC) { 
        if (BC==undefined) BC = 0; 
        return (4.75 - absVis - BC)/2.51189; 
}

