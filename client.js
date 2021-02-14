
let function_def = document.getElementById('function_def'),
    value = document.getElementById('value'),
    points = document.getElementById('points'),
    optimizer = document.getElementById('optimizer'),
    go = document.getElementById('go'),
    stop = document.getElementById('stop'),
    last_values = document.getElementById('last_values'),
    last_error = document.getElementById('last_error'),
    error_graph = document.getElementById('error_graph'),
    plot_graph = document.getElementById('plot_graph'),
    
    worker = null,
    lastMessageFromWorker = null,
    updateFromWorker = false,

    viewPort = null,
    pointsParsed = [],
    functionText = "",
    
    errors = [];

error_graph.width = error_graph.getClientRects()[0].width*2;
plot_graph.width = plot_graph.getClientRects()[0].width*2;
window.onresize = _=>{
    error_graph.width = error_graph.getClientRects()[0].width*2;
    plot_graph.width = plot_graph.getClientRects()[0].width*2;
    drawChart();
    drawErrors();
}

let error_graph_context = error_graph.getContext('2d');
let plot_graph_context = plot_graph.getContext('2d');



go.addEventListener("click", _=>{
    if(worker) worker.terminate();
    errors = []
    error_graph_context.clearRect(0, 0, error_graph.width, error_graph.height);
    plot_graph_context.clearRect(0, 0, plot_graph.width, plot_graph.height);

    
    last_error.innerHTML=""
    last_values.innerHTML=""

    functionText = function_def.value;
    let    valueText = value.value,
        realValues = null,
        pointsText = points.value,
        optimizerSelected = optimizer.value;

    pointsParsed = pointsText.split(",").map(i => i.split(":").map(i => parseFloat(i.trim()))) 


    try{
        realValues = eval("("+valueText+")")
    }catch(e){
        alert(e)
        return
    }

    viewPort = calcViewport()

    worker = new Worker("worker.js")
    worker.addEventListener("message", data => {
        errors.push(data.data.error)
        lastMessageFromWorker = data.data;
        updateFromWorker = true;
    })
    worker.postMessage({
        functionText,
        realValues,
        pointsParsed,
        optimizerSelected
    });

    (async function(){

        while (worker !== null) {
            if(updateFromWorker){

                last_values.innerHTML = Object.keys(lastMessageFromWorker.state)
                    .map(i => i + ": " + lastMessageFromWorker.state[i].toFixed(lastMessageFromWorker.precision))
                    .join("\n")
                last_error.innerHTML = lastMessageFromWorker.error
                
                error_graph_context.clearRect(0, 0, error_graph.width, error_graph.height);
                plot_graph_context.clearRect(0, 0, plot_graph.width, plot_graph.height);

                drawErrors()
                drawChart()

                updateFromWorker = false
            }

            await new Promise(res => requestAnimationFrame(res))
        }

    })()

})

stop.addEventListener("click", _=>{
    if(worker) worker.terminate();
    worker=null;
})

function calcViewport(){
    let viewPort = {
        minX: pointsParsed[0][0],
        maxX: pointsParsed[0][0],
        minY: pointsParsed[0][1],
        maxY: pointsParsed[0][1]
    }
    for (let index = 1; index < pointsParsed.length; index++) {
        const element = pointsParsed[index];
        viewPort.minX = Math.min(viewPort.minX, element[0])
        viewPort.maxX = Math.max(viewPort.maxX, element[0])
        viewPort.minY = Math.min(viewPort.minY, element[1])
        viewPort.maxY = Math.max(viewPort.maxY, element[1])
    }

    let diffX = viewPort.maxX - viewPort.minX;
    viewPort.minX -= diffX * 0.2
    viewPort.maxX += diffX * 0.2

    let diffY = viewPort.maxY - viewPort.minY;
    viewPort.minY -= diffY * 0.2
    viewPort.maxY += diffY * 0.2

    return viewPort
}

const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;


function drawErrors(){
    if(errors.length <= 2) return;

    let maxError = errors[0];
    let minError = errors[errors.length-1];
    let valToPx = val => 330 - map(val, minError, maxError, 0, 280)
    let errorWidth = Math.min(10, errors.length / (error_graph.width - 50) )

    error_graph_context.strokeStyle = "#ffa726";
    error_graph_context.lineWidth = 8;
    error_graph_context.beginPath();
    let currentX = 45
    error_graph_context.moveTo(currentX, valToPx(errors[0]));

    for (let index = 1; index < errors.length; index++) {
        currentX += errorWidth
        error_graph_context.lineTo(currentX, valToPx(errors[index]));
    }
    error_graph_context.stroke();

    error_graph_context.fillStyle = "#eee";
    error_graph_context.font = "30px Arial";
    error_graph_context.fillText(errors[0], 10, 40);
    error_graph_context.fillText(errors[errors.length-1], 10, 370);

}
function drawChart(){
    if(viewPort == null) return;
    let xToPx = val => map(val, viewPort.minX, viewPort.maxX, 0, plot_graph.width)
    let yToPx = val => plot_graph.height - map(val, viewPort.minY, viewPort.maxY, 0, plot_graph.height)
    let xDiff = viewPort.maxX - viewPort.minX;
    let yDiff = viewPort.maxY - viewPort.minY;

    

    plot_graph_context.strokeStyle = "#888888";

    // grid
    {
        let xSpace = parseFloat(xDiff.toPrecision(1))/10;
        let ySpace = parseFloat(yDiff.toPrecision(1))/10 ;

        let xMagnitude = Math.max(0, String(xSpace%1).length - 2)
        let yMagnitude = Math.max(0, String(ySpace%1).length - 2)

        let xLine = Math.floor(parseFloat(viewPort.minX.toPrecision(1)) * xSpace)/xSpace
        let yLine = Math.floor(parseFloat(viewPort.minY.toPrecision(1))  * ySpace)/ySpace

    
        plot_graph_context.fillStyle = "#eee";
        plot_graph_context.font = "20px Arial";

        console.log(viewPort)

        getSteps = (start, step, vstart, vstop) => {
            let steps = []

            if(vstart < 0 && vstop > 0){


                let deq = 0 - step;
                while(deq > vstart){
                    steps.push(deq)
                    deq -= step
                }

                steps.push(0)

                
                let inc = 0 + step;
                while(inc < vstop){
                    steps.push(inc)
                    inc += step
                }



            }else{
                while(start < vstop){
                    steps.push(start)
                    start+=step
                }

            }

            return steps;
        }

        for(let x of getSteps(xLine, xSpace, viewPort.minX, viewPort.maxX)){
            plot_graph_context.beginPath()
            if(Math.abs( x ) < 0.0000000001){
                plot_graph_context.lineWidth = 3;
            }else{
                plot_graph_context.lineWidth = 1;
            }
            
            plot_graph_context.moveTo(xToPx(x), 0);
            plot_graph_context.lineTo(xToPx(x), plot_graph.width);
            plot_graph_context.stroke();

            plot_graph_context.fillText(x.toFixed( xMagnitude ), xToPx(x), plot_graph.height - 10);

        }


        for(let y of getSteps(yLine, ySpace, viewPort.minY, viewPort.maxY)){
            
            plot_graph_context.beginPath()
            if(Math.abs( y ) < 0.0000000001){
                plot_graph_context.lineWidth = 3;
            }else{
                plot_graph_context.lineWidth = 1;
            }
            
            plot_graph_context.moveTo(0, yToPx(y));
            plot_graph_context.lineTo(plot_graph.width, yToPx(y));
            plot_graph_context.stroke();

            plot_graph_context.fillText(y.toFixed( yMagnitude ), 10, yToPx(y));

        }
    }

    // curve
    {

        let fxVal = x => {
            let val = 0;
            with(lastMessageFromWorker.state){
                val = eval("("+functionText+")")
            }
            return val
        }

        plot_graph_context.beginPath();

        plot_graph_context.moveTo(xToPx(viewPort.minX), yToPx(fxVal(viewPort.minX)) )
        let moves = xDiff / plot_graph.width;
        for (let index = 1; index < plot_graph.width; index++) {

            plot_graph_context.lineTo(xToPx(viewPort.minX + index* moves), yToPx(fxVal(viewPort.minX + index* moves)) )

            
        }
        plot_graph_context.strokeStyle = '#ffa726';
        plot_graph_context.lineWidth = 3;
        plot_graph_context.stroke();
    }

    // points
    {
        for (let index = 0; index < pointsParsed.length; index++) {
            const element = pointsParsed[index];
            
            plot_graph_context.beginPath();
            plot_graph_context.arc(xToPx(element[0]), yToPx(element[1]), 5, 0, 2 * Math.PI, false);
            plot_graph_context.fillStyle = '#a5d6a7';
            plot_graph_context.fill();
        }
    }
}