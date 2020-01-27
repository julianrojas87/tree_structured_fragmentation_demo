var drawable = true;

var resultsgraph = null;
async function createResultsGraph(resultsList){
    resultsgraph = Highcharts.chart('resultscontainer', {
        chart: {
            zoomType: 'x'
        },

        title: {
            text: 'Timing of results'
        },
    
        yAxis: {
            title: {
                text: 'results'
            }
        },
        xAxis: {
            accessibility: {
                rangeDescription: "Time (ms)"
            }
        },
    
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },
    
        plotOptions: {
            animation: false,
            series: {
                label: {
                    connectorAllowed: false
                },
            }
        },
    
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 400
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom'
                    }
                }
            }]
        }
    
      });
      resultsgraph.setSize(null, "250px")
    
}

var lastresultsupdate = [];
async function updateResultsGraph(resultsList, currentOffset, currentIndex, currentSearchValue){
    if (! drawable){return}
    let newResultsList = []
    
    for (let i = 0; i < resultsList.length; i++){
        newResultsList.push([resultsList[i]+parseFloat(currentOffset), i+1])
    }
       
    // resultsgraph.series[0].setData(resultsList, true)
    lastresultsupdatelength = newResultsList.length
    resultsgraph.addSeries( {
        id: currentIndex,
        name: currentSearchValue,
        data: newResultsList
    }, true)
    
    
    // resultsgraph.series[0].data = resultsList
    // resultsgraph.redraw()
}

async function addPlotBand(offsetObject){
    if (! drawable){return}
    console.log(offsetObject)
    resultsgraph.xAxis[0].addPlotBand({
        color: 'black', // Color value
        from: offsetObject.time, // Start of the plot band
        to: offsetObject.time + 1 //
    })
    
}


async function addPlotBandhit(offsetObject, time){
    if (! drawable){return}
    resultsgraph.xAxis[0].addPlotBand({
        color: 'lightgreen', // Color value
        from: offsetObject.time+time, // Start of the plot band
        to: offsetObject.time+time + 1 //
    })
    
}

async function addPlotBandmiss(offsetObject, time){
    if (! drawable){return}
    resultsgraph.xAxis[0].addPlotBand({
        color: 'lightpink', // Color value
        from: offsetObject.time+time, // Start of the plot band
        to: offsetObject.time+time + 1 //
    })
    
}

function resetCharts(){
    totalBandwidth = 0
    bandwidthHistory = []
    
    currentStartTiming = null
    currentResponseTimings = []
    
    createResultsGraph([])
}
