(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* globals document confirm btoa */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");

var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;

// ======= WORLD STATE ======

var $graphList = document.querySelector("#graph-list");
var $graphTemplate = document.querySelector("#graph-template");

function stringToHTML(s) {
  var temp = document.createElement("div");
  temp.innerHTML = s;
  return temp.children[0];
}

var states,
  runners,
  results,
  graphState = {};

function updateUI(key, scores) {
  var $graph = $graphList.querySelector("#graph-" + key);
  var $newGraph = stringToHTML($graphTemplate.innerHTML);
  $newGraph.id = "graph-" + key;
  if ($graph) {
    $graphList.replaceChild($graph, $newGraph);
  } else {
    $graphList.appendChild($newGraph);
  }
  console.log($newGraph);
  var scatterPlotElem = $newGraph.querySelector(".scatterplot");
  scatterPlotElem.id = "graph-" + key + "-scatter";
  graphState[key] = plot_graphs(
    $newGraph.querySelector(".graphcanvas"),
    $newGraph.querySelector(".topscores"),
    scatterPlotElem,
    graphState[key],
    scores,
    {}
  );
}

var generationConfig = require("./generation-config");

var box2dfps = 60;
var max_car_health = box2dfps * 10;

var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema,
};

var manageRound = {
  genetic: require("./machine-learning/genetic-algorithm/manage-round.js"),
  annealing: require("./machine-learning/simulated-annealing/manage-round.js"),
};

var createListeners = function (key) {
  return {
    preCarStep: function () {},
    carStep: function () {},
    carDeath: function (carInfo) {
      carInfo.score.i = states[key].counter;
    },
    generationEnd: function (results) {
      handleRoundEnd(key, results);
    },
  };
};

function generationZero() {
  var obj = Object.keys(manageRound).reduce(
    function (obj, key) {
      obj.states[key] = manageRound[key].generationZero(generationConfig());
      obj.runners[key] = worldRun(
        world_def,
        obj.states[key].generation,
        createListeners(key)
      );
      obj.results[key] = [];
      graphState[key] = {};
      return obj;
    },
    { states: {}, runners: {}, results: {} }
  );
  states = obj.states;
  runners = obj.runners;
  results = obj.results;
}

function handleRoundEnd(key, scores) {
  var previousCounter = states[key].counter;
  states[key] = manageRound[key].nextGeneration(
    states[key],
    scores,
    generationConfig()
  );
  runners[key] = worldRun(
    world_def,
    states[key].generation,
    createListeners(key)
  );
  if (states[key].counter === previousCounter) {
    console.log(results);
    results[key] = results[key].concat(scores);
  } else {
    handleGenerationEnd(key);
    results[key] = [];
  }
}

function runRound() {
  var toRun = new Map();
  Object.keys(states).forEach(function (key) {
    toRun.set(key, states[key].counter);
  });
  console.log(toRun);
  while (toRun.size) {
    console.log("running");
    Array.from(toRun.keys()).forEach(function (key) {
      if (states[key].counter === toRun.get(key)) {
        runners[key].step();
      } else {
        toRun.delete(key);
      }
    });
  }
}

function handleGenerationEnd(key) {
  var scores = results[key];
  scores.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1;
    } else {
      return 1;
    }
  });
  updateUI(key, scores);
  results[key] = [];
}

function cw_resetPopulationUI() {
  $graphList.innerHTML = "";
}

function cw_resetWorld() {
  cw_resetPopulationUI();
  Math.seedrandom();
  generationZero();
}

document
  .querySelector("#new-population")
  .addEventListener("click", function () {
    cw_resetPopulationUI();
    generationZero();
  });

document.querySelector("#confirm-reset").addEventListener("click", function () {
  cw_confirmResetWorld();
});

document.querySelector("#fast-forward").addEventListener("click", function () {
  runRound();
});

function cw_confirmResetWorld() {
  if (confirm("Really reset world?")) {
    cw_resetWorld();
  } else {
    return false;
  }
}

cw_resetWorld();

},{"./draw/plot-graphs.js":6,"./generation-config":10,"./machine-learning/genetic-algorithm/manage-round.js":14,"./machine-learning/simulated-annealing/manage-round.js":16,"./world/run.js":17}],2:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1
}

},{}],3:[function(require,module,exports){
var carConstants = require("./car-constants.json");

module.exports = {
  worldDef: worldDef,
  carConstants: getCarConstants,
  generateSchema: generateSchema,
};

function worldDef() {
  var box2dfps = 60;
  return {
    gravity: { y: 0 },
    doSleep: true,
    floorseed: "abc",
    maxFloorTiles: 200,
    mutable_floor: false,
    motorSpeed: 20,
    box2dfps: box2dfps,
    max_car_health: box2dfps * 10,
    tileDimensions: {
      width: 1.5,
      height: 0.15,
    },
  };
}

function getCarConstants() {
  return carConstants;
}

function generateSchema(values) {
  return {
    wheel_radius: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinRadius,
      range: values.wheelRadiusRange,
      factor: 1,
    },
    wheel_density: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinDensity,
      range: values.wheelDensityRange,
      factor: 1,
    },
    chassis_density: {
      type: "float",
      length: 1,
      min: values.chassisDensityRange,
      range: values.chassisMinDensity,
      factor: 1,
    },
    vertex_list: {
      type: "float",
      length: 12,
      min: values.chassisMinAxis,
      range: values.chassisAxisRange,
      factor: 1,
    },
    wheel_vertex: {
      type: "shuffle",
      length: 8,
      limit: values.wheelCount,
      factor: 1,
    },
  };
}

},{"./car-constants.json":2}],4:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/

var createInstance = require("../machine-learning/create-instance");

module.exports = defToCar;

function defToCar(normal_def, world, constants) {
  var car_def = createInstance.applyTypes(constants.schema, normal_def);
  var instance = {};
  instance.chassis = createChassis(
    world,
    car_def.vertex_list,
    car_def.chassis_density
  );
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    instance.wheels[i] = createWheel(
      world,
      car_def.wheel_radius[i],
      car_def.wheel_density[i]
    );
  }

  var carmass = instance.chassis.GetMass();
  for (i = 0; i < wheelCount; i++) {
    carmass += instance.wheels[i].GetMass();
  }

  var joint_def = new b2RevoluteJointDef();

  for (i = 0; i < wheelCount; i++) {
    var torque = (carmass * -constants.gravity.y) / car_def.wheel_radius[i];

    var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque;
    joint_def.motorSpeed = -constants.motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = instance.chassis;
    joint_def.bodyB = instance.wheels[i];
    world.CreateJoint(joint_def);
  }

  return instance;
}

function createChassis(world, vertexs, density) {
  var vertex_list = new Array();
  vertex_list.push(new b2Vec2(vertexs[0], 0));
  vertex_list.push(new b2Vec2(vertexs[1], vertexs[2]));
  vertex_list.push(new b2Vec2(0, vertexs[3]));
  vertex_list.push(new b2Vec2(-vertexs[4], vertexs[5]));
  vertex_list.push(new b2Vec2(-vertexs[6], 0));
  vertex_list.push(new b2Vec2(-vertexs[7], -vertexs[8]));
  vertex_list.push(new b2Vec2(0, -vertexs[9]));
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]));

  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  createChassisPart(body, vertex_list[0], vertex_list[1], density);
  createChassisPart(body, vertex_list[1], vertex_list[2], density);
  createChassisPart(body, vertex_list[2], vertex_list[3], density);
  createChassisPart(body, vertex_list[3], vertex_list[4], density);
  createChassisPart(body, vertex_list[4], vertex_list[5], density);
  createChassisPart(body, vertex_list[5], vertex_list[6], density);
  createChassisPart(body, vertex_list[6], vertex_list[7], density);
  createChassisPart(body, vertex_list[7], vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}

function createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0, 0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list, 3);

  body.CreateFixture(fix_def);
}

function createWheel(world, radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

},{"../machine-learning/create-instance":13}],5:[function(require,module,exports){
module.exports = {
  getInitialState: getInitialState,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function getInitialState(world_def) {
  return {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  };
}

function updateState(constants, worldConstruct, state) {
  if (state.health <= 0) {
    throw new Error("Already Dead");
  }
  if (state.maxPositionx > constants.finishLine) {
    throw new Error("already Finished");
  }

  // console.log(state);
  // check health
  var position = worldConstruct.chassis.GetPosition();
  // check if car reached end of the path
  var nextState = {
    frames: state.frames + 1,
    maxPositionx:
      position.x > state.maxPositionx ? position.x : state.maxPositionx,
    maxPositiony:
      position.y > state.maxPositiony ? position.y : state.maxPositiony,
    minPositiony:
      position.y < state.minPositiony ? position.y : state.minPositiony,
  };

  if (position.x > constants.finishLine) {
    return nextState;
  }

  if (position.x > state.maxPositionx + 0.02) {
    nextState.health = constants.max_car_health;
    return nextState;
  }
  nextState.health = state.health - 1;
  if (Math.abs(worldConstruct.chassis.GetLinearVelocity().x) < 0.001) {
    nextState.health -= 5;
  }
  return nextState;
}

function getStatus(state, constants) {
  if (hasFailed(state, constants)) return -1;
  if (hasSuccess(state, constants)) return 1;
  return 0;
}

function hasFailed(state /*, constants */) {
  return state.health <= 0;
}
function hasSuccess(state, constants) {
  return state.maxPositionx > constants.finishLine;
}

function calculateScore(state, constants) {
  var avgspeed = (state.maxPositionx / state.frames) * constants.box2dfps;
  var position = state.maxPositionx;
  var score = position + avgspeed;
  return {
    v: score,
    s: avgspeed,
    x: position,
    y: state.maxPositiony,
    y2: state.minPositiony,
  };
}

},{}],6:[function(require,module,exports){
var scatterPlot = require("./scatter-plot");

module.exports = {
  plotGraphs: function (
    graphElem,
    topScoresElem,
    scatterPlotElem,
    lastState,
    scores,
    config
  ) {
    lastState = lastState || {};
    var generationSize = scores.length;
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    var nextState = cw_storeGraphScores(lastState, scores, generationSize);
    console.log(scores, nextState);
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
    cw_plotAverage(nextState, graphctx);
    cw_plotElite(nextState, graphctx);
    cw_plotTop(nextState, graphctx);
    cw_listTopScores(topScoresElem, nextState);
    nextState.scatterGraph = drawAllResults(
      scatterPlotElem,
      config,
      nextState,
      lastState.scatterGraph
    );
    return nextState;
  },
  clearGraphics: function (graphElem) {
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  },
};

function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  console.log(cw_carScores);
  return {
    cw_topScores: (lastState.cw_topScores || []).concat([
      cw_carScores[0].score,
    ]),
    cw_graphAverage: (lastState.cw_graphAverage || []).concat([
      cw_average(cw_carScores, generationSize),
    ]),
    cw_graphElite: (lastState.cw_graphElite || []).concat([
      cw_eliteaverage(cw_carScores, generationSize),
    ]),
    cw_graphTop: (lastState.cw_graphTop || []).concat([
      cw_carScores[0].score.v,
    ]),
    allResults: (lastState.allResults || []).concat(cw_carScores),
  };
}

function cw_plotTop(state, graphctx) {
  var cw_graphTop = state.cw_graphTop;
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#C83B3B";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo((400 * (k + 1)) / graphsize, cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite(state, graphctx) {
  var cw_graphElite = state.cw_graphElite;
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#7BC74D";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo((400 * (k + 1)) / graphsize, cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage(state, graphctx) {
  var cw_graphAverage = state.cw_graphAverage;
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo((400 * (k + 1)) / graphsize, cw_graphAverage[k]);
  }
  graphctx.stroke();
}

function cw_eliteaverage(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < Math.floor(generationSize / 2); k++) {
    sum += scores[k].score.v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].score.v;
  }
  return sum / generationSize;
}

function cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight) {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0, graphheight);
  graphctx.scale(1, -1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, graphheight / 2);
  graphctx.lineTo(graphwidth, graphheight / 2);
  graphctx.moveTo(0, graphheight / 4);
  graphctx.lineTo(graphwidth, graphheight / 4);
  graphctx.moveTo(0, (graphheight * 3) / 4);
  graphctx.lineTo(graphwidth, (graphheight * 3) / 4);
  graphctx.stroke();
}

function cw_listTopScores(elem, state) {
  var cw_topScores = state.cw_topScores;
  var ts = elem;
  ts.innerHTML = "<b>Top Scores:</b><br />";
  cw_topScores.sort(function (a, b) {
    if (a.v > b.v) {
      return -1;
    } else {
      return 1;
    }
  });

  for (var k = 0; k < Math.min(10, cw_topScores.length); k++) {
    var topScore = cw_topScores[k];
    // console.log(topScore);
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =
      "h:" +
      Math.round(topScore.y2 * 100) / 100 +
      "/" +
      Math.round(topScore.y * 100) / 100 +
      "m";
    var gen = "(Gen " + cw_topScores[k].i + ")";

    ts.innerHTML += [n, score, distance, yrange, gen].join(" ") + "<br />";
  }
}

function drawAllResults(scatterPlotElem, config, allResults, previousGraph) {
  if (!scatterPlotElem) return;
  return scatterPlot(
    scatterPlotElem,
    allResults,
    config.propertyMap,
    previousGraph
  );
}

},{"./scatter-plot":7}],7:[function(require,module,exports){
/* globals vis Highcharts */

// Called when the Visualization API is loaded.

module.exports = highCharts;
function highCharts(elem, scores) {
  var keys = Object.keys(scores[0].def);
  keys = keys.reduce(function (curArray, key) {
    var l = scores[0].def[key].length;
    var subArray = [];
    for (var i = 0; i < l; i++) {
      subArray.push(key + "." + i);
    }
    return curArray.concat(subArray);
  }, []);
  function retrieveValue(obj, path) {
    return path.split(".").reduce(function (curValue, key) {
      return curValue[key];
    }, obj);
  }

  var dataObj = Object.keys(scores).reduce(
    function (kv, score) {
      keys.forEach(function (key) {
        kv[key].data.push([retrieveValue(score.def, key), score.score.v]);
      });
      return kv;
    },
    keys.reduce(function (kv, key) {
      kv[key] = {
        name: key,
        data: [],
      };
      return kv;
    }, {})
  );
  Highcharts.chart(elem.id, {
    chart: {
      type: "scatter",
      zoomType: "xy",
    },
    title: {
      text: "Property Value to Score",
    },
    xAxis: {
      title: {
        enabled: true,
        text: "Normalized",
      },
      startOnTick: true,
      endOnTick: true,
      showLastLabel: true,
    },
    yAxis: {
      title: {
        text: "Score",
      },
    },
    legend: {
      layout: "vertical",
      align: "left",
      verticalAlign: "top",
      x: 100,
      y: 70,
      floating: true,
      backgroundColor:
        (Highcharts.theme && Highcharts.theme.legendBackgroundColor) ||
        "#FFFFFF",
      borderWidth: 1,
    },
    plotOptions: {
      scatter: {
        marker: {
          radius: 5,
          states: {
            hover: {
              enabled: true,
              lineColor: "rgb(100,100,100)",
            },
          },
        },
        states: {
          hover: {
            marker: {
              enabled: false,
            },
          },
        },
        tooltip: {
          headerFormat: "<b>{series.name}</b><br>",
          pointFormat: "{point.x}, {point.y}",
        },
      },
    },
    series: keys.map(function (key) {
      return dataObj[key];
    }),
  });
}

function visChart(elem, scores, propertyMap, graph) {
  // Create and populate a data table.
  var data = new vis.DataSet();
  scores.forEach(function (scoreInfo) {
    data.add({
      x: getProperty(scoreInfo, propertyMap.x),
      y: getProperty(scoreInfo, propertyMap.x),
      z: getProperty(scoreInfo, propertyMap.z),
      style: getProperty(scoreInfo, propertyMap.z),
      // extra: def.ancestry
    });
  });

  function getProperty(info, key) {
    if (key === "score") {
      return info.score.v;
    } else {
      return info.def[key];
    }
  }

  // specify options
  var options = {
    width: "600px",
    height: "600px",
    style: "dot-size",
    showPerspective: true,
    showLegend: true,
    showGrid: true,
    showShadow: false,

    // Option tooltip can be true, false, or a function returning a string with HTML contents
    tooltip: function (point) {
      // parameter point contains properties x, y, z, and data
      // data is the original object passed to the point constructor
      return "score: <b>" + point.z + "</b><br>"; // + point.data.extra;
    },

    // Tooltip default styling can be overridden
    tooltipStyle: {
      content: {
        background: "rgba(255, 255, 255, 0.7)",
        padding: "10px",
        borderRadius: "10px",
      },
      line: {
        borderLeft: "1px dotted rgba(0, 0, 0, 0.5)",
      },
      dot: {
        border: "5px solid rgba(0, 0, 0, 0.5)",
      },
    },

    keepAspectRatio: true,
    verticalRatio: 0.5,
  };

  var camera = graph ? graph.getCameraPosition() : null;

  // create our graph
  var container = elem;
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
  return graph;
}

},{}],8:[function(require,module,exports){
module.exports = generateRandom;
function generateRandom() {
  return Math.random();
}

},{}],9:[function(require,module,exports){
// http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
module.exports = getInbreedingCoefficient;

function getInbreedingCoefficient(child) {
  var nameIndex = new Map();
  var flagged = new Set();
  var convergencePoints = new Set();
  createAncestryMap(child, []);

  var storedCoefficients = new Map();

  return Array.from(convergencePoints.values()).reduce(function (sum, point) {
    var iCo = getCoefficient(point);
    return sum + iCo;
  }, 0);

  function createAncestryMap(initNode) {
    var itemsInQueue = [{ node: initNode, path: [] }];
    do {
      var item = itemsInQueue.shift();
      var node = item.node;
      var path = item.path;
      if (processItem(node, path)) {
        var nextPath = [node.id].concat(path);
        itemsInQueue = itemsInQueue.concat(
          node.ancestry.map(function (parent) {
            return {
              node: parent,
              path: nextPath,
            };
          })
        );
      }
    } while (itemsInQueue.length);

    function processItem(node, path) {
      var newAncestor = !nameIndex.has(node.id);
      if (newAncestor) {
        nameIndex.set(node.id, {
          parents: (node.ancestry || []).map(function (parent) {
            return parent.id;
          }),
          id: node.id,
          children: [],
          convergences: [],
        });
      } else {
        flagged.add(node.id);
        nameIndex.get(node.id).children.forEach(function (childIdentifier) {
          var offsets = findConvergence(childIdentifier.path, path);
          if (!offsets) {
            return;
          }
          var childID = path[offsets[1]];
          convergencePoints.add(childID);
          nameIndex.get(childID).convergences.push({
            parent: node.id,
            offsets: offsets,
          });
        });
      }

      if (path.length) {
        nameIndex.get(node.id).children.push({
          child: path[0],
          path: path,
        });
      }

      if (!newAncestor) {
        return;
      }
      if (!node.ancestry) {
        return;
      }
      return true;
    }
  }

  function getCoefficient(id) {
    if (storedCoefficients.has(id)) {
      return storedCoefficients.get(id);
    }
    var node = nameIndex.get(id);
    var val = node.convergences.reduce(function (sum, point) {
      return (
        sum +
        Math.pow(
          1 / 2,
          point.offsets.reduce(function (sum, value) {
            return sum + value;
          }, 1)
        ) *
          (1 + getCoefficient(point.parent))
      );
    }, 0);
    storedCoefficients.set(id, val);

    return val;
  }
  function findConvergence(listA, listB) {
    var ci, cj, li, lj;
    outerloop: for (ci = 0, li = listA.length; ci < li; ci++) {
      for (cj = 0, lj = listB.length; cj < lj; cj++) {
        if (listA[ci] === listB[cj]) {
          break outerloop;
        }
      }
    }
    if (ci === li) {
      return false;
    }
    return [ci, cj];
  }
}

},{}],10:[function(require,module,exports){
var carConstruct = require("../car-schema/construct.js");

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);
var pickParent = require("./pickParent");
var selectFromAllParents = require("./selectFromAllParents");
const constants = {
  generationSize: 20,
  schema: schema,
  championLength: 1,
  mutation_range: 1,
  gen_mutation: 0.05,
};
module.exports = function () {
  var currentChoices = new Map();
  return Object.assign({}, constants, {
    selectFromAllParents: selectFromAllParents,
    generateRandom: require("./generateRandom"),
    pickParent: pickParent.bind(void 0, currentChoices),
  });
};
module.exports.constants = constants;

},{"../car-schema/construct.js":3,"./generateRandom":8,"./pickParent":11,"./selectFromAllParents":12}],11:[function(require,module,exports){
var nAttributes = 15;
module.exports = pickParent;

function pickParent(currentChoices, chooseId, key /* , parents */) {
  if (!currentChoices.has(chooseId)) {
    currentChoices.set(chooseId, initializePick());
  }
  // console.log(chooseId);
  var state = currentChoices.get(chooseId);
  // console.log(state.curparent);
  state.i++;
  if (["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1) {
    state.curparent = cw_chooseParent(state);
    return state.curparent;
  }
  state.curparent = cw_chooseParent(state);
  return state.curparent;

  function cw_chooseParent(state) {
    var curparent = state.curparent;
    var attributeIndex = state.i;
    var swapPoint1 = state.swapPoint1;
    var swapPoint2 = state.swapPoint2;
    // console.log(swapPoint1, swapPoint2, attributeIndex)
    if (swapPoint1 == attributeIndex || swapPoint2 == attributeIndex) {
      return curparent == 1 ? 0 : 1;
    }
    return curparent;
  }

  function initializePick() {
    var curparent = 0;

    var swapPoint1 = Math.floor(Math.random() * nAttributes);
    var swapPoint2 = swapPoint1;
    while (swapPoint2 == swapPoint1) {
      swapPoint2 = Math.floor(Math.random() * nAttributes);
    }
    var i = 0;
    return {
      curparent: curparent,
      i: i,
      swapPoint1: swapPoint1,
      swapPoint2: swapPoint2,
    };
  }
}

},{}],12:[function(require,module,exports){
var getInbreedingCoefficient = require("./inbreeding-coefficient");

module.exports = simpleSelect;

function simpleSelect(parents) {
  var totalParents = parents.length;
  var r = Math.random();
  if (r == 0) return 0;
  return Math.floor(-Math.log(r) * totalParents) % totalParents;
}

function selectFromAllParents(parents, parentList, previousParentIndex) {
  var previousParent = parents[previousParentIndex];
  var validParents = parents.filter(function (parent, i) {
    if (previousParentIndex === i) {
      return false;
    }
    if (!previousParent) {
      return true;
    }
    var child = {
      id: Math.random().toString(32),
      ancestry: [previousParent, parent].map(function (p) {
        return {
          id: p.def.id,
          ancestry: p.def.ancestry,
        };
      }),
    };
    var iCo = getInbreedingCoefficient(child);
    console.log("inbreeding coefficient", iCo);
    if (iCo > 0.25) {
      return false;
    }
    return true;
  });
  if (validParents.length === 0) {
    return Math.floor(Math.random() * parents.length);
  }
  var totalScore = validParents.reduce(function (sum, parent) {
    return sum + parent.score.v;
  }, 0);
  var r = totalScore * Math.random();
  for (var i = 0; i < validParents.length; i++) {
    var score = validParents[i].score.v;
    if (r > score) {
      r = r - score;
    } else {
      break;
    }
  }
  return i;
}

},{"./inbreeding-coefficient":9}],13:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  createGenerationZero(schema, generator) {
    return Object.keys(schema).reduce(
      function (instance, key) {
        var schemaProp = schema[key];
        var values = random.createNormals(schemaProp, generator);
        instance[key] = values;
        return instance;
      },
      { id: Math.random().toString(32) }
    );
  },
  createCrossBreed(schema, parents, parentChooser) {
    var id = Math.random().toString(32);
    return Object.keys(schema).reduce(
      function (crossDef, key) {
        var schemaDef = schema[key];
        var values = [];
        for (var i = 0, l = schemaDef.length; i < l; i++) {
          var p = parentChooser(id, key, parents);
          values.push(parents[p][key][i]);
        }
        crossDef[key] = values;
        return crossDef;
      },
      {
        id: id,
        ancestry: parents.map(function (parent) {
          return {
            id: parent.id,
            ancestry: parent.ancestry,
          };
        }),
      }
    );
  },
  createMutatedClone(schema, generator, parent, factor, chanceToMutate) {
    return Object.keys(schema).reduce(
      function (clone, key) {
        var schemaProp = schema[key];
        var originalValues = parent[key];
        var values = random.mutateNormals(
          schemaProp,
          generator,
          originalValues,
          factor,
          chanceToMutate
        );
        clone[key] = values;
        return clone;
      },
      {
        id: parent.id,
        ancestry: parent.ancestry,
      }
    );
  },
  applyTypes(schema, parent) {
    return Object.keys(schema).reduce(
      function (clone, key) {
        var schemaProp = schema[key];
        var originalValues = parent[key];
        var values;
        switch (schemaProp.type) {
          case "shuffle":
            values = random.mapToShuffle(schemaProp, originalValues);
            break;
          case "float":
            values = random.mapToFloat(schemaProp, originalValues);
            break;
          case "integer":
            values = random.mapToInteger(schemaProp, originalValues);
            break;
          default:
            throw new Error(
              `Unknown type ${schemaProp.type} of schema for key ${key}`
            );
        }
        clone[key] = values;
        return clone;
      },
      {
        id: parent.id,
        ancestry: parent.ancestry,
      }
    );
  },
};

},{"./random.js":15}],14:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration,
};

function generationZero(config) {
  var generationSize = config.generationSize,
    schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function () {
      return Math.random();
    });
    def.index = k;
    cw_carGeneration.push(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

function nextGeneration(previousState, scores, config) {
  var champion_length = config.championLength,
    generationSize = config.generationSize,
    selectFromAllParents = config.selectFromAllParents;

  var newGeneration = new Array();
  var newborn;
  for (var k = 0; k < champion_length; k++) {
    ``;
    scores[k].def.is_elite = true;
    scores[k].def.index = k;
    newGeneration.push(scores[k].def);
  }
  var parentList = [];
  for (k = champion_length; k < generationSize; k++) {
    var parent1 = selectFromAllParents(scores, parentList);
    var parent2 = parent1;
    while (parent2 == parent1) {
      parent2 = selectFromAllParents(scores, parentList, parent1);
    }
    var pair = [parent1, parent2];
    parentList.push(pair);
    newborn = makeChild(
      config,
      pair.map(function (parent) {
        return scores[parent].def;
      })
    );
    newborn = mutate(config, newborn);
    newborn.is_elite = false;
    newborn.index = k;
    newGeneration.push(newborn);
  }

  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
  };
}

function makeChild(config, parents) {
  var schema = config.schema,
    pickParent = config.pickParent;
  return create.createCrossBreed(schema, parents, pickParent);
}

function mutate(config, parent) {
  var schema = config.schema,
    mutation_range = config.mutation_range,
    gen_mutation = config.gen_mutation,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    Math.max(mutation_range),
    gen_mutation
  );
}

},{"../create-instance":13}],15:[function(require,module,exports){
const random = {
  shuffleIntegers(prop, generator) {
    return random.mapToShuffle(
      prop,
      random.createNormals(
        {
          length: prop.length || 10,
          inclusive: true,
        },
        generator
      )
    );
  },
  createIntegers(prop, generator) {
    return random.mapToInteger(
      prop,
      random.createNormals(
        {
          length: prop.length,
          inclusive: true,
        },
        generator
      )
    );
  },
  createFloats(prop, generator) {
    return random.mapToFloat(
      prop,
      random.createNormals(
        {
          length: prop.length,
          inclusive: true,
        },
        generator
      )
    );
  },
  createNormals(prop, generator) {
    var l = prop.length;
    var values = [];
    for (var i = 0; i < l; i++) {
      values.push(createNormal(prop, generator));
    }
    return values;
  },
  mutateShuffle(
    prop,
    generator,
    originalValues,
    mutation_range,
    chanceToMutate
  ) {
    return random.mapToShuffle(
      prop,
      random.mutateNormals(
        prop,
        generator,
        originalValues,
        mutation_range,
        chanceToMutate
      )
    );
  },
  mutateIntegers(
    prop,
    generator,
    originalValues,
    mutation_range,
    chanceToMutate
  ) {
    return random.mapToInteger(
      prop,
      random.mutateNormals(
        prop,
        generator,
        originalValues,
        mutation_range,
        chanceToMutate
      )
    );
  },
  mutateFloats(
    prop,
    generator,
    originalValues,
    mutation_range,
    chanceToMutate
  ) {
    return random.mapToFloat(
      prop,
      random.mutateNormals(
        prop,
        generator,
        originalValues,
        mutation_range,
        chanceToMutate
      )
    );
  },
  mapToShuffle(prop, normals) {
    var offset = prop.offset || 0;
    var limit = prop.limit || prop.length;
    var sorted = normals.slice().sort(function (a, b) {
      return a - b;
    });
    return normals
      .map(function (val) {
        return sorted.indexOf(val);
      })
      .map(function (i) {
        return i + offset;
      })
      .slice(0, limit);
  },
  mapToInteger(prop, normals) {
    prop = {
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length,
    };
    return random.mapToFloat(prop, normals).map(function (float) {
      return Math.round(float);
    });
  },
  mapToFloat(prop, normals) {
    prop = {
      min: prop.min || 0,
      range: prop.range || 1,
    };
    return normals.map(function (normal) {
      var min = prop.min;
      var range = prop.range;
      return min + normal * range;
    });
  },
  mutateNormals(
    prop,
    generator,
    originalValues,
    mutation_range,
    chanceToMutate
  ) {
    var factor = (prop.factor || 1) * mutation_range;
    return originalValues.map(function (originalValue) {
      if (generator() > chanceToMutate) {
        return originalValue;
      }
      return mutateNormal(prop, generator, originalValue, factor);
    });
  },
};

module.exports = random;

function mutateNormal(prop, generator, originalValue, mutation_range) {
  if (mutation_range > 1) {
    throw new Error("Cannot mutate beyond bounds");
  }
  var newMin = originalValue - 0.5;
  if (newMin < 0) newMin = 0;
  if (newMin + mutation_range > 1) newMin = 1 - mutation_range;
  var rangeValue = createNormal(
    {
      inclusive: true,
    },
    generator
  );
  return newMin + rangeValue * mutation_range;
}

function createNormal(prop, generator) {
  if (!prop.inclusive) {
    return generator();
  } else {
    return generator() < 0.5 ? generator() : 1 - generator();
  }
}

},{}],16:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration,
};

function generationZero(config) {
  var oldStructure = create.createGenerationZero(
    config.schema,
    config.generateRandom
  );
  var newStructure = createStructure(config, 1, oldStructure);

  var k = 0;

  return {
    counter: 0,
    k: k,
    generation: [newStructure, oldStructure],
  };
}

function nextGeneration(previousState, scores, config) {
  var nextState = {
    k: (previousState.k + 1) % config.generationSize,
    counter:
      previousState.counter +
      (previousState.k === config.generationSize ? 1 : 0),
  };
  // gradually get closer to zero temperature (but never hit it)
  var oldDef = previousState.curDef || previousState.generation[1];
  var oldScore = previousState.score || scores[1].score.v;

  var newDef = previousState.generation[0];
  var newScore = scores[0].score.v;

  var temp = Math.pow(Math.E, -nextState.counter / config.generationSize);

  var scoreDiff = newScore - oldScore;
  // If the next point is higher, change location
  if (scoreDiff > 0) {
    nextState.curDef = newDef;
    nextState.score = newScore;
    // Else we want to increase likelyhood of changing location as we get
  } else if (Math.random() > Math.exp(-scoreDiff / (nextState.k * temp))) {
    nextState.curDef = newDef;
    nextState.score = newScore;
  } else {
    nextState.curDef = oldDef;
    nextState.score = oldScore;
  }

  console.log(previousState, nextState);

  nextState.generation = [createStructure(config, temp, nextState.curDef)];

  return nextState;
}

function createStructure(config, mutation_range, parent) {
  var schema = config.schema,
    gen_mutation = 1,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    mutation_range,
    gen_mutation
  );
}

},{"../create-instance":13}],17:[function(require,module,exports){
/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    world_def.floorseed = btoa(Math.seedrandom());
  }

  var scene = setupScene(world_def);
  scene.world.Step(1 / world_def.box2dfps, 20, 20);
  console.log("about to build cars");
  var cars = defs.map((def, i) => {
    return {
      index: i,
      def: def,
      car: defToCar(def, scene.world, world_def),
      state: carRun.getInitialState(world_def),
    };
  });
  var alivecars = cars;
  return {
    scene: scene,
    cars: cars,
    step: function () {
      if (alivecars.length === 0) {
        throw new Error("no more cars");
      }
      scene.world.Step(1 / world_def.box2dfps, 20, 20);
      listeners.preCarStep();
      alivecars = alivecars.filter(function (car) {
        car.state = carRun.updateState(world_def, car.car, car.state);
        var status = carRun.getStatus(car.state, world_def);
        listeners.carStep(car);
        if (status === 0) {
          return true;
        }
        car.score = carRun.calculateScore(car.state, world_def);
        listeners.carDeath(car);

        var world = scene.world;
        var worldCar = car.car;
        world.DestroyBody(worldCar.chassis);

        for (var w = 0; w < worldCar.wheels.length; w++) {
          world.DestroyBody(worldCar.wheels[w]);
        }

        return false;
      });
      if (alivecars.length === 0) {
        listeners.generationEnd(cars);
      }
    },
  };
}

},{"../car-schema/def-to-car":4,"../car-schema/run":5,"./setup-scene":18}],18:[function(require,module,exports){
/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

/*

world_def = {
  gravity: {x, y},
  doSleep: boolean,
  floorseed: string,
  tileDimensions,
  maxFloorTiles,
  mutable_floor: boolean
}

*/

module.exports = function (world_def) {
  var world = new b2World(world_def.gravity, world_def.doSleep);
  var floorTiles = cw_createFloor(
    world,
    world_def.floorseed,
    world_def.tileDimensions,
    world_def.maxFloorTiles,
    world_def.mutable_floor
  );

  var last_tile = floorTiles[floorTiles.length - 1];
  var last_fixture = last_tile.GetFixtureList();
  var tile_position = last_tile.GetWorldPoint(
    last_fixture.GetShape().m_vertices[3]
  );
  world.finishLine = tile_position.x;
  return {
    world: world,
    floorTiles: floorTiles,
    finishLine: tile_position.x,
  };
};

function cw_createFloor(
  world,
  floorseed,
  dimensions,
  maxFloorTiles,
  mutable_floor
) {
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  var cw_floorTiles = [];
  Math.seedrandom(floorseed);
  for (var k = 0; k < maxFloorTiles; k++) {
    if (!mutable_floor) {
      // keep old impossible tracks if not using mutable floors
      last_tile = cw_createFloorTile(
        world,
        dimensions,
        tile_position,
        ((Math.random() * 3 - 1.5) * 1.5 * k) / maxFloorTiles
      );
    } else {
      // if path is mutable over races, create smoother tracks
      last_tile = cw_createFloorTile(
        world,
        dimensions,
        tile_position,
        ((Math.random() * 3 - 1.5) * 1.2 * k) / maxFloorTiles
      );
    }
    cw_floorTiles.push(last_tile);
    var last_fixture = last_tile.GetFixtureList();
    tile_position = last_tile.GetWorldPoint(
      last_fixture.GetShape().m_vertices[3]
    );
  }
  return cw_floorTiles;
}

function cw_createFloorTile(world, dim, position, angle) {
  var body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0, 0));
  coords.push(new b2Vec2(0, -dim.y));
  coords.push(new b2Vec2(dim.x, -dim.y));
  coords.push(new b2Vec2(dim.x, 0));

  var center = new b2Vec2(0, 0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  return coords.map(function (coord) {
    return {
      x:
        Math.cos(angle) * (coord.x - center.x) -
        Math.sin(angle) * (coord.y - center.y) +
        center.x,
      y:
        Math.sin(angle) * (coord.x - center.x) +
        Math.cos(angle) * (coord.y - center.y) +
        center.y,
    };
  });
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmFyZS5qcyIsInNyYy9jYXItc2NoZW1hL2Nhci1jb25zdGFudHMuanNvbiIsInNyYy9jYXItc2NoZW1hL2NvbnN0cnVjdC5qcyIsInNyYy9jYXItc2NoZW1hL2RlZi10by1jYXIuanMiLCJzcmMvY2FyLXNjaGVtYS9ydW4uanMiLCJzcmMvZHJhdy9wbG90LWdyYXBocy5qcyIsInNyYy9kcmF3L3NjYXR0ZXItcGxvdC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9nZW5lcmF0ZVJhbmRvbS5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmJyZWVkaW5nLWNvZWZmaWNpZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luZGV4LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3BpY2tQYXJlbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvc2VsZWN0RnJvbUFsbFBhcmVudHMuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9yYW5kb20uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9zaW11bGF0ZWQtYW5uZWFsaW5nL21hbmFnZS1yb3VuZC5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgY29uZmlybSBidG9hICovXHJcbi8qIGdsb2JhbHMgYjJWZWMyICovXHJcbi8vIEdsb2JhbCBWYXJzXHJcblxyXG52YXIgd29ybGRSdW4gPSByZXF1aXJlKFwiLi93b3JsZC9ydW4uanNcIik7XHJcblxyXG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcclxudmFyIHBsb3RfZ3JhcGhzID0gZ3JhcGhfZm5zLnBsb3RHcmFwaHM7XHJcblxyXG4vLyA9PT09PT09IFdPUkxEIFNUQVRFID09PT09PVxyXG5cclxudmFyICRncmFwaExpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2dyYXBoLWxpc3RcIik7XHJcbnZhciAkZ3JhcGhUZW1wbGF0ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3JhcGgtdGVtcGxhdGVcIik7XHJcblxyXG5mdW5jdGlvbiBzdHJpbmdUb0hUTUwocykge1xyXG4gIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICB0ZW1wLmlubmVySFRNTCA9IHM7XHJcbiAgcmV0dXJuIHRlbXAuY2hpbGRyZW5bMF07XHJcbn1cclxuXHJcbnZhciBzdGF0ZXMsXHJcbiAgcnVubmVycyxcclxuICByZXN1bHRzLFxyXG4gIGdyYXBoU3RhdGUgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJKGtleSwgc2NvcmVzKSB7XHJcbiAgdmFyICRncmFwaCA9ICRncmFwaExpc3QucXVlcnlTZWxlY3RvcihcIiNncmFwaC1cIiArIGtleSk7XHJcbiAgdmFyICRuZXdHcmFwaCA9IHN0cmluZ1RvSFRNTCgkZ3JhcGhUZW1wbGF0ZS5pbm5lckhUTUwpO1xyXG4gICRuZXdHcmFwaC5pZCA9IFwiZ3JhcGgtXCIgKyBrZXk7XHJcbiAgaWYgKCRncmFwaCkge1xyXG4gICAgJGdyYXBoTGlzdC5yZXBsYWNlQ2hpbGQoJGdyYXBoLCAkbmV3R3JhcGgpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkZ3JhcGhMaXN0LmFwcGVuZENoaWxkKCRuZXdHcmFwaCk7XHJcbiAgfVxyXG4gIGNvbnNvbGUubG9nKCRuZXdHcmFwaCk7XHJcbiAgdmFyIHNjYXR0ZXJQbG90RWxlbSA9ICRuZXdHcmFwaC5xdWVyeVNlbGVjdG9yKFwiLnNjYXR0ZXJwbG90XCIpO1xyXG4gIHNjYXR0ZXJQbG90RWxlbS5pZCA9IFwiZ3JhcGgtXCIgKyBrZXkgKyBcIi1zY2F0dGVyXCI7XHJcbiAgZ3JhcGhTdGF0ZVtrZXldID0gcGxvdF9ncmFwaHMoXHJcbiAgICAkbmV3R3JhcGgucXVlcnlTZWxlY3RvcihcIi5ncmFwaGNhbnZhc1wiKSxcclxuICAgICRuZXdHcmFwaC5xdWVyeVNlbGVjdG9yKFwiLnRvcHNjb3Jlc1wiKSxcclxuICAgIHNjYXR0ZXJQbG90RWxlbSxcclxuICAgIGdyYXBoU3RhdGVba2V5XSxcclxuICAgIHNjb3JlcyxcclxuICAgIHt9XHJcbiAgKTtcclxufVxyXG5cclxudmFyIGdlbmVyYXRpb25Db25maWcgPSByZXF1aXJlKFwiLi9nZW5lcmF0aW9uLWNvbmZpZ1wiKTtcclxuXHJcbnZhciBib3gyZGZwcyA9IDYwO1xyXG52YXIgbWF4X2Nhcl9oZWFsdGggPSBib3gyZGZwcyAqIDEwO1xyXG5cclxudmFyIHdvcmxkX2RlZiA9IHtcclxuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxyXG4gIGRvU2xlZXA6IHRydWUsXHJcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcclxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxyXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgbW90b3JTcGVlZDogMjAsXHJcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIHNjaGVtYTogZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuc2NoZW1hLFxyXG59O1xyXG5cclxudmFyIG1hbmFnZVJvdW5kID0ge1xyXG4gIGdlbmV0aWM6IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzXCIpLFxyXG4gIGFubmVhbGluZzogcmVxdWlyZShcIi4vbWFjaGluZS1sZWFybmluZy9zaW11bGF0ZWQtYW5uZWFsaW5nL21hbmFnZS1yb3VuZC5qc1wiKSxcclxufTtcclxuXHJcbnZhciBjcmVhdGVMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHByZUNhclN0ZXA6IGZ1bmN0aW9uICgpIHt9LFxyXG4gICAgY2FyU3RlcDogZnVuY3Rpb24gKCkge30sXHJcbiAgICBjYXJEZWF0aDogZnVuY3Rpb24gKGNhckluZm8pIHtcclxuICAgICAgY2FySW5mby5zY29yZS5pID0gc3RhdGVzW2tleV0uY291bnRlcjtcclxuICAgIH0sXHJcbiAgICBnZW5lcmF0aW9uRW5kOiBmdW5jdGlvbiAocmVzdWx0cykge1xyXG4gICAgICBoYW5kbGVSb3VuZEVuZChrZXksIHJlc3VsdHMpO1xyXG4gICAgfSxcclxuICB9O1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oKSB7XHJcbiAgdmFyIG9iaiA9IE9iamVjdC5rZXlzKG1hbmFnZVJvdW5kKS5yZWR1Y2UoXHJcbiAgICBmdW5jdGlvbiAob2JqLCBrZXkpIHtcclxuICAgICAgb2JqLnN0YXRlc1trZXldID0gbWFuYWdlUm91bmRba2V5XS5nZW5lcmF0aW9uWmVybyhnZW5lcmF0aW9uQ29uZmlnKCkpO1xyXG4gICAgICBvYmoucnVubmVyc1trZXldID0gd29ybGRSdW4oXHJcbiAgICAgICAgd29ybGRfZGVmLFxyXG4gICAgICAgIG9iai5zdGF0ZXNba2V5XS5nZW5lcmF0aW9uLFxyXG4gICAgICAgIGNyZWF0ZUxpc3RlbmVycyhrZXkpXHJcbiAgICAgICk7XHJcbiAgICAgIG9iai5yZXN1bHRzW2tleV0gPSBbXTtcclxuICAgICAgZ3JhcGhTdGF0ZVtrZXldID0ge307XHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9LFxyXG4gICAgeyBzdGF0ZXM6IHt9LCBydW5uZXJzOiB7fSwgcmVzdWx0czoge30gfVxyXG4gICk7XHJcbiAgc3RhdGVzID0gb2JqLnN0YXRlcztcclxuICBydW5uZXJzID0gb2JqLnJ1bm5lcnM7XHJcbiAgcmVzdWx0cyA9IG9iai5yZXN1bHRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVSb3VuZEVuZChrZXksIHNjb3Jlcykge1xyXG4gIHZhciBwcmV2aW91c0NvdW50ZXIgPSBzdGF0ZXNba2V5XS5jb3VudGVyO1xyXG4gIHN0YXRlc1trZXldID0gbWFuYWdlUm91bmRba2V5XS5uZXh0R2VuZXJhdGlvbihcclxuICAgIHN0YXRlc1trZXldLFxyXG4gICAgc2NvcmVzLFxyXG4gICAgZ2VuZXJhdGlvbkNvbmZpZygpXHJcbiAgKTtcclxuICBydW5uZXJzW2tleV0gPSB3b3JsZFJ1bihcclxuICAgIHdvcmxkX2RlZixcclxuICAgIHN0YXRlc1trZXldLmdlbmVyYXRpb24sXHJcbiAgICBjcmVhdGVMaXN0ZW5lcnMoa2V5KVxyXG4gICk7XHJcbiAgaWYgKHN0YXRlc1trZXldLmNvdW50ZXIgPT09IHByZXZpb3VzQ291bnRlcikge1xyXG4gICAgY29uc29sZS5sb2cocmVzdWx0cyk7XHJcbiAgICByZXN1bHRzW2tleV0gPSByZXN1bHRzW2tleV0uY29uY2F0KHNjb3Jlcyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGhhbmRsZUdlbmVyYXRpb25FbmQoa2V5KTtcclxuICAgIHJlc3VsdHNba2V5XSA9IFtdO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcnVuUm91bmQoKSB7XHJcbiAgdmFyIHRvUnVuID0gbmV3IE1hcCgpO1xyXG4gIE9iamVjdC5rZXlzKHN0YXRlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICB0b1J1bi5zZXQoa2V5LCBzdGF0ZXNba2V5XS5jb3VudGVyKTtcclxuICB9KTtcclxuICBjb25zb2xlLmxvZyh0b1J1bik7XHJcbiAgd2hpbGUgKHRvUnVuLnNpemUpIHtcclxuICAgIGNvbnNvbGUubG9nKFwicnVubmluZ1wiKTtcclxuICAgIEFycmF5LmZyb20odG9SdW4ua2V5cygpKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgaWYgKHN0YXRlc1trZXldLmNvdW50ZXIgPT09IHRvUnVuLmdldChrZXkpKSB7XHJcbiAgICAgICAgcnVubmVyc1trZXldLnN0ZXAoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0b1J1bi5kZWxldGUoa2V5KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVHZW5lcmF0aW9uRW5kKGtleSkge1xyXG4gIHZhciBzY29yZXMgPSByZXN1bHRzW2tleV07XHJcbiAgc2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcclxuICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgdXBkYXRlVUkoa2V5LCBzY29yZXMpO1xyXG4gIHJlc3VsdHNba2V5XSA9IFtdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXNldFBvcHVsYXRpb25VSSgpIHtcclxuICAkZ3JhcGhMaXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc2V0V29ybGQoKSB7XHJcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKTtcclxuICBNYXRoLnNlZWRyYW5kb20oKTtcclxuICBnZW5lcmF0aW9uWmVybygpO1xyXG59XHJcblxyXG5kb2N1bWVudFxyXG4gIC5xdWVyeVNlbGVjdG9yKFwiI25ldy1wb3B1bGF0aW9uXCIpXHJcbiAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBjd19yZXNldFBvcHVsYXRpb25VSSgpO1xyXG4gICAgZ2VuZXJhdGlvblplcm8oKTtcclxuICB9KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY29uZmlybS1yZXNldFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKCk7XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmYXN0LWZvcndhcmRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICBydW5Sb3VuZCgpO1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xyXG4gIGlmIChjb25maXJtKFwiUmVhbGx5IHJlc2V0IHdvcmxkP1wiKSkge1xyXG4gICAgY3dfcmVzZXRXb3JsZCgpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5jd19yZXNldFdvcmxkKCk7XHJcbiIsIm1vZHVsZS5leHBvcnRzPXtcclxuICBcIndoZWVsQ291bnRcIjogMixcclxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcclxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxyXG4gIFwid2hlZWxNaW5EZW5zaXR5XCI6IDQwLFxyXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxyXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXHJcbiAgXCJjaGFzc2lzTWluRGVuc2l0eVwiOiAzMCxcclxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcclxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXHJcbn1cclxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHdvcmxkRGVmOiB3b3JsZERlZixcclxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcclxuICBnZW5lcmF0ZVNjaGVtYTogZ2VuZXJhdGVTY2hlbWEsXHJcbn07XHJcblxyXG5mdW5jdGlvbiB3b3JsZERlZigpIHtcclxuICB2YXIgYm94MmRmcHMgPSA2MDtcclxuICByZXR1cm4ge1xyXG4gICAgZ3Jhdml0eTogeyB5OiAwIH0sXHJcbiAgICBkb1NsZWVwOiB0cnVlLFxyXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxyXG4gICAgbWF4Rmxvb3JUaWxlczogMjAwLFxyXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXHJcbiAgICBtb3RvclNwZWVkOiAyMCxcclxuICAgIGJveDJkZnBzOiBib3gyZGZwcyxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxyXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcclxuICAgICAgd2lkdGg6IDEuNSxcclxuICAgICAgaGVpZ2h0OiAwLjE1LFxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKSB7XHJcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHdoZWVsX3JhZGl1czoge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsUmFkaXVzUmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB3aGVlbF9kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5EZW5zaXR5LFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiAxLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxyXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgdmVydGV4X2xpc3Q6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IDEyLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzQXhpc1JhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgd2hlZWxfdmVydGV4OiB7XHJcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxyXG4gICAgICBsZW5ndGg6IDgsXHJcbiAgICAgIGxpbWl0OiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiIsIi8qXHJcbiAgZ2xvYmFscyBiMlJldm9sdXRlSm9pbnREZWYgYjJWZWMyIGIyQm9keURlZiBiMkJvZHkgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlIGIyQ2lyY2xlU2hhcGVcclxuKi9cclxuXHJcbnZhciBjcmVhdGVJbnN0YW5jZSA9IHJlcXVpcmUoXCIuLi9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XHJcblxyXG5mdW5jdGlvbiBkZWZUb0Nhcihub3JtYWxfZGVmLCB3b3JsZCwgY29uc3RhbnRzKSB7XHJcbiAgdmFyIGNhcl9kZWYgPSBjcmVhdGVJbnN0YW5jZS5hcHBseVR5cGVzKGNvbnN0YW50cy5zY2hlbWEsIG5vcm1hbF9kZWYpO1xyXG4gIHZhciBpbnN0YW5jZSA9IHt9O1xyXG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxyXG4gICAgd29ybGQsXHJcbiAgICBjYXJfZGVmLnZlcnRleF9saXN0LFxyXG4gICAgY2FyX2RlZi5jaGFzc2lzX2RlbnNpdHlcclxuICApO1xyXG4gIHZhciBpO1xyXG5cclxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcclxuXHJcbiAgaW5zdGFuY2Uud2hlZWxzID0gW107XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXHJcbiAgICAgIHdvcmxkLFxyXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcclxuICAgICAgY2FyX2RlZi53aGVlbF9kZW5zaXR5W2ldXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgdmFyIGNhcm1hc3MgPSBpbnN0YW5jZS5jaGFzc2lzLkdldE1hc3MoKTtcclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICBjYXJtYXNzICs9IGluc3RhbmNlLndoZWVsc1tpXS5HZXRNYXNzKCk7XHJcbiAgfVxyXG5cclxuICB2YXIgam9pbnRfZGVmID0gbmV3IGIyUmV2b2x1dGVKb2ludERlZigpO1xyXG5cclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICB2YXIgdG9ycXVlID0gKGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSkgLyBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXTtcclxuXHJcbiAgICB2YXIgcmFuZHZlcnRleCA9IGluc3RhbmNlLmNoYXNzaXMudmVydGV4X2xpc3RbY2FyX2RlZi53aGVlbF92ZXJ0ZXhbaV1dO1xyXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQS5TZXQocmFuZHZlcnRleC54LCByYW5kdmVydGV4LnkpO1xyXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XHJcbiAgICBqb2ludF9kZWYubWF4TW90b3JUb3JxdWUgPSB0b3JxdWU7XHJcbiAgICBqb2ludF9kZWYubW90b3JTcGVlZCA9IC1jb25zdGFudHMubW90b3JTcGVlZDtcclxuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XHJcbiAgICBqb2ludF9kZWYuYm9keUEgPSBpbnN0YW5jZS5jaGFzc2lzO1xyXG4gICAgam9pbnRfZGVmLmJvZHlCID0gaW5zdGFuY2Uud2hlZWxzW2ldO1xyXG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBpbnN0YW5jZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xyXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzBdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s0XSwgdmVydGV4c1s1XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgLXZlcnRleHNbOV0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xyXG5cclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xyXG5cclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG5cclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFswXSwgdmVydGV4X2xpc3RbMV0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFszXSwgdmVydGV4X2xpc3RbNF0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs2XSwgdmVydGV4X2xpc3RbN10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XHJcblxyXG4gIGJvZHkudmVydGV4X2xpc3QgPSB2ZXJ0ZXhfbGlzdDtcclxuXHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleDEsIHZlcnRleDIsIGRlbnNpdHkpIHtcclxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDEpO1xyXG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4Mik7XHJcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDEwO1xyXG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XHJcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xyXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheSh2ZXJ0ZXhfbGlzdCwgMyk7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcclxuXHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuXHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKHJhZGl1cyk7XHJcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMTtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdldEluaXRpYWxTdGF0ZTogZ2V0SW5pdGlhbFN0YXRlLFxyXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcclxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcclxuICBjYWxjdWxhdGVTY29yZTogY2FsY3VsYXRlU2NvcmUsXHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGZyYW1lczogMCxcclxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxyXG4gICAgbWF4UG9zaXRpb255OiAwLFxyXG4gICAgbWluUG9zaXRpb255OiAwLFxyXG4gICAgbWF4UG9zaXRpb254OiAwLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKGNvbnN0YW50cywgd29ybGRDb25zdHJ1Y3QsIHN0YXRlKSB7XHJcbiAgaWYgKHN0YXRlLmhlYWx0aCA8PSAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XHJcbiAgfVxyXG4gIGlmIChzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcclxuICAvLyBjaGVjayBoZWFsdGhcclxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXHJcbiAgdmFyIG5leHRTdGF0ZSA9IHtcclxuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcclxuICAgIG1heFBvc2l0aW9ueDpcclxuICAgICAgcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXHJcbiAgICBtYXhQb3NpdGlvbnk6XHJcbiAgICAgIHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgbWluUG9zaXRpb255OlxyXG4gICAgICBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueSxcclxuICB9O1xyXG5cclxuICBpZiAocG9zaXRpb24ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKSB7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XHJcbiAgICBuZXh0U3RhdGUuaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9XHJcbiAgbmV4dFN0YXRlLmhlYWx0aCA9IHN0YXRlLmhlYWx0aCAtIDE7XHJcbiAgaWYgKE1hdGguYWJzKHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKS54KSA8IDAuMDAxKSB7XHJcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XHJcbiAgfVxyXG4gIHJldHVybiBuZXh0U3RhdGU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YXR1cyhzdGF0ZSwgY29uc3RhbnRzKSB7XHJcbiAgaWYgKGhhc0ZhaWxlZChzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIC0xO1xyXG4gIGlmIChoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gMTtcclxuICByZXR1cm4gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFzRmFpbGVkKHN0YXRlIC8qLCBjb25zdGFudHMgKi8pIHtcclxuICByZXR1cm4gc3RhdGUuaGVhbHRoIDw9IDA7XHJcbn1cclxuZnVuY3Rpb24gaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSB7XHJcbiAgcmV0dXJuIHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVTY29yZShzdGF0ZSwgY29uc3RhbnRzKSB7XHJcbiAgdmFyIGF2Z3NwZWVkID0gKHN0YXRlLm1heFBvc2l0aW9ueCAvIHN0YXRlLmZyYW1lcykgKiBjb25zdGFudHMuYm94MmRmcHM7XHJcbiAgdmFyIHBvc2l0aW9uID0gc3RhdGUubWF4UG9zaXRpb254O1xyXG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XHJcbiAgcmV0dXJuIHtcclxuICAgIHY6IHNjb3JlLFxyXG4gICAgczogYXZnc3BlZWQsXHJcbiAgICB4OiBwb3NpdGlvbixcclxuICAgIHk6IHN0YXRlLm1heFBvc2l0aW9ueSxcclxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnksXHJcbiAgfTtcclxufVxyXG4iLCJ2YXIgc2NhdHRlclBsb3QgPSByZXF1aXJlKFwiLi9zY2F0dGVyLXBsb3RcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBwbG90R3JhcGhzOiBmdW5jdGlvbiAoXHJcbiAgICBncmFwaEVsZW0sXHJcbiAgICB0b3BTY29yZXNFbGVtLFxyXG4gICAgc2NhdHRlclBsb3RFbGVtLFxyXG4gICAgbGFzdFN0YXRlLFxyXG4gICAgc2NvcmVzLFxyXG4gICAgY29uZmlnXHJcbiAgKSB7XHJcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XHJcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBzY29yZXMubGVuZ3RoO1xyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICB2YXIgbmV4dFN0YXRlID0gY3dfc3RvcmVHcmFwaFNjb3JlcyhsYXN0U3RhdGUsIHNjb3JlcywgZ2VuZXJhdGlvblNpemUpO1xyXG4gICAgY29uc29sZS5sb2coc2NvcmVzLCBuZXh0U3RhdGUpO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICAgIGN3X3Bsb3RBdmVyYWdlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdEVsaXRlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X2xpc3RUb3BTY29yZXModG9wU2NvcmVzRWxlbSwgbmV4dFN0YXRlKTtcclxuICAgIG5leHRTdGF0ZS5zY2F0dGVyR3JhcGggPSBkcmF3QWxsUmVzdWx0cyhcclxuICAgICAgc2NhdHRlclBsb3RFbGVtLFxyXG4gICAgICBjb25maWcsXHJcbiAgICAgIG5leHRTdGF0ZSxcclxuICAgICAgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxyXG4gICAgKTtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfSxcclxuICBjbGVhckdyYXBoaWNzOiBmdW5jdGlvbiAoZ3JhcGhFbGVtKSB7XHJcbiAgICB2YXIgZ3JhcGhjYW52YXMgPSBncmFwaEVsZW07XHJcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcclxuICAgIHZhciBncmFwaGhlaWdodCA9IDI1MDtcclxuICAgIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCk7XHJcbiAgfSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIGN3X3N0b3JlR3JhcGhTY29yZXMobGFzdFN0YXRlLCBjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgY29uc29sZS5sb2coY3dfY2FyU2NvcmVzKTtcclxuICByZXR1cm4ge1xyXG4gICAgY3dfdG9wU2NvcmVzOiAobGFzdFN0YXRlLmN3X3RvcFNjb3JlcyB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfY2FyU2NvcmVzWzBdLnNjb3JlLFxyXG4gICAgXSksXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IChsYXN0U3RhdGUuY3dfZ3JhcGhBdmVyYWdlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19hdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpLFxyXG4gICAgXSksXHJcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2VsaXRlYXZlcmFnZShjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKSxcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhUb3A6IChsYXN0U3RhdGUuY3dfZ3JhcGhUb3AgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52LFxyXG4gICAgXSksXHJcbiAgICBhbGxSZXN1bHRzOiAobGFzdFN0YXRlLmFsbFJlc3VsdHMgfHwgW10pLmNvbmNhdChjd19jYXJTY29yZXMpLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RUb3Aoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoVG9wID0gc3RhdGUuY3dfZ3JhcGhUb3A7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiI0M4M0IzQlwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oKDQwMCAqIChrICsgMSkpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90RWxpdGUoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEVsaXRlLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzdCQzc0RFwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oKDQwMCAqIChrICsgMSkpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEVsaXRlW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaEF2ZXJhZ2UgPSBzdGF0ZS5jd19ncmFwaEF2ZXJhZ2U7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoQXZlcmFnZS5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKCg0MDAgKiAoayArIDEpKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhBdmVyYWdlW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7IGsrKykge1xyXG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xyXG4gIH1cclxuICByZXR1cm4gc3VtIC8gTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19hdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICB2YXIgc3VtID0gMDtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcclxuICB9XHJcbiAgcmV0dXJuIHN1bSAvIGdlbmVyYXRpb25TaXplO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpIHtcclxuICBncmFwaGNhbnZhcy53aWR0aCA9IGdyYXBoY2FudmFzLndpZHRoO1xyXG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XHJcbiAgZ3JhcGhjdHguc2NhbGUoMSwgLTEpO1xyXG4gIGdyYXBoY3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgKGdyYXBoaGVpZ2h0ICogMykgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgKGdyYXBoaGVpZ2h0ICogMykgLyA0KTtcclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbGlzdFRvcFNjb3JlcyhlbGVtLCBzdGF0ZSkge1xyXG4gIHZhciBjd190b3BTY29yZXMgPSBzdGF0ZS5jd190b3BTY29yZXM7XHJcbiAgdmFyIHRzID0gZWxlbTtcclxuICB0cy5pbm5lckhUTUwgPSBcIjxiPlRvcCBTY29yZXM6PC9iPjxiciAvPlwiO1xyXG4gIGN3X3RvcFNjb3Jlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICBpZiAoYS52ID4gYi52KSB7XHJcbiAgICAgIHJldHVybiAtMTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGgubWluKDEwLCBjd190b3BTY29yZXMubGVuZ3RoKTsgaysrKSB7XHJcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XHJcbiAgICAvLyBjb25zb2xlLmxvZyh0b3BTY29yZSk7XHJcbiAgICB2YXIgbiA9IFwiI1wiICsgKGsgKyAxKSArIFwiOlwiO1xyXG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcclxuICAgIHZhciBkaXN0YW5jZSA9IFwiZDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueCAqIDEwMCkgLyAxMDA7XHJcbiAgICB2YXIgeXJhbmdlID1cclxuICAgICAgXCJoOlwiICtcclxuICAgICAgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgK1xyXG4gICAgICBcIi9cIiArXHJcbiAgICAgIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgK1xyXG4gICAgICBcIm1cIjtcclxuICAgIHZhciBnZW4gPSBcIihHZW4gXCIgKyBjd190b3BTY29yZXNba10uaSArIFwiKVwiO1xyXG5cclxuICAgIHRzLmlubmVySFRNTCArPSBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0FsbFJlc3VsdHMoc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIGFsbFJlc3VsdHMsIHByZXZpb3VzR3JhcGgpIHtcclxuICBpZiAoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xyXG4gIHJldHVybiBzY2F0dGVyUGxvdChcclxuICAgIHNjYXR0ZXJQbG90RWxlbSxcclxuICAgIGFsbFJlc3VsdHMsXHJcbiAgICBjb25maWcucHJvcGVydHlNYXAsXHJcbiAgICBwcmV2aW91c0dyYXBoXHJcbiAgKTtcclxufVxyXG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXHJcblxyXG4vLyBDYWxsZWQgd2hlbiB0aGUgVmlzdWFsaXphdGlvbiBBUEkgaXMgbG9hZGVkLlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBoaWdoQ2hhcnRzO1xyXG5mdW5jdGlvbiBoaWdoQ2hhcnRzKGVsZW0sIHNjb3Jlcykge1xyXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc2NvcmVzWzBdLmRlZik7XHJcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChjdXJBcnJheSwga2V5KSB7XHJcbiAgICB2YXIgbCA9IHNjb3Jlc1swXS5kZWZba2V5XS5sZW5ndGg7XHJcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJBcnJheS5jb25jYXQoc3ViQXJyYXkpO1xyXG4gIH0sIFtdKTtcclxuICBmdW5jdGlvbiByZXRyaWV2ZVZhbHVlKG9iaiwgcGF0aCkge1xyXG4gICAgcmV0dXJuIHBhdGguc3BsaXQoXCIuXCIpLnJlZHVjZShmdW5jdGlvbiAoY3VyVmFsdWUsIGtleSkge1xyXG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcclxuICAgIH0sIG9iaik7XHJcbiAgfVxyXG5cclxuICB2YXIgZGF0YU9iaiA9IE9iamVjdC5rZXlzKHNjb3JlcykucmVkdWNlKFxyXG4gICAgZnVuY3Rpb24gKGt2LCBzY29yZSkge1xyXG4gICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgIGt2W2tleV0uZGF0YS5wdXNoKFtyZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudl0pO1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGt2O1xyXG4gICAgfSxcclxuICAgIGtleXMucmVkdWNlKGZ1bmN0aW9uIChrdiwga2V5KSB7XHJcbiAgICAgIGt2W2tleV0gPSB7XHJcbiAgICAgICAgbmFtZToga2V5LFxyXG4gICAgICAgIGRhdGE6IFtdLFxyXG4gICAgICB9O1xyXG4gICAgICByZXR1cm4ga3Y7XHJcbiAgICB9LCB7fSlcclxuICApO1xyXG4gIEhpZ2hjaGFydHMuY2hhcnQoZWxlbS5pZCwge1xyXG4gICAgY2hhcnQ6IHtcclxuICAgICAgdHlwZTogXCJzY2F0dGVyXCIsXHJcbiAgICAgIHpvb21UeXBlOiBcInh5XCIsXHJcbiAgICB9LFxyXG4gICAgdGl0bGU6IHtcclxuICAgICAgdGV4dDogXCJQcm9wZXJ0eSBWYWx1ZSB0byBTY29yZVwiLFxyXG4gICAgfSxcclxuICAgIHhBeGlzOiB7XHJcbiAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICB0ZXh0OiBcIk5vcm1hbGl6ZWRcIixcclxuICAgICAgfSxcclxuICAgICAgc3RhcnRPblRpY2s6IHRydWUsXHJcbiAgICAgIGVuZE9uVGljazogdHJ1ZSxcclxuICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICB5QXhpczoge1xyXG4gICAgICB0aXRsZToge1xyXG4gICAgICAgIHRleHQ6IFwiU2NvcmVcIixcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBsZWdlbmQ6IHtcclxuICAgICAgbGF5b3V0OiBcInZlcnRpY2FsXCIsXHJcbiAgICAgIGFsaWduOiBcImxlZnRcIixcclxuICAgICAgdmVydGljYWxBbGlnbjogXCJ0b3BcIixcclxuICAgICAgeDogMTAwLFxyXG4gICAgICB5OiA3MCxcclxuICAgICAgZmxvYXRpbmc6IHRydWUsXHJcbiAgICAgIGJhY2tncm91bmRDb2xvcjpcclxuICAgICAgICAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHxcclxuICAgICAgICBcIiNGRkZGRkZcIixcclxuICAgICAgYm9yZGVyV2lkdGg6IDEsXHJcbiAgICB9LFxyXG4gICAgcGxvdE9wdGlvbnM6IHtcclxuICAgICAgc2NhdHRlcjoge1xyXG4gICAgICAgIG1hcmtlcjoge1xyXG4gICAgICAgICAgcmFkaXVzOiA1LFxyXG4gICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICBsaW5lQ29sb3I6IFwicmdiKDEwMCwxMDAsMTAwKVwiLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YXRlczoge1xyXG4gICAgICAgICAgaG92ZXI6IHtcclxuICAgICAgICAgICAgbWFya2VyOiB7XHJcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdG9vbHRpcDoge1xyXG4gICAgICAgICAgaGVhZGVyRm9ybWF0OiBcIjxiPntzZXJpZXMubmFtZX08L2I+PGJyPlwiLFxyXG4gICAgICAgICAgcG9pbnRGb3JtYXQ6IFwie3BvaW50Lnh9LCB7cG9pbnQueX1cIixcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICByZXR1cm4gZGF0YU9ialtrZXldO1xyXG4gICAgfSksXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZpc0NoYXJ0KGVsZW0sIHNjb3JlcywgcHJvcGVydHlNYXAsIGdyYXBoKSB7XHJcbiAgLy8gQ3JlYXRlIGFuZCBwb3B1bGF0ZSBhIGRhdGEgdGFibGUuXHJcbiAgdmFyIGRhdGEgPSBuZXcgdmlzLkRhdGFTZXQoKTtcclxuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbiAoc2NvcmVJbmZvKSB7XHJcbiAgICBkYXRhLmFkZCh7XHJcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXHJcbiAgICAgIHk6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXHJcbiAgICAgIHo6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueiksXHJcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICAvLyBleHRyYTogZGVmLmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gZ2V0UHJvcGVydHkoaW5mbywga2V5KSB7XHJcbiAgICBpZiAoa2V5ID09PSBcInNjb3JlXCIpIHtcclxuICAgICAgcmV0dXJuIGluZm8uc2NvcmUudjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBpbmZvLmRlZltrZXldO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gc3BlY2lmeSBvcHRpb25zXHJcbiAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICB3aWR0aDogXCI2MDBweFwiLFxyXG4gICAgaGVpZ2h0OiBcIjYwMHB4XCIsXHJcbiAgICBzdHlsZTogXCJkb3Qtc2l6ZVwiLFxyXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxyXG4gICAgc2hvd0xlZ2VuZDogdHJ1ZSxcclxuICAgIHNob3dHcmlkOiB0cnVlLFxyXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXHJcblxyXG4gICAgLy8gT3B0aW9uIHRvb2x0aXAgY2FuIGJlIHRydWUsIGZhbHNlLCBvciBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHN0cmluZyB3aXRoIEhUTUwgY29udGVudHNcclxuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAvLyBwYXJhbWV0ZXIgcG9pbnQgY29udGFpbnMgcHJvcGVydGllcyB4LCB5LCB6LCBhbmQgZGF0YVxyXG4gICAgICAvLyBkYXRhIGlzIHRoZSBvcmlnaW5hbCBvYmplY3QgcGFzc2VkIHRvIHRoZSBwb2ludCBjb25zdHJ1Y3RvclxyXG4gICAgICByZXR1cm4gXCJzY29yZTogPGI+XCIgKyBwb2ludC56ICsgXCI8L2I+PGJyPlwiOyAvLyArIHBvaW50LmRhdGEuZXh0cmE7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFRvb2x0aXAgZGVmYXVsdCBzdHlsaW5nIGNhbiBiZSBvdmVycmlkZGVuXHJcbiAgICB0b29sdGlwU3R5bGU6IHtcclxuICAgICAgY29udGVudDoge1xyXG4gICAgICAgIGJhY2tncm91bmQ6IFwicmdiYSgyNTUsIDI1NSwgMjU1LCAwLjcpXCIsXHJcbiAgICAgICAgcGFkZGluZzogXCIxMHB4XCIsXHJcbiAgICAgICAgYm9yZGVyUmFkaXVzOiBcIjEwcHhcIixcclxuICAgICAgfSxcclxuICAgICAgbGluZToge1xyXG4gICAgICAgIGJvcmRlckxlZnQ6IFwiMXB4IGRvdHRlZCByZ2JhKDAsIDAsIDAsIDAuNSlcIixcclxuICAgICAgfSxcclxuICAgICAgZG90OiB7XHJcbiAgICAgICAgYm9yZGVyOiBcIjVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSlcIixcclxuICAgICAgfSxcclxuICAgIH0sXHJcblxyXG4gICAga2VlcEFzcGVjdFJhdGlvOiB0cnVlLFxyXG4gICAgdmVydGljYWxSYXRpbzogMC41LFxyXG4gIH07XHJcblxyXG4gIHZhciBjYW1lcmEgPSBncmFwaCA/IGdyYXBoLmdldENhbWVyYVBvc2l0aW9uKCkgOiBudWxsO1xyXG5cclxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXHJcbiAgdmFyIGNvbnRhaW5lciA9IGVsZW07XHJcbiAgZ3JhcGggPSBuZXcgdmlzLkdyYXBoM2QoY29udGFpbmVyLCBkYXRhLCBvcHRpb25zKTtcclxuXHJcbiAgaWYgKGNhbWVyYSkgZ3JhcGguc2V0Q2FtZXJhUG9zaXRpb24oY2FtZXJhKTsgLy8gcmVzdG9yZSBjYW1lcmEgcG9zaXRpb25cclxuICByZXR1cm4gZ3JhcGg7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcclxuZnVuY3Rpb24gZ2VuZXJhdGVSYW5kb20oKSB7XHJcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XHJcbn1cclxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXHJcbm1vZHVsZS5leHBvcnRzID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50O1xyXG5cclxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKSB7XHJcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcclxuICB2YXIgZmxhZ2dlZCA9IG5ldyBTZXQoKTtcclxuICB2YXIgY29udmVyZ2VuY2VQb2ludHMgPSBuZXcgU2V0KCk7XHJcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcclxuXHJcbiAgdmFyIHN0b3JlZENvZWZmaWNpZW50cyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgcmV0dXJuIEFycmF5LmZyb20oY29udmVyZ2VuY2VQb2ludHMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbiAoc3VtLCBwb2ludCkge1xyXG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcclxuICAgIHJldHVybiBzdW0gKyBpQ287XHJcbiAgfSwgMCk7XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUFuY2VzdHJ5TWFwKGluaXROb2RlKSB7XHJcbiAgICB2YXIgaXRlbXNJblF1ZXVlID0gW3sgbm9kZTogaW5pdE5vZGUsIHBhdGg6IFtdIH1dO1xyXG4gICAgZG8ge1xyXG4gICAgICB2YXIgaXRlbSA9IGl0ZW1zSW5RdWV1ZS5zaGlmdCgpO1xyXG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcclxuICAgICAgdmFyIHBhdGggPSBpdGVtLnBhdGg7XHJcbiAgICAgIGlmIChwcm9jZXNzSXRlbShub2RlLCBwYXRoKSkge1xyXG4gICAgICAgIHZhciBuZXh0UGF0aCA9IFtub2RlLmlkXS5jb25jYXQocGF0aCk7XHJcbiAgICAgICAgaXRlbXNJblF1ZXVlID0gaXRlbXNJblF1ZXVlLmNvbmNhdChcclxuICAgICAgICAgIG5vZGUuYW5jZXN0cnkubWFwKGZ1bmN0aW9uIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICBub2RlOiBwYXJlbnQsXHJcbiAgICAgICAgICAgICAgcGF0aDogbmV4dFBhdGgsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH0gd2hpbGUgKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIHByb2Nlc3NJdGVtKG5vZGUsIHBhdGgpIHtcclxuICAgICAgdmFyIG5ld0FuY2VzdG9yID0gIW5hbWVJbmRleC5oYXMobm9kZS5pZCk7XHJcbiAgICAgIGlmIChuZXdBbmNlc3Rvcikge1xyXG4gICAgICAgIG5hbWVJbmRleC5zZXQobm9kZS5pZCwge1xyXG4gICAgICAgICAgcGFyZW50czogKG5vZGUuYW5jZXN0cnkgfHwgW10pLm1hcChmdW5jdGlvbiAocGFyZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQuaWQ7XHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIGlkOiBub2RlLmlkLFxyXG4gICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgY29udmVyZ2VuY2VzOiBbXSxcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmbGFnZ2VkLmFkZChub2RlLmlkKTtcclxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkSWRlbnRpZmllcikge1xyXG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xyXG4gICAgICAgICAgaWYgKCFvZmZzZXRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBjaGlsZElEID0gcGF0aFtvZmZzZXRzWzFdXTtcclxuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcclxuICAgICAgICAgIG5hbWVJbmRleC5nZXQoY2hpbGRJRCkuY29udmVyZ2VuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICBwYXJlbnQ6IG5vZGUuaWQsXHJcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHBhdGgubGVuZ3RoKSB7XHJcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5wdXNoKHtcclxuICAgICAgICAgIGNoaWxkOiBwYXRoWzBdLFxyXG4gICAgICAgICAgcGF0aDogcGF0aCxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFuZXdBbmNlc3Rvcikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIW5vZGUuYW5jZXN0cnkpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCkge1xyXG4gICAgaWYgKHN0b3JlZENvZWZmaWNpZW50cy5oYXMoaWQpKSB7XHJcbiAgICAgIHJldHVybiBzdG9yZWRDb2VmZmljaWVudHMuZ2V0KGlkKTtcclxuICAgIH1cclxuICAgIHZhciBub2RlID0gbmFtZUluZGV4LmdldChpZCk7XHJcbiAgICB2YXIgdmFsID0gbm9kZS5jb252ZXJnZW5jZXMucmVkdWNlKGZ1bmN0aW9uIChzdW0sIHBvaW50KSB7XHJcbiAgICAgIHJldHVybiAoXHJcbiAgICAgICAgc3VtICtcclxuICAgICAgICBNYXRoLnBvdyhcclxuICAgICAgICAgIDEgLyAyLFxyXG4gICAgICAgICAgcG9pbnQub2Zmc2V0cy5yZWR1Y2UoZnVuY3Rpb24gKHN1bSwgdmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN1bSArIHZhbHVlO1xyXG4gICAgICAgICAgfSwgMSlcclxuICAgICAgICApICpcclxuICAgICAgICAgICgxICsgZ2V0Q29lZmZpY2llbnQocG9pbnQucGFyZW50KSlcclxuICAgICAgKTtcclxuICAgIH0sIDApO1xyXG4gICAgc3RvcmVkQ29lZmZpY2llbnRzLnNldChpZCwgdmFsKTtcclxuXHJcbiAgICByZXR1cm4gdmFsO1xyXG4gIH1cclxuICBmdW5jdGlvbiBmaW5kQ29udmVyZ2VuY2UobGlzdEEsIGxpc3RCKSB7XHJcbiAgICB2YXIgY2ksIGNqLCBsaSwgbGo7XHJcbiAgICBvdXRlcmxvb3A6IGZvciAoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKykge1xyXG4gICAgICBmb3IgKGNqID0gMCwgbGogPSBsaXN0Qi5sZW5ndGg7IGNqIDwgbGo7IGNqKyspIHtcclxuICAgICAgICBpZiAobGlzdEFbY2ldID09PSBsaXN0Qltjal0pIHtcclxuICAgICAgICAgIGJyZWFrIG91dGVybG9vcDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChjaSA9PT0gbGkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFtjaSwgY2pdO1xyXG4gIH1cclxufVxyXG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcclxuXHJcbnZhciBzY2hlbWEgPSBjYXJDb25zdHJ1Y3QuZ2VuZXJhdGVTY2hlbWEoY2FyQ29uc3RhbnRzKTtcclxudmFyIHBpY2tQYXJlbnQgPSByZXF1aXJlKFwiLi9waWNrUGFyZW50XCIpO1xyXG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcclxuY29uc3QgY29uc3RhbnRzID0ge1xyXG4gIGdlbmVyYXRpb25TaXplOiAyMCxcclxuICBzY2hlbWE6IHNjaGVtYSxcclxuICBjaGFtcGlvbkxlbmd0aDogMSxcclxuICBtdXRhdGlvbl9yYW5nZTogMSxcclxuICBnZW5fbXV0YXRpb246IDAuMDUsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBjdXJyZW50Q2hvaWNlcyA9IG5ldyBNYXAoKTtcclxuICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgY29uc3RhbnRzLCB7XHJcbiAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXHJcbiAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXHJcbiAgICBwaWNrUGFyZW50OiBwaWNrUGFyZW50LmJpbmQodm9pZCAwLCBjdXJyZW50Q2hvaWNlcyksXHJcbiAgfSk7XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzLmNvbnN0YW50cyA9IGNvbnN0YW50cztcclxuIiwidmFyIG5BdHRyaWJ1dGVzID0gMTU7XHJcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcclxuXHJcbmZ1bmN0aW9uIHBpY2tQYXJlbnQoY3VycmVudENob2ljZXMsIGNob29zZUlkLCBrZXkgLyogLCBwYXJlbnRzICovKSB7XHJcbiAgaWYgKCFjdXJyZW50Q2hvaWNlcy5oYXMoY2hvb3NlSWQpKSB7XHJcbiAgICBjdXJyZW50Q2hvaWNlcy5zZXQoY2hvb3NlSWQsIGluaXRpYWxpemVQaWNrKCkpO1xyXG4gIH1cclxuICAvLyBjb25zb2xlLmxvZyhjaG9vc2VJZCk7XHJcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcclxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZS5jdXJwYXJlbnQpO1xyXG4gIHN0YXRlLmkrKztcclxuICBpZiAoW1wid2hlZWxfcmFkaXVzXCIsIFwid2hlZWxfdmVydGV4XCIsIFwid2hlZWxfZGVuc2l0eVwiXS5pbmRleE9mKGtleSkgPiAtMSkge1xyXG4gICAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcclxuICAgIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XHJcbiAgfVxyXG4gIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XHJcbiAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcclxuXHJcbiAgZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KHN0YXRlKSB7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gc3RhdGUuY3VycGFyZW50O1xyXG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcclxuICAgIHZhciBzd2FwUG9pbnQxID0gc3RhdGUuc3dhcFBvaW50MTtcclxuICAgIHZhciBzd2FwUG9pbnQyID0gc3RhdGUuc3dhcFBvaW50MjtcclxuICAgIC8vIGNvbnNvbGUubG9nKHN3YXBQb2ludDEsIHN3YXBQb2ludDIsIGF0dHJpYnV0ZUluZGV4KVxyXG4gICAgaWYgKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXggfHwgc3dhcFBvaW50MiA9PSBhdHRyaWJ1dGVJbmRleCkge1xyXG4gICAgICByZXR1cm4gY3VycGFyZW50ID09IDEgPyAwIDogMTtcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJwYXJlbnQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpbml0aWFsaXplUGljaygpIHtcclxuICAgIHZhciBjdXJwYXJlbnQgPSAwO1xyXG5cclxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbkF0dHJpYnV0ZXMpO1xyXG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xyXG4gICAgd2hpbGUgKHN3YXBQb2ludDIgPT0gc3dhcFBvaW50MSkge1xyXG4gICAgICBzd2FwUG9pbnQyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbkF0dHJpYnV0ZXMpO1xyXG4gICAgfVxyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY3VycGFyZW50OiBjdXJwYXJlbnQsXHJcbiAgICAgIGk6IGksXHJcbiAgICAgIHN3YXBQb2ludDE6IHN3YXBQb2ludDEsXHJcbiAgICAgIHN3YXBQb2ludDI6IHN3YXBQb2ludDIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG4iLCJ2YXIgZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50ID0gcmVxdWlyZShcIi4vaW5icmVlZGluZy1jb2VmZmljaWVudFwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xyXG5cclxuZnVuY3Rpb24gc2ltcGxlU2VsZWN0KHBhcmVudHMpIHtcclxuICB2YXIgdG90YWxQYXJlbnRzID0gcGFyZW50cy5sZW5ndGg7XHJcbiAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpO1xyXG4gIGlmIChyID09IDApIHJldHVybiAwO1xyXG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcclxuICB2YXIgcHJldmlvdXNQYXJlbnQgPSBwYXJlbnRzW3ByZXZpb3VzUGFyZW50SW5kZXhdO1xyXG4gIHZhciB2YWxpZFBhcmVudHMgPSBwYXJlbnRzLmZpbHRlcihmdW5jdGlvbiAocGFyZW50LCBpKSB7XHJcbiAgICBpZiAocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBpZiAoIXByZXZpb3VzUGFyZW50KSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkID0ge1xyXG4gICAgICBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMiksXHJcbiAgICAgIGFuY2VzdHJ5OiBbcHJldmlvdXNQYXJlbnQsIHBhcmVudF0ubWFwKGZ1bmN0aW9uIChwKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiBwLmRlZi5pZCxcclxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeSxcclxuICAgICAgICB9O1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcclxuICAgIGNvbnNvbGUubG9nKFwiaW5icmVlZGluZyBjb2VmZmljaWVudFwiLCBpQ28pO1xyXG4gICAgaWYgKGlDbyA+IDAuMjUpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbiAgaWYgKHZhbGlkUGFyZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwYXJlbnRzLmxlbmd0aCk7XHJcbiAgfVxyXG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbiAoc3VtLCBwYXJlbnQpIHtcclxuICAgIHJldHVybiBzdW0gKyBwYXJlbnQuc2NvcmUudjtcclxuICB9LCAwKTtcclxuICB2YXIgciA9IHRvdGFsU2NvcmUgKiBNYXRoLnJhbmRvbSgpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsaWRQYXJlbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgc2NvcmUgPSB2YWxpZFBhcmVudHNbaV0uc2NvcmUudjtcclxuICAgIGlmIChyID4gc2NvcmUpIHtcclxuICAgICAgciA9IHIgLSBzY29yZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gaTtcclxufVxyXG4iLCJ2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4vcmFuZG9tLmpzXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShcclxuICAgICAgZnVuY3Rpb24gKGluc3RhbmNlLCBrZXkpIHtcclxuICAgICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20uY3JlYXRlTm9ybWFscyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpO1xyXG4gICAgICAgIGluc3RhbmNlW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgICB9LFxyXG4gICAgICB7IGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSB9XHJcbiAgICApO1xyXG4gIH0sXHJcbiAgY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBhcmVudENob29zZXIpIHtcclxuICAgIHZhciBpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKFxyXG4gICAgICBmdW5jdGlvbiAoY3Jvc3NEZWYsIGtleSkge1xyXG4gICAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcclxuICAgICAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XHJcbiAgICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG4gICAgICAgIHJldHVybiBjcm9zc0RlZjtcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiBpZCxcclxuICAgICAgICBhbmNlc3RyeTogcGFyZW50cy5tYXAoZnVuY3Rpb24gKHBhcmVudCkge1xyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfSksXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfSxcclxuICBjcmVhdGVNdXRhdGVkQ2xvbmUoc2NoZW1hLCBnZW5lcmF0b3IsIHBhcmVudCwgZmFjdG9yLCBjaGFuY2VUb011dGF0ZSkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKFxyXG4gICAgICBmdW5jdGlvbiAoY2xvbmUsIGtleSkge1xyXG4gICAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XHJcbiAgICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICAgICAgc2NoZW1hUHJvcCxcclxuICAgICAgICAgIGdlbmVyYXRvcixcclxuICAgICAgICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgICAgICAgZmFjdG9yLFxyXG4gICAgICAgICAgY2hhbmNlVG9NdXRhdGVcclxuICAgICAgICApO1xyXG4gICAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH0sXHJcbiAgYXBwbHlUeXBlcyhzY2hlbWEsIHBhcmVudCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKFxyXG4gICAgICBmdW5jdGlvbiAoY2xvbmUsIGtleSkge1xyXG4gICAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XHJcbiAgICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgICAgdmFyIHZhbHVlcztcclxuICAgICAgICBzd2l0Y2ggKHNjaGVtYVByb3AudHlwZSkge1xyXG4gICAgICAgICAgY2FzZSBcInNodWZmbGVcIjpcclxuICAgICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBcImZsb2F0XCI6XHJcbiAgICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIFwiaW50ZWdlclwiOlxyXG4gICAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9JbnRlZ2VyKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgYFVua25vd24gdHlwZSAke3NjaGVtYVByb3AudHlwZX0gb2Ygc2NoZW1hIGZvciBrZXkgJHtrZXl9YFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICAgIHJldHVybiBjbG9uZTtcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9LFxyXG59O1xyXG4iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdlbmVyYXRpb25aZXJvOiBnZW5lcmF0aW9uWmVybyxcclxuICBuZXh0R2VuZXJhdGlvbjogbmV4dEdlbmVyYXRpb24sXHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpIHtcclxuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXHJcbiAgICBzY2hlbWEgPSBjb25maWcuc2NoZW1hO1xyXG4gIHZhciBjd19jYXJHZW5lcmF0aW9uID0gW107XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcbiAgICB2YXIgZGVmID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcclxuICAgIH0pO1xyXG4gICAgZGVmLmluZGV4ID0gaztcclxuICAgIGN3X2NhckdlbmVyYXRpb24ucHVzaChkZWYpO1xyXG4gIH1cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogMCxcclxuICAgIGdlbmVyYXRpb246IGN3X2NhckdlbmVyYXRpb24sXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24ocHJldmlvdXNTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcclxuICB2YXIgY2hhbXBpb25fbGVuZ3RoID0gY29uZmlnLmNoYW1waW9uTGVuZ3RoLFxyXG4gICAgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXHJcbiAgICBzZWxlY3RGcm9tQWxsUGFyZW50cyA9IGNvbmZpZy5zZWxlY3RGcm9tQWxsUGFyZW50cztcclxuXHJcbiAgdmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuICB2YXIgbmV3Ym9ybjtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGNoYW1waW9uX2xlbmd0aDsgaysrKSB7XHJcbiAgICBgYDtcclxuICAgIHNjb3Jlc1trXS5kZWYuaXNfZWxpdGUgPSB0cnVlO1xyXG4gICAgc2NvcmVzW2tdLmRlZi5pbmRleCA9IGs7XHJcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2goc2NvcmVzW2tdLmRlZik7XHJcbiAgfVxyXG4gIHZhciBwYXJlbnRMaXN0ID0gW107XHJcbiAgZm9yIChrID0gY2hhbXBpb25fbGVuZ3RoOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG4gICAgdmFyIHBhcmVudDEgPSBzZWxlY3RGcm9tQWxsUGFyZW50cyhzY29yZXMsIHBhcmVudExpc3QpO1xyXG4gICAgdmFyIHBhcmVudDIgPSBwYXJlbnQxO1xyXG4gICAgd2hpbGUgKHBhcmVudDIgPT0gcGFyZW50MSkge1xyXG4gICAgICBwYXJlbnQyID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0LCBwYXJlbnQxKTtcclxuICAgIH1cclxuICAgIHZhciBwYWlyID0gW3BhcmVudDEsIHBhcmVudDJdO1xyXG4gICAgcGFyZW50TGlzdC5wdXNoKHBhaXIpO1xyXG4gICAgbmV3Ym9ybiA9IG1ha2VDaGlsZChcclxuICAgICAgY29uZmlnLFxyXG4gICAgICBwYWlyLm1hcChmdW5jdGlvbiAocGFyZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHNjb3Jlc1twYXJlbnRdLmRlZjtcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgICBuZXdib3JuID0gbXV0YXRlKGNvbmZpZywgbmV3Ym9ybik7XHJcbiAgICBuZXdib3JuLmlzX2VsaXRlID0gZmFsc2U7XHJcbiAgICBuZXdib3JuLmluZGV4ID0gaztcclxuICAgIG5ld0dlbmVyYXRpb24ucHVzaChuZXdib3JuKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiBwcmV2aW91c1N0YXRlLmNvdW50ZXIgKyAxLFxyXG4gICAgZ2VuZXJhdGlvbjogbmV3R2VuZXJhdGlvbixcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlQ2hpbGQoY29uZmlnLCBwYXJlbnRzKSB7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGlja1BhcmVudCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjb25maWcsIHBhcmVudCkge1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UgPSBjb25maWcubXV0YXRpb25fcmFuZ2UsXHJcbiAgICBnZW5fbXV0YXRpb24gPSBjb25maWcuZ2VuX211dGF0aW9uLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20gPSBjb25maWcuZ2VuZXJhdGVSYW5kb207XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXHJcbiAgICBzY2hlbWEsXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSxcclxuICAgIHBhcmVudCxcclxuICAgIE1hdGgubWF4KG11dGF0aW9uX3JhbmdlKSxcclxuICAgIGdlbl9tdXRhdGlvblxyXG4gICk7XHJcbn1cclxuIiwiY29uc3QgcmFuZG9tID0ge1xyXG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKFxyXG4gICAgICBwcm9wLFxyXG4gICAgICByYW5kb20uY3JlYXRlTm9ybWFscyhcclxuICAgICAgICB7XHJcbiAgICAgICAgICBsZW5ndGg6IHByb3AubGVuZ3RoIHx8IDEwLFxyXG4gICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2VuZXJhdG9yXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgfSxcclxuICBjcmVhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKFxyXG4gICAgICBwcm9wLFxyXG4gICAgICByYW5kb20uY3JlYXRlTm9ybWFscyhcclxuICAgICAgICB7XHJcbiAgICAgICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2VuZXJhdG9yXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgfSxcclxuICBjcmVhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQoXHJcbiAgICAgIHByb3AsXHJcbiAgICAgIHJhbmRvbS5jcmVhdGVOb3JtYWxzKFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXHJcbiAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZW5lcmF0b3JcclxuICAgICAgKVxyXG4gICAgKTtcclxuICB9LFxyXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKSB7XHJcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcclxuICAgICAgdmFsdWVzLnB1c2goY3JlYXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvcikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlcztcclxuICB9LFxyXG4gIG11dGF0ZVNodWZmbGUoXHJcbiAgICBwcm9wLFxyXG4gICAgZ2VuZXJhdG9yLFxyXG4gICAgb3JpZ2luYWxWYWx1ZXMsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSxcclxuICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgKSB7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShcclxuICAgICAgcHJvcCxcclxuICAgICAgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgICAgcHJvcCxcclxuICAgICAgICBnZW5lcmF0b3IsXHJcbiAgICAgICAgb3JpZ2luYWxWYWx1ZXMsXHJcbiAgICAgICAgbXV0YXRpb25fcmFuZ2UsXHJcbiAgICAgICAgY2hhbmNlVG9NdXRhdGVcclxuICAgICAgKVxyXG4gICAgKTtcclxuICB9LFxyXG4gIG11dGF0ZUludGVnZXJzKFxyXG4gICAgcHJvcCxcclxuICAgIGdlbmVyYXRvcixcclxuICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UsXHJcbiAgICBjaGFuY2VUb011dGF0ZVxyXG4gICkge1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIoXHJcbiAgICAgIHByb3AsXHJcbiAgICAgIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICAgIHByb3AsXHJcbiAgICAgICAgZ2VuZXJhdG9yLFxyXG4gICAgICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgICAgIG11dGF0aW9uX3JhbmdlLFxyXG4gICAgICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgfSxcclxuICBtdXRhdGVGbG9hdHMoXHJcbiAgICBwcm9wLFxyXG4gICAgZ2VuZXJhdG9yLFxyXG4gICAgb3JpZ2luYWxWYWx1ZXMsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSxcclxuICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgKSB7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQoXHJcbiAgICAgIHByb3AsXHJcbiAgICAgIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICAgIHByb3AsXHJcbiAgICAgICAgZ2VuZXJhdG9yLFxyXG4gICAgICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgICAgIG11dGF0aW9uX3JhbmdlLFxyXG4gICAgICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgfSxcclxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscykge1xyXG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XHJcbiAgICB2YXIgbGltaXQgPSBwcm9wLmxpbWl0IHx8IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHNvcnRlZCA9IG5vcm1hbHMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgIHJldHVybiBhIC0gYjtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG5vcm1hbHNcclxuICAgICAgLm1hcChmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgcmV0dXJuIHNvcnRlZC5pbmRleE9mKHZhbCk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5tYXAoZnVuY3Rpb24gKGkpIHtcclxuICAgICAgICByZXR1cm4gaSArIG9mZnNldDtcclxuICAgICAgfSlcclxuICAgICAgLnNsaWNlKDAsIGxpbWl0KTtcclxuICB9LFxyXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKSB7XHJcbiAgICBwcm9wID0ge1xyXG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXHJcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwLFxyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgfTtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24gKGZsb2F0KSB7XHJcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKGZsb2F0KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgbWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKSB7XHJcbiAgICBwcm9wID0ge1xyXG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXHJcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEsXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uIChub3JtYWwpIHtcclxuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xyXG4gICAgICB2YXIgcmFuZ2UgPSBwcm9wLnJhbmdlO1xyXG4gICAgICByZXR1cm4gbWluICsgbm9ybWFsICogcmFuZ2U7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIG11dGF0ZU5vcm1hbHMoXHJcbiAgICBwcm9wLFxyXG4gICAgZ2VuZXJhdG9yLFxyXG4gICAgb3JpZ2luYWxWYWx1ZXMsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSxcclxuICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgKSB7XHJcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2U7XHJcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uIChvcmlnaW5hbFZhbHVlKSB7XHJcbiAgICAgIGlmIChnZW5lcmF0b3IoKSA+IGNoYW5jZVRvTXV0YXRlKSB7XHJcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIGZhY3Rvcik7XHJcbiAgICB9KTtcclxuICB9LFxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSByYW5kb207XHJcblxyXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSkge1xyXG4gIGlmIChtdXRhdGlvbl9yYW5nZSA+IDEpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBtdXRhdGUgYmV5b25kIGJvdW5kc1wiKTtcclxuICB9XHJcbiAgdmFyIG5ld01pbiA9IG9yaWdpbmFsVmFsdWUgLSAwLjU7XHJcbiAgaWYgKG5ld01pbiA8IDApIG5ld01pbiA9IDA7XHJcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlID4gMSkgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xyXG4gIHZhciByYW5nZVZhbHVlID0gY3JlYXRlTm9ybWFsKFxyXG4gICAge1xyXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICB9LFxyXG4gICAgZ2VuZXJhdG9yXHJcbiAgKTtcclxuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKSB7XHJcbiAgaWYgKCFwcm9wLmluY2x1c2l2ZSkge1xyXG4gICAgcmV0dXJuIGdlbmVyYXRvcigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCkgPCAwLjUgPyBnZW5lcmF0b3IoKSA6IDEgLSBnZW5lcmF0b3IoKTtcclxuICB9XHJcbn1cclxuIiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXHJcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKSB7XHJcbiAgdmFyIG9sZFN0cnVjdHVyZSA9IGNyZWF0ZS5jcmVhdGVHZW5lcmF0aW9uWmVybyhcclxuICAgIGNvbmZpZy5zY2hlbWEsXHJcbiAgICBjb25maWcuZ2VuZXJhdGVSYW5kb21cclxuICApO1xyXG4gIHZhciBuZXdTdHJ1Y3R1cmUgPSBjcmVhdGVTdHJ1Y3R1cmUoY29uZmlnLCAxLCBvbGRTdHJ1Y3R1cmUpO1xyXG5cclxuICB2YXIgayA9IDA7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiAwLFxyXG4gICAgazogayxcclxuICAgIGdlbmVyYXRpb246IFtuZXdTdHJ1Y3R1cmUsIG9sZFN0cnVjdHVyZV0sXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24ocHJldmlvdXNTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcclxuICB2YXIgbmV4dFN0YXRlID0ge1xyXG4gICAgazogKHByZXZpb3VzU3RhdGUuayArIDEpICUgY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gICAgY291bnRlcjpcclxuICAgICAgcHJldmlvdXNTdGF0ZS5jb3VudGVyICtcclxuICAgICAgKHByZXZpb3VzU3RhdGUuayA9PT0gY29uZmlnLmdlbmVyYXRpb25TaXplID8gMSA6IDApLFxyXG4gIH07XHJcbiAgLy8gZ3JhZHVhbGx5IGdldCBjbG9zZXIgdG8gemVybyB0ZW1wZXJhdHVyZSAoYnV0IG5ldmVyIGhpdCBpdClcclxuICB2YXIgb2xkRGVmID0gcHJldmlvdXNTdGF0ZS5jdXJEZWYgfHwgcHJldmlvdXNTdGF0ZS5nZW5lcmF0aW9uWzFdO1xyXG4gIHZhciBvbGRTY29yZSA9IHByZXZpb3VzU3RhdGUuc2NvcmUgfHwgc2NvcmVzWzFdLnNjb3JlLnY7XHJcblxyXG4gIHZhciBuZXdEZWYgPSBwcmV2aW91c1N0YXRlLmdlbmVyYXRpb25bMF07XHJcbiAgdmFyIG5ld1Njb3JlID0gc2NvcmVzWzBdLnNjb3JlLnY7XHJcblxyXG4gIHZhciB0ZW1wID0gTWF0aC5wb3coTWF0aC5FLCAtbmV4dFN0YXRlLmNvdW50ZXIgLyBjb25maWcuZ2VuZXJhdGlvblNpemUpO1xyXG5cclxuICB2YXIgc2NvcmVEaWZmID0gbmV3U2NvcmUgLSBvbGRTY29yZTtcclxuICAvLyBJZiB0aGUgbmV4dCBwb2ludCBpcyBoaWdoZXIsIGNoYW5nZSBsb2NhdGlvblxyXG4gIGlmIChzY29yZURpZmYgPiAwKSB7XHJcbiAgICBuZXh0U3RhdGUuY3VyRGVmID0gbmV3RGVmO1xyXG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XHJcbiAgICAvLyBFbHNlIHdlIHdhbnQgdG8gaW5jcmVhc2UgbGlrZWx5aG9vZCBvZiBjaGFuZ2luZyBsb2NhdGlvbiBhcyB3ZSBnZXRcclxuICB9IGVsc2UgaWYgKE1hdGgucmFuZG9tKCkgPiBNYXRoLmV4cCgtc2NvcmVEaWZmIC8gKG5leHRTdGF0ZS5rICogdGVtcCkpKSB7XHJcbiAgICBuZXh0U3RhdGUuY3VyRGVmID0gbmV3RGVmO1xyXG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XHJcbiAgfSBlbHNlIHtcclxuICAgIG5leHRTdGF0ZS5jdXJEZWYgPSBvbGREZWY7XHJcbiAgICBuZXh0U3RhdGUuc2NvcmUgPSBvbGRTY29yZTtcclxuICB9XHJcblxyXG4gIGNvbnNvbGUubG9nKHByZXZpb3VzU3RhdGUsIG5leHRTdGF0ZSk7XHJcblxyXG4gIG5leHRTdGF0ZS5nZW5lcmF0aW9uID0gW2NyZWF0ZVN0cnVjdHVyZShjb25maWcsIHRlbXAsIG5leHRTdGF0ZS5jdXJEZWYpXTtcclxuXHJcbiAgcmV0dXJuIG5leHRTdGF0ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgbXV0YXRpb25fcmFuZ2UsIHBhcmVudCkge1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgZ2VuX211dGF0aW9uID0gMSxcclxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxyXG4gICAgc2NoZW1hLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20sXHJcbiAgICBwYXJlbnQsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSxcclxuICAgIGdlbl9tdXRhdGlvblxyXG4gICk7XHJcbn1cclxuIiwiLyogZ2xvYmFscyBidG9hICovXHJcbnZhciBzZXR1cFNjZW5lID0gcmVxdWlyZShcIi4vc2V0dXAtc2NlbmVcIik7XHJcbnZhciBjYXJSdW4gPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9ydW5cIik7XHJcbnZhciBkZWZUb0NhciA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2RlZi10by1jYXJcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJ1bkRlZnM7XHJcbmZ1bmN0aW9uIHJ1bkRlZnMod29ybGRfZGVmLCBkZWZzLCBsaXN0ZW5lcnMpIHtcclxuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcclxuICAgIC8vIEdIT1NUIERJU0FCTEVEXHJcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XHJcbiAgfVxyXG5cclxuICB2YXIgc2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XHJcbiAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xyXG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYnVpbGQgY2Fyc1wiKTtcclxuICB2YXIgY2FycyA9IGRlZnMubWFwKChkZWYsIGkpID0+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGluZGV4OiBpLFxyXG4gICAgICBkZWY6IGRlZixcclxuICAgICAgY2FyOiBkZWZUb0NhcihkZWYsIHNjZW5lLndvcmxkLCB3b3JsZF9kZWYpLFxyXG4gICAgICBzdGF0ZTogY2FyUnVuLmdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpLFxyXG4gICAgfTtcclxuICB9KTtcclxuICB2YXIgYWxpdmVjYXJzID0gY2FycztcclxuICByZXR1cm4ge1xyXG4gICAgc2NlbmU6IHNjZW5lLFxyXG4gICAgY2FyczogY2FycyxcclxuICAgIHN0ZXA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyBtb3JlIGNhcnNcIik7XHJcbiAgICAgIH1cclxuICAgICAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xyXG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xyXG4gICAgICBhbGl2ZWNhcnMgPSBhbGl2ZWNhcnMuZmlsdGVyKGZ1bmN0aW9uIChjYXIpIHtcclxuICAgICAgICBjYXIuc3RhdGUgPSBjYXJSdW4udXBkYXRlU3RhdGUod29ybGRfZGVmLCBjYXIuY2FyLCBjYXIuc3RhdGUpO1xyXG4gICAgICAgIHZhciBzdGF0dXMgPSBjYXJSdW4uZ2V0U3RhdHVzKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcclxuICAgICAgICBsaXN0ZW5lcnMuY2FyU3RlcChjYXIpO1xyXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xyXG4gICAgICAgIGxpc3RlbmVycy5jYXJEZWF0aChjYXIpO1xyXG5cclxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcclxuICAgICAgICB2YXIgd29ybGRDYXIgPSBjYXIuY2FyO1xyXG4gICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLmNoYXNzaXMpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IHdvcmxkQ2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xyXG4gICAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIud2hlZWxzW3ddKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSk7XHJcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgbGlzdGVuZXJzLmdlbmVyYXRpb25FbmQoY2Fycyk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cclxuXHJcbi8qXHJcblxyXG53b3JsZF9kZWYgPSB7XHJcbiAgZ3Jhdml0eToge3gsIHl9LFxyXG4gIGRvU2xlZXA6IGJvb2xlYW4sXHJcbiAgZmxvb3JzZWVkOiBzdHJpbmcsXHJcbiAgdGlsZURpbWVuc2lvbnMsXHJcbiAgbWF4Rmxvb3JUaWxlcyxcclxuICBtdXRhYmxlX2Zsb29yOiBib29sZWFuXHJcbn1cclxuXHJcbiovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh3b3JsZF9kZWYpIHtcclxuICB2YXIgd29ybGQgPSBuZXcgYjJXb3JsZCh3b3JsZF9kZWYuZ3Jhdml0eSwgd29ybGRfZGVmLmRvU2xlZXApO1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXHJcbiAgICB3b3JsZCxcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQsXHJcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXHJcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcclxuICAgIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yXHJcbiAgKTtcclxuXHJcbiAgdmFyIGxhc3RfdGlsZSA9IGZsb29yVGlsZXNbZmxvb3JUaWxlcy5sZW5ndGggLSAxXTtcclxuICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XHJcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChcclxuICAgIGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM11cclxuICApO1xyXG4gIHdvcmxkLmZpbmlzaExpbmUgPSB0aWxlX3Bvc2l0aW9uLng7XHJcbiAgcmV0dXJuIHtcclxuICAgIHdvcmxkOiB3b3JsZCxcclxuICAgIGZsb29yVGlsZXM6IGZsb29yVGlsZXMsXHJcbiAgICBmaW5pc2hMaW5lOiB0aWxlX3Bvc2l0aW9uLngsXHJcbiAgfTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yKFxyXG4gIHdvcmxkLFxyXG4gIGZsb29yc2VlZCxcclxuICBkaW1lbnNpb25zLFxyXG4gIG1heEZsb29yVGlsZXMsXHJcbiAgbXV0YWJsZV9mbG9vclxyXG4pIHtcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIHZhciBjd19mbG9vclRpbGVzID0gW107XHJcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcclxuICAgIGlmICghbXV0YWJsZV9mbG9vcikge1xyXG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLFxyXG4gICAgICAgIGRpbWVuc2lvbnMsXHJcbiAgICAgICAgdGlsZV9wb3NpdGlvbixcclxuICAgICAgICAoKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuNSAqIGspIC8gbWF4Rmxvb3JUaWxlc1xyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaWYgcGF0aCBpcyBtdXRhYmxlIG92ZXIgcmFjZXMsIGNyZWF0ZSBzbW9vdGhlciB0cmFja3NcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLFxyXG4gICAgICAgIGRpbWVuc2lvbnMsXHJcbiAgICAgICAgdGlsZV9wb3NpdGlvbixcclxuICAgICAgICAoKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGspIC8gbWF4Rmxvb3JUaWxlc1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgY3dfZmxvb3JUaWxlcy5wdXNoKGxhc3RfdGlsZSk7XHJcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XHJcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXHJcbiAgICAgIGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM11cclxuICAgICk7XHJcbiAgfVxyXG4gIHJldHVybiBjd19mbG9vclRpbGVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vclRpbGUod29ybGQsIGRpbSwgcG9zaXRpb24sIGFuZ2xlKSB7XHJcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xyXG5cclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcclxuXHJcbiAgdmFyIGNvb3JkcyA9IG5ldyBBcnJheSgpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xyXG5cclxuICB2YXIgY2VudGVyID0gbmV3IGIyVmVjMigwLCAwKTtcclxuXHJcbiAgdmFyIG5ld2Nvb3JkcyA9IGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpO1xyXG5cclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XHJcbiAgcmV0dXJuIGNvb3Jkcy5tYXAoZnVuY3Rpb24gKGNvb3JkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OlxyXG4gICAgICAgIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpIC1cclxuICAgICAgICBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArXHJcbiAgICAgICAgY2VudGVyLngsXHJcbiAgICAgIHk6XHJcbiAgICAgICAgTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgK1xyXG4gICAgICAgIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICtcclxuICAgICAgICBjZW50ZXIueSxcclxuICAgIH07XHJcbiAgfSk7XHJcbn1cclxuIl19
