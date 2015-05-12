var Animator = function(context){
    var animating = false;
    var paused = true;
    var points = [];
    var generator = fractal(context);

    var pIndex = -2, dt = 1, bz = null;
    function draw() {
        if(dt >= 1) {
            pIndex += 3;
            dt = 0;
            bz = Painter.prototype.bezier4(points[pIndex], points[pIndex + 1], points[pIndex + 2], points[pIndex + 3]);
        }

        if(pIndex + 3 >= points.length){
            return null;
        }

        var p = bz(dt);
        dt += 0.005;
        return {x: p.x, y: p.y};
    }

    function runLoop(){
        //if(paused) return;
        generator.start(draw);
        //draw();
        //requestAnimFrame(runLoop);
    }

    function start(p){
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        animating = true;
        points = p;
        pIndex = -2;
        dt = 1;
        unpause();
    }

    function pause(){
        paused = true;
    }

    function unpause() {
        paused = false;
        runLoop();
    }

    function stop(){
        generator.stop();
        animating = false;
        points = [];
    }

    return {
        start: start,
        pause: pause,
        unpause: unpause,
        stop: stop
    };

};


initializePainter = function(canvas) {
    var painter = new Painter(canvas);
    var points = [];
    var down = false, selectedPointIndex = -1, updatePointIndex = 0, hoveredPointIndex = -1;
    var animator = new Animator(painter.context);

    repaint = function() {
        painter.clear();
        painter.context.fillStyle = "#f1c40f";
        painter.context.strokeStyle = "#f1c40f";
        if (selectedPointIndex >= 0) {
            painter.drawCirclePoint(points[updatePointIndex + 1]);
            if (updatePointIndex >= 3) {
                painter.context.fillStyle = "#cccccc";
                painter.drawCirclePoint(points[updatePointIndex - 2]);
                painter.context.strokeStyle = "#cccccc";
                painter.drawLine(points[updatePointIndex - 3], points[updatePointIndex - 2]);
            }

            painter.context.fillStyle = "#f1c40f";
            painter.context.strokeStyle = "#f1c40f";            
            painter.drawCirclePoint(points[updatePointIndex - 1]);
            painter.drawLine(points[updatePointIndex - 1], points[updatePointIndex]);
            painter.drawLine(points[updatePointIndex], points[updatePointIndex + 1]);
            painter.fillRectPoint(points[updatePointIndex]);
        }

        painter.context.fillStyle = "#333333";
        painter.context.strokeStyle = "#333333";
        for (var i = 1; i + 3 < points.length; i += 3)
            painter.interpolate(painter.bezier4(points[i], points[i + 1], points[i + 2], points[i + 3]));
        for (var i = 1; i < points.length; i += 3) {
            if(i === updatePointIndex) continue;
            if(hoveredPointIndex === i || updatePointIndex === i) {
                painter.context.fillStyle = "#f1c40f";
                painter.fillRectPoint(points[i]);
            }
            else {
                painter.drawRectPoint(points[i]);    
            }
            
        }
    };

    var resizeCanvas = function(w, h) {
        canvas.width = w;
        canvas.height = h;
    };
    resizeCanvas(window.innerWidth, window.innerHeight);

    $(window).on('resize', function(){
        resizeCanvas(window.innerWidth, window.innerHeight);
        repaint();
    });
    $(canvas).on('contextmenu', function(e){ return false; });

    function indexOfVector2(vec, arr, center) {
        var boxRadius = 5;
        var box = {
            top: vec.y - boxRadius,
            right: vec.x + boxRadius,
            bottom: vec.y + boxRadius,
            left: vec.x - boxRadius
        };

        for(var i = 0; i < arr.length; i++) {
            if( arr[i].x >= box.left && 
                arr[i].x <= box.right && 
                arr[i].y >= box.top &&
                arr[i].y <= box.bottom ) {
                if(center) {
                    if(i % 3 !== 1) {
                        continue;
                    }
                }
                return i;
            }
        }
        return -1;
    }

    function getCenterIndex(index) {
        if(index % 3 === 0) {
            return index + 1;
        }
        else if(index % 3 === 1) {
            return index;
        }
        else {
            return index - 1;
        }
    }

    var offset = $(canvas).offset();
    function mouseDownHandler(event) {
        if (down) return;
        down = true;

        var x = event.clientX - offset.left;
        var y = event.clientY - offset.top;

        centerPointIndex = indexOfVector2(new Vector2(x, y), points, true);
        selectedPointIndex = indexOfVector2(new Vector2(x, y), points);
        if(centerPointIndex >= 0 && Math.abs(centerPointIndex-selectedPointIndex)) {
            selectedPointIndex = centerPointIndex;    
        }
        if(event.which === 3 && centerPointIndex >= 0) {
            points.splice(centerPointIndex - 1, 3);
            selectedPointIndex = updatePointIndex = -1;
            down = false;
            return repaint();
        }
        updatePointIndex = getCenterIndex(selectedPointIndex);
        if(selectedPointIndex < 0) {
            points.push(new Vector2(x, y));
            points.push(new Vector2(x, y));
            points.push(new Vector2(x, y));
            updatePointIndex = points.length - 2;
            selectedPointIndex = points.length - 1;
        }
        repaint();
    }

    function mouseMoveHandler(event) {
        var x = event.clientX - offset.left;
        var y = event.clientY - offset.top;
        var pointIndex = indexOfVector2(new Vector2(x, y), points, true);
        if (!down) {
            if(hoveredPointIndex !== pointIndex) {
                hoveredPointIndex = pointIndex;
                repaint();    
            }
            return;
        }

        if(selectedPointIndex < 0) {
            updatePointIndex = points.length - 2; 
            var p1 = points[updatePointIndex - 1];
            var p = points[updatePointIndex];
            var p2 = points[updatePointIndex + 1];

            p2.x = x;
            p2.y = y;
            p1.x = p.x + p.x - p2.x;
            p1.y = p.y + p.y - p2.y;
        }
        else{
            points[selectedPointIndex].x = x;
            points[selectedPointIndex].y = y;
            var centerPointIndex = getCenterIndex(selectedPointIndex);
            if(selectedPointIndex % 3 === 0) {
                updatePointIndex = selectedPointIndex + 2;
            }
            else if(selectedPointIndex % 3 === 2) {
                updatePointIndex = selectedPointIndex - 2; 
            }
            points[updatePointIndex].x = 2 * points[centerPointIndex].x - x;
            points[updatePointIndex].y = 2 * points[centerPointIndex].y - y;
            updatePointIndex = centerPointIndex;     
        } 


        repaint();
    }
    function mouseUpHandler(event) {
        down = false;
    }


    function setEditMode() {
        animator.stop();
        $(canvas).on('mousedown', mouseDownHandler);
        $(canvas).on('mousemove', mouseMoveHandler);
        $(canvas).on('mouseup', mouseUpHandler);

        resizeCanvas(window.innerWidth, window.innerHeight);
        repaint();
        $('.info').show();
    }

    function setAnimMode() {
        $('.info').hide();
        $(canvas).off('mousedown', mouseDownHandler);
        $(canvas).off('mousemove', mouseMoveHandler);
        $(canvas).off('mouseup', mouseUpHandler);

        animator.start(points);
    }

   $('input:radio[name="mode"]').change(function() {
        if($(this).val() === "edit") {
            setEditMode();
        }
        else {
            setAnimMode();
        }
   });

   setEditMode();
};

Vector2 = function(x, y) {
    this.x = x;
    this.y = y;
};

Vector2.prototype.add = function(that) {
    return new Vector2(this.x + that.x, this.y + that.y);
};

Vector2.prototype.multiply = function(that) {
    return new Vector2(this.x * that, this.y * that);
}

Painter = function(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
};

Painter.prototype.clear = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.strokeStyle = "#ffffff";
    this.context.fillStyle = "#ffffff";
};

Painter.prototype.drawCirclePoint = function(point) {
    this.context.beginPath();
    this.context.arc(point.x, point.y, 3, 0, 2 * Math.PI);
    this.context.fill();
};

Painter.prototype.drawRectPoint = function(point) {
    this.context.strokeStyle = "#aaaaaa";
    this.context.fillStyle = "#aaaaaa";
    this.context.beginPath();
    this.context.rect(point.x - 3, point.y - 3, 6, 6);
    this.context.stroke();
};

Painter.prototype.fillRectPoint = function(point) {
    this.context.beginPath();
    this.context.rect(point.x - 3, point.y - 3, 6, 6);
    this.context.fill();
};

Painter.prototype.drawLine = function(point1, point2) {
    this.context.beginPath();
    this.context.moveTo(point1.x, point1.y);
    this.context.lineTo(point2.x, point2.y);
    this.context.stroke();
};

Painter.prototype.interpolate = function(interpolater, precision) {
    precision = precision || 0.01;
    this.context.beginPath();
    var p0 = interpolater(0);
    this.context.moveTo(p0.x, p0.y);
    for (var t = precision; t <= 1; t += precision) {
        var p = interpolater(t);
        this.context.lineTo(p.x, p.y);
    }
    this.context.stroke();
}

Painter.prototype.bezier3 = function(A, B, C) {
    return function(t) {
        return A.multiply(Math.pow(1 - t, 2)).add(B.multiply(2 * t * (1 - t))).add(C.multiply(t * t));
    };
};

Painter.prototype.bezier4 = function(A, B, C, D) {
    return function(t) {
        return A.multiply(Math.pow(1 - t, 3)).add(
               B.multiply(3 * t * Math.pow(1 - t, 2))).add(
               C.multiply(3 * t * t * (1 - t))).add(
               D.multiply(Math.pow(t, 3)));
    };
};

var requestAnimFrame = (function(callback) {
            return requestAnimationFrame
                    || webkitRequestAnimationFrame
                    || mozRequestAnimationFrame
                    || oRequestAnimationFrame
                    || msRequestAnimationFrame
                    || function(callback) { setTimeout(callback, 1000 / 60); }; })();