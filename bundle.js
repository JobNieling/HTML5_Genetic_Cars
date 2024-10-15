(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{"./car-constants.json":1}],3:[function(require,module,exports){
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

},{"../machine-learning/create-instance":20}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
/* globals document */

var run = require("../car-schema/run");

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function () {
  this.__constructor.apply(this, arguments);
};

cw_Car.prototype.__constructor = function (car) {
  this.car = car;
  this.car_def = car.def;
  var car_def = this.car_def;

  this.frames = 0;
  this.alive = true;
  this.is_elite = car.def.is_elite;
  this.healthBar = document.getElementById("health" + car_def.index).style;
  this.healthBarText = document.getElementById(
    "health" + car_def.index
  ).nextSibling.nextSibling;
  this.healthBarText.innerHTML = car_def.index;
  this.minimapmarker = document.getElementById("bar" + car_def.index);

  if (this.is_elite) {
    this.healthBar.backgroundColor = "#3F72AF";
    this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
    this.minimapmarker.innerHTML = car_def.index;
  } else {
    this.healthBar.backgroundColor = "#F7C873";
    this.minimapmarker.style.borderLeft = "1px solid #F7C873";
    this.minimapmarker.innerHTML = car_def.index;
  }
};

cw_Car.prototype.getPosition = function () {
  return this.car.car.chassis.GetPosition();
};

cw_Car.prototype.kill = function (currentRunner, constants) {
  this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
  var finishLine = currentRunner.scene.finishLine;
  var max_car_health = constants.max_car_health;
  var status = run.getStatus(this.car.state, {
    finishLine: finishLine,
    max_car_health: max_car_health,
  });
  switch (status) {
    case 1: {
      this.healthBar.width = "0";
      break;
    }
    case -1: {
      this.healthBarText.innerHTML = "&dagger;";
      this.healthBar.width = "0";
      break;
    }
  }
  this.alive = false;
};

module.exports = cw_Car;

},{"../car-schema/run":4}],6:[function(require,module,exports){
var cw_drawVirtualPoly = require("./draw-virtual-poly");
var cw_drawCircle = require("./draw-circle");

module.exports = function (car_constants, myCar, camera, ctx) {
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;

  var wheelMinDensity = car_constants.wheelMinDensity;
  var wheelDensityRange = car_constants.wheelDensityRange;

  if (!myCar.alive) {
    return;
  }
  var myCarPos = myCar.getPosition();

  if (myCarPos.x < camera_x - 5) {
    // too far behind, don't draw
    return;
  }

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1 / zoom;

  var wheels = myCar.car.car.wheels;

  for (var i = 0; i < wheels.length; i++) {
    var b = wheels[i];
    for (var f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(
        255 - (255 * (f.m_density - wheelMinDensity)) / wheelDensityRange
      ).toString();
      var rgbcolor = "rgb(" + color + "," + color + "," + color + ")";
      cw_drawCircle(ctx, b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }
  }

  if (myCar.is_elite) {
    ctx.strokeStyle = "#3F72AF";
    ctx.fillStyle = "#DBE2EF";
  } else {
    ctx.strokeStyle = "#F7C873";
    ctx.fillStyle = "#FAEBCD";
  }
  ctx.beginPath();

  var chassis = myCar.car.car.chassis;

  for (f = chassis.GetFixtureList(); f; f = f.m_next) {
    var cs = f.GetShape();
    cw_drawVirtualPoly(ctx, chassis, cs.m_vertices, cs.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
};

},{"./draw-circle":7,"./draw-virtual-poly":9}],7:[function(require,module,exports){
module.exports = cw_drawCircle;

function cw_drawCircle(ctx, body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius * Math.cos(angle), p.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{}],8:[function(require,module,exports){
var cw_drawVirtualPoly = require("./draw-virtual-poly");
module.exports = function (ctx, camera, cw_floorTiles) {
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#777";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();

  var k;
  if (camera.pos.x - 10 > 0) {
    k = Math.floor((camera.pos.x - 10) / 1.5);
  } else {
    k = 0;
  }

  // console.log(k);

  outer_loop: for (k; k < cw_floorTiles.length; k++) {
    var b = cw_floorTiles[k];
    for (var f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
      if (shapePosition > camera_x - 5 && shapePosition < camera_x + 10) {
        cw_drawVirtualPoly(ctx, b, s.m_vertices, s.m_vertexCount);
      }
      if (shapePosition > camera_x + 10) {
        break outer_loop;
      }
    }
  }
  ctx.fill();
  ctx.stroke();
};

},{"./draw-virtual-poly":9}],9:[function(require,module,exports){
module.exports = function (ctx, body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    var p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
};

},{}],10:[function(require,module,exports){
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

},{"./scatter-plot":11}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
module.exports = generateRandom;
function generateRandom() {
  return Math.random();
}

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{"../car-schema/construct.js":2,"./generateRandom":12,"./pickParent":15,"./selectFromAllParents":16}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{"./inbreeding-coefficient":13}],17:[function(require,module,exports){
module.exports = function (car) {
  var out = {
    chassis: ghost_get_chassis(car.chassis),
    wheels: [],
    pos: { x: car.chassis.GetPosition().x, y: car.chassis.GetPosition().y },
  };

  for (var i = 0; i < car.wheels.length; i++) {
    out.wheels[i] = ghost_get_wheel(car.wheels[i]);
  }

  return out;
};

function ghost_get_chassis(c) {
  var gc = [];

  for (var f = c.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var p = {
      vtx: [],
      num: 0,
    };

    p.num = s.m_vertexCount;

    for (var i = 0; i < s.m_vertexCount; i++) {
      p.vtx.push(c.GetWorldPoint(s.m_vertices[i]));
    }

    gc.push(p);
  }

  return gc;
}

function ghost_get_wheel(w) {
  var gw = [];

  for (var f = w.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var c = {
      pos: w.GetWorldPoint(s.m_p),
      rad: s.m_radius,
      ang: w.m_sweep.a,
    };

    gw.push(c);
  }

  return gw;
}

},{}],18:[function(require,module,exports){
var ghost_get_frame = require("./car-to-ghost.js");

var enable_ghost = true;

module.exports = {
  ghost_create_replay: ghost_create_replay,
  ghost_create_ghost: ghost_create_ghost,
  ghost_pause: ghost_pause,
  ghost_resume: ghost_resume,
  ghost_get_position: ghost_get_position,
  ghost_compare_to_replay: ghost_compare_to_replay,
  ghost_move_frame: ghost_move_frame,
  ghost_add_replay_frame: ghost_add_replay_frame,
  ghost_draw_frame: ghost_draw_frame,
  ghost_reset_ghost: ghost_reset_ghost,
};

function ghost_create_replay() {
  if (!enable_ghost) return null;

  return {
    num_frames: 0,
    frames: [],
  };
}

function ghost_create_ghost() {
  if (!enable_ghost) return null;

  return {
    replay: null,
    frame: 0,
    dist: -100,
  };
}

function ghost_reset_ghost(ghost) {
  if (!enable_ghost) return;
  if (ghost == null) return;
  ghost.frame = 0;
}

function ghost_pause(ghost) {
  if (ghost != null) ghost.old_frame = ghost.frame;
  ghost_reset_ghost(ghost);
}

function ghost_resume(ghost) {
  if (ghost != null) ghost.frame = ghost.old_frame;
}

function ghost_get_position(ghost) {
  if (!enable_ghost) return;
  if (ghost == null) return;
  if (ghost.frame < 0) return;
  if (ghost.replay == null) return;
  var frame = ghost.replay.frames[ghost.frame];
  return frame.pos;
}

function ghost_compare_to_replay(replay, ghost, max) {
  if (!enable_ghost) return;
  if (ghost == null) return;
  if (replay == null) return;

  if (ghost.dist < max) {
    ghost.replay = replay;
    ghost.dist = max;
    ghost.frame = 0;
  }
}

function ghost_move_frame(ghost) {
  if (!enable_ghost) return;
  if (ghost == null) return;
  if (ghost.replay == null) return;
  ghost.frame++;
  if (ghost.frame >= ghost.replay.num_frames)
    ghost.frame = ghost.replay.num_frames - 1;
}

function ghost_add_replay_frame(replay, car) {
  if (!enable_ghost) return;
  if (replay == null) return;

  var frame = ghost_get_frame(car);
  replay.frames.push(frame);
  replay.num_frames++;
}

function ghost_draw_frame(ctx, ghost, camera) {
  var zoom = camera.zoom;
  if (!enable_ghost) return;
  if (ghost == null) return;
  if (ghost.frame < 0) return;
  if (ghost.replay == null) return;

  var frame = ghost.replay.frames[ghost.frame];

  // wheel style
  ctx.fillStyle = "#eee";
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1 / zoom;

  for (var i = 0; i < frame.wheels.length; i++) {
    for (var w in frame.wheels[i]) {
      ghost_draw_circle(
        ctx,
        frame.wheels[i][w].pos,
        frame.wheels[i][w].rad,
        frame.wheels[i][w].ang
      );
    }
  }

  // chassis style
  ctx.strokeStyle = "#aaa";
  ctx.fillStyle = "#eee";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (var c in frame.chassis)
    ghost_draw_poly(ctx, frame.chassis[c].vtx, frame.chassis[c].num);
  ctx.fill();
  ctx.stroke();
}

function ghost_draw_poly(ctx, vtx, n_vtx) {
  ctx.moveTo(vtx[0].x, vtx[0].y);
  for (var i = 1; i < n_vtx; i++) {
    ctx.lineTo(vtx[i].x, vtx[i].y);
  }
  ctx.lineTo(vtx[0].x, vtx[0].y);
}

function ghost_draw_circle(ctx, center, radius, angle) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(center.x, center.y);
  ctx.lineTo(
    center.x + radius * Math.cos(angle),
    center.y + radius * Math.sin(angle)
  );

  ctx.fill();
  ctx.stroke();
}

},{"./car-to-ghost.js":17}],19:[function(require,module,exports){
/* globals document performance localStorage alert confirm btoa HTMLDivElement */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");
var carConstruct = require("./car-schema/construct.js");

var manageRound = require("./machine-learning/genetic-algorithm/manage-round.js");

var ghost_fns = require("./ghost/index.js");

var drawCar = require("./draw/draw-car.js");
var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;
var cw_clearGraphics = graph_fns.clearGraphics;
var cw_drawFloor = require("./draw/draw-floor.js");

var ghost_draw_frame = ghost_fns.ghost_draw_frame;
var ghost_create_ghost = ghost_fns.ghost_create_ghost;
var ghost_add_replay_frame = ghost_fns.ghost_add_replay_frame;
var ghost_compare_to_replay = ghost_fns.ghost_compare_to_replay;
var ghost_get_position = ghost_fns.ghost_get_position;
var ghost_move_frame = ghost_fns.ghost_move_frame;
var ghost_reset_ghost = ghost_fns.ghost_reset_ghost;
var ghost_pause = ghost_fns.ghost_pause;
var ghost_resume = ghost_fns.ghost_resume;
var ghost_create_replay = ghost_fns.ghost_create_replay;

var cw_Car = require("./draw/draw-car-stats.js");
var ghost;
var carMap = new Map();

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;
var skipTicks = Math.round(1000 / box2dfps);
var maxFrameSkip = skipTicks * 2;

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var camera = {
  speed: 0.05,
  pos: {
    x: 0,
    y: 0,
  },
  target: -1,
  zoom: 70,
};

var minimapcamera = document.getElementById("minimapcamera").style;
var minimapholder = document.querySelector("#minimapholder");

var minimapcanvas = document.getElementById("minimap");
var minimapctx = minimapcanvas.getContext("2d");
var minimapscale = 3;
var minimapfogdistance = 0;
var fogdistance = document.getElementById("minimapfog").style;

var carConstants = carConstruct.carConstants();

var max_car_health = box2dfps * 10;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");
var heightMeter = document.getElementById("heightmeter");

var leaderPosition = {
  x: 0,
  y: 0,
};

minimapcamera.width = 12 * minimapscale + "px";
minimapcamera.height = 6 * minimapscale + "px";

// ======= WORLD STATE ======
var generationConfig = require("./generation-config");

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

var cw_deadCars;
var graphState = {
  cw_topScores: [],
  cw_graphAverage: [],
  cw_graphElite: [],
  cw_graphTop: [],
};

function resetGraphState() {
  graphState = {
    cw_topScores: [],
    cw_graphAverage: [],
    cw_graphElite: [],
    cw_graphTop: [],
  };
}

// ==========================

var generationState;

// ======== Activity State ====
var currentRunner;
var loops = 0;
var nextGameTick = new Date().getTime();

function showDistance(distance, height) {
  distanceMeter.innerHTML = distance + " meters<br />";
  heightMeter.innerHTML = height + " meters";
  if (distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}

/* === END Car ============================================================= */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {
  generationState = manageRound.generationZero(generationConfig());
}

function resetCarUI() {
  cw_deadCars = 0;
  leaderPosition = {
    x: 0,
    y: 0,
  };
  document.getElementById("generation").innerHTML =
    generationState.counter.toString();
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML =
    generationConfig.constants.generationSize.toString();
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  var floorTiles = currentRunner.scene.floorTiles;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  cw_setCameraPosition();
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  ctx.translate(200 - camera_x * zoom, 200 + camera_y * zoom);
  ctx.scale(zoom, -zoom);
  cw_drawFloor(ctx, camera, floorTiles);
  ghost_draw_frame(ctx, ghost, camera);
  cw_drawCars();
  ctx.restore();
}

function cw_minimapCamera(/* x, y*/) {
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  minimapcamera.left = Math.round((2 + camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31 - camera_y) * minimapscale) + "px";
}

function cw_setCameraTarget(k) {
  camera.target = k;
}

function cw_setCameraPosition() {
  var cameraTargetPosition;
  if (camera.target !== -1) {
    cameraTargetPosition = carMap.get(camera.target).getPosition();
  } else {
    cameraTargetPosition = leaderPosition;
  }
  var diff_y = camera.pos.y - cameraTargetPosition.y;
  var diff_x = camera.pos.x - cameraTargetPosition.x;
  camera.pos.y -= camera.speed * diff_y;
  camera.pos.x -= camera.speed * diff_x;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
}

function cw_drawGhostReplay() {
  var floorTiles = currentRunner.scene.floorTiles;
  var carPosition = ghost_get_position(ghost);
  camera.pos.x = carPosition.x;
  camera.pos.y = carPosition.y;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
  showDistance(
    Math.round(carPosition.x * 100) / 100,
    Math.round(carPosition.y * 100) / 100
  );
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    200 - carPosition.x * camera.zoom,
    200 + carPosition.y * camera.zoom
  );
  ctx.scale(camera.zoom, -camera.zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor(ctx, camera, floorTiles);
  ctx.restore();
}

function cw_drawCars() {
  var cw_carArray = Array.from(carMap.values());
  for (var k = cw_carArray.length - 1; k >= 0; k--) {
    var myCar = cw_carArray[k];
    drawCar(carConstants, myCar, camera, ctx);
  }
}

function toggleDisplay() {
  canvas.width = canvas.width;
  if (doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(function () {
      var time = performance.now() + 1000 / screenfps;
      while (time > performance.now()) {
        simulationStep();
      }
    }, 1);
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
}

function cw_drawMiniMap() {
  var floorTiles = currentRunner.scene.floorTiles;
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#3F72AF";
  minimapctx.beginPath();
  minimapctx.moveTo(0, 35 * minimapscale);
  for (var k = 0; k < floorTiles.length; k++) {
    last_tile = floorTiles[k];
    var last_fixture = last_tile.GetFixtureList();
    var last_world_coords = last_tile.GetWorldPoint(
      last_fixture.GetShape().m_vertices[3]
    );
    tile_position = last_world_coords;
    minimapctx.lineTo(
      (tile_position.x + 5) * minimapscale,
      (-tile_position.y + 35) * minimapscale
    );
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */
var uiListeners = {
  preCarStep: function () {
    ghost_move_frame(ghost);
  },
  carStep(car) {
    updateCarUI(car);
  },
  carDeath(carInfo) {
    var k = carInfo.index;

    var car = carInfo.car,
      score = carInfo.score;
    carMap.get(carInfo).kill(currentRunner, world_def);

    // refocus camera to leader on death
    if (camera.target == carInfo) {
      cw_setCameraTarget(-1);
    }
    // console.log(score);
    carMap.delete(carInfo);
    ghost_compare_to_replay(car.replay, ghost, score.v);
    score.i = generationState.counter;

    cw_deadCars++;
    var generationSize = generationConfig.constants.generationSize;
    document.getElementById("population").innerHTML = (
      generationSize - cw_deadCars
    ).toString();

    // console.log(leaderPosition.leader, k)
    if (leaderPosition.leader == k) {
      // leader is dead, find new leader
      cw_findLeader();
    }
  },
  generationEnd(results) {
    cleanupRound(results);
    return cw_newRound(results);
  },
};

function simulationStep() {
  currentRunner.step();
  showDistance(
    Math.round(leaderPosition.x * 100) / 100,
    Math.round(leaderPosition.y * 100) / 100
  );
}

function gameLoop() {
  loops = 0;
  while (
    !cw_paused &&
    new Date().getTime() > nextGameTick &&
    loops < maxFrameSkip
  ) {
    nextGameTick += skipTicks;
    loops++;
  }
  simulationStep();
  cw_drawScreen();

  if (!cw_paused) window.requestAnimationFrame(gameLoop);
}

function updateCarUI(carInfo) {
  var k = carInfo.index;
  var car = carMap.get(carInfo);
  var position = car.getPosition();

  ghost_add_replay_frame(car.replay, car.car.car);
  car.minimapmarker.style.left =
    Math.round((position.x + 5) * minimapscale) + "px";
  car.healthBar.width =
    Math.round((car.car.state.health / max_car_health) * 100) + "%";
  if (position.x > leaderPosition.x) {
    leaderPosition = position;
    leaderPosition.leader = k;
    // console.log("new leader: ", k);
  }
}

function cw_findLeader() {
  var lead = 0;
  var cw_carArray = Array.from(carMap.values());
  for (var k = 0; k < cw_carArray.length; k++) {
    if (!cw_carArray[k].alive) {
      continue;
    }
    var position = cw_carArray[k].getPosition();
    if (position.x > lead) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
}

function fastForward() {
  var gen = generationState.counter;
  while (gen === generationState.counter) {
    currentRunner.step();
  }
}

function cleanupRound(results) {
  results.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1;
    } else {
      return 1;
    }
  });
  graphState = plot_graphs(
    document.getElementById("graphcanvas"),
    document.getElementById("topscores"),
    null,
    graphState,
    results
  );
}

function cw_newRound(results) {
  camera.pos.x = camera.pos.y = 0;
  cw_setCameraTarget(-1);

  generationState = manageRound.nextGeneration(
    generationState,
    results,
    generationConfig()
  );
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    world_def.floorseed = btoa(Math.seedrandom());
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  resetCarUI();
}

function cw_startSimulation() {
  cw_paused = false;
  window.requestAnimationFrame(gameLoop);
}

function cw_stopSimulation() {
  cw_paused = true;
}

function cw_clearPopulationWorld() {
  carMap.forEach(function (car) {
    car.kill(currentRunner, world_def);
  });
}

function cw_resetPopulationUI() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics(document.getElementById("graphcanvas"));
  resetGraphState();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  world_def.floorseed = document.getElementById("newseed").value;
  cw_clearPopulationWorld();
  cw_resetPopulationUI();

  Math.seedrandom();
  cw_generationZero();
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);

  ghost = ghost_create_ghost();
  resetCarUI();
  setupCarUI();
  cw_drawMiniMap();

  cw_startSimulation();
}

function setupCarUI() {
  currentRunner.cars.map(function (carInfo) {
    var car = new cw_Car(carInfo, carMap);
    carMap.set(carInfo, car);
    car.replay = ghost_create_replay();
    ghost_add_replay_frame(car.replay, car.car.car);
  });
}

document.querySelector("#fast-forward").addEventListener("click", function () {
  fastForward();
});

document.querySelector("#save-progress").addEventListener("click", function () {
  saveProgress();
});

document
  .querySelector("#restore-progress")
  .addEventListener("click", function () {
    restoreProgress();
  });

document
  .querySelector("#toggle-display")
  .addEventListener("click", function () {
    toggleDisplay();
  });

document
  .querySelector("#new-population")
  .addEventListener("click", function () {
    cw_resetPopulationUI();
    cw_generationZero();
    ghost = ghost_create_ghost();
    resetCarUI();
  });

function saveProgress() {
  localStorage.cw_savedGeneration = JSON.stringify(generationState.generation);
  localStorage.cw_genCounter = generationState.counter;
  localStorage.cw_ghost = JSON.stringify(ghost);
  localStorage.cw_topScores = JSON.stringify(graphState.cw_topScores);
  localStorage.cw_floorSeed = world_def.floorseed;
}

function restoreProgress() {
  if (
    typeof localStorage.cw_savedGeneration == "undefined" ||
    localStorage.cw_savedGeneration == null
  ) {
    alert("No saved progress found");
    return;
  }
  cw_stopSimulation();
  generationState.generation = JSON.parse(localStorage.cw_savedGeneration);
  generationState.counter = localStorage.cw_genCounter;
  ghost = JSON.parse(localStorage.cw_ghost);
  graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
  world_def.floorseed = localStorage.cw_floorSeed;
  document.getElementById("newseed").value = world_def.floorseed;

  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  cw_drawMiniMap();
  Math.seedrandom();

  resetCarUI();
  cw_startSimulation();
}

document.querySelector("#confirm-reset").addEventListener("click", function () {
  cw_confirmResetWorld();
});

function cw_confirmResetWorld() {
  if (confirm("Really reset world?")) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff

function cw_pauseSimulation() {
  cw_paused = true;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  window.requestAnimationFrame(gameLoop);
}

function cw_startGhostReplay() {
  if (!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(
    cw_drawGhostReplay,
    Math.round(1000 / screenfps)
  );
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera.pos.x = leaderPosition.x;
  camera.pos.y = leaderPosition.y;
  cw_resumeSimulation();
}

document.querySelector("#toggle-ghost").addEventListener("click", function (e) {
  cw_toggleGhostReplay(e.target);
});

function cw_toggleGhostReplay(button) {
  if (cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  // clone silver dot and health bar
  var mmm = document.getElementsByName("minimapmarker")[0];
  var hbar = document.getElementsByName("healthbar")[0];
  var generationSize = generationConfig.constants.generationSize;

  for (var k = 0; k < generationSize; k++) {
    // minimap markers
    var newbar = mmm.cloneNode(true);
    newbar.id = "bar" + k;
    newbar.style.paddingTop = k * 9 + "px";
    minimapholder.appendChild(newbar);

    // health bars
    var newhealth = hbar.cloneNode(true);
    newhealth.getElementsByTagName("DIV")[0].id = "health" + k;
    newhealth.car_index = k;
    document.getElementById("health").appendChild(newhealth);
  }
  mmm.parentNode.removeChild(mmm);
  hbar.parentNode.removeChild(hbar);
  world_def.floorseed = btoa(Math.seedrandom());
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  window.requestAnimationFrame(gameLoop);
}

function relMouseCoords(event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do {
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent;
  } while (currentElement);

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return { x: canvasX, y: canvasY };
}
HTMLDivElement.prototype.relMouseCoords = relMouseCoords;
minimapholder.onclick = function (event) {
  var coords = minimapholder.relMouseCoords(event);
  var cw_carArray = Array.from(carMap.values());
  var closest = {
    value: cw_carArray[0].car,
    dist: Math.abs(
      (cw_carArray[0].getPosition().x + 6) * minimapscale - coords.x
    ),
    x: cw_carArray[0].getPosition().x,
  };

  var maxX = 0;
  for (var i = 0; i < cw_carArray.length; i++) {
    var pos = cw_carArray[i].getPosition();
    var dist = Math.abs((pos.x + 6) * minimapscale - coords.x);
    if (dist < closest.dist) {
      closest.value = cw_carArray.car;
      closest.dist = dist;
      closest.x = pos.x;
    }
    maxX = Math.max(pos.x, maxX);
  }

  if (closest.x == maxX) {
    // focus on leader again
    cw_setCameraTarget(-1);
  } else {
    cw_setCameraTarget(closest.value);
  }
};

document
  .querySelector("#mutationrate")
  .addEventListener("change", function (e) {
    var elem = e.target;
    cw_setMutation(elem.options[elem.selectedIndex].value);
  });

document
  .querySelector("#mutationsize")
  .addEventListener("change", function (e) {
    var elem = e.target;
    cw_setMutationRange(elem.options[elem.selectedIndex].value);
  });

document.querySelector("#floor").addEventListener("change", function (e) {
  var elem = e.target;
  cw_setMutableFloor(elem.options[elem.selectedIndex].value);
});

document.querySelector("#gravity").addEventListener("change", function (e) {
  var elem = e.target;
  cw_setGravity(elem.options[elem.selectedIndex].value);
});

document.querySelector("#elitesize").addEventListener("change", function (e) {
  var elem = e.target;
  cw_setEliteSize(elem.options[elem.selectedIndex].value);
});

function cw_setMutation(mutation) {
  generationConfig.constants.gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  generationConfig.constants.mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  world_def.mutable_floor = choice == 1;
}

function cw_setGravity(choice) {
  world_def.gravity = new b2Vec2(0.0, -parseFloat(choice));
  var world = currentRunner.scene.world;
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != world_def.gravity.y) {
    world.SetGravity(world_def.gravity);
  }
}

function cw_setEliteSize(clones) {
  generationConfig.constants.championLength = parseInt(clones, 10);
}

cw_init();

},{"./car-schema/construct.js":2,"./draw/draw-car-stats.js":5,"./draw/draw-car.js":6,"./draw/draw-floor.js":8,"./draw/plot-graphs.js":10,"./generation-config":14,"./ghost/index.js":18,"./machine-learning/genetic-algorithm/manage-round.js":21,"./world/run.js":23}],20:[function(require,module,exports){
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

},{"./random.js":22}],21:[function(require,module,exports){
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

},{"../create-instance":20}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{"../car-schema/def-to-car":3,"../car-schema/run":4,"./setup-scene":24}],24:[function(require,module,exports){
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

},{}]},{},[19])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvZHJhdy1jYXItc3RhdHMuanMiLCJzcmMvZHJhdy9kcmF3LWNhci5qcyIsInNyYy9kcmF3L2RyYXctY2lyY2xlLmpzIiwic3JjL2RyYXcvZHJhdy1mbG9vci5qcyIsInNyYy9kcmF3L2RyYXctdmlydHVhbC1wb2x5LmpzIiwic3JjL2RyYXcvcGxvdC1ncmFwaHMuanMiLCJzcmMvZHJhdy9zY2F0dGVyLXBsb3QuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvZ2VuZXJhdGVSYW5kb20uanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5icmVlZGluZy1jb2VmZmljaWVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmRleC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9waWNrUGFyZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3NlbGVjdEZyb21BbGxQYXJlbnRzLmpzIiwic3JjL2dob3N0L2Nhci10by1naG9zdC5qcyIsInNyYy9naG9zdC9pbmRleC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZS5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3p0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzPXtcclxuICBcIndoZWVsQ291bnRcIjogMixcclxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcclxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxyXG4gIFwid2hlZWxNaW5EZW5zaXR5XCI6IDQwLFxyXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxyXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXHJcbiAgXCJjaGFzc2lzTWluRGVuc2l0eVwiOiAzMCxcclxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcclxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXHJcbn1cclxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHdvcmxkRGVmOiB3b3JsZERlZixcclxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcclxuICBnZW5lcmF0ZVNjaGVtYTogZ2VuZXJhdGVTY2hlbWEsXHJcbn07XHJcblxyXG5mdW5jdGlvbiB3b3JsZERlZigpIHtcclxuICB2YXIgYm94MmRmcHMgPSA2MDtcclxuICByZXR1cm4ge1xyXG4gICAgZ3Jhdml0eTogeyB5OiAwIH0sXHJcbiAgICBkb1NsZWVwOiB0cnVlLFxyXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxyXG4gICAgbWF4Rmxvb3JUaWxlczogMjAwLFxyXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXHJcbiAgICBtb3RvclNwZWVkOiAyMCxcclxuICAgIGJveDJkZnBzOiBib3gyZGZwcyxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxyXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcclxuICAgICAgd2lkdGg6IDEuNSxcclxuICAgICAgaGVpZ2h0OiAwLjE1LFxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKSB7XHJcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHdoZWVsX3JhZGl1czoge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsUmFkaXVzUmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB3aGVlbF9kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5EZW5zaXR5LFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiAxLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxyXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgdmVydGV4X2xpc3Q6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IDEyLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzQXhpc1JhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgd2hlZWxfdmVydGV4OiB7XHJcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxyXG4gICAgICBsZW5ndGg6IDgsXHJcbiAgICAgIGxpbWl0OiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiIsIi8qXHJcbiAgZ2xvYmFscyBiMlJldm9sdXRlSm9pbnREZWYgYjJWZWMyIGIyQm9keURlZiBiMkJvZHkgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlIGIyQ2lyY2xlU2hhcGVcclxuKi9cclxuXHJcbnZhciBjcmVhdGVJbnN0YW5jZSA9IHJlcXVpcmUoXCIuLi9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XHJcblxyXG5mdW5jdGlvbiBkZWZUb0Nhcihub3JtYWxfZGVmLCB3b3JsZCwgY29uc3RhbnRzKSB7XHJcbiAgdmFyIGNhcl9kZWYgPSBjcmVhdGVJbnN0YW5jZS5hcHBseVR5cGVzKGNvbnN0YW50cy5zY2hlbWEsIG5vcm1hbF9kZWYpO1xyXG4gIHZhciBpbnN0YW5jZSA9IHt9O1xyXG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxyXG4gICAgd29ybGQsXHJcbiAgICBjYXJfZGVmLnZlcnRleF9saXN0LFxyXG4gICAgY2FyX2RlZi5jaGFzc2lzX2RlbnNpdHlcclxuICApO1xyXG4gIHZhciBpO1xyXG5cclxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcclxuXHJcbiAgaW5zdGFuY2Uud2hlZWxzID0gW107XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXHJcbiAgICAgIHdvcmxkLFxyXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcclxuICAgICAgY2FyX2RlZi53aGVlbF9kZW5zaXR5W2ldXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgdmFyIGNhcm1hc3MgPSBpbnN0YW5jZS5jaGFzc2lzLkdldE1hc3MoKTtcclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICBjYXJtYXNzICs9IGluc3RhbmNlLndoZWVsc1tpXS5HZXRNYXNzKCk7XHJcbiAgfVxyXG5cclxuICB2YXIgam9pbnRfZGVmID0gbmV3IGIyUmV2b2x1dGVKb2ludERlZigpO1xyXG5cclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICB2YXIgdG9ycXVlID0gKGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSkgLyBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXTtcclxuXHJcbiAgICB2YXIgcmFuZHZlcnRleCA9IGluc3RhbmNlLmNoYXNzaXMudmVydGV4X2xpc3RbY2FyX2RlZi53aGVlbF92ZXJ0ZXhbaV1dO1xyXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQS5TZXQocmFuZHZlcnRleC54LCByYW5kdmVydGV4LnkpO1xyXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XHJcbiAgICBqb2ludF9kZWYubWF4TW90b3JUb3JxdWUgPSB0b3JxdWU7XHJcbiAgICBqb2ludF9kZWYubW90b3JTcGVlZCA9IC1jb25zdGFudHMubW90b3JTcGVlZDtcclxuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XHJcbiAgICBqb2ludF9kZWYuYm9keUEgPSBpbnN0YW5jZS5jaGFzc2lzO1xyXG4gICAgam9pbnRfZGVmLmJvZHlCID0gaW5zdGFuY2Uud2hlZWxzW2ldO1xyXG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBpbnN0YW5jZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xyXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzBdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s0XSwgdmVydGV4c1s1XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgLXZlcnRleHNbOV0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xyXG5cclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xyXG5cclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG5cclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFswXSwgdmVydGV4X2xpc3RbMV0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFszXSwgdmVydGV4X2xpc3RbNF0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs2XSwgdmVydGV4X2xpc3RbN10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XHJcblxyXG4gIGJvZHkudmVydGV4X2xpc3QgPSB2ZXJ0ZXhfbGlzdDtcclxuXHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleDEsIHZlcnRleDIsIGRlbnNpdHkpIHtcclxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDEpO1xyXG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4Mik7XHJcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDEwO1xyXG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XHJcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xyXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheSh2ZXJ0ZXhfbGlzdCwgMyk7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcclxuXHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuXHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKHJhZGl1cyk7XHJcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMTtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdldEluaXRpYWxTdGF0ZTogZ2V0SW5pdGlhbFN0YXRlLFxyXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcclxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcclxuICBjYWxjdWxhdGVTY29yZTogY2FsY3VsYXRlU2NvcmUsXHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGZyYW1lczogMCxcclxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxyXG4gICAgbWF4UG9zaXRpb255OiAwLFxyXG4gICAgbWluUG9zaXRpb255OiAwLFxyXG4gICAgbWF4UG9zaXRpb254OiAwLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKGNvbnN0YW50cywgd29ybGRDb25zdHJ1Y3QsIHN0YXRlKSB7XHJcbiAgaWYgKHN0YXRlLmhlYWx0aCA8PSAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XHJcbiAgfVxyXG4gIGlmIChzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcclxuICAvLyBjaGVjayBoZWFsdGhcclxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXHJcbiAgdmFyIG5leHRTdGF0ZSA9IHtcclxuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcclxuICAgIG1heFBvc2l0aW9ueDpcclxuICAgICAgcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXHJcbiAgICBtYXhQb3NpdGlvbnk6XHJcbiAgICAgIHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgbWluUG9zaXRpb255OlxyXG4gICAgICBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueSxcclxuICB9O1xyXG5cclxuICBpZiAocG9zaXRpb24ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKSB7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XHJcbiAgICBuZXh0U3RhdGUuaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9XHJcbiAgbmV4dFN0YXRlLmhlYWx0aCA9IHN0YXRlLmhlYWx0aCAtIDE7XHJcbiAgaWYgKE1hdGguYWJzKHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKS54KSA8IDAuMDAxKSB7XHJcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XHJcbiAgfVxyXG4gIHJldHVybiBuZXh0U3RhdGU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YXR1cyhzdGF0ZSwgY29uc3RhbnRzKSB7XHJcbiAgaWYgKGhhc0ZhaWxlZChzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIC0xO1xyXG4gIGlmIChoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gMTtcclxuICByZXR1cm4gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFzRmFpbGVkKHN0YXRlIC8qLCBjb25zdGFudHMgKi8pIHtcclxuICByZXR1cm4gc3RhdGUuaGVhbHRoIDw9IDA7XHJcbn1cclxuZnVuY3Rpb24gaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSB7XHJcbiAgcmV0dXJuIHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVTY29yZShzdGF0ZSwgY29uc3RhbnRzKSB7XHJcbiAgdmFyIGF2Z3NwZWVkID0gKHN0YXRlLm1heFBvc2l0aW9ueCAvIHN0YXRlLmZyYW1lcykgKiBjb25zdGFudHMuYm94MmRmcHM7XHJcbiAgdmFyIHBvc2l0aW9uID0gc3RhdGUubWF4UG9zaXRpb254O1xyXG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XHJcbiAgcmV0dXJuIHtcclxuICAgIHY6IHNjb3JlLFxyXG4gICAgczogYXZnc3BlZWQsXHJcbiAgICB4OiBwb3NpdGlvbixcclxuICAgIHk6IHN0YXRlLm1heFBvc2l0aW9ueSxcclxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnksXHJcbiAgfTtcclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50ICovXHJcblxyXG52YXIgcnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT0gQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciBjd19DYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblxyXG5jd19DYXIucHJvdG90eXBlLl9fY29uc3RydWN0b3IgPSBmdW5jdGlvbiAoY2FyKSB7XHJcbiAgdGhpcy5jYXIgPSBjYXI7XHJcbiAgdGhpcy5jYXJfZGVmID0gY2FyLmRlZjtcclxuICB2YXIgY2FyX2RlZiA9IHRoaXMuY2FyX2RlZjtcclxuXHJcbiAgdGhpcy5mcmFtZXMgPSAwO1xyXG4gIHRoaXMuYWxpdmUgPSB0cnVlO1xyXG4gIHRoaXMuaXNfZWxpdGUgPSBjYXIuZGVmLmlzX2VsaXRlO1xyXG4gIHRoaXMuaGVhbHRoQmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLnN0eWxlO1xyXG4gIHRoaXMuaGVhbHRoQmFyVGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxyXG4gICAgXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXhcclxuICApLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xyXG4gIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIHRoaXMubWluaW1hcG1hcmtlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFyXCIgKyBjYXJfZGVmLmluZGV4KTtcclxuXHJcbiAgaWYgKHRoaXMuaXNfZWxpdGUpIHtcclxuICAgIHRoaXMuaGVhbHRoQmFyLmJhY2tncm91bmRDb2xvciA9IFwiIzNGNzJBRlwiO1xyXG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICNGN0M4NzNcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIH1cclxufTtcclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuY2FyLmNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbn07XHJcblxyXG5jd19DYXIucHJvdG90eXBlLmtpbGwgPSBmdW5jdGlvbiAoY3VycmVudFJ1bm5lciwgY29uc3RhbnRzKSB7XHJcbiAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XHJcbiAgdmFyIGZpbmlzaExpbmUgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZpbmlzaExpbmU7XHJcbiAgdmFyIG1heF9jYXJfaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xyXG4gIHZhciBzdGF0dXMgPSBydW4uZ2V0U3RhdHVzKHRoaXMuY2FyLnN0YXRlLCB7XHJcbiAgICBmaW5pc2hMaW5lOiBmaW5pc2hMaW5lLFxyXG4gICAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIH0pO1xyXG4gIHN3aXRjaCAoc3RhdHVzKSB7XHJcbiAgICBjYXNlIDE6IHtcclxuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBjYXNlIC0xOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBcIiZkYWdnZXI7XCI7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICB0aGlzLmFsaXZlID0gZmFsc2U7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGN3X0NhcjtcclxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG52YXIgY3dfZHJhd0NpcmNsZSA9IHJlcXVpcmUoXCIuL2RyYXctY2lyY2xlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY2FyX2NvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KSB7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcblxyXG4gIHZhciB3aGVlbE1pbkRlbnNpdHkgPSBjYXJfY29uc3RhbnRzLndoZWVsTWluRGVuc2l0eTtcclxuICB2YXIgd2hlZWxEZW5zaXR5UmFuZ2UgPSBjYXJfY29uc3RhbnRzLndoZWVsRGVuc2l0eVJhbmdlO1xyXG5cclxuICBpZiAoIW15Q2FyLmFsaXZlKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciBteUNhclBvcyA9IG15Q2FyLmdldFBvc2l0aW9uKCk7XHJcblxyXG4gIGlmIChteUNhclBvcy54IDwgY2FtZXJhX3ggLSA1KSB7XHJcbiAgICAvLyB0b28gZmFyIGJlaGluZCwgZG9uJ3QgZHJhd1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNDQ0XCI7XHJcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xyXG5cclxuICB2YXIgd2hlZWxzID0gbXlDYXIuY2FyLmNhci53aGVlbHM7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgd2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgYiA9IHdoZWVsc1tpXTtcclxuICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgICAgdmFyIGNvbG9yID0gTWF0aC5yb3VuZChcclxuICAgICAgICAyNTUgLSAoMjU1ICogKGYubV9kZW5zaXR5IC0gd2hlZWxNaW5EZW5zaXR5KSkgLyB3aGVlbERlbnNpdHlSYW5nZVxyXG4gICAgICApLnRvU3RyaW5nKCk7XHJcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xyXG4gICAgICBjd19kcmF3Q2lyY2xlKGN0eCwgYiwgcy5tX3AsIHMubV9yYWRpdXMsIGIubV9zd2VlcC5hLCByZ2Jjb2xvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAobXlDYXIuaXNfZWxpdGUpIHtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0RCRTJFRlwiO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGQUVCQ0RcIjtcclxuICB9XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICB2YXIgY2hhc3NpcyA9IG15Q2FyLmNhci5jYXIuY2hhc3NpcztcclxuXHJcbiAgZm9yIChmID0gY2hhc3Npcy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBjcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xyXG4gIH1cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xyXG5cclxuZnVuY3Rpb24gY3dfZHJhd0NpcmNsZShjdHgsIGJvZHksIGNlbnRlciwgcmFkaXVzLCBhbmdsZSwgY29sb3IpIHtcclxuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuXHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGN0eC5hcmMocC54LCBwLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcclxuICBjdHgubGluZVRvKHAueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgcC55ICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpKTtcclxuXHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjdHgsIGNhbWVyYSwgY3dfZmxvb3JUaWxlcykge1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAwMFwiO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiM3NzdcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICB2YXIgaztcclxuICBpZiAoY2FtZXJhLnBvcy54IC0gMTAgPiAwKSB7XHJcbiAgICBrID0gTWF0aC5mbG9vcigoY2FtZXJhLnBvcy54IC0gMTApIC8gMS41KTtcclxuICB9IGVsc2Uge1xyXG4gICAgayA9IDA7XHJcbiAgfVxyXG5cclxuICAvLyBjb25zb2xlLmxvZyhrKTtcclxuXHJcbiAgb3V0ZXJfbG9vcDogZm9yIChrOyBrIDwgY3dfZmxvb3JUaWxlcy5sZW5ndGg7IGsrKykge1xyXG4gICAgdmFyIGIgPSBjd19mbG9vclRpbGVzW2tdO1xyXG4gICAgZm9yICh2YXIgZiA9IGIuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XHJcbiAgICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG4gICAgICB2YXIgc2hhcGVQb3NpdGlvbiA9IGIuR2V0V29ybGRQb2ludChzLm1fdmVydGljZXNbMF0pLng7XHJcbiAgICAgIGlmIChzaGFwZVBvc2l0aW9uID4gY2FtZXJhX3ggLSA1ICYmIHNoYXBlUG9zaXRpb24gPCBjYW1lcmFfeCArIDEwKSB7XHJcbiAgICAgICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgYiwgcy5tX3ZlcnRpY2VzLCBzLm1fdmVydGV4Q291bnQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChzaGFwZVBvc2l0aW9uID4gY2FtZXJhX3ggKyAxMCkge1xyXG4gICAgICAgIGJyZWFrIG91dGVyX2xvb3A7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn07XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN0eCwgYm9keSwgdnR4LCBuX3Z0eCkge1xyXG4gIC8vIHNldCBzdHJva2VzdHlsZSBhbmQgZmlsbHN0eWxlIGJlZm9yZSBjYWxsXHJcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcclxuXHJcbiAgdmFyIHAwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFswXSk7XHJcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFtpXSk7XHJcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyhwMC54LCBwMC55KTtcclxufTtcclxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24gKFxyXG4gICAgZ3JhcGhFbGVtLFxyXG4gICAgdG9wU2NvcmVzRWxlbSxcclxuICAgIHNjYXR0ZXJQbG90RWxlbSxcclxuICAgIGxhc3RTdGF0ZSxcclxuICAgIHNjb3JlcyxcclxuICAgIGNvbmZpZ1xyXG4gICkge1xyXG4gICAgbGFzdFN0YXRlID0gbGFzdFN0YXRlIHx8IHt9O1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aDtcclxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcclxuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHZhciBncmFwaHdpZHRoID0gNDAwO1xyXG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xyXG4gICAgdmFyIG5leHRTdGF0ZSA9IGN3X3N0b3JlR3JhcGhTY29yZXMobGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplKTtcclxuICAgIGNvbnNvbGUubG9nKHNjb3JlcywgbmV4dFN0YXRlKTtcclxuICAgIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCk7XHJcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X3Bsb3RFbGl0ZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X3Bsb3RUb3AobmV4dFN0YXRlLCBncmFwaGN0eCk7XHJcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XHJcbiAgICBuZXh0U3RhdGUuc2NhdHRlckdyYXBoID0gZHJhd0FsbFJlc3VsdHMoXHJcbiAgICAgIHNjYXR0ZXJQbG90RWxlbSxcclxuICAgICAgY29uZmlnLFxyXG4gICAgICBuZXh0U3RhdGUsXHJcbiAgICAgIGxhc3RTdGF0ZS5zY2F0dGVyR3JhcGhcclxuICAgICk7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH0sXHJcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24gKGdyYXBoRWxlbSkge1xyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xyXG4gIH0sXHJcbn07XHJcblxyXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIGNvbnNvbGUubG9nKGN3X2NhclNjb3Jlcyk7XHJcbiAgcmV0dXJuIHtcclxuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZSxcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfYXZlcmFnZShjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKSxcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhFbGl0ZTogKGxhc3RTdGF0ZS5jd19ncmFwaEVsaXRlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSksXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoVG9wOiAobGFzdFN0YXRlLmN3X2dyYXBoVG9wIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19jYXJTY29yZXNbMF0uc2NvcmUudixcclxuICAgIF0pLFxyXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaFRvcCA9IHN0YXRlLmN3X2dyYXBoVG9wO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaFRvcC5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKCg0MDAgKiAoayArIDEpKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhUb3Bba10pO1xyXG4gIH1cclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcGxvdEVsaXRlKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaEVsaXRlID0gc3RhdGUuY3dfZ3JhcGhFbGl0ZTtcclxuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiM3QkM3NERcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKCg0MDAgKiAoayArIDEpKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90QXZlcmFnZShzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEF2ZXJhZ2UubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbygoNDAwICogKGsgKyAxKSkgLyBncmFwaHNpemUsIGN3X2dyYXBoQXZlcmFnZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19lbGl0ZWF2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIHZhciBzdW0gPSAwO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpOyBrKyspIHtcclxuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcclxuICB9XHJcbiAgcmV0dXJuIHN1bSAvIE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnNjb3JlLnY7XHJcbiAgfVxyXG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XHJcbiAgZ3JhcGhjYW52YXMud2lkdGggPSBncmFwaGNhbnZhcy53aWR0aDtcclxuICBncmFwaGN0eC50cmFuc2xhdGUoMCwgZ3JhcGhoZWlnaHQpO1xyXG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcclxuICBncmFwaGN0eC5saW5lV2lkdGggPSAxO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gMik7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gMik7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gNCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIChncmFwaGhlaWdodCAqIDMpIC8gNCk7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIChncmFwaGhlaWdodCAqIDMpIC8gNCk7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcclxuICB2YXIgY3dfdG9wU2NvcmVzID0gc3RhdGUuY3dfdG9wU2NvcmVzO1xyXG4gIHZhciB0cyA9IGVsZW07XHJcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcclxuICBjd190b3BTY29yZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgaWYgKGEudiA+IGIudikge1xyXG4gICAgICByZXR1cm4gLTE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLm1pbigxMCwgY3dfdG9wU2NvcmVzLmxlbmd0aCk7IGsrKykge1xyXG4gICAgdmFyIHRvcFNjb3JlID0gY3dfdG9wU2NvcmVzW2tdO1xyXG4gICAgLy8gY29uc29sZS5sb2codG9wU2NvcmUpO1xyXG4gICAgdmFyIG4gPSBcIiNcIiArIChrICsgMSkgKyBcIjpcIjtcclxuICAgIHZhciBzY29yZSA9IE1hdGgucm91bmQodG9wU2NvcmUudiAqIDEwMCkgLyAxMDA7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xyXG4gICAgdmFyIHlyYW5nZSA9XHJcbiAgICAgIFwiaDpcIiArXHJcbiAgICAgIE1hdGgucm91bmQodG9wU2NvcmUueTIgKiAxMDApIC8gMTAwICtcclxuICAgICAgXCIvXCIgK1xyXG4gICAgICBNYXRoLnJvdW5kKHRvcFNjb3JlLnkgKiAxMDApIC8gMTAwICtcclxuICAgICAgXCJtXCI7XHJcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIjtcclxuXHJcbiAgICB0cy5pbm5lckhUTUwgKz0gW24sIHNjb3JlLCBkaXN0YW5jZSwgeXJhbmdlLCBnZW5dLmpvaW4oXCIgXCIpICsgXCI8YnIgLz5cIjtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKSB7XHJcbiAgaWYgKCFzY2F0dGVyUGxvdEVsZW0pIHJldHVybjtcclxuICByZXR1cm4gc2NhdHRlclBsb3QoXHJcbiAgICBzY2F0dGVyUGxvdEVsZW0sXHJcbiAgICBhbGxSZXN1bHRzLFxyXG4gICAgY29uZmlnLnByb3BlcnR5TWFwLFxyXG4gICAgcHJldmlvdXNHcmFwaFxyXG4gICk7XHJcbn1cclxuIiwiLyogZ2xvYmFscyB2aXMgSGlnaGNoYXJ0cyAqL1xyXG5cclxuLy8gQ2FsbGVkIHdoZW4gdGhlIFZpc3VhbGl6YXRpb24gQVBJIGlzIGxvYWRlZC5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcclxuZnVuY3Rpb24gaGlnaENoYXJ0cyhlbGVtLCBzY29yZXMpIHtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3Jlc1swXS5kZWYpO1xyXG4gIGtleXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAoY3VyQXJyYXksIGtleSkge1xyXG4gICAgdmFyIGwgPSBzY29yZXNbMF0uZGVmW2tleV0ubGVuZ3RoO1xyXG4gICAgdmFyIHN1YkFycmF5ID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xyXG4gICAgICBzdWJBcnJheS5wdXNoKGtleSArIFwiLlwiICsgaSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3VyQXJyYXkuY29uY2F0KHN1YkFycmF5KTtcclxuICB9LCBbXSk7XHJcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpIHtcclxuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24gKGN1clZhbHVlLCBrZXkpIHtcclxuICAgICAgcmV0dXJuIGN1clZhbHVlW2tleV07XHJcbiAgICB9LCBvYmopO1xyXG4gIH1cclxuXHJcbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShcclxuICAgIGZ1bmN0aW9uIChrdiwgc2NvcmUpIHtcclxuICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICBrdltrZXldLmRhdGEucHVzaChbcmV0cmlldmVWYWx1ZShzY29yZS5kZWYsIGtleSksIHNjb3JlLnNjb3JlLnZdKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBrdjtcclxuICAgIH0sXHJcbiAgICBrZXlzLnJlZHVjZShmdW5jdGlvbiAoa3YsIGtleSkge1xyXG4gICAgICBrdltrZXldID0ge1xyXG4gICAgICAgIG5hbWU6IGtleSxcclxuICAgICAgICBkYXRhOiBbXSxcclxuICAgICAgfTtcclxuICAgICAgcmV0dXJuIGt2O1xyXG4gICAgfSwge30pXHJcbiAgKTtcclxuICBIaWdoY2hhcnRzLmNoYXJ0KGVsZW0uaWQsIHtcclxuICAgIGNoYXJ0OiB7XHJcbiAgICAgIHR5cGU6IFwic2NhdHRlclwiLFxyXG4gICAgICB6b29tVHlwZTogXCJ4eVwiLFxyXG4gICAgfSxcclxuICAgIHRpdGxlOiB7XHJcbiAgICAgIHRleHQ6IFwiUHJvcGVydHkgVmFsdWUgdG8gU2NvcmVcIixcclxuICAgIH0sXHJcbiAgICB4QXhpczoge1xyXG4gICAgICB0aXRsZToge1xyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgdGV4dDogXCJOb3JtYWxpemVkXCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YXJ0T25UaWNrOiB0cnVlLFxyXG4gICAgICBlbmRPblRpY2s6IHRydWUsXHJcbiAgICAgIHNob3dMYXN0TGFiZWw6IHRydWUsXHJcbiAgICB9LFxyXG4gICAgeUF4aXM6IHtcclxuICAgICAgdGl0bGU6IHtcclxuICAgICAgICB0ZXh0OiBcIlNjb3JlXCIsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgbGVnZW5kOiB7XHJcbiAgICAgIGxheW91dDogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICBhbGlnbjogXCJsZWZ0XCIsXHJcbiAgICAgIHZlcnRpY2FsQWxpZ246IFwidG9wXCIsXHJcbiAgICAgIHg6IDEwMCxcclxuICAgICAgeTogNzAsXHJcbiAgICAgIGZsb2F0aW5nOiB0cnVlLFxyXG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6XHJcbiAgICAgICAgKEhpZ2hjaGFydHMudGhlbWUgJiYgSGlnaGNoYXJ0cy50aGVtZS5sZWdlbmRCYWNrZ3JvdW5kQ29sb3IpIHx8XHJcbiAgICAgICAgXCIjRkZGRkZGXCIsXHJcbiAgICAgIGJvcmRlcldpZHRoOiAxLFxyXG4gICAgfSxcclxuICAgIHBsb3RPcHRpb25zOiB7XHJcbiAgICAgIHNjYXR0ZXI6IHtcclxuICAgICAgICBtYXJrZXI6IHtcclxuICAgICAgICAgIHJhZGl1czogNSxcclxuICAgICAgICAgIHN0YXRlczoge1xyXG4gICAgICAgICAgICBob3Zlcjoge1xyXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgbGluZUNvbG9yOiBcInJnYigxMDAsMTAwLDEwMClcIixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0ZXM6IHtcclxuICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgIG1hcmtlcjoge1xyXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRvb2x0aXA6IHtcclxuICAgICAgICAgIGhlYWRlckZvcm1hdDogXCI8Yj57c2VyaWVzLm5hbWV9PC9iPjxicj5cIixcclxuICAgICAgICAgIHBvaW50Rm9ybWF0OiBcIntwb2ludC54fSwge3BvaW50Lnl9XCIsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBzZXJpZXM6IGtleXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcclxuICAgIH0pLFxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xyXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxyXG4gIHZhciBkYXRhID0gbmV3IHZpcy5EYXRhU2V0KCk7XHJcbiAgc2NvcmVzLmZvckVhY2goZnVuY3Rpb24gKHNjb3JlSW5mbykge1xyXG4gICAgZGF0YS5hZGQoe1xyXG4gICAgICB4OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB6OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICBzdHlsZTogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcclxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5KGluZm8sIGtleSkge1xyXG4gICAgaWYgKGtleSA9PT0gXCJzY29yZVwiKSB7XHJcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnY7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gaW5mby5kZWZba2V5XTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIHNwZWNpZnkgb3B0aW9uc1xyXG4gIHZhciBvcHRpb25zID0ge1xyXG4gICAgd2lkdGg6IFwiNjAwcHhcIixcclxuICAgIGhlaWdodDogXCI2MDBweFwiLFxyXG4gICAgc3R5bGU6IFwiZG90LXNpemVcIixcclxuICAgIHNob3dQZXJzcGVjdGl2ZTogdHJ1ZSxcclxuICAgIHNob3dMZWdlbmQ6IHRydWUsXHJcbiAgICBzaG93R3JpZDogdHJ1ZSxcclxuICAgIHNob3dTaGFkb3c6IGZhbHNlLFxyXG5cclxuICAgIC8vIE9wdGlvbiB0b29sdGlwIGNhbiBiZSB0cnVlLCBmYWxzZSwgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcgd2l0aCBIVE1MIGNvbnRlbnRzXHJcbiAgICB0b29sdGlwOiBmdW5jdGlvbiAocG9pbnQpIHtcclxuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcclxuICAgICAgLy8gZGF0YSBpcyB0aGUgb3JpZ2luYWwgb2JqZWN0IHBhc3NlZCB0byB0aGUgcG9pbnQgY29uc3RydWN0b3JcclxuICAgICAgcmV0dXJuIFwic2NvcmU6IDxiPlwiICsgcG9pbnQueiArIFwiPC9iPjxicj5cIjsgLy8gKyBwb2ludC5kYXRhLmV4dHJhO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBUb29sdGlwIGRlZmF1bHQgc3R5bGluZyBjYW4gYmUgb3ZlcnJpZGRlblxyXG4gICAgdG9vbHRpcFN0eWxlOiB7XHJcbiAgICAgIGNvbnRlbnQ6IHtcclxuICAgICAgICBiYWNrZ3JvdW5kOiBcInJnYmEoMjU1LCAyNTUsIDI1NSwgMC43KVwiLFxyXG4gICAgICAgIHBhZGRpbmc6IFwiMTBweFwiLFxyXG4gICAgICAgIGJvcmRlclJhZGl1czogXCIxMHB4XCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIGxpbmU6IHtcclxuICAgICAgICBib3JkZXJMZWZ0OiBcIjFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpXCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIGRvdDoge1xyXG4gICAgICAgIGJvcmRlcjogXCI1cHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjUpXCIsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG5cclxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcclxuICAgIHZlcnRpY2FsUmF0aW86IDAuNSxcclxuICB9O1xyXG5cclxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcclxuXHJcbiAgLy8gY3JlYXRlIG91ciBncmFwaFxyXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xyXG4gIGdyYXBoID0gbmV3IHZpcy5HcmFwaDNkKGNvbnRhaW5lciwgZGF0YSwgb3B0aW9ucyk7XHJcblxyXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXHJcbiAgcmV0dXJuIGdyYXBoO1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZ2VuZXJhdGVSYW5kb207XHJcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCkge1xyXG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xyXG59XHJcbiIsIi8vIGh0dHA6Ly9zdW5taW5ndGFvLmJsb2dzcG90LmNvbS8yMDE2LzExL2luYnJlZWRpbmctY29lZmZpY2llbnQuaHRtbFxyXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcclxuXHJcbmZ1bmN0aW9uIGdldEluYnJlZWRpbmdDb2VmZmljaWVudChjaGlsZCkge1xyXG4gIHZhciBuYW1lSW5kZXggPSBuZXcgTWFwKCk7XHJcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XHJcbiAgdmFyIGNvbnZlcmdlbmNlUG9pbnRzID0gbmV3IFNldCgpO1xyXG4gIGNyZWF0ZUFuY2VzdHJ5TWFwKGNoaWxkLCBbXSk7XHJcblxyXG4gIHZhciBzdG9yZWRDb2VmZmljaWVudHMgPSBuZXcgTWFwKCk7XHJcblxyXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24gKHN1bSwgcG9pbnQpIHtcclxuICAgIHZhciBpQ28gPSBnZXRDb2VmZmljaWVudChwb2ludCk7XHJcbiAgICByZXR1cm4gc3VtICsgaUNvO1xyXG4gIH0sIDApO1xyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSkge1xyXG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcclxuICAgIGRvIHtcclxuICAgICAgdmFyIGl0ZW0gPSBpdGVtc0luUXVldWUuc2hpZnQoKTtcclxuICAgICAgdmFyIG5vZGUgPSBpdGVtLm5vZGU7XHJcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xyXG4gICAgICBpZiAocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpIHtcclxuICAgICAgICB2YXIgbmV4dFBhdGggPSBbbm9kZS5pZF0uY29uY2F0KHBhdGgpO1xyXG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQoXHJcbiAgICAgICAgICBub2RlLmFuY2VzdHJ5Lm1hcChmdW5jdGlvbiAocGFyZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgbm9kZTogcGFyZW50LFxyXG4gICAgICAgICAgICAgIHBhdGg6IG5leHRQYXRoLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9IHdoaWxlIChpdGVtc0luUXVldWUubGVuZ3RoKTtcclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKSB7XHJcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xyXG4gICAgICBpZiAobmV3QW5jZXN0b3IpIHtcclxuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcclxuICAgICAgICAgIHBhcmVudHM6IChub2RlLmFuY2VzdHJ5IHx8IFtdKS5tYXAoZnVuY3Rpb24gKHBhcmVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBpZDogbm9kZS5pZCxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgIGNvbnZlcmdlbmNlczogW10sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZCk7XHJcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZElkZW50aWZpZXIpIHtcclxuICAgICAgICAgIHZhciBvZmZzZXRzID0gZmluZENvbnZlcmdlbmNlKGNoaWxkSWRlbnRpZmllci5wYXRoLCBwYXRoKTtcclxuICAgICAgICAgIGlmICghb2Zmc2V0cykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgY2hpbGRJRCA9IHBhdGhbb2Zmc2V0c1sxXV07XHJcbiAgICAgICAgICBjb252ZXJnZW5jZVBvaW50cy5hZGQoY2hpbGRJRCk7XHJcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgcGFyZW50OiBub2RlLmlkLFxyXG4gICAgICAgICAgICBvZmZzZXRzOiBvZmZzZXRzLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwYXRoLmxlbmd0aCkge1xyXG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XHJcbiAgICAgICAgICBjaGlsZDogcGF0aFswXSxcclxuICAgICAgICAgIHBhdGg6IHBhdGgsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghbmV3QW5jZXN0b3IpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCFub2RlLmFuY2VzdHJ5KSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Q29lZmZpY2llbnQoaWQpIHtcclxuICAgIGlmIChzdG9yZWRDb2VmZmljaWVudHMuaGFzKGlkKSkge1xyXG4gICAgICByZXR1cm4gc3RvcmVkQ29lZmZpY2llbnRzLmdldChpZCk7XHJcbiAgICB9XHJcbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xyXG4gICAgdmFyIHZhbCA9IG5vZGUuY29udmVyZ2VuY2VzLnJlZHVjZShmdW5jdGlvbiAoc3VtLCBwb2ludCkge1xyXG4gICAgICByZXR1cm4gKFxyXG4gICAgICAgIHN1bSArXHJcbiAgICAgICAgTWF0aC5wb3coXHJcbiAgICAgICAgICAxIC8gMixcclxuICAgICAgICAgIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uIChzdW0sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdW0gKyB2YWx1ZTtcclxuICAgICAgICAgIH0sIDEpXHJcbiAgICAgICAgKSAqXHJcbiAgICAgICAgICAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpXHJcbiAgICAgICk7XHJcbiAgICB9LCAwKTtcclxuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XHJcblxyXG4gICAgcmV0dXJuIHZhbDtcclxuICB9XHJcbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qikge1xyXG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xyXG4gICAgb3V0ZXJsb29wOiBmb3IgKGNpID0gMCwgbGkgPSBsaXN0QS5sZW5ndGg7IGNpIDwgbGk7IGNpKyspIHtcclxuICAgICAgZm9yIChjaiA9IDAsIGxqID0gbGlzdEIubGVuZ3RoOyBjaiA8IGxqOyBjaisrKSB7XHJcbiAgICAgICAgaWYgKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKSB7XHJcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoY2kgPT09IGxpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiBbY2ksIGNqXTtcclxuICB9XHJcbn1cclxuIiwidmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2NvbnN0cnVjdC5qc1wiKTtcclxuXHJcbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XHJcblxyXG52YXIgc2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGNhckNvbnN0YW50cyk7XHJcbnZhciBwaWNrUGFyZW50ID0gcmVxdWlyZShcIi4vcGlja1BhcmVudFwiKTtcclxudmFyIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gcmVxdWlyZShcIi4vc2VsZWN0RnJvbUFsbFBhcmVudHNcIik7XHJcbmNvbnN0IGNvbnN0YW50cyA9IHtcclxuICBnZW5lcmF0aW9uU2l6ZTogMjAsXHJcbiAgc2NoZW1hOiBzY2hlbWEsXHJcbiAgY2hhbXBpb25MZW5ndGg6IDEsXHJcbiAgbXV0YXRpb25fcmFuZ2U6IDEsXHJcbiAgZ2VuX211dGF0aW9uOiAwLjA1LFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XHJcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGNvbnN0YW50cywge1xyXG4gICAgc2VsZWN0RnJvbUFsbFBhcmVudHM6IHNlbGVjdEZyb21BbGxQYXJlbnRzLFxyXG4gICAgZ2VuZXJhdGVSYW5kb206IHJlcXVpcmUoXCIuL2dlbmVyYXRlUmFuZG9tXCIpLFxyXG4gICAgcGlja1BhcmVudDogcGlja1BhcmVudC5iaW5kKHZvaWQgMCwgY3VycmVudENob2ljZXMpLFxyXG4gIH0pO1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cy5jb25zdGFudHMgPSBjb25zdGFudHM7XHJcbiIsInZhciBuQXR0cmlidXRlcyA9IDE1O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHBpY2tQYXJlbnQ7XHJcblxyXG5mdW5jdGlvbiBwaWNrUGFyZW50KGN1cnJlbnRDaG9pY2VzLCBjaG9vc2VJZCwga2V5IC8qICwgcGFyZW50cyAqLykge1xyXG4gIGlmICghY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSkge1xyXG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKTtcclxuICB9XHJcbiAgLy8gY29uc29sZS5sb2coY2hvb3NlSWQpO1xyXG4gIHZhciBzdGF0ZSA9IGN1cnJlbnRDaG9pY2VzLmdldChjaG9vc2VJZCk7XHJcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcclxuICBzdGF0ZS5pKys7XHJcbiAgaWYgKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpIHtcclxuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XHJcbiAgICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xyXG4gIH1cclxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xyXG4gIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XHJcblxyXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xyXG4gICAgdmFyIGN1cnBhcmVudCA9IHN0YXRlLmN1cnBhcmVudDtcclxuICAgIHZhciBhdHRyaWJ1dGVJbmRleCA9IHN0YXRlLmk7XHJcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDE7XHJcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDI7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcclxuICAgIGlmIChzd2FwUG9pbnQxID09IGF0dHJpYnV0ZUluZGV4IHx8IHN3YXBQb2ludDIgPT0gYXR0cmlidXRlSW5kZXgpIHtcclxuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3VycGFyZW50O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKSB7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcclxuXHJcbiAgICB2YXIgc3dhcFBvaW50MSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG5BdHRyaWJ1dGVzKTtcclxuICAgIHZhciBzd2FwUG9pbnQyID0gc3dhcFBvaW50MTtcclxuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcclxuICAgICAgc3dhcFBvaW50MiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG5BdHRyaWJ1dGVzKTtcclxuICAgIH1cclxuICAgIHZhciBpID0gMDtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGN1cnBhcmVudDogY3VycGFyZW50LFxyXG4gICAgICBpOiBpLFxyXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxyXG4gICAgICBzd2FwUG9pbnQyOiBzd2FwUG9pbnQyLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNpbXBsZVNlbGVjdDtcclxuXHJcbmZ1bmN0aW9uIHNpbXBsZVNlbGVjdChwYXJlbnRzKSB7XHJcbiAgdmFyIHRvdGFsUGFyZW50cyA9IHBhcmVudHMubGVuZ3RoO1xyXG4gIHZhciByID0gTWF0aC5yYW5kb20oKTtcclxuICBpZiAociA9PSAwKSByZXR1cm4gMDtcclxuICByZXR1cm4gTWF0aC5mbG9vcigtTWF0aC5sb2cocikgKiB0b3RhbFBhcmVudHMpICUgdG90YWxQYXJlbnRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWxlY3RGcm9tQWxsUGFyZW50cyhwYXJlbnRzLCBwYXJlbnRMaXN0LCBwcmV2aW91c1BhcmVudEluZGV4KSB7XHJcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcclxuICB2YXIgdmFsaWRQYXJlbnRzID0gcGFyZW50cy5maWx0ZXIoZnVuY3Rpb24gKHBhcmVudCwgaSkge1xyXG4gICAgaWYgKHByZXZpb3VzUGFyZW50SW5kZXggPT09IGkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaWYgKCFwcmV2aW91c1BhcmVudCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZCA9IHtcclxuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxyXG4gICAgICBhbmNlc3RyeTogW3ByZXZpb3VzUGFyZW50LCBwYXJlbnRdLm1hcChmdW5jdGlvbiAocCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpZDogcC5kZWYuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcC5kZWYuYW5jZXN0cnksXHJcbiAgICAgICAgfTtcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gICAgdmFyIGlDbyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudChjaGlsZCk7XHJcbiAgICBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKTtcclxuICAgIGlmIChpQ28gPiAwLjI1KSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmICh2YWxpZFBhcmVudHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGFyZW50cy5sZW5ndGgpO1xyXG4gIH1cclxuICB2YXIgdG90YWxTY29yZSA9IHZhbGlkUGFyZW50cy5yZWR1Y2UoZnVuY3Rpb24gKHN1bSwgcGFyZW50KSB7XHJcbiAgICByZXR1cm4gc3VtICsgcGFyZW50LnNjb3JlLnY7XHJcbiAgfSwgMCk7XHJcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XHJcbiAgICBpZiAociA+IHNjb3JlKSB7XHJcbiAgICAgIHIgPSByIC0gc2NvcmU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGk7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY2FyKSB7XHJcbiAgdmFyIG91dCA9IHtcclxuICAgIGNoYXNzaXM6IGdob3N0X2dldF9jaGFzc2lzKGNhci5jaGFzc2lzKSxcclxuICAgIHdoZWVsczogW10sXHJcbiAgICBwb3M6IHsgeDogY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKS54LCB5OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLnkgfSxcclxuICB9O1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcclxuICAgIG91dC53aGVlbHNbaV0gPSBnaG9zdF9nZXRfd2hlZWwoY2FyLndoZWVsc1tpXSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3V0O1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xyXG4gIHZhciBnYyA9IFtdO1xyXG5cclxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG5cclxuICAgIHZhciBwID0ge1xyXG4gICAgICB2dHg6IFtdLFxyXG4gICAgICBudW06IDAsXHJcbiAgICB9O1xyXG5cclxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcy5tX3ZlcnRleENvdW50OyBpKyspIHtcclxuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2MucHVzaChwKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBnYztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcclxuICB2YXIgZ3cgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XHJcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuXHJcbiAgICB2YXIgYyA9IHtcclxuICAgICAgcG9zOiB3LkdldFdvcmxkUG9pbnQocy5tX3ApLFxyXG4gICAgICByYWQ6IHMubV9yYWRpdXMsXHJcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmEsXHJcbiAgICB9O1xyXG5cclxuICAgIGd3LnB1c2goYyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZ3c7XHJcbn1cclxuIiwidmFyIGdob3N0X2dldF9mcmFtZSA9IHJlcXVpcmUoXCIuL2Nhci10by1naG9zdC5qc1wiKTtcclxuXHJcbnZhciBlbmFibGVfZ2hvc3QgPSB0cnVlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2hvc3RfY3JlYXRlX3JlcGxheTogZ2hvc3RfY3JlYXRlX3JlcGxheSxcclxuICBnaG9zdF9jcmVhdGVfZ2hvc3Q6IGdob3N0X2NyZWF0ZV9naG9zdCxcclxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXHJcbiAgZ2hvc3RfcmVzdW1lOiBnaG9zdF9yZXN1bWUsXHJcbiAgZ2hvc3RfZ2V0X3Bvc2l0aW9uOiBnaG9zdF9nZXRfcG9zaXRpb24sXHJcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxyXG4gIGdob3N0X21vdmVfZnJhbWU6IGdob3N0X21vdmVfZnJhbWUsXHJcbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZTogZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSxcclxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxyXG4gIGdob3N0X3Jlc2V0X2dob3N0OiBnaG9zdF9yZXNldF9naG9zdCxcclxufTtcclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NyZWF0ZV9yZXBsYXkoKSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpIHJldHVybiBudWxsO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbnVtX2ZyYW1lczogMCxcclxuICAgIGZyYW1lczogW10sXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KSByZXR1cm4gbnVsbDtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHJlcGxheTogbnVsbCxcclxuICAgIGZyYW1lOiAwLFxyXG4gICAgZGlzdDogLTEwMCxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9yZXNldF9naG9zdChnaG9zdCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KSByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpIHJldHVybjtcclxuICBnaG9zdC5mcmFtZSA9IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X3BhdXNlKGdob3N0KSB7XHJcbiAgaWYgKGdob3N0ICE9IG51bGwpIGdob3N0Lm9sZF9mcmFtZSA9IGdob3N0LmZyYW1lO1xyXG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XHJcbiAgaWYgKGdob3N0ICE9IG51bGwpIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdCkgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKSByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMCkgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbCkgcmV0dXJuO1xyXG4gIHZhciBmcmFtZSA9IGdob3N0LnJlcGxheS5mcmFtZXNbZ2hvc3QuZnJhbWVdO1xyXG4gIHJldHVybiBmcmFtZS5wb3M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5KHJlcGxheSwgZ2hvc3QsIG1heCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KSByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpIHJldHVybjtcclxuICBpZiAocmVwbGF5ID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgaWYgKGdob3N0LmRpc3QgPCBtYXgpIHtcclxuICAgIGdob3N0LnJlcGxheSA9IHJlcGxheTtcclxuICAgIGdob3N0LmRpc3QgPSBtYXg7XHJcbiAgICBnaG9zdC5mcmFtZSA9IDA7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9tb3ZlX2ZyYW1lKGdob3N0KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbCkgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbCkgcmV0dXJuO1xyXG4gIGdob3N0LmZyYW1lKys7XHJcbiAgaWYgKGdob3N0LmZyYW1lID49IGdob3N0LnJlcGxheS5udW1fZnJhbWVzKVxyXG4gICAgZ2hvc3QuZnJhbWUgPSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcyAtIDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUocmVwbGF5LCBjYXIpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdCkgcmV0dXJuO1xyXG4gIGlmIChyZXBsYXkgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICB2YXIgZnJhbWUgPSBnaG9zdF9nZXRfZnJhbWUoY2FyKTtcclxuICByZXBsYXkuZnJhbWVzLnB1c2goZnJhbWUpO1xyXG4gIHJlcGxheS5udW1fZnJhbWVzKys7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XHJcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcclxuICBpZiAoIWVuYWJsZV9naG9zdCkgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKSByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMCkgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcclxuXHJcbiAgLy8gd2hlZWwgc3R5bGVcclxuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjYWFhXCI7XHJcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGZyYW1lLndoZWVscy5sZW5ndGg7IGkrKykge1xyXG4gICAgZm9yICh2YXIgdyBpbiBmcmFtZS53aGVlbHNbaV0pIHtcclxuICAgICAgZ2hvc3RfZHJhd19jaXJjbGUoXHJcbiAgICAgICAgY3R4LFxyXG4gICAgICAgIGZyYW1lLndoZWVsc1tpXVt3XS5wb3MsXHJcbiAgICAgICAgZnJhbWUud2hlZWxzW2ldW3ddLnJhZCxcclxuICAgICAgICBmcmFtZS53aGVlbHNbaV1bd10uYW5nXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjaGFzc2lzIHN0eWxlXHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjYWFhXCI7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2VlZVwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgZm9yICh2YXIgYyBpbiBmcmFtZS5jaGFzc2lzKVxyXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZHJhd19wb2x5KGN0eCwgdnR4LCBuX3Z0eCkge1xyXG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIGN0eC5saW5lVG8odnR4W2ldLngsIHZ0eFtpXS55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyh2dHhbMF0ueCwgdnR4WzBdLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGNlbnRlciwgcmFkaXVzLCBhbmdsZSkge1xyXG4gIGN0eC5iZWdpblBhdGgoKTtcclxuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcblxyXG4gIGN0eC5tb3ZlVG8oY2VudGVyLngsIGNlbnRlci55KTtcclxuICBjdHgubGluZVRvKFxyXG4gICAgY2VudGVyLnggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksXHJcbiAgICBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKVxyXG4gICk7XHJcblxyXG4gIGN0eC5maWxsKCk7XHJcbiAgY3R4LnN0cm9rZSgpO1xyXG59XHJcbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgcGVyZm9ybWFuY2UgbG9jYWxTdG9yYWdlIGFsZXJ0IGNvbmZpcm0gYnRvYSBIVE1MRGl2RWxlbWVudCAqL1xyXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xyXG4vLyBHbG9iYWwgVmFyc1xyXG5cclxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xyXG52YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XHJcblxyXG52YXIgbWFuYWdlUm91bmQgPSByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKTtcclxuXHJcbnZhciBnaG9zdF9mbnMgPSByZXF1aXJlKFwiLi9naG9zdC9pbmRleC5qc1wiKTtcclxuXHJcbnZhciBkcmF3Q2FyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWNhci5qc1wiKTtcclxudmFyIGdyYXBoX2ZucyA9IHJlcXVpcmUoXCIuL2RyYXcvcGxvdC1ncmFwaHMuanNcIik7XHJcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xyXG52YXIgY3dfY2xlYXJHcmFwaGljcyA9IGdyYXBoX2Zucy5jbGVhckdyYXBoaWNzO1xyXG52YXIgY3dfZHJhd0Zsb29yID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWZsb29yLmpzXCIpO1xyXG5cclxudmFyIGdob3N0X2RyYXdfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfZHJhd19mcmFtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfZ2hvc3Q7XHJcbnZhciBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2FkZF9yZXBsYXlfZnJhbWU7XHJcbnZhciBnaG9zdF9jb21wYXJlX3RvX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jb21wYXJlX3RvX3JlcGxheTtcclxudmFyIGdob3N0X2dldF9wb3NpdGlvbiA9IGdob3N0X2Zucy5naG9zdF9nZXRfcG9zaXRpb247XHJcbnZhciBnaG9zdF9tb3ZlX2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X21vdmVfZnJhbWU7XHJcbnZhciBnaG9zdF9yZXNldF9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9yZXNldF9naG9zdDtcclxudmFyIGdob3N0X3BhdXNlID0gZ2hvc3RfZm5zLmdob3N0X3BhdXNlO1xyXG52YXIgZ2hvc3RfcmVzdW1lID0gZ2hvc3RfZm5zLmdob3N0X3Jlc3VtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX3JlcGxheTtcclxuXHJcbnZhciBjd19DYXIgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctY2FyLXN0YXRzLmpzXCIpO1xyXG52YXIgZ2hvc3Q7XHJcbnZhciBjYXJNYXAgPSBuZXcgTWFwKCk7XHJcblxyXG52YXIgZG9EcmF3ID0gdHJ1ZTtcclxudmFyIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG5cclxudmFyIGJveDJkZnBzID0gNjA7XHJcbnZhciBzY3JlZW5mcHMgPSA2MDtcclxudmFyIHNraXBUaWNrcyA9IE1hdGgucm91bmQoMTAwMCAvIGJveDJkZnBzKTtcclxudmFyIG1heEZyYW1lU2tpcCA9IHNraXBUaWNrcyAqIDI7XHJcblxyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluYm94XCIpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbnZhciBjYW1lcmEgPSB7XHJcbiAgc3BlZWQ6IDAuMDUsXHJcbiAgcG9zOiB7XHJcbiAgICB4OiAwLFxyXG4gICAgeTogMCxcclxuICB9LFxyXG4gIHRhcmdldDogLTEsXHJcbiAgem9vbTogNzAsXHJcbn07XHJcblxyXG52YXIgbWluaW1hcGNhbWVyYSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGNhbWVyYVwiKS5zdHlsZTtcclxudmFyIG1pbmltYXBob2xkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI21pbmltYXBob2xkZXJcIik7XHJcblxyXG52YXIgbWluaW1hcGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcFwiKTtcclxudmFyIG1pbmltYXBjdHggPSBtaW5pbWFwY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxudmFyIG1pbmltYXBzY2FsZSA9IDM7XHJcbnZhciBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xyXG52YXIgZm9nZGlzdGFuY2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBmb2dcIikuc3R5bGU7XHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxudmFyIG1heF9jYXJfaGVhbHRoID0gYm94MmRmcHMgKiAxMDtcclxuXHJcbnZhciBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcclxuXHJcbnZhciBkaXN0YW5jZU1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkaXN0YW5jZW1ldGVyXCIpO1xyXG52YXIgaGVpZ2h0TWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlaWdodG1ldGVyXCIpO1xyXG5cclxudmFyIGxlYWRlclBvc2l0aW9uID0ge1xyXG4gIHg6IDAsXHJcbiAgeTogMCxcclxufTtcclxuXHJcbm1pbmltYXBjYW1lcmEud2lkdGggPSAxMiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxubWluaW1hcGNhbWVyYS5oZWlnaHQgPSA2ICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG5cclxuLy8gPT09PT09PSBXT1JMRCBTVEFURSA9PT09PT1cclxudmFyIGdlbmVyYXRpb25Db25maWcgPSByZXF1aXJlKFwiLi9nZW5lcmF0aW9uLWNvbmZpZ1wiKTtcclxuXHJcbnZhciB3b3JsZF9kZWYgPSB7XHJcbiAgZ3Jhdml0eTogbmV3IGIyVmVjMigwLjAsIC05LjgxKSxcclxuICBkb1NsZWVwOiB0cnVlLFxyXG4gIGZsb29yc2VlZDogYnRvYShNYXRoLnNlZWRyYW5kb20oKSksXHJcbiAgdGlsZURpbWVuc2lvbnM6IG5ldyBiMlZlYzIoMS41LCAwLjE1KSxcclxuICBtYXhGbG9vclRpbGVzOiAyMDAsXHJcbiAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXHJcbiAgYm94MmRmcHM6IGJveDJkZnBzLFxyXG4gIG1vdG9yU3BlZWQ6IDIwLFxyXG4gIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcclxuICBzY2hlbWE6IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLnNjaGVtYSxcclxufTtcclxuXHJcbnZhciBjd19kZWFkQ2FycztcclxudmFyIGdyYXBoU3RhdGUgPSB7XHJcbiAgY3dfdG9wU2NvcmVzOiBbXSxcclxuICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxyXG4gIGN3X2dyYXBoRWxpdGU6IFtdLFxyXG4gIGN3X2dyYXBoVG9wOiBbXSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIHJlc2V0R3JhcGhTdGF0ZSgpIHtcclxuICBncmFwaFN0YXRlID0ge1xyXG4gICAgY3dfdG9wU2NvcmVzOiBbXSxcclxuICAgIGN3X2dyYXBoQXZlcmFnZTogW10sXHJcbiAgICBjd19ncmFwaEVsaXRlOiBbXSxcclxuICAgIGN3X2dyYXBoVG9wOiBbXSxcclxuICB9O1xyXG59XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxudmFyIGdlbmVyYXRpb25TdGF0ZTtcclxuXHJcbi8vID09PT09PT09IEFjdGl2aXR5IFN0YXRlID09PT1cclxudmFyIGN1cnJlbnRSdW5uZXI7XHJcbnZhciBsb29wcyA9IDA7XHJcbnZhciBuZXh0R2FtZVRpY2sgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHJcbmZ1bmN0aW9uIHNob3dEaXN0YW5jZShkaXN0YW5jZSwgaGVpZ2h0KSB7XHJcbiAgZGlzdGFuY2VNZXRlci5pbm5lckhUTUwgPSBkaXN0YW5jZSArIFwiIG1ldGVyczxiciAvPlwiO1xyXG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xyXG4gIGlmIChkaXN0YW5jZSA+IG1pbmltYXBmb2dkaXN0YW5jZSkge1xyXG4gICAgZm9nZGlzdGFuY2Uud2lkdGggPSA4MDAgLSBNYXRoLnJvdW5kKGRpc3RhbmNlICsgMTUpICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XHJcbiAgfVxyXG59XHJcblxyXG4vKiA9PT0gRU5EIENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PSBHZW5lcmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuZnVuY3Rpb24gY3dfZ2VuZXJhdGlvblplcm8oKSB7XHJcbiAgZ2VuZXJhdGlvblN0YXRlID0gbWFuYWdlUm91bmQuZ2VuZXJhdGlvblplcm8oZ2VuZXJhdGlvbkNvbmZpZygpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzZXRDYXJVSSgpIHtcclxuICBjd19kZWFkQ2FycyA9IDA7XHJcbiAgbGVhZGVyUG9zaXRpb24gPSB7XHJcbiAgICB4OiAwLFxyXG4gICAgeTogMCxcclxuICB9O1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPVxyXG4gICAgZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIudG9TdHJpbmcoKTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID1cclxuICAgIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplLnRvU3RyaW5nKCk7XHJcbn1cclxuXHJcbi8qID09PT0gRU5EIEdlbnJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09IERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG5mdW5jdGlvbiBjd19kcmF3U2NyZWVuKCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICBjdHguc2F2ZSgpO1xyXG4gIGN3X3NldENhbWVyYVBvc2l0aW9uKCk7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueTtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG4gIGN0eC50cmFuc2xhdGUoMjAwIC0gY2FtZXJhX3ggKiB6b29tLCAyMDAgKyBjYW1lcmFfeSAqIHpvb20pO1xyXG4gIGN0eC5zY2FsZSh6b29tLCAtem9vbSk7XHJcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSk7XHJcbiAgY3dfZHJhd0NhcnMoKTtcclxuICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19taW5pbWFwQ2FtZXJhKC8qIHgsIHkqLykge1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcclxuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnk7XHJcbiAgbWluaW1hcGNhbWVyYS5sZWZ0ID0gTWF0aC5yb3VuZCgoMiArIGNhbWVyYV94KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XHJcbiAgbWluaW1hcGNhbWVyYS50b3AgPSBNYXRoLnJvdW5kKCgzMSAtIGNhbWVyYV95KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldENhbWVyYVRhcmdldChrKSB7XHJcbiAgY2FtZXJhLnRhcmdldCA9IGs7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldENhbWVyYVBvc2l0aW9uKCkge1xyXG4gIHZhciBjYW1lcmFUYXJnZXRQb3NpdGlvbjtcclxuICBpZiAoY2FtZXJhLnRhcmdldCAhPT0gLTEpIHtcclxuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gY2FyTWFwLmdldChjYW1lcmEudGFyZ2V0KS5nZXRQb3NpdGlvbigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGxlYWRlclBvc2l0aW9uO1xyXG4gIH1cclxuICB2YXIgZGlmZl95ID0gY2FtZXJhLnBvcy55IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueTtcclxuICB2YXIgZGlmZl94ID0gY2FtZXJhLnBvcy54IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgLT0gY2FtZXJhLnNwZWVkICogZGlmZl95O1xyXG4gIGNhbWVyYS5wb3MueCAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3g7XHJcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdHaG9zdFJlcGxheSgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgY2FyUG9zaXRpb24gPSBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcclxuICBjd19taW5pbWFwQ2FtZXJhKGNhbWVyYS5wb3MueCwgY2FtZXJhLnBvcy55KTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3R4LnRyYW5zbGF0ZShcclxuICAgIDIwMCAtIGNhclBvc2l0aW9uLnggKiBjYW1lcmEuem9vbSxcclxuICAgIDIwMCArIGNhclBvc2l0aW9uLnkgKiBjYW1lcmEuem9vbVxyXG4gICk7XHJcbiAgY3R4LnNjYWxlKGNhbWVyYS56b29tLCAtY2FtZXJhLnpvb20pO1xyXG4gIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCk7XHJcbiAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XHJcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcclxuICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3Q2FycygpIHtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgZm9yICh2YXIgayA9IGN3X2NhckFycmF5Lmxlbmd0aCAtIDE7IGsgPj0gMDsgay0tKSB7XHJcbiAgICB2YXIgbXlDYXIgPSBjd19jYXJBcnJheVtrXTtcclxuICAgIGRyYXdDYXIoY2FyQ29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlRGlzcGxheSgpIHtcclxuICBjYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XHJcbiAgaWYgKGRvRHJhdykge1xyXG4gICAgZG9EcmF3ID0gZmFsc2U7XHJcbiAgICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gICAgY3dfcnVubmluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpICsgMTAwMCAvIHNjcmVlbmZwcztcclxuICAgICAgd2hpbGUgKHRpbWUgPiBwZXJmb3JtYW5jZS5ub3coKSkge1xyXG4gICAgICAgIHNpbXVsYXRpb25TdGVwKCk7XHJcbiAgICAgIH1cclxuICAgIH0sIDEpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkb0RyYXcgPSB0cnVlO1xyXG4gICAgY2xlYXJJbnRlcnZhbChjd19ydW5uaW5nSW50ZXJ2YWwpO1xyXG4gICAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3TWluaU1hcCgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XHJcbiAgZm9nZGlzdGFuY2Uud2lkdGggPSBcIjgwMHB4XCI7XHJcbiAgbWluaW1hcGNhbnZhcy53aWR0aCA9IG1pbmltYXBjYW52YXMud2lkdGg7XHJcbiAgbWluaW1hcGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gIG1pbmltYXBjdHguYmVnaW5QYXRoKCk7XHJcbiAgbWluaW1hcGN0eC5tb3ZlVG8oMCwgMzUgKiBtaW5pbWFwc2NhbGUpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZmxvb3JUaWxlcy5sZW5ndGg7IGsrKykge1xyXG4gICAgbGFzdF90aWxlID0gZmxvb3JUaWxlc1trXTtcclxuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICAgIHZhciBsYXN0X3dvcmxkX2Nvb3JkcyA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxyXG4gICAgICBsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdXHJcbiAgICApO1xyXG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3Rfd29ybGRfY29vcmRzO1xyXG4gICAgbWluaW1hcGN0eC5saW5lVG8oXHJcbiAgICAgICh0aWxlX3Bvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSxcclxuICAgICAgKC10aWxlX3Bvc2l0aW9uLnkgKyAzNSkgKiBtaW5pbWFwc2NhbGVcclxuICAgICk7XHJcbiAgfVxyXG4gIG1pbmltYXBjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbi8qID09PT0gRU5EIERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG52YXIgdWlMaXN0ZW5lcnMgPSB7XHJcbiAgcHJlQ2FyU3RlcDogZnVuY3Rpb24gKCkge1xyXG4gICAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XHJcbiAgfSxcclxuICBjYXJTdGVwKGNhcikge1xyXG4gICAgdXBkYXRlQ2FyVUkoY2FyKTtcclxuICB9LFxyXG4gIGNhckRlYXRoKGNhckluZm8pIHtcclxuICAgIHZhciBrID0gY2FySW5mby5pbmRleDtcclxuXHJcbiAgICB2YXIgY2FyID0gY2FySW5mby5jYXIsXHJcbiAgICAgIHNjb3JlID0gY2FySW5mby5zY29yZTtcclxuICAgIGNhck1hcC5nZXQoY2FySW5mbykua2lsbChjdXJyZW50UnVubmVyLCB3b3JsZF9kZWYpO1xyXG5cclxuICAgIC8vIHJlZm9jdXMgY2FtZXJhIHRvIGxlYWRlciBvbiBkZWF0aFxyXG4gICAgaWYgKGNhbWVyYS50YXJnZXQgPT0gY2FySW5mbykge1xyXG4gICAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xyXG4gICAgfVxyXG4gICAgLy8gY29uc29sZS5sb2coc2NvcmUpO1xyXG4gICAgY2FyTWFwLmRlbGV0ZShjYXJJbmZvKTtcclxuICAgIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5KGNhci5yZXBsYXksIGdob3N0LCBzY29yZS52KTtcclxuICAgIHNjb3JlLmkgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuXHJcbiAgICBjd19kZWFkQ2FycysrO1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gKFxyXG4gICAgICBnZW5lcmF0aW9uU2l6ZSAtIGN3X2RlYWRDYXJzXHJcbiAgICApLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gY29uc29sZS5sb2cobGVhZGVyUG9zaXRpb24ubGVhZGVyLCBrKVxyXG4gICAgaWYgKGxlYWRlclBvc2l0aW9uLmxlYWRlciA9PSBrKSB7XHJcbiAgICAgIC8vIGxlYWRlciBpcyBkZWFkLCBmaW5kIG5ldyBsZWFkZXJcclxuICAgICAgY3dfZmluZExlYWRlcigpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2VuZXJhdGlvbkVuZChyZXN1bHRzKSB7XHJcbiAgICBjbGVhbnVwUm91bmQocmVzdWx0cyk7XHJcbiAgICByZXR1cm4gY3dfbmV3Um91bmQocmVzdWx0cyk7XHJcbiAgfSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIHNpbXVsYXRpb25TdGVwKCkge1xyXG4gIGN1cnJlbnRSdW5uZXIuc3RlcCgpO1xyXG4gIHNob3dEaXN0YW5jZShcclxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueCAqIDEwMCkgLyAxMDAsXHJcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnkgKiAxMDApIC8gMTAwXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2FtZUxvb3AoKSB7XHJcbiAgbG9vcHMgPSAwO1xyXG4gIHdoaWxlIChcclxuICAgICFjd19wYXVzZWQgJiZcclxuICAgIG5ldyBEYXRlKCkuZ2V0VGltZSgpID4gbmV4dEdhbWVUaWNrICYmXHJcbiAgICBsb29wcyA8IG1heEZyYW1lU2tpcFxyXG4gICkge1xyXG4gICAgbmV4dEdhbWVUaWNrICs9IHNraXBUaWNrcztcclxuICAgIGxvb3BzKys7XHJcbiAgfVxyXG4gIHNpbXVsYXRpb25TdGVwKCk7XHJcbiAgY3dfZHJhd1NjcmVlbigpO1xyXG5cclxuICBpZiAoIWN3X3BhdXNlZCkgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNhclVJKGNhckluZm8pIHtcclxuICB2YXIgayA9IGNhckluZm8uaW5kZXg7XHJcbiAgdmFyIGNhciA9IGNhck1hcC5nZXQoY2FySW5mbyk7XHJcbiAgdmFyIHBvc2l0aW9uID0gY2FyLmdldFBvc2l0aW9uKCk7XHJcblxyXG4gIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUoY2FyLnJlcGxheSwgY2FyLmNhci5jYXIpO1xyXG4gIGNhci5taW5pbWFwbWFya2VyLnN0eWxlLmxlZnQgPVxyXG4gICAgTWF0aC5yb3VuZCgocG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxuICBjYXIuaGVhbHRoQmFyLndpZHRoID1cclxuICAgIE1hdGgucm91bmQoKGNhci5jYXIuc3RhdGUuaGVhbHRoIC8gbWF4X2Nhcl9oZWFsdGgpICogMTAwKSArIFwiJVwiO1xyXG4gIGlmIChwb3NpdGlvbi54ID4gbGVhZGVyUG9zaXRpb24ueCkge1xyXG4gICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcIm5ldyBsZWFkZXI6IFwiLCBrKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2ZpbmRMZWFkZXIoKSB7XHJcbiAgdmFyIGxlYWQgPSAwO1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaysrKSB7XHJcbiAgICBpZiAoIWN3X2NhckFycmF5W2tdLmFsaXZlKSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHBvc2l0aW9uID0gY3dfY2FyQXJyYXlba10uZ2V0UG9zaXRpb24oKTtcclxuICAgIGlmIChwb3NpdGlvbi54ID4gbGVhZCkge1xyXG4gICAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgICBsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPSBrO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmFzdEZvcndhcmQoKSB7XHJcbiAgdmFyIGdlbiA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG4gIHdoaWxlIChnZW4gPT09IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyKSB7XHJcbiAgICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBSb3VuZChyZXN1bHRzKSB7XHJcbiAgcmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICBpZiAoYS5zY29yZS52ID4gYi5zY29yZS52KSB7XHJcbiAgICAgIHJldHVybiAtMTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIGdyYXBoU3RhdGUgPSBwbG90X2dyYXBocyhcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIiksXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKSxcclxuICAgIG51bGwsXHJcbiAgICBncmFwaFN0YXRlLFxyXG4gICAgcmVzdWx0c1xyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X25ld1JvdW5kKHJlc3VsdHMpIHtcclxuICBjYW1lcmEucG9zLnggPSBjYW1lcmEucG9zLnkgPSAwO1xyXG4gIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcblxyXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLm5leHRHZW5lcmF0aW9uKFxyXG4gICAgZ2VuZXJhdGlvblN0YXRlLFxyXG4gICAgcmVzdWx0cyxcclxuICAgIGdlbmVyYXRpb25Db25maWcoKVxyXG4gICk7XHJcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxyXG4gICAgZ2hvc3QgPSBudWxsO1xyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBSRS1FTkFCTEUgR0hPU1RcclxuICAgIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxuICB9XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBzZXR1cENhclVJKCk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICByZXNldENhclVJKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0YXJ0U2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSBmYWxzZTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcFNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY2xlYXJQb3B1bGF0aW9uV29ybGQoKSB7XHJcbiAgY2FyTWFwLmZvckVhY2goZnVuY3Rpb24gKGNhcikge1xyXG4gICAgY2FyLmtpbGwoY3VycmVudFJ1bm5lciwgd29ybGRfZGVmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXJzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBjd19jbGVhckdyYXBoaWNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIikpO1xyXG4gIHJlc2V0R3JhcGhTdGF0ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXNldFdvcmxkKCkge1xyXG4gIGRvRHJhdyA9IHRydWU7XHJcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlO1xyXG4gIGN3X2NsZWFyUG9wdWxhdGlvbldvcmxkKCk7XHJcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKTtcclxuXHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG5cclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBzZXR1cENhclVJKCk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuXHJcbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldHVwQ2FyVUkoKSB7XHJcbiAgY3VycmVudFJ1bm5lci5jYXJzLm1hcChmdW5jdGlvbiAoY2FySW5mbykge1xyXG4gICAgdmFyIGNhciA9IG5ldyBjd19DYXIoY2FySW5mbywgY2FyTWFwKTtcclxuICAgIGNhck1hcC5zZXQoY2FySW5mbywgY2FyKTtcclxuICAgIGNhci5yZXBsYXkgPSBnaG9zdF9jcmVhdGVfcmVwbGF5KCk7XHJcbiAgICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcclxuICB9KTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmYXN0LWZvcndhcmRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICBmYXN0Rm9yd2FyZCgpO1xyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2F2ZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gIHNhdmVQcm9ncmVzcygpO1xyXG59KTtcclxuXHJcbmRvY3VtZW50XHJcbiAgLnF1ZXJ5U2VsZWN0b3IoXCIjcmVzdG9yZS1wcm9ncmVzc1wiKVxyXG4gIC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgcmVzdG9yZVByb2dyZXNzKCk7XHJcbiAgfSk7XHJcblxyXG5kb2N1bWVudFxyXG4gIC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1kaXNwbGF5XCIpXHJcbiAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICB0b2dnbGVEaXNwbGF5KCk7XHJcbiAgfSk7XHJcblxyXG5kb2N1bWVudFxyXG4gIC5xdWVyeVNlbGVjdG9yKFwiI25ldy1wb3B1bGF0aW9uXCIpXHJcbiAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBjd19yZXNldFBvcHVsYXRpb25VSSgpO1xyXG4gICAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICAgIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgICByZXNldENhclVJKCk7XHJcbiAgfSk7XHJcblxyXG5mdW5jdGlvbiBzYXZlUHJvZ3Jlc3MoKSB7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9IEpTT04uc3RyaW5naWZ5KGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uKTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZ2VuQ291bnRlciA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19naG9zdCA9IEpTT04uc3RyaW5naWZ5KGdob3N0KTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfdG9wU2NvcmVzID0gSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd190b3BTY29yZXMpO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXN0b3JlUHJvZ3Jlc3MoKSB7XHJcbiAgaWYgKFxyXG4gICAgdHlwZW9mIGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPT0gXCJ1bmRlZmluZWRcIiB8fFxyXG4gICAgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSBudWxsXHJcbiAgKSB7XHJcbiAgICBhbGVydChcIk5vIHNhdmVkIHByb2dyZXNzIGZvdW5kXCIpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uKTtcclxuICBnZW5lcmF0aW9uU3RhdGUuY291bnRlciA9IGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyO1xyXG4gIGdob3N0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QpO1xyXG4gIGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfdG9wU2NvcmVzKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZDtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWUgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xyXG5cclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcblxyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjb25maXJtLXJlc2V0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgY3dfY29uZmlybVJlc2V0V29ybGQoKTtcclxufSk7XHJcblxyXG5mdW5jdGlvbiBjd19jb25maXJtUmVzZXRXb3JsZCgpIHtcclxuICBpZiAoY29uZmlybShcIlJlYWxseSByZXNldCB3b3JsZD9cIikpIHtcclxuICAgIGN3X3Jlc2V0V29ybGQoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmXHJcblxyXG5mdW5jdGlvbiBjd19wYXVzZVNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcclxuICBnaG9zdF9wYXVzZShnaG9zdCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc3VtZVNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gZmFsc2U7XHJcbiAgZ2hvc3RfcmVzdW1lKGdob3N0KTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RhcnRHaG9zdFJlcGxheSgpIHtcclxuICBpZiAoIWRvRHJhdykge1xyXG4gICAgdG9nZ2xlRGlzcGxheSgpO1xyXG4gIH1cclxuICBjd19wYXVzZVNpbXVsYXRpb24oKTtcclxuICBjd19naG9zdFJlcGxheUludGVydmFsID0gc2V0SW50ZXJ2YWwoXHJcbiAgICBjd19kcmF3R2hvc3RSZXBsYXksXHJcbiAgICBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcEdob3N0UmVwbGF5KCkge1xyXG4gIGNsZWFySW50ZXJ2YWwoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCk7XHJcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XHJcbiAgY3dfZmluZExlYWRlcigpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGxlYWRlclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gbGVhZGVyUG9zaXRpb24ueTtcclxuICBjd19yZXN1bWVTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWdob3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoZSkge1xyXG4gIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGUudGFyZ2V0KTtcclxufSk7XHJcblxyXG5mdW5jdGlvbiBjd190b2dnbGVHaG9zdFJlcGxheShidXR0b24pIHtcclxuICBpZiAoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9PSBudWxsKSB7XHJcbiAgICBjd19zdGFydEdob3N0UmVwbGF5KCk7XHJcbiAgICBidXR0b24udmFsdWUgPSBcIlJlc3VtZSBzaW11bGF0aW9uXCI7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN3X3N0b3BHaG9zdFJlcGxheSgpO1xyXG4gICAgYnV0dG9uLnZhbHVlID0gXCJWaWV3IHRvcCByZXBsYXlcIjtcclxuICB9XHJcbn1cclxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmIEVORFxyXG5cclxuLy8gaW5pdGlhbCBzdHVmZiwgb25seSBjYWxsZWQgb25jZSAoaG9wZWZ1bGx5KVxyXG5mdW5jdGlvbiBjd19pbml0KCkge1xyXG4gIC8vIGNsb25lIHNpbHZlciBkb3QgYW5kIGhlYWx0aCBiYXJcclxuICB2YXIgbW1tID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoXCJtaW5pbWFwbWFya2VyXCIpWzBdO1xyXG4gIHZhciBoYmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoXCJoZWFsdGhiYXJcIilbMF07XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG4gICAgLy8gbWluaW1hcCBtYXJrZXJzXHJcbiAgICB2YXIgbmV3YmFyID0gbW1tLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIG5ld2Jhci5pZCA9IFwiYmFyXCIgKyBrO1xyXG4gICAgbmV3YmFyLnN0eWxlLnBhZGRpbmdUb3AgPSBrICogOSArIFwicHhcIjtcclxuICAgIG1pbmltYXBob2xkZXIuYXBwZW5kQ2hpbGQobmV3YmFyKTtcclxuXHJcbiAgICAvLyBoZWFsdGggYmFyc1xyXG4gICAgdmFyIG5ld2hlYWx0aCA9IGhiYXIuY2xvbmVOb2RlKHRydWUpO1xyXG4gICAgbmV3aGVhbHRoLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiRElWXCIpWzBdLmlkID0gXCJoZWFsdGhcIiArIGs7XHJcbiAgICBuZXdoZWFsdGguY2FyX2luZGV4ID0gaztcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIpLmFwcGVuZENoaWxkKG5ld2hlYWx0aCk7XHJcbiAgfVxyXG4gIG1tbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG1tbSk7XHJcbiAgaGJhci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGhiYXIpO1xyXG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgc2V0dXBDYXJVSSgpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbE1vdXNlQ29vcmRzKGV2ZW50KSB7XHJcbiAgdmFyIHRvdGFsT2Zmc2V0WCA9IDA7XHJcbiAgdmFyIHRvdGFsT2Zmc2V0WSA9IDA7XHJcbiAgdmFyIGNhbnZhc1ggPSAwO1xyXG4gIHZhciBjYW52YXNZID0gMDtcclxuICB2YXIgY3VycmVudEVsZW1lbnQgPSB0aGlzO1xyXG5cclxuICBkbyB7XHJcbiAgICB0b3RhbE9mZnNldFggKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0TGVmdCAtIGN1cnJlbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICB0b3RhbE9mZnNldFkgKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0VG9wIC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5vZmZzZXRQYXJlbnQ7XHJcbiAgfSB3aGlsZSAoY3VycmVudEVsZW1lbnQpO1xyXG5cclxuICBjYW52YXNYID0gZXZlbnQucGFnZVggLSB0b3RhbE9mZnNldFg7XHJcbiAgY2FudmFzWSA9IGV2ZW50LnBhZ2VZIC0gdG90YWxPZmZzZXRZO1xyXG5cclxuICByZXR1cm4geyB4OiBjYW52YXNYLCB5OiBjYW52YXNZIH07XHJcbn1cclxuSFRNTERpdkVsZW1lbnQucHJvdG90eXBlLnJlbE1vdXNlQ29vcmRzID0gcmVsTW91c2VDb29yZHM7XHJcbm1pbmltYXBob2xkZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gIHZhciBjb29yZHMgPSBtaW5pbWFwaG9sZGVyLnJlbE1vdXNlQ29vcmRzKGV2ZW50KTtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgdmFyIGNsb3Nlc3QgPSB7XHJcbiAgICB2YWx1ZTogY3dfY2FyQXJyYXlbMF0uY2FyLFxyXG4gICAgZGlzdDogTWF0aC5hYnMoXHJcbiAgICAgIChjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnggKyA2KSAqIG1pbmltYXBzY2FsZSAtIGNvb3Jkcy54XHJcbiAgICApLFxyXG4gICAgeDogY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54LFxyXG4gIH07XHJcblxyXG4gIHZhciBtYXhYID0gMDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgcG9zID0gY3dfY2FyQXJyYXlbaV0uZ2V0UG9zaXRpb24oKTtcclxuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMoKHBvcy54ICsgNikgKiBtaW5pbWFwc2NhbGUgLSBjb29yZHMueCk7XHJcbiAgICBpZiAoZGlzdCA8IGNsb3Nlc3QuZGlzdCkge1xyXG4gICAgICBjbG9zZXN0LnZhbHVlID0gY3dfY2FyQXJyYXkuY2FyO1xyXG4gICAgICBjbG9zZXN0LmRpc3QgPSBkaXN0O1xyXG4gICAgICBjbG9zZXN0LnggPSBwb3MueDtcclxuICAgIH1cclxuICAgIG1heFggPSBNYXRoLm1heChwb3MueCwgbWF4WCk7XHJcbiAgfVxyXG5cclxuICBpZiAoY2xvc2VzdC54ID09IG1heFgpIHtcclxuICAgIC8vIGZvY3VzIG9uIGxlYWRlciBhZ2FpblxyXG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KGNsb3Nlc3QudmFsdWUpO1xyXG4gIH1cclxufTtcclxuXHJcbmRvY3VtZW50XHJcbiAgLnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25yYXRlXCIpXHJcbiAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKGUpIHtcclxuICAgIHZhciBlbGVtID0gZS50YXJnZXQ7XHJcbiAgICBjd19zZXRNdXRhdGlvbihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSk7XHJcbiAgfSk7XHJcblxyXG5kb2N1bWVudFxyXG4gIC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9uc2l6ZVwiKVxyXG4gIC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICB2YXIgZWxlbSA9IGUudGFyZ2V0O1xyXG4gICAgY3dfc2V0TXV0YXRpb25SYW5nZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSk7XHJcbiAgfSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zsb29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKGUpIHtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0O1xyXG4gIGN3X3NldE11dGFibGVGbG9vcihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSk7XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmF2aXR5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKGUpIHtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0O1xyXG4gIGN3X3NldEdyYXZpdHkoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpO1xyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZWxpdGVzaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKGUpIHtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0O1xyXG4gIGN3X3NldEVsaXRlU2l6ZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSk7XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YXRpb24obXV0YXRpb24pIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5fbXV0YXRpb24gPSBwYXJzZUZsb2F0KG11dGF0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YXRpb25SYW5nZShyYW5nZSkge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLm11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcclxuICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vciA9IGNob2ljZSA9PSAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xyXG4gIHdvcmxkX2RlZi5ncmF2aXR5ID0gbmV3IGIyVmVjMigwLjAsIC1wYXJzZUZsb2F0KGNob2ljZSkpO1xyXG4gIHZhciB3b3JsZCA9IGN1cnJlbnRSdW5uZXIuc2NlbmUud29ybGQ7XHJcbiAgLy8gQ0hFQ0sgR1JBVklUWSBDSEFOR0VTXHJcbiAgaWYgKHdvcmxkLkdldEdyYXZpdHkoKS55ICE9IHdvcmxkX2RlZi5ncmF2aXR5LnkpIHtcclxuICAgIHdvcmxkLlNldEdyYXZpdHkod29ybGRfZGVmLmdyYXZpdHkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0RWxpdGVTaXplKGNsb25lcykge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmNoYW1waW9uTGVuZ3RoID0gcGFyc2VJbnQoY2xvbmVzLCAxMCk7XHJcbn1cclxuXHJcbmN3X2luaXQoKTtcclxuIiwidmFyIHJhbmRvbSA9IHJlcXVpcmUoXCIuL3JhbmRvbS5qc1wiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoXHJcbiAgICAgIGZ1bmN0aW9uIChpbnN0YW5jZSwga2V5KSB7XHJcbiAgICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLmNyZWF0ZU5vcm1hbHMoc2NoZW1hUHJvcCwgZ2VuZXJhdG9yKTtcclxuICAgICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgICAgfSxcclxuICAgICAgeyBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMikgfVxyXG4gICAgKTtcclxuICB9LFxyXG4gIGNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwYXJlbnRDaG9vc2VyKSB7XHJcbiAgICB2YXIgaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKTtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShcclxuICAgICAgZnVuY3Rpb24gKGNyb3NzRGVmLCBrZXkpIHtcclxuICAgICAgICB2YXIgc2NoZW1hRGVmID0gc2NoZW1hW2tleV07XHJcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gc2NoZW1hRGVmLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgICAgdmFyIHAgPSBwYXJlbnRDaG9vc2VyKGlkLCBrZXksIHBhcmVudHMpO1xyXG4gICAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcclxuICAgICAgICByZXR1cm4gY3Jvc3NEZWY7XHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgYW5jZXN0cnk6IHBhcmVudHMubWFwKGZ1bmN0aW9uIChwYXJlbnQpIHtcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH0sXHJcbiAgY3JlYXRlTXV0YXRlZENsb25lKHNjaGVtYSwgZ2VuZXJhdG9yLCBwYXJlbnQsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGUpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShcclxuICAgICAgZnVuY3Rpb24gKGNsb25lLCBrZXkpIHtcclxuICAgICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgICAgIHNjaGVtYVByb3AsXHJcbiAgICAgICAgICBnZW5lcmF0b3IsXHJcbiAgICAgICAgICBvcmlnaW5hbFZhbHVlcyxcclxuICAgICAgICAgIGZhY3RvcixcclxuICAgICAgICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgICAgKTtcclxuICAgICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICAgIHJldHVybiBjbG9uZTtcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9LFxyXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShcclxuICAgICAgZnVuY3Rpb24gKGNsb25lLCBrZXkpIHtcclxuICAgICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xyXG4gICAgICAgIHZhciB2YWx1ZXM7XHJcbiAgICAgICAgc3dpdGNoIChzY2hlbWFQcm9wLnR5cGUpIHtcclxuICAgICAgICAgIGNhc2UgXCJzaHVmZmxlXCI6XHJcbiAgICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb1NodWZmbGUoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGNhc2UgXCJmbG9hdFwiOlxyXG4gICAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9GbG9hdChzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBcImludGVnZXJcIjpcclxuICAgICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvSW50ZWdlcihzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgIGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcclxuICAgICAgICByZXR1cm4gY2xvbmU7XHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogcGFyZW50LmlkLFxyXG4gICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfSxcclxufTtcclxuIiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXHJcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKSB7XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gICAgc2NoZW1hID0gY29uZmlnLnNjaGVtYTtcclxuICB2YXIgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG4gICAgdmFyIGRlZiA9IGNyZWF0ZS5jcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XHJcbiAgICB9KTtcclxuICAgIGRlZi5pbmRleCA9IGs7XHJcbiAgICBjd19jYXJHZW5lcmF0aW9uLnB1c2goZGVmKTtcclxuICB9XHJcbiAgcmV0dXJuIHtcclxuICAgIGNvdW50ZXI6IDAsXHJcbiAgICBnZW5lcmF0aW9uOiBjd19jYXJHZW5lcmF0aW9uLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5leHRHZW5lcmF0aW9uKHByZXZpb3VzU3RhdGUsIHNjb3JlcywgY29uZmlnKSB7XHJcbiAgdmFyIGNoYW1waW9uX2xlbmd0aCA9IGNvbmZpZy5jaGFtcGlvbkxlbmd0aCxcclxuICAgIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gICAgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSBjb25maWcuc2VsZWN0RnJvbUFsbFBhcmVudHM7XHJcblxyXG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcbiAgdmFyIG5ld2Jvcm47XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBjaGFtcGlvbl9sZW5ndGg7IGsrKykge1xyXG4gICAgYGA7XHJcbiAgICBzY29yZXNba10uZGVmLmlzX2VsaXRlID0gdHJ1ZTtcclxuICAgIHNjb3Jlc1trXS5kZWYuaW5kZXggPSBrO1xyXG4gICAgbmV3R2VuZXJhdGlvbi5wdXNoKHNjb3Jlc1trXS5kZWYpO1xyXG4gIH1cclxuICB2YXIgcGFyZW50TGlzdCA9IFtdO1xyXG4gIGZvciAoayA9IGNoYW1waW9uX2xlbmd0aDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHZhciBwYXJlbnQxID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0KTtcclxuICAgIHZhciBwYXJlbnQyID0gcGFyZW50MTtcclxuICAgIHdoaWxlIChwYXJlbnQyID09IHBhcmVudDEpIHtcclxuICAgICAgcGFyZW50MiA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCwgcGFyZW50MSk7XHJcbiAgICB9XHJcbiAgICB2YXIgcGFpciA9IFtwYXJlbnQxLCBwYXJlbnQyXTtcclxuICAgIHBhcmVudExpc3QucHVzaChwYWlyKTtcclxuICAgIG5ld2Jvcm4gPSBtYWtlQ2hpbGQoXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgcGFpci5tYXAoZnVuY3Rpb24gKHBhcmVudCkge1xyXG4gICAgICAgIHJldHVybiBzY29yZXNbcGFyZW50XS5kZWY7XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gICAgbmV3Ym9ybiA9IG11dGF0ZShjb25maWcsIG5ld2Jvcm4pO1xyXG4gICAgbmV3Ym9ybi5pc19lbGl0ZSA9IGZhbHNlO1xyXG4gICAgbmV3Ym9ybi5pbmRleCA9IGs7XHJcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2gobmV3Ym9ybik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMSxcclxuICAgIGdlbmVyYXRpb246IG5ld0dlbmVyYXRpb24sXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWFrZUNoaWxkKGNvbmZpZywgcGFyZW50cykge1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgcGlja1BhcmVudCA9IGNvbmZpZy5waWNrUGFyZW50O1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdXRhdGUoY29uZmlnLCBwYXJlbnQpIHtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIG11dGF0aW9uX3JhbmdlID0gY29uZmlnLm11dGF0aW9uX3JhbmdlLFxyXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcclxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxyXG4gICAgc2NoZW1hLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20sXHJcbiAgICBwYXJlbnQsXHJcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXHJcbiAgICBnZW5fbXV0YXRpb25cclxuICApO1xyXG59XHJcbiIsImNvbnN0IHJhbmRvbSA9IHtcclxuICBzaHVmZmxlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShcclxuICAgICAgcHJvcCxcclxuICAgICAgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCB8fCAxMCxcclxuICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdlbmVyYXRvclxyXG4gICAgICApXHJcbiAgICApO1xyXG4gIH0sXHJcbiAgY3JlYXRlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihcclxuICAgICAgcHJvcCxcclxuICAgICAgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdlbmVyYXRvclxyXG4gICAgICApXHJcbiAgICApO1xyXG4gIH0sXHJcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KFxyXG4gICAgICBwcm9wLFxyXG4gICAgICByYW5kb20uY3JlYXRlTm9ybWFscyhcclxuICAgICAgICB7XHJcbiAgICAgICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2VuZXJhdG9yXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgfSxcclxuICBjcmVhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvcikge1xyXG4gICAgdmFyIGwgPSBwcm9wLmxlbmd0aDtcclxuICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgIHZhbHVlcy5wdXNoKGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IpKTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgfSxcclxuICBtdXRhdGVTaHVmZmxlKFxyXG4gICAgcHJvcCxcclxuICAgIGdlbmVyYXRvcixcclxuICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UsXHJcbiAgICBjaGFuY2VUb011dGF0ZVxyXG4gICkge1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb1NodWZmbGUoXHJcbiAgICAgIHByb3AsXHJcbiAgICAgIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICAgIHByb3AsXHJcbiAgICAgICAgZ2VuZXJhdG9yLFxyXG4gICAgICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgICAgIG11dGF0aW9uX3JhbmdlLFxyXG4gICAgICAgIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgfSxcclxuICBtdXRhdGVJbnRlZ2VycyhcclxuICAgIHByb3AsXHJcbiAgICBnZW5lcmF0b3IsXHJcbiAgICBvcmlnaW5hbFZhbHVlcyxcclxuICAgIG11dGF0aW9uX3JhbmdlLFxyXG4gICAgY2hhbmNlVG9NdXRhdGVcclxuICApIHtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKFxyXG4gICAgICBwcm9wLFxyXG4gICAgICByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgICBwcm9wLFxyXG4gICAgICAgIGdlbmVyYXRvcixcclxuICAgICAgICBvcmlnaW5hbFZhbHVlcyxcclxuICAgICAgICBtdXRhdGlvbl9yYW5nZSxcclxuICAgICAgICBjaGFuY2VUb011dGF0ZVxyXG4gICAgICApXHJcbiAgICApO1xyXG4gIH0sXHJcbiAgbXV0YXRlRmxvYXRzKFxyXG4gICAgcHJvcCxcclxuICAgIGdlbmVyYXRvcixcclxuICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UsXHJcbiAgICBjaGFuY2VUb011dGF0ZVxyXG4gICkge1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KFxyXG4gICAgICBwcm9wLFxyXG4gICAgICByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgICBwcm9wLFxyXG4gICAgICAgIGdlbmVyYXRvcixcclxuICAgICAgICBvcmlnaW5hbFZhbHVlcyxcclxuICAgICAgICBtdXRhdGlvbl9yYW5nZSxcclxuICAgICAgICBjaGFuY2VUb011dGF0ZVxyXG4gICAgICApXHJcbiAgICApO1xyXG4gIH0sXHJcbiAgbWFwVG9TaHVmZmxlKHByb3AsIG5vcm1hbHMpIHtcclxuICAgIHZhciBvZmZzZXQgPSBwcm9wLm9mZnNldCB8fCAwO1xyXG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcclxuICAgIHZhciBzb3J0ZWQgPSBub3JtYWxzLnNsaWNlKCkuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICByZXR1cm4gYSAtIGI7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBub3JtYWxzXHJcbiAgICAgIC5tYXAoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgIHJldHVybiBzb3J0ZWQuaW5kZXhPZih2YWwpO1xyXG4gICAgICB9KVxyXG4gICAgICAubWFwKGZ1bmN0aW9uIChpKSB7XHJcbiAgICAgICAgcmV0dXJuIGkgKyBvZmZzZXQ7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5zbGljZSgwLCBsaW1pdCk7XHJcbiAgfSxcclxuICBtYXBUb0ludGVnZXIocHJvcCwgbm9ybWFscykge1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxMCxcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgIH07XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgbm9ybWFscykubWFwKGZ1bmN0aW9uIChmbG9hdCkge1xyXG4gICAgICByZXR1cm4gTWF0aC5yb3VuZChmbG9hdCk7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIG1hcFRvRmxvYXQocHJvcCwgbm9ybWFscykge1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxLFxyXG4gICAgfTtcclxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbiAobm9ybWFsKSB7XHJcbiAgICAgIHZhciBtaW4gPSBwcm9wLm1pbjtcclxuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcclxuICAgICAgcmV0dXJuIG1pbiArIG5vcm1hbCAqIHJhbmdlO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICBtdXRhdGVOb3JtYWxzKFxyXG4gICAgcHJvcCxcclxuICAgIGdlbmVyYXRvcixcclxuICAgIG9yaWdpbmFsVmFsdWVzLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UsXHJcbiAgICBjaGFuY2VUb011dGF0ZVxyXG4gICkge1xyXG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlO1xyXG4gICAgcmV0dXJuIG9yaWdpbmFsVmFsdWVzLm1hcChmdW5jdGlvbiAob3JpZ2luYWxWYWx1ZSkge1xyXG4gICAgICBpZiAoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSkge1xyXG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3IpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xyXG5cclxuZnVuY3Rpb24gbXV0YXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgbXV0YXRpb25fcmFuZ2UpIHtcclxuICBpZiAobXV0YXRpb25fcmFuZ2UgPiAxKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgbXV0YXRlIGJleW9uZCBib3VuZHNcIik7XHJcbiAgfVxyXG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xyXG4gIGlmIChuZXdNaW4gPCAwKSBuZXdNaW4gPSAwO1xyXG4gIGlmIChuZXdNaW4gKyBtdXRhdGlvbl9yYW5nZSA+IDEpIG5ld01pbiA9IDEgLSBtdXRhdGlvbl9yYW5nZTtcclxuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbChcclxuICAgIHtcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSxcclxuICAgIGdlbmVyYXRvclxyXG4gICk7XHJcbiAgcmV0dXJuIG5ld01pbiArIHJhbmdlVmFsdWUgKiBtdXRhdGlvbl9yYW5nZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvcikge1xyXG4gIGlmICghcHJvcC5pbmNsdXNpdmUpIHtcclxuICAgIHJldHVybiBnZW5lcmF0b3IoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID8gZ2VuZXJhdG9yKCkgOiAxIC0gZ2VuZXJhdG9yKCk7XHJcbiAgfVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgYnRvYSAqL1xyXG52YXIgc2V0dXBTY2VuZSA9IHJlcXVpcmUoXCIuL3NldHVwLXNjZW5lXCIpO1xyXG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG52YXIgZGVmVG9DYXIgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9kZWYtdG8tY2FyXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBydW5EZWZzO1xyXG5mdW5jdGlvbiBydW5EZWZzKHdvcmxkX2RlZiwgZGVmcywgbGlzdGVuZXJzKSB7XHJcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNjZW5lID0gc2V0dXBTY2VuZSh3b3JsZF9kZWYpO1xyXG4gIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGJ1aWxkIGNhcnNcIik7XHJcbiAgdmFyIGNhcnMgPSBkZWZzLm1hcCgoZGVmLCBpKSA9PiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpbmRleDogaSxcclxuICAgICAgZGVmOiBkZWYsXHJcbiAgICAgIGNhcjogZGVmVG9DYXIoZGVmLCBzY2VuZS53b3JsZCwgd29ybGRfZGVmKSxcclxuICAgICAgc3RhdGU6IGNhclJ1bi5nZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKSxcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XHJcbiAgcmV0dXJuIHtcclxuICAgIHNjZW5lOiBzY2VuZSxcclxuICAgIGNhcnM6IGNhcnMsXHJcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcclxuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XHJcbiAgICAgICAgY2FyLnN0YXRlID0gY2FyUnVuLnVwZGF0ZVN0YXRlKHdvcmxkX2RlZiwgY2FyLmNhciwgY2FyLnN0YXRlKTtcclxuICAgICAgICB2YXIgc3RhdHVzID0gY2FyUnVuLmdldFN0YXR1cyhjYXIuc3RhdGUsIHdvcmxkX2RlZik7XHJcbiAgICAgICAgbGlzdGVuZXJzLmNhclN0ZXAoY2FyKTtcclxuICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FyLnNjb3JlID0gY2FyUnVuLmNhbGN1bGF0ZVNjb3JlKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcclxuICAgICAgICBsaXN0ZW5lcnMuY2FyRGVhdGgoY2FyKTtcclxuXHJcbiAgICAgICAgdmFyIHdvcmxkID0gc2NlbmUud29ybGQ7XHJcbiAgICAgICAgdmFyIHdvcmxkQ2FyID0gY2FyLmNhcjtcclxuICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci5jaGFzc2lzKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCB3b3JsZENhci53aGVlbHMubGVuZ3RoOyB3KyspIHtcclxuICAgICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLndoZWVsc1t3XSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0pO1xyXG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXHJcblxyXG4vKlxyXG5cclxud29ybGRfZGVmID0ge1xyXG4gIGdyYXZpdHk6IHt4LCB5fSxcclxuICBkb1NsZWVwOiBib29sZWFuLFxyXG4gIGZsb29yc2VlZDogc3RyaW5nLFxyXG4gIHRpbGVEaW1lbnNpb25zLFxyXG4gIG1heEZsb29yVGlsZXMsXHJcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxyXG59XHJcblxyXG4qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAod29ybGRfZGVmKSB7XHJcbiAgdmFyIHdvcmxkID0gbmV3IGIyV29ybGQod29ybGRfZGVmLmdyYXZpdHksIHdvcmxkX2RlZi5kb1NsZWVwKTtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN3X2NyZWF0ZUZsb29yKFxyXG4gICAgd29ybGQsXHJcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkLFxyXG4gICAgd29ybGRfZGVmLnRpbGVEaW1lbnNpb25zLFxyXG4gICAgd29ybGRfZGVmLm1heEZsb29yVGlsZXMsXHJcbiAgICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vclxyXG4gICk7XHJcblxyXG4gIHZhciBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW2Zsb29yVGlsZXMubGVuZ3RoIC0gMV07XHJcbiAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXHJcbiAgICBsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdXHJcbiAgKTtcclxuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xyXG4gIHJldHVybiB7XHJcbiAgICB3b3JsZDogd29ybGQsXHJcbiAgICBmbG9vclRpbGVzOiBmbG9vclRpbGVzLFxyXG4gICAgZmluaXNoTGluZTogdGlsZV9wb3NpdGlvbi54LFxyXG4gIH07XHJcbn07XHJcblxyXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vcihcclxuICB3b3JsZCxcclxuICBmbG9vcnNlZWQsXHJcbiAgZGltZW5zaW9ucyxcclxuICBtYXhGbG9vclRpbGVzLFxyXG4gIG11dGFibGVfZmxvb3JcclxuKSB7XHJcbiAgdmFyIGxhc3RfdGlsZSA9IG51bGw7XHJcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcclxuICB2YXIgY3dfZmxvb3JUaWxlcyA9IFtdO1xyXG4gIE1hdGguc2VlZHJhbmRvbShmbG9vcnNlZWQpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgbWF4Rmxvb3JUaWxlczsgaysrKSB7XHJcbiAgICBpZiAoIW11dGFibGVfZmxvb3IpIHtcclxuICAgICAgLy8ga2VlcCBvbGQgaW1wb3NzaWJsZSB0cmFja3MgaWYgbm90IHVzaW5nIG11dGFibGUgZmxvb3JzXHJcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcclxuICAgICAgICB3b3JsZCxcclxuICAgICAgICBkaW1lbnNpb25zLFxyXG4gICAgICAgIHRpbGVfcG9zaXRpb24sXHJcbiAgICAgICAgKChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiBrKSAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIHBhdGggaXMgbXV0YWJsZSBvdmVyIHJhY2VzLCBjcmVhdGUgc21vb3RoZXIgdHJhY2tzXHJcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcclxuICAgICAgICB3b3JsZCxcclxuICAgICAgICBkaW1lbnNpb25zLFxyXG4gICAgICAgIHRpbGVfcG9zaXRpb24sXHJcbiAgICAgICAgKChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjIgKiBrKSAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIGN3X2Zsb29yVGlsZXMucHVzaChsYXN0X3RpbGUpO1xyXG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxyXG4gICAgICBsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdXHJcbiAgICApO1xyXG4gIH1cclxuICByZXR1cm4gY3dfZmxvb3JUaWxlcztcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3JUaWxlKHdvcmxkLCBkaW0sIHBvc2l0aW9uLCBhbmdsZSkge1xyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuXHJcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xyXG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAwLjU7XHJcblxyXG4gIHZhciBjb29yZHMgPSBuZXcgQXJyYXkoKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIDApKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIC1kaW0ueSkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIC1kaW0ueSkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIDApKTtcclxuXHJcbiAgdmFyIGNlbnRlciA9IG5ldyBiMlZlYzIoMCwgMCk7XHJcblxyXG4gIHZhciBuZXdjb29yZHMgPSBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKTtcclxuXHJcbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KG5ld2Nvb3Jkcyk7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxuICByZXR1cm4gYm9keTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSkge1xyXG4gIHJldHVybiBjb29yZHMubWFwKGZ1bmN0aW9uIChjb29yZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDpcclxuICAgICAgICBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSAtXHJcbiAgICAgICAgTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgK1xyXG4gICAgICAgIGNlbnRlci54LFxyXG4gICAgICB5OlxyXG4gICAgICAgIE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpICtcclxuICAgICAgICBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArXHJcbiAgICAgICAgY2VudGVyLnksXHJcbiAgICB9O1xyXG4gIH0pO1xyXG59XHJcbiJdfQ==
