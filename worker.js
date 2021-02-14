
function calcError(inputs, state, optimizerSelected, functionText) {
    let error = 0;

    for (let i = 0; i < inputs.length; i++) {
        let x = inputs[i][0];
        let val = 0;
        with(state){
            val = eval("("+functionText+")")
        }
        
        let aim = inputs[i][1];
        let diff = Math.abs(aim - val)
        if(optimizerSelected === "diff2") diff = diff*diff;
        error += diff
    }

    return error
}


self.addEventListener("message", async data => {
    let inputs = data.data;

    /*
    functionText: "Math.sin(x * (Math.PI/6) + c) * d + a"
    optimizerSelected: "diff"
    pointsParsed: Array(14)
    0: (2) [0, 2.22]
    1: (2) [1, 2.76]
    2: (2) [2, 3.5]
    3: (2) [3, 4.16]
    4: (2) [4, 4.72]
    realValues: {d: 1.5, c: -2, a: 3.5}
*/

    let state = inputs.realValues;
    let lastError = calcError(inputs.pointsParsed, state, inputs.optimizerSelected, inputs.functionText);
    let change = 1;
    let precision = 0;
    
    while (true) {
        let bestIterationError = Infinity;
        let bestIterationState = null;

        for (let componentName of Object.keys(state)) {
            for (let offset of [-change, change]) {
                let testState = { ...state }
                testState[componentName] += offset;
                let error = calcError(inputs.pointsParsed, testState, inputs.optimizerSelected, inputs.functionText)

                if (error < bestIterationError) {
                    bestIterationError = error;
                    bestIterationState = testState
                }
            }
        }
        if (bestIterationError < lastError) {
            lastError = bestIterationError
            state = bestIterationState

         //   console.log(lastError, state)

            self.postMessage({
                state,
                precision,
                error: lastError
            })

        } else {
            change *= .1;
            precision ++;
        }

        await new Promise(r => setTimeout(r, 25))


        if(precision > 13) return
    }



})