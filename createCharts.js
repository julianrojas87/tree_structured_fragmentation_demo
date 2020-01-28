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
colors = ['rgba(20,100,0,1)', 'rgba(0,0,255,1)', 'rgba(255,85,0,1)', 'rgba(0,125,255,1)', 'rgba(165,0,255,1)', 'rgba(100,40,0,1)']
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
        data: newResultsList,
        color: colors[currentIndex%colors.length], // Color value
    }, true)
    
    
    // resultsgraph.series[0].data = resultsList
    // resultsgraph.redraw()
}

async function addPlotBand(offsetObject){
    if (! drawable){return}
    console.log(offsetObject)
    resultsgraph.xAxis[0].addPlotBand({
        color: 'rgba(0,0,0,1)', // Color value
        from: offsetObject.time, // Start of the plot band
        to: offsetObject.time + 0.01 //
    })
    
}


async function addPlotBandhit(offsetObject, time){
    if (! drawable){return}
    resultsgraph.xAxis[0].addPlotBand({
        color: 'rgba(50,255,0,0.55)', // Color value
        from: offsetObject.time+time, // Start of the plot band
        to: offsetObject.time+time + 0.01 //
    }, true)
    
}

async function addPlotBandmiss(offsetObject, time){
    if (! drawable){return}
    resultsgraph.xAxis[0].addPlotBand({
        color: 'rgba(255,50,0,0.55)', // Color value
        from: offsetObject.time+time, // Start of the plot band
        to: offsetObject.time+time + 0.01 //
    }, true)
}

function resetCharts(){
    totalBandwidth = 0
    bandwidthHistory = []
    
    currentStartTiming = null
    currentResponseTimings = []
    
    createResultsGraph([])
    currentIndex = 0;
}
