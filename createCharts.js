var resultsgraph = null;
async function createResultsGraph(resultsList){
    resultsgraph = Highcharts.chart('resultscontainer', {

        chart: {
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

    console.log("RESULTS", resultsList)
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

function addPlotBand(offsetObject){
    console.log(offsetObject)
    resultsgraph.xAxis[0].addPlotBand({
        color: 'gray', // Color value
        from: offsetObject.time, // Start of the plot band
        to: offsetObject.time + 1 //
    })
    
}

function resetCharts(){
    totalBandwidth = 0
    bandwidthHistory = []
    
    currentStartTiming = null
    currentResponseTimings = []
    
    createResultsGraph([])
}

// var bandwidthgraph = null
// async function updateBandwidthGraph(newdata){
//     bandwidthgraph.series.data = newdata
//     bandwidthgraph.redraw()
// }


// async function createBandwidthGraph(){
//   bandwidthgraph = Highcharts.chart('bandwidthfigurecontainer', {

//     title: {
//         text: 'Used Bandwidth'
//     },

//     yAxis: {
//         title: {
//             text: 'Bandwidth (kB)'
//         }
//     },

//     xAxis: {
//         accessibility: {
//             rangeDescription: "Executed Query"
//         }
//     },

//     legend: {
//         layout: 'vertical',
//         align: 'right',
//         verticalAlign: 'middle'
//     },

//     plotOptions: {
//         series: {
//             label: {
//                 connectorAllowed: false
//             },
//         }
//     },

//     series: [{
//         name: 'Bandwidth',
//         data: []
//     }],

//     responsive: {
//         rules: [{
//             condition: {
//                 maxWidth: 500
//             },
//             chartOptions: {
//                 legend: {
//                     layout: 'horizontal',
//                     align: 'center',
//                     verticalAlign: 'bottom'
//                 }
//             }
//         }]
//     }

//   });

// }

// function createResultsGraph(dataArray){

// Highcharts.chart('resultscontainer', {
//     title: {
//         text: 'Timing of results'
//     },

//     xAxis: [{
//         title: { text: 'Timing (ms)' },
//         alignTicks: false
//     }],

//     series: [{
//             name: 'Histogram',
//             type: 'histogram',
//             xAxis: 1,
//             yAxis: 1,
//             baseSeries: dataArray,
//             zIndex: -1
//         }
//     ]
//     });

// }

// function updateGraphs(){
//   createBandwidthGraph()
// }

function isEqual(a, b) 
{ 
  // if length is not equal 
  if(a.length!=b.length) 
   return "False"; 
  else
  { 
  // comapring each element of array 
   for(var i=0;i<a.length;i++) 
   if(a[i]!=b[i]) 
    return "False"; 
  } 
  return "True"; 
} 