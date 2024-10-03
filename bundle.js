(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = "function" == typeof require && require;
          if (!f && c) return c(i, !0);
          if (u) return u(i, !0);
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = "MODULE_NOT_FOUND"), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function (r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (
      var u = "function" == typeof require && require, i = 0;
      i < t.length;
      i++
    )
      o(t[i]);
    return o;
  }
  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        module.exports = {
          wheelCount: 2,
          wheelMinRadius: 0.2,
          wheelRadiusRange: 0.5,
          wheelMinDensity: 40,
          wheelDensityRange: 100,
          chassisDensityRange: 300,
          chassisMinDensity: 30,
          chassisMinAxis: 0.1,
          chassisAxisRange: 1.1,
        };
      },
      {},
    ],
    2: [
      function (require, module, exports) {
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
      },
      { "./car-constants.json": 1 },
    ],
    3: [
      function (require, module, exports) {
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
            var torque =
              (carmass * -constants.gravity.y) / car_def.wheel_radius[i];

            var randvertex =
              instance.chassis.vertex_list[car_def.wheel_vertex[i]];
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
      },
      { "../machine-learning/create-instance": 20 },
    ],
    4: [
      function (require, module, exports) {
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
          var avgspeed =
            (state.maxPositionx / state.frames) * constants.box2dfps;
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
      },
      {},
    ],
    5: [
      function (require, module, exports) {
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
          this.healthBar = document.getElementById(
            "health" + car_def.index
          ).style;
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
      },
      { "../car-schema/run": 4 },
    ],
    6: [
      function (require, module, exports) {
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
                255 -
                  (255 * (f.m_density - wheelMinDensity)) / wheelDensityRange
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
      },
      { "./draw-circle": 7, "./draw-virtual-poly": 9 },
    ],
    7: [
      function (require, module, exports) {
        module.exports = cw_drawCircle;

        function cw_drawCircle(ctx, body, center, radius, angle, color) {
          var p = body.GetWorldPoint(center);
          ctx.fillStyle = color;

          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, true);

          ctx.moveTo(p.x, p.y);
          ctx.lineTo(
            p.x + radius * Math.cos(angle),
            p.y + radius * Math.sin(angle)
          );

          ctx.fill();
          ctx.stroke();
        }
      },
      {},
    ],
    8: [
      function (require, module, exports) {
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
              if (
                shapePosition > camera_x - 5 &&
                shapePosition < camera_x + 10
              ) {
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
      },
      { "./draw-virtual-poly": 9 },
    ],
    9: [
      function (require, module, exports) {
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
      },
      {},
    ],
    10: [
      function (require, module, exports) {
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
            var nextState = cw_storeGraphScores(
              lastState,
              scores,
              generationSize
            );
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

        function cw_clearGraphics(
          graphcanvas,
          graphctx,
          graphwidth,
          graphheight
        ) {
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

            ts.innerHTML +=
              [n, score, distance, yrange, gen].join(" ") + "<br />";
          }
        }

        function drawAllResults(
          scatterPlotElem,
          config,
          allResults,
          previousGraph
        ) {
          if (!scatterPlotElem) return;
          return scatterPlot(
            scatterPlotElem,
            allResults,
            config.propertyMap,
            previousGraph
          );
        }
      },
      { "./scatter-plot": 11 },
    ],
    11: [
      function (require, module, exports) {
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
                kv[key].data.push([
                  retrieveValue(score.def, key),
                  score.score.v,
                ]);
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
      },
      {},
    ],
    12: [
      function (require, module, exports) {
        module.exports = generateRandom;
        function generateRandom() {
          return Math.random();
        }
      },
      {},
    ],
    13: [
      function (require, module, exports) {
        // http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
        module.exports = getInbreedingCoefficient;

        function getInbreedingCoefficient(child) {
          var nameIndex = new Map();
          var flagged = new Set();
          var convergencePoints = new Set();
          createAncestryMap(child, []);

          var storedCoefficients = new Map();

          return Array.from(convergencePoints.values()).reduce(function (
            sum,
            point
          ) {
            var iCo = getCoefficient(point);
            return sum + iCo;
          },
          0);

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
                nameIndex
                  .get(node.id)
                  .children.forEach(function (childIdentifier) {
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
      },
      {},
    ],
    14: [
      function (require, module, exports) {
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
      },
      {
        "../car-schema/construct.js": 2,
        "./generateRandom": 12,
        "./pickParent": 15,
        "./selectFromAllParents": 16,
      },
    ],
    15: [
      function (require, module, exports) {
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
          if (
            ["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1
          ) {
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
      },
      {},
    ],
    16: [
      function (require, module, exports) {
        var getInbreedingCoefficient = require("./inbreeding-coefficient");

        module.exports = simpleSelect;

        function simpleSelect(parents) {
          var totalParents = parents.length;
          var r = Math.random();
          if (r == 0) return 0;
          return Math.floor(-Math.log(r) * totalParents) % totalParents;
        }

        function selectFromAllParents(
          parents,
          parentList,
          previousParentIndex
        ) {
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
      },
      { "./inbreeding-coefficient": 13 },
    ],
    17: [
      function (require, module, exports) {
        module.exports = function (car) {
          var out = {
            chassis: ghost_get_chassis(car.chassis),
            wheels: [],
            pos: {
              x: car.chassis.GetPosition().x,
              y: car.chassis.GetPosition().y,
            },
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
      },
      {},
    ],
    18: [
      function (require, module, exports) {
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
      },
      { "./car-to-ghost.js": 17 },
    ],
    19: [
      function (require, module, exports) {
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
            fogdistance.width =
              800 - Math.round(distance + 15) * minimapscale + "px";
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
          currentRunner = worldRun(
            world_def,
            generationState.generation,
            uiListeners
          );
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
          currentRunner = worldRun(
            world_def,
            generationState.generation,
            uiListeners
          );

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

        document
          .querySelector("#fast-forward")
          .addEventListener("click", function () {
            fastForward();
          });

        document
          .querySelector("#save-progress")
          .addEventListener("click", function () {
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
          localStorage.cw_savedGeneration = JSON.stringify(
            generationState.generation
          );
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
          generationState.generation = JSON.parse(
            localStorage.cw_savedGeneration
          );
          generationState.counter = localStorage.cw_genCounter;
          ghost = JSON.parse(localStorage.cw_ghost);
          graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
          world_def.floorseed = localStorage.cw_floorSeed;
          document.getElementById("newseed").value = world_def.floorseed;

          currentRunner = worldRun(
            world_def,
            generationState.generation,
            uiListeners
          );
          cw_drawMiniMap();
          Math.seedrandom();

          resetCarUI();
          cw_startSimulation();
        }

        document
          .querySelector("#confirm-reset")
          .addEventListener("click", function () {
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

        document
          .querySelector("#toggle-ghost")
          .addEventListener("click", function (e) {
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
          currentRunner = worldRun(
            world_def,
            generationState.generation,
            uiListeners
          );
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
            totalOffsetX +=
              currentElement.offsetLeft - currentElement.scrollLeft;
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

        document
          .querySelector("#floor")
          .addEventListener("change", function (e) {
            var elem = e.target;
            cw_setMutableFloor(elem.options[elem.selectedIndex].value);
          });

        document
          .querySelector("#gravity")
          .addEventListener("change", function (e) {
            var elem = e.target;
            cw_setGravity(elem.options[elem.selectedIndex].value);
          });

        document
          .querySelector("#elitesize")
          .addEventListener("change", function (e) {
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
      },
      {
        "./car-schema/construct.js": 2,
        "./draw/draw-car-stats.js": 5,
        "./draw/draw-car.js": 6,
        "./draw/draw-floor.js": 8,
        "./draw/plot-graphs.js": 10,
        "./generation-config": 14,
        "./ghost/index.js": 18,
        "./machine-learning/genetic-algorithm/manage-round.js": 21,
        "./world/run.js": 23,
      },
    ],
    20: [
      function (require, module, exports) {
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
          createMutatedClone(
            schema,
            generator,
            parent,
            factor,
            chanceToMutate
          ) {
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
      },
      { "./random.js": 22 },
    ],
    21: [
      function (require, module, exports) {
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
      },
      { "../create-instance": 20 },
    ],
    22: [
      function (require, module, exports) {
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
      },
      {},
    ],
    23: [
      function (require, module, exports) {
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
      },
      {
        "../car-schema/def-to-car": 3,
        "../car-schema/run": 4,
        "./setup-scene": 24,
      },
    ],
    24: [
      function (require, module, exports) {
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
      },
      {},
    ],
  },
  {},
  [19]
);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvZHJhdy1jYXItc3RhdHMuanMiLCJzcmMvZHJhdy9kcmF3LWNhci5qcyIsInNyYy9kcmF3L2RyYXctY2lyY2xlLmpzIiwic3JjL2RyYXcvZHJhdy1mbG9vci5qcyIsInNyYy9kcmF3L2RyYXctdmlydHVhbC1wb2x5LmpzIiwic3JjL2RyYXcvcGxvdC1ncmFwaHMuanMiLCJzcmMvZHJhdy9zY2F0dGVyLXBsb3QuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvZ2VuZXJhdGVSYW5kb20uanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5icmVlZGluZy1jb2VmZmljaWVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmRleC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9waWNrUGFyZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3NlbGVjdEZyb21BbGxQYXJlbnRzLmpzIiwic3JjL2dob3N0L2Nhci10by1naG9zdC5qcyIsInNyYy9naG9zdC9pbmRleC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZS5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwibW9kdWxlLmV4cG9ydHM9e1xyXG4gIFwid2hlZWxDb3VudFwiOiAyLFxyXG4gIFwid2hlZWxNaW5SYWRpdXNcIjogMC4yLFxyXG4gIFwid2hlZWxSYWRpdXNSYW5nZVwiOiAwLjUsXHJcbiAgXCJ3aGVlbE1pbkRlbnNpdHlcIjogNDAsXHJcbiAgXCJ3aGVlbERlbnNpdHlSYW5nZVwiOiAxMDAsXHJcbiAgXCJjaGFzc2lzRGVuc2l0eVJhbmdlXCI6IDMwMCxcclxuICBcImNoYXNzaXNNaW5EZW5zaXR5XCI6IDMwLFxyXG4gIFwiY2hhc3Npc01pbkF4aXNcIjogMC4xLFxyXG4gIFwiY2hhc3Npc0F4aXNSYW5nZVwiOiAxLjFcclxufVxyXG4iLCJ2YXIgY2FyQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY2FyLWNvbnN0YW50cy5qc29uXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgd29ybGREZWY6IHdvcmxkRGVmLFxyXG4gIGNhckNvbnN0YW50czogZ2V0Q2FyQ29uc3RhbnRzLFxyXG4gIGdlbmVyYXRlU2NoZW1hOiBnZW5lcmF0ZVNjaGVtYVxyXG59XHJcblxyXG5mdW5jdGlvbiB3b3JsZERlZigpe1xyXG4gIHZhciBib3gyZGZwcyA9IDYwO1xyXG4gIHJldHVybiB7XHJcbiAgICBncmF2aXR5OiB7IHk6IDAgfSxcclxuICAgIGRvU2xlZXA6IHRydWUsXHJcbiAgICBmbG9vcnNlZWQ6IFwiYWJjXCIsXHJcbiAgICBtYXhGbG9vclRpbGVzOiAyMDAsXHJcbiAgICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICAgIG1vdG9yU3BlZWQ6IDIwLFxyXG4gICAgYm94MmRmcHM6IGJveDJkZnBzLFxyXG4gICAgbWF4X2Nhcl9oZWFsdGg6IGJveDJkZnBzICogMTAsXHJcbiAgICB0aWxlRGltZW5zaW9uczoge1xyXG4gICAgICB3aWR0aDogMS41LFxyXG4gICAgICBoZWlnaHQ6IDAuMTVcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKXtcclxuICByZXR1cm4gY2FyQ29uc3RhbnRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVNjaGVtYSh2YWx1ZXMpe1xyXG4gIHJldHVybiB7XHJcbiAgICB3aGVlbF9yYWRpdXM6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxyXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pblJhZGl1cyxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbFJhZGl1c1JhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgd2hlZWxfZGVuc2l0eToge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluRGVuc2l0eSxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbERlbnNpdHlSYW5nZSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIGNoYXNzaXNfZGVuc2l0eToge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogMSxcclxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc0RlbnNpdHlSYW5nZSxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzTWluRGVuc2l0eSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIHZlcnRleF9saXN0OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiAxMixcclxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc01pbkF4aXMsXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc0F4aXNSYW5nZSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIHdoZWVsX3ZlcnRleDoge1xyXG4gICAgICB0eXBlOiBcInNodWZmbGVcIixcclxuICAgICAgbGVuZ3RoOiA4LFxyXG4gICAgICBsaW1pdDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG4iLCIvKlxyXG4gIGdsb2JhbHMgYjJSZXZvbHV0ZUpvaW50RGVmIGIyVmVjMiBiMkJvZHlEZWYgYjJCb2R5IGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSBiMkNpcmNsZVNoYXBlXHJcbiovXHJcblxyXG52YXIgY3JlYXRlSW5zdGFuY2UgPSByZXF1aXJlKFwiLi4vbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2VcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlZlRvQ2FyO1xyXG5cclxuZnVuY3Rpb24gZGVmVG9DYXIobm9ybWFsX2RlZiwgd29ybGQsIGNvbnN0YW50cyl7XHJcbiAgdmFyIGNhcl9kZWYgPSBjcmVhdGVJbnN0YW5jZS5hcHBseVR5cGVzKGNvbnN0YW50cy5zY2hlbWEsIG5vcm1hbF9kZWYpXHJcbiAgdmFyIGluc3RhbmNlID0ge307XHJcbiAgaW5zdGFuY2UuY2hhc3NpcyA9IGNyZWF0ZUNoYXNzaXMoXHJcbiAgICB3b3JsZCwgY2FyX2RlZi52ZXJ0ZXhfbGlzdCwgY2FyX2RlZi5jaGFzc2lzX2RlbnNpdHlcclxuICApO1xyXG4gIHZhciBpO1xyXG5cclxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcclxuXHJcbiAgaW5zdGFuY2Uud2hlZWxzID0gW107XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXHJcbiAgICAgIHdvcmxkLFxyXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcclxuICAgICAgY2FyX2RlZi53aGVlbF9kZW5zaXR5W2ldXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgdmFyIGNhcm1hc3MgPSBpbnN0YW5jZS5jaGFzc2lzLkdldE1hc3MoKTtcclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICBjYXJtYXNzICs9IGluc3RhbmNlLndoZWVsc1tpXS5HZXRNYXNzKCk7XHJcbiAgfVxyXG5cclxuICB2YXIgam9pbnRfZGVmID0gbmV3IGIyUmV2b2x1dGVKb2ludERlZigpO1xyXG5cclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICB2YXIgdG9ycXVlID0gY2FybWFzcyAqIC1jb25zdGFudHMuZ3Jhdml0eS55IC8gY2FyX2RlZi53aGVlbF9yYWRpdXNbaV07XHJcblxyXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcclxuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckEuU2V0KHJhbmR2ZXJ0ZXgueCwgcmFuZHZlcnRleC55KTtcclxuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckIuU2V0KDAsIDApO1xyXG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xyXG4gICAgam9pbnRfZGVmLm1vdG9yU3BlZWQgPSAtY29uc3RhbnRzLm1vdG9yU3BlZWQ7XHJcbiAgICBqb2ludF9kZWYuZW5hYmxlTW90b3IgPSB0cnVlO1xyXG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcclxuICAgIGpvaW50X2RlZi5ib2R5QiA9IGluc3RhbmNlLndoZWVsc1tpXTtcclxuICAgIHdvcmxkLkNyZWF0ZUpvaW50KGpvaW50X2RlZik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaW5zdGFuY2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXMod29ybGQsIHZlcnRleHMsIGRlbnNpdHkpIHtcclxuXHJcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMF0sIDApKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCB2ZXJ0ZXhzWzNdKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzRdLCB2ZXJ0ZXhzWzVdKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzddLCAtdmVydGV4c1s4XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCAtdmVydGV4c1s5XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XHJcblxyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLjAsIDQuMCk7XHJcblxyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcblxyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzBdLCB2ZXJ0ZXhfbGlzdFsxXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFsyXSwgdmVydGV4X2xpc3RbM10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzNdLCB2ZXJ0ZXhfbGlzdFs0XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs1XSwgdmVydGV4X2xpc3RbNl0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzZdLCB2ZXJ0ZXhfbGlzdFs3XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcclxuXHJcbiAgYm9keS52ZXJ0ZXhfbGlzdCA9IHZlcnRleF9saXN0O1xyXG5cclxuICByZXR1cm4gYm9keTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleDEsIHZlcnRleDIsIGRlbnNpdHkpIHtcclxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDEpO1xyXG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4Mik7XHJcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDEwO1xyXG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XHJcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xyXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheSh2ZXJ0ZXhfbGlzdCwgMyk7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcclxuXHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuXHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKHJhZGl1cyk7XHJcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMTtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcbiIsIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiBnZXRJbml0aWFsU3RhdGUsXHJcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxyXG4gIGdldFN0YXR1czogZ2V0U3RhdHVzLFxyXG4gIGNhbGN1bGF0ZVNjb3JlOiBjYWxjdWxhdGVTY29yZSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpe1xyXG4gIHJldHVybiB7XHJcbiAgICBmcmFtZXM6IDAsXHJcbiAgICBoZWFsdGg6IHdvcmxkX2RlZi5tYXhfY2FyX2hlYWx0aCxcclxuICAgIG1heFBvc2l0aW9ueTogMCxcclxuICAgIG1pblBvc2l0aW9ueTogMCxcclxuICAgIG1heFBvc2l0aW9ueDogMCxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShjb25zdGFudHMsIHdvcmxkQ29uc3RydWN0LCBzdGF0ZSl7XHJcbiAgaWYoc3RhdGUuaGVhbHRoIDw9IDApe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQWxyZWFkeSBEZWFkXCIpO1xyXG4gIH1cclxuICBpZihzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZSl7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJhbHJlYWR5IEZpbmlzaGVkXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gY29uc29sZS5sb2coc3RhdGUpO1xyXG4gIC8vIGNoZWNrIGhlYWx0aFxyXG4gIHZhciBwb3NpdGlvbiA9IHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcclxuICAvLyBjaGVjayBpZiBjYXIgcmVhY2hlZCBlbmQgb2YgdGhlIHBhdGhcclxuICB2YXIgbmV4dFN0YXRlID0ge1xyXG4gICAgZnJhbWVzOiBzdGF0ZS5mcmFtZXMgKyAxLFxyXG4gICAgbWF4UG9zaXRpb254OiBwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ID8gcG9zaXRpb24ueCA6IHN0YXRlLm1heFBvc2l0aW9ueCxcclxuICAgIG1heFBvc2l0aW9ueTogcG9zaXRpb24ueSA+IHN0YXRlLm1heFBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5tYXhQb3NpdGlvbnksXHJcbiAgICBtaW5Qb3NpdGlvbnk6IHBvc2l0aW9uLnkgPCBzdGF0ZS5taW5Qb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWluUG9zaXRpb255XHJcbiAgfTtcclxuXHJcbiAgaWYgKHBvc2l0aW9uLnggPiBjb25zdGFudHMuZmluaXNoTGluZSkge1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9XHJcblxyXG4gIGlmIChwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ICsgMC4wMikge1xyXG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfVxyXG4gIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xyXG4gIGlmIChNYXRoLmFicyh3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldExpbmVhclZlbG9jaXR5KCkueCkgPCAwLjAwMSkge1xyXG4gICAgbmV4dFN0YXRlLmhlYWx0aCAtPSA1O1xyXG4gIH1cclxuICByZXR1cm4gbmV4dFN0YXRlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTdGF0dXMoc3RhdGUsIGNvbnN0YW50cyl7XHJcbiAgaWYoaGFzRmFpbGVkKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gLTE7XHJcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhc0ZhaWxlZChzdGF0ZSAvKiwgY29uc3RhbnRzICovKXtcclxuICByZXR1cm4gc3RhdGUuaGVhbHRoIDw9IDA7XHJcbn1cclxuZnVuY3Rpb24gaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKXtcclxuICByZXR1cm4gc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZVNjb3JlKHN0YXRlLCBjb25zdGFudHMpe1xyXG4gIHZhciBhdmdzcGVlZCA9IChzdGF0ZS5tYXhQb3NpdGlvbnggLyBzdGF0ZS5mcmFtZXMpICogY29uc3RhbnRzLmJveDJkZnBzO1xyXG4gIHZhciBwb3NpdGlvbiA9IHN0YXRlLm1heFBvc2l0aW9ueDtcclxuICB2YXIgc2NvcmUgPSBwb3NpdGlvbiArIGF2Z3NwZWVkO1xyXG4gIHJldHVybiB7XHJcbiAgICB2OiBzY29yZSxcclxuICAgIHM6IGF2Z3NwZWVkLFxyXG4gICAgeDogcG9zaXRpb24sXHJcbiAgICB5OiBzdGF0ZS5tYXhQb3NpdGlvbnksXHJcbiAgICB5Mjogc3RhdGUubWluUG9zaXRpb255XHJcbiAgfVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgKi9cclxuXHJcbnZhciBydW4gPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9ydW5cIik7XHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PSBDYXIgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxudmFyIGN3X0NhciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLl9fY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufVxyXG5cclxuY3dfQ2FyLnByb3RvdHlwZS5fX2NvbnN0cnVjdG9yID0gZnVuY3Rpb24gKGNhcikge1xyXG4gIHRoaXMuY2FyID0gY2FyO1xyXG4gIHRoaXMuY2FyX2RlZiA9IGNhci5kZWY7XHJcbiAgdmFyIGNhcl9kZWYgPSB0aGlzLmNhcl9kZWY7XHJcblxyXG4gIHRoaXMuZnJhbWVzID0gMDtcclxuICB0aGlzLmFsaXZlID0gdHJ1ZTtcclxuICB0aGlzLmlzX2VsaXRlID0gY2FyLmRlZi5pc19lbGl0ZTtcclxuICB0aGlzLmhlYWx0aEJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIgKyBjYXJfZGVmLmluZGV4KS5zdHlsZTtcclxuICB0aGlzLmhlYWx0aEJhclRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkubmV4dFNpYmxpbmcubmV4dFNpYmxpbmc7XHJcbiAgdGhpcy5oZWFsdGhCYXJUZXh0LmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XHJcbiAgdGhpcy5taW5pbWFwbWFya2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXJcIiArIGNhcl9kZWYuaW5kZXgpO1xyXG5cclxuICBpZiAodGhpcy5pc19lbGl0ZSkge1xyXG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjM0Y3MkFGXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmhlYWx0aEJhci5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGN0M4NzNcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggc29saWQgI0Y3Qzg3M1wiO1xyXG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuY3dfQ2FyLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5jYXIuY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcclxufVxyXG5cclxuY3dfQ2FyLnByb3RvdHlwZS5raWxsID0gZnVuY3Rpb24gKGN1cnJlbnRSdW5uZXIsIGNvbnN0YW50cykge1xyXG4gIHRoaXMubWluaW1hcG1hcmtlci5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggc29saWQgIzNGNzJBRlwiO1xyXG4gIHZhciBmaW5pc2hMaW5lID0gY3VycmVudFJ1bm5lci5zY2VuZS5maW5pc2hMaW5lXHJcbiAgdmFyIG1heF9jYXJfaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xyXG4gIHZhciBzdGF0dXMgPSBydW4uZ2V0U3RhdHVzKHRoaXMuY2FyLnN0YXRlLCB7XHJcbiAgICBmaW5pc2hMaW5lOiBmaW5pc2hMaW5lLFxyXG4gICAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIH0pXHJcbiAgc3dpdGNoKHN0YXR1cyl7XHJcbiAgICBjYXNlIDE6IHtcclxuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuICAgIGNhc2UgLTE6IHtcclxuICAgICAgdGhpcy5oZWFsdGhCYXJUZXh0LmlubmVySFRNTCA9IFwiJmRhZ2dlcjtcIjtcclxuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuICB9XHJcbiAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xyXG5cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjd19DYXI7XHJcbiIsIlxyXG52YXIgY3dfZHJhd1ZpcnR1YWxQb2x5ID0gcmVxdWlyZShcIi4vZHJhdy12aXJ0dWFsLXBvbHlcIik7XHJcbnZhciBjd19kcmF3Q2lyY2xlID0gcmVxdWlyZShcIi4vZHJhdy1jaXJjbGVcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcl9jb25zdGFudHMsIG15Q2FyLCBjYW1lcmEsIGN0eCl7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcblxyXG4gIHZhciB3aGVlbE1pbkRlbnNpdHkgPSBjYXJfY29uc3RhbnRzLndoZWVsTWluRGVuc2l0eVxyXG4gIHZhciB3aGVlbERlbnNpdHlSYW5nZSA9IGNhcl9jb25zdGFudHMud2hlZWxEZW5zaXR5UmFuZ2VcclxuXHJcbiAgaWYgKCFteUNhci5hbGl2ZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgbXlDYXJQb3MgPSBteUNhci5nZXRQb3NpdGlvbigpO1xyXG5cclxuICBpZiAobXlDYXJQb3MueCA8IChjYW1lcmFfeCAtIDUpKSB7XHJcbiAgICAvLyB0b28gZmFyIGJlaGluZCwgZG9uJ3QgZHJhd1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNDQ0XCI7XHJcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xyXG5cclxuICB2YXIgd2hlZWxzID0gbXlDYXIuY2FyLmNhci53aGVlbHM7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgd2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgYiA9IHdoZWVsc1tpXTtcclxuICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgICAgdmFyIGNvbG9yID0gTWF0aC5yb3VuZCgyNTUgLSAoMjU1ICogKGYubV9kZW5zaXR5IC0gd2hlZWxNaW5EZW5zaXR5KSkgLyB3aGVlbERlbnNpdHlSYW5nZSkudG9TdHJpbmcoKTtcclxuICAgICAgdmFyIHJnYmNvbG9yID0gXCJyZ2IoXCIgKyBjb2xvciArIFwiLFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIpXCI7XHJcbiAgICAgIGN3X2RyYXdDaXJjbGUoY3R4LCBiLCBzLm1fcCwgcy5tX3JhZGl1cywgYi5tX3N3ZWVwLmEsIHJnYmNvbG9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChteUNhci5pc19lbGl0ZSkge1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjREJFMkVGXCI7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiI0Y3Qzg3M1wiO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0ZBRUJDRFwiO1xyXG4gIH1cclxuICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gIHZhciBjaGFzc2lzID0gbXlDYXIuY2FyLmNhci5jaGFzc2lzO1xyXG5cclxuICBmb3IgKGYgPSBjaGFzc2lzLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIGNzID0gZi5HZXRTaGFwZSgpO1xyXG4gICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgY2hhc3NpcywgY3MubV92ZXJ0aWNlcywgY3MubV92ZXJ0ZXhDb3VudCk7XHJcbiAgfVxyXG4gIGN0eC5maWxsKCk7XHJcbiAgY3R4LnN0cm9rZSgpO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGN3X2RyYXdDaXJjbGU7XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3Q2lyY2xlKGN0eCwgYm9keSwgY2VudGVyLCByYWRpdXMsIGFuZ2xlLCBjb2xvcikge1xyXG4gIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KGNlbnRlcik7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG5cclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgY3R4LmFyYyhwLngsIHAueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcblxyXG4gIGN0eC5tb3ZlVG8ocC54LCBwLnkpO1xyXG4gIGN0eC5saW5lVG8ocC54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBwLnkgKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG5cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJ2YXIgY3dfZHJhd1ZpcnR1YWxQb2x5ID0gcmVxdWlyZShcIi4vZHJhdy12aXJ0dWFsLXBvbHlcIik7XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBjYW1lcmEsIGN3X2Zsb29yVGlsZXMpIHtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XHJcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcclxuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMwMDBcIjtcclxuICBjdHguZmlsbFN0eWxlID0gXCIjNzc3XCI7XHJcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xyXG4gIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgdmFyIGs7XHJcbiAgaWYoY2FtZXJhLnBvcy54IC0gMTAgPiAwKXtcclxuICAgIGsgPSBNYXRoLmZsb29yKChjYW1lcmEucG9zLnggLSAxMCkgLyAxLjUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBrID0gMDtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKGspO1xyXG5cclxuICBvdXRlcl9sb29wOlxyXG4gICAgZm9yIChrOyBrIDwgY3dfZmxvb3JUaWxlcy5sZW5ndGg7IGsrKykge1xyXG4gICAgICB2YXIgYiA9IGN3X2Zsb29yVGlsZXNba107XHJcbiAgICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG4gICAgICAgIHZhciBzaGFwZVBvc2l0aW9uID0gYi5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1swXSkueDtcclxuICAgICAgICBpZiAoKHNoYXBlUG9zaXRpb24gPiAoY2FtZXJhX3ggLSA1KSkgJiYgKHNoYXBlUG9zaXRpb24gPCAoY2FtZXJhX3ggKyAxMCkpKSB7XHJcbiAgICAgICAgICBjd19kcmF3VmlydHVhbFBvbHkoY3R4LCBiLCBzLm1fdmVydGljZXMsIHMubV92ZXJ0ZXhDb3VudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzaGFwZVBvc2l0aW9uID4gY2FtZXJhX3ggKyAxMCkge1xyXG4gICAgICAgICAgYnJlYWsgb3V0ZXJfbG9vcDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBib2R5LCB2dHgsIG5fdnR4KSB7XHJcbiAgLy8gc2V0IHN0cm9rZXN0eWxlIGFuZCBmaWxsc3R5bGUgYmVmb3JlIGNhbGxcclxuICAvLyBjYWxsIGJlZ2luUGF0aCBiZWZvcmUgY2FsbFxyXG5cclxuICB2YXIgcDAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4WzBdKTtcclxuICBjdHgubW92ZVRvKHAwLngsIHAwLnkpO1xyXG4gIGZvciAodmFyIGkgPSAxOyBpIDwgbl92dHg7IGkrKykge1xyXG4gICAgdmFyIHAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4W2ldKTtcclxuICAgIGN0eC5saW5lVG8ocC54LCBwLnkpO1xyXG4gIH1cclxuICBjdHgubGluZVRvKHAwLngsIHAwLnkpO1xyXG59XHJcbiIsInZhciBzY2F0dGVyUGxvdCA9IHJlcXVpcmUoXCIuL3NjYXR0ZXItcGxvdFwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHBsb3RHcmFwaHM6IGZ1bmN0aW9uKGdyYXBoRWxlbSwgdG9wU2NvcmVzRWxlbSwgc2NhdHRlclBsb3RFbGVtLCBsYXN0U3RhdGUsIHNjb3JlcywgY29uZmlnKSB7XHJcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XHJcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBzY29yZXMubGVuZ3RoXHJcbiAgICB2YXIgZ3JhcGhjYW52YXMgPSBncmFwaEVsZW07XHJcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcclxuICAgIHZhciBncmFwaGhlaWdodCA9IDI1MDtcclxuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxyXG4gICAgICBsYXN0U3RhdGUsIHNjb3JlcywgZ2VuZXJhdGlvblNpemVcclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XHJcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xyXG4gICAgY3dfcGxvdEF2ZXJhZ2UobmV4dFN0YXRlLCBncmFwaGN0eCk7XHJcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XHJcbiAgICBjd19wbG90VG9wKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfbGlzdFRvcFNjb3Jlcyh0b3BTY29yZXNFbGVtLCBuZXh0U3RhdGUpO1xyXG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxyXG4gICAgICBzY2F0dGVyUGxvdEVsZW0sIGNvbmZpZywgbmV4dFN0YXRlLCBsYXN0U3RhdGUuc2NhdHRlckdyYXBoXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9LFxyXG4gIGNsZWFyR3JhcGhpY3M6IGZ1bmN0aW9uKGdyYXBoRWxlbSkge1xyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIGNvbnNvbGUubG9nKGN3X2NhclNjb3Jlcyk7XHJcbiAgcmV0dXJuIHtcclxuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXHJcbiAgICAuY29uY2F0KFtjd19jYXJTY29yZXNbMF0uc2NvcmVdKSxcclxuICAgIGN3X2dyYXBoQXZlcmFnZTogKGxhc3RTdGF0ZS5jd19ncmFwaEF2ZXJhZ2UgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhFbGl0ZTogKGxhc3RTdGF0ZS5jd19ncmFwaEVsaXRlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhUb3A6IChsYXN0U3RhdGUuY3dfZ3JhcGhUb3AgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XHJcbiAgICBdKSxcclxuICAgIGFsbFJlc3VsdHM6IChsYXN0U3RhdGUuYWxsUmVzdWx0cyB8fCBbXSkuY29uY2F0KGN3X2NhclNjb3JlcyksXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaFRvcCA9IHN0YXRlLmN3X2dyYXBoVG9wO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaFRvcC5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoVG9wW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhFbGl0ZSA9IHN0YXRlLmN3X2dyYXBoRWxpdGU7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoRWxpdGUubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEVsaXRlW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaEF2ZXJhZ2UgPSBzdGF0ZS5jd19ncmFwaEF2ZXJhZ2U7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoQXZlcmFnZS5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoQXZlcmFnZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfZWxpdGVhdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICB2YXIgc3VtID0gMDtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XHJcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnNjb3JlLnY7XHJcbiAgfVxyXG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIHZhciBzdW0gPSAwO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xyXG4gIH1cclxuICByZXR1cm4gc3VtIC8gZ2VuZXJhdGlvblNpemU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCkge1xyXG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XHJcbiAgZ3JhcGhjdHgudHJhbnNsYXRlKDAsIGdyYXBoaGVpZ2h0KTtcclxuICBncmFwaGN0eC5zY2FsZSgxLCAtMSk7XHJcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xyXG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDIpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDQpO1xyXG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcclxuICB2YXIgY3dfdG9wU2NvcmVzID0gc3RhdGUuY3dfdG9wU2NvcmVzO1xyXG4gIHZhciB0cyA9IGVsZW07XHJcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcclxuICBjd190b3BTY29yZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgaWYgKGEudiA+IGIudikge1xyXG4gICAgICByZXR1cm4gLTFcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAxXHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcclxuICAgIHZhciB0b3BTY29yZSA9IGN3X3RvcFNjb3Jlc1trXTtcclxuICAgIC8vIGNvbnNvbGUubG9nKHRvcFNjb3JlKTtcclxuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XHJcbiAgICB2YXIgc2NvcmUgPSBNYXRoLnJvdW5kKHRvcFNjb3JlLnYgKiAxMDApIC8gMTAwO1xyXG4gICAgdmFyIGRpc3RhbmNlID0gXCJkOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS54ICogMTAwKSAvIDEwMDtcclxuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcclxuICAgIHZhciBnZW4gPSBcIihHZW4gXCIgKyBjd190b3BTY29yZXNba10uaSArIFwiKVwiXHJcblxyXG4gICAgdHMuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0FsbFJlc3VsdHMoc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIGFsbFJlc3VsdHMsIHByZXZpb3VzR3JhcGgpe1xyXG4gIGlmKCFzY2F0dGVyUGxvdEVsZW0pIHJldHVybjtcclxuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXHJcbn1cclxuIiwiLyogZ2xvYmFscyB2aXMgSGlnaGNoYXJ0cyAqL1xyXG5cclxuLy8gQ2FsbGVkIHdoZW4gdGhlIFZpc3VhbGl6YXRpb24gQVBJIGlzIGxvYWRlZC5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcclxuZnVuY3Rpb24gaGlnaENoYXJ0cyhlbGVtLCBzY29yZXMpe1xyXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc2NvcmVzWzBdLmRlZik7XHJcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xyXG4gICAgdmFyIGwgPSBzY29yZXNbMF0uZGVmW2tleV0ubGVuZ3RoO1xyXG4gICAgdmFyIHN1YkFycmF5ID0gW107XHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcclxuICAgICAgc3ViQXJyYXkucHVzaChrZXkgKyBcIi5cIiArIGkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XHJcbiAgfSwgW10pO1xyXG4gIGZ1bmN0aW9uIHJldHJpZXZlVmFsdWUob2JqLCBwYXRoKXtcclxuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XHJcbiAgICAgIHJldHVybiBjdXJWYWx1ZVtrZXldO1xyXG4gICAgfSwgb2JqKTtcclxuICB9XHJcblxyXG4gIHZhciBkYXRhT2JqID0gT2JqZWN0LmtleXMoc2NvcmVzKS5yZWR1Y2UoZnVuY3Rpb24oa3YsIHNjb3JlKXtcclxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xyXG4gICAgICBrdltrZXldLmRhdGEucHVzaChbXHJcbiAgICAgICAgcmV0cmlldmVWYWx1ZShzY29yZS5kZWYsIGtleSksIHNjb3JlLnNjb3JlLnZcclxuICAgICAgXSlcclxuICAgIH0pXHJcbiAgICByZXR1cm4ga3Y7XHJcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XHJcbiAgICBrdltrZXldID0ge1xyXG4gICAgICBuYW1lOiBrZXksXHJcbiAgICAgIGRhdGE6IFtdLFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGt2O1xyXG4gIH0sIHt9KSlcclxuICBIaWdoY2hhcnRzLmNoYXJ0KGVsZW0uaWQsIHtcclxuICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcclxuICAgICAgICAgIHpvb21UeXBlOiAneHknXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgICB0ZXh0OiAnUHJvcGVydHkgVmFsdWUgdG8gU2NvcmUnXHJcbiAgICAgIH0sXHJcbiAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICB0aXRsZToge1xyXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgc3RhcnRPblRpY2s6IHRydWUsXHJcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXHJcbiAgICAgICAgICBzaG93TGFzdExhYmVsOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHlBeGlzOiB7XHJcbiAgICAgICAgICB0aXRsZToge1xyXG4gICAgICAgICAgICAgIHRleHQ6ICdTY29yZSdcclxuICAgICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgbGVnZW5kOiB7XHJcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXHJcbiAgICAgICAgICBhbGlnbjogJ2xlZnQnLFxyXG4gICAgICAgICAgdmVydGljYWxBbGlnbjogJ3RvcCcsXHJcbiAgICAgICAgICB4OiAxMDAsXHJcbiAgICAgICAgICB5OiA3MCxcclxuICAgICAgICAgIGZsb2F0aW5nOiB0cnVlLFxyXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxyXG4gICAgICAgICAgYm9yZGVyV2lkdGg6IDFcclxuICAgICAgfSxcclxuICAgICAgcGxvdE9wdGlvbnM6IHtcclxuICAgICAgICAgIHNjYXR0ZXI6IHtcclxuICAgICAgICAgICAgICBtYXJrZXI6IHtcclxuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxyXG4gICAgICAgICAgICAgICAgICBzdGF0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lQ29sb3I6ICdyZ2IoMTAwLDEwMCwxMDApJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBzdGF0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG1hcmtlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcclxuICAgICAgICAgICAgICAgICAgaGVhZGVyRm9ybWF0OiAnPGI+e3Nlcmllcy5uYW1lfTwvYj48YnI+JyxcclxuICAgICAgICAgICAgICAgICAgcG9pbnRGb3JtYXQ6ICd7cG9pbnQueH0sIHtwb2ludC55fSdcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcclxuICAgICAgICByZXR1cm4gZGF0YU9ialtrZXldO1xyXG4gICAgICB9KVxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xyXG5cclxuICAvLyBDcmVhdGUgYW5kIHBvcHVsYXRlIGEgZGF0YSB0YWJsZS5cclxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xyXG4gIHNjb3Jlcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3JlSW5mbyl7XHJcbiAgICBkYXRhLmFkZCh7XHJcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXHJcbiAgICAgIHk6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXHJcbiAgICAgIHo6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueiksXHJcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICAvLyBleHRyYTogZGVmLmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gZ2V0UHJvcGVydHkoaW5mbywga2V5KXtcclxuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcclxuICAgICAgcmV0dXJuIGluZm8uc2NvcmUudlxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBzcGVjaWZ5IG9wdGlvbnNcclxuICB2YXIgb3B0aW9ucyA9IHtcclxuICAgIHdpZHRoOiAgJzYwMHB4JyxcclxuICAgIGhlaWdodDogJzYwMHB4JyxcclxuICAgIHN0eWxlOiAnZG90LXNpemUnLFxyXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxyXG4gICAgc2hvd0xlZ2VuZDogdHJ1ZSxcclxuICAgIHNob3dHcmlkOiB0cnVlLFxyXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXHJcblxyXG4gICAgLy8gT3B0aW9uIHRvb2x0aXAgY2FuIGJlIHRydWUsIGZhbHNlLCBvciBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHN0cmluZyB3aXRoIEhUTUwgY29udGVudHNcclxuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAvLyBwYXJhbWV0ZXIgcG9pbnQgY29udGFpbnMgcHJvcGVydGllcyB4LCB5LCB6LCBhbmQgZGF0YVxyXG4gICAgICAvLyBkYXRhIGlzIHRoZSBvcmlnaW5hbCBvYmplY3QgcGFzc2VkIHRvIHRoZSBwb2ludCBjb25zdHJ1Y3RvclxyXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cclxuICAgIHRvb2x0aXBTdHlsZToge1xyXG4gICAgICBjb250ZW50OiB7XHJcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxyXG4gICAgICAgIHBhZGRpbmcgICAgICAgOiAnMTBweCcsXHJcbiAgICAgICAgYm9yZGVyUmFkaXVzICA6ICcxMHB4J1xyXG4gICAgICB9LFxyXG4gICAgICBsaW5lOiB7XHJcbiAgICAgICAgYm9yZGVyTGVmdCAgICA6ICcxcHggZG90dGVkIHJnYmEoMCwgMCwgMCwgMC41KSdcclxuICAgICAgfSxcclxuICAgICAgZG90OiB7XHJcbiAgICAgICAgYm9yZGVyICAgICAgICA6ICc1cHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcclxuICAgIHZlcnRpY2FsUmF0aW86IDAuNVxyXG4gIH07XHJcblxyXG4gIHZhciBjYW1lcmEgPSBncmFwaCA/IGdyYXBoLmdldENhbWVyYVBvc2l0aW9uKCkgOiBudWxsO1xyXG5cclxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXHJcbiAgdmFyIGNvbnRhaW5lciA9IGVsZW07XHJcbiAgZ3JhcGggPSBuZXcgdmlzLkdyYXBoM2QoY29udGFpbmVyLCBkYXRhLCBvcHRpb25zKTtcclxuXHJcbiAgaWYgKGNhbWVyYSkgZ3JhcGguc2V0Q2FtZXJhUG9zaXRpb24oY2FtZXJhKTsgLy8gcmVzdG9yZSBjYW1lcmEgcG9zaXRpb25cclxuICByZXR1cm4gZ3JhcGg7XHJcbn1cclxuIiwiXHJcbm1vZHVsZS5leHBvcnRzID0gZ2VuZXJhdGVSYW5kb207XHJcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XHJcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XHJcbn1cclxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXHJcbm1vZHVsZS5leHBvcnRzID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50O1xyXG5cclxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcclxuICB2YXIgbmFtZUluZGV4ID0gbmV3IE1hcCgpO1xyXG4gIHZhciBmbGFnZ2VkID0gbmV3IFNldCgpO1xyXG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcclxuICBjcmVhdGVBbmNlc3RyeU1hcChjaGlsZCwgW10pO1xyXG5cclxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xyXG5cclxuICByZXR1cm4gQXJyYXkuZnJvbShjb252ZXJnZW5jZVBvaW50cy52YWx1ZXMoKSkucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcG9pbnQpe1xyXG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcclxuICAgIHJldHVybiBzdW0gKyBpQ287XHJcbiAgfSwgMCk7XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUFuY2VzdHJ5TWFwKGluaXROb2RlKXtcclxuICAgIHZhciBpdGVtc0luUXVldWUgPSBbeyBub2RlOiBpbml0Tm9kZSwgcGF0aDogW10gfV07XHJcbiAgICBkb3tcclxuICAgICAgdmFyIGl0ZW0gPSBpdGVtc0luUXVldWUuc2hpZnQoKTtcclxuICAgICAgdmFyIG5vZGUgPSBpdGVtLm5vZGU7XHJcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xyXG4gICAgICBpZihwcm9jZXNzSXRlbShub2RlLCBwYXRoKSl7XHJcbiAgICAgICAgdmFyIG5leHRQYXRoID0gWyBub2RlLmlkIF0uY29uY2F0KHBhdGgpO1xyXG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG5vZGU6IHBhcmVudCxcclxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfSkpO1xyXG4gICAgICB9XHJcbiAgICB9d2hpbGUoaXRlbXNJblF1ZXVlLmxlbmd0aCk7XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIHByb2Nlc3NJdGVtKG5vZGUsIHBhdGgpe1xyXG4gICAgICB2YXIgbmV3QW5jZXN0b3IgPSAhbmFtZUluZGV4Lmhhcyhub2RlLmlkKTtcclxuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xyXG4gICAgICAgIG5hbWVJbmRleC5zZXQobm9kZS5pZCwge1xyXG4gICAgICAgICAgcGFyZW50czogKG5vZGUuYW5jZXN0cnkgfHwgW10pLm1hcChmdW5jdGlvbihwYXJlbnQpe1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBpZDogbm9kZS5pZCxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgIGNvbnZlcmdlbmNlczogW10sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgIGZsYWdnZWQuYWRkKG5vZGUuaWQpXHJcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XHJcbiAgICAgICAgICB2YXIgb2Zmc2V0cyA9IGZpbmRDb252ZXJnZW5jZShjaGlsZElkZW50aWZpZXIucGF0aCwgcGF0aCk7XHJcbiAgICAgICAgICBpZighb2Zmc2V0cyl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBjaGlsZElEID0gcGF0aFtvZmZzZXRzWzFdXTtcclxuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcclxuICAgICAgICAgIG5hbWVJbmRleC5nZXQoY2hpbGRJRCkuY29udmVyZ2VuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICBwYXJlbnQ6IG5vZGUuaWQsXHJcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocGF0aC5sZW5ndGgpe1xyXG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XHJcbiAgICAgICAgICBjaGlsZDogcGF0aFswXSxcclxuICAgICAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldENvZWZmaWNpZW50KGlkKXtcclxuICAgIGlmKHN0b3JlZENvZWZmaWNpZW50cy5oYXMoaWQpKXtcclxuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xyXG4gICAgfVxyXG4gICAgdmFyIG5vZGUgPSBuYW1lSW5kZXguZ2V0KGlkKTtcclxuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XHJcbiAgICAgIHJldHVybiBzdW0gKyBNYXRoLnBvdygxIC8gMiwgcG9pbnQub2Zmc2V0cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCB2YWx1ZSl7XHJcbiAgICAgICAgcmV0dXJuIHN1bSArIHZhbHVlO1xyXG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xyXG4gICAgfSwgMCk7XHJcbiAgICBzdG9yZWRDb2VmZmljaWVudHMuc2V0KGlkLCB2YWwpO1xyXG5cclxuICAgIHJldHVybiB2YWw7XHJcblxyXG4gIH1cclxuICBmdW5jdGlvbiBmaW5kQ29udmVyZ2VuY2UobGlzdEEsIGxpc3RCKXtcclxuICAgIHZhciBjaSwgY2osIGxpLCBsajtcclxuICAgIG91dGVybG9vcDpcclxuICAgIGZvcihjaSA9IDAsIGxpID0gbGlzdEEubGVuZ3RoOyBjaSA8IGxpOyBjaSsrKXtcclxuICAgICAgZm9yKGNqID0gMCwgbGogPSBsaXN0Qi5sZW5ndGg7IGNqIDwgbGo7IGNqKyspe1xyXG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcclxuICAgICAgICAgIGJyZWFrIG91dGVybG9vcDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmKGNpID09PSBsaSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiBbY2ksIGNqXTtcclxuICB9XHJcbn1cclxuIiwidmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2NvbnN0cnVjdC5qc1wiKTtcclxuXHJcbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XHJcblxyXG52YXIgc2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGNhckNvbnN0YW50cyk7XHJcbnZhciBwaWNrUGFyZW50ID0gcmVxdWlyZShcIi4vcGlja1BhcmVudFwiKTtcclxudmFyIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gcmVxdWlyZShcIi4vc2VsZWN0RnJvbUFsbFBhcmVudHNcIik7XHJcbmNvbnN0IGNvbnN0YW50cyA9IHtcclxuICBnZW5lcmF0aW9uU2l6ZTogMjAsXHJcbiAgc2NoZW1hOiBzY2hlbWEsXHJcbiAgY2hhbXBpb25MZW5ndGg6IDEsXHJcbiAgbXV0YXRpb25fcmFuZ2U6IDEsXHJcbiAgZ2VuX211dGF0aW9uOiAwLjA1LFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIGN1cnJlbnRDaG9pY2VzID0gbmV3IE1hcCgpO1xyXG4gIHJldHVybiBPYmplY3QuYXNzaWduKFxyXG4gICAge30sXHJcbiAgICBjb25zdGFudHMsXHJcbiAgICB7XHJcbiAgICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzOiBzZWxlY3RGcm9tQWxsUGFyZW50cyxcclxuICAgICAgZ2VuZXJhdGVSYW5kb206IHJlcXVpcmUoXCIuL2dlbmVyYXRlUmFuZG9tXCIpLFxyXG4gICAgICBwaWNrUGFyZW50OiBwaWNrUGFyZW50LmJpbmQodm9pZCAwLCBjdXJyZW50Q2hvaWNlcyksXHJcbiAgICB9XHJcbiAgKTtcclxufVxyXG5tb2R1bGUuZXhwb3J0cy5jb25zdGFudHMgPSBjb25zdGFudHNcclxuIiwidmFyIG5BdHRyaWJ1dGVzID0gMTU7XHJcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcclxuXHJcbmZ1bmN0aW9uIHBpY2tQYXJlbnQoY3VycmVudENob2ljZXMsIGNob29zZUlkLCBrZXkgLyogLCBwYXJlbnRzICovKXtcclxuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XHJcbiAgICBjdXJyZW50Q2hvaWNlcy5zZXQoY2hvb3NlSWQsIGluaXRpYWxpemVQaWNrKCkpXHJcbiAgfVxyXG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcclxuICB2YXIgc3RhdGUgPSBjdXJyZW50Q2hvaWNlcy5nZXQoY2hvb3NlSWQpO1xyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlLmN1cnBhcmVudCk7XHJcbiAgc3RhdGUuaSsrXHJcbiAgaWYoW1wid2hlZWxfcmFkaXVzXCIsIFwid2hlZWxfdmVydGV4XCIsIFwid2hlZWxfZGVuc2l0eVwiXS5pbmRleE9mKGtleSkgPiAtMSl7XHJcbiAgICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xyXG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcclxuICB9XHJcbiAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcclxuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xyXG5cclxuICBmdW5jdGlvbiBjd19jaG9vc2VQYXJlbnQoc3RhdGUpIHtcclxuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XHJcbiAgICB2YXIgYXR0cmlidXRlSW5kZXggPSBzdGF0ZS5pO1xyXG4gICAgdmFyIHN3YXBQb2ludDEgPSBzdGF0ZS5zd2FwUG9pbnQxXHJcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcclxuICAgIC8vIGNvbnNvbGUubG9nKHN3YXBQb2ludDEsIHN3YXBQb2ludDIsIGF0dHJpYnV0ZUluZGV4KVxyXG4gICAgaWYgKChzd2FwUG9pbnQxID09IGF0dHJpYnV0ZUluZGV4KSB8fCAoc3dhcFBvaW50MiA9PSBhdHRyaWJ1dGVJbmRleCkpIHtcclxuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJwYXJlbnRcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVQaWNrKCl7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcclxuXHJcbiAgICB2YXIgc3dhcFBvaW50MSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xyXG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xyXG4gICAgd2hpbGUgKHN3YXBQb2ludDIgPT0gc3dhcFBvaW50MSkge1xyXG4gICAgICBzd2FwUG9pbnQyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XHJcbiAgICB9XHJcbiAgICB2YXIgaSA9IDA7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcclxuICAgICAgaTogaSxcclxuICAgICAgc3dhcFBvaW50MTogc3dhcFBvaW50MSxcclxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50ID0gcmVxdWlyZShcIi4vaW5icmVlZGluZy1jb2VmZmljaWVudFwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xyXG5cclxuZnVuY3Rpb24gc2ltcGxlU2VsZWN0KHBhcmVudHMpe1xyXG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxyXG4gIHZhciByID0gTWF0aC5yYW5kb20oKTtcclxuICBpZiAociA9PSAwKVxyXG4gICAgcmV0dXJuIDA7XHJcbiAgcmV0dXJuIE1hdGguZmxvb3IoLU1hdGgubG9nKHIpICogdG90YWxQYXJlbnRzKSAlIHRvdGFsUGFyZW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gc2VsZWN0RnJvbUFsbFBhcmVudHMocGFyZW50cywgcGFyZW50TGlzdCwgcHJldmlvdXNQYXJlbnRJbmRleCkge1xyXG4gIHZhciBwcmV2aW91c1BhcmVudCA9IHBhcmVudHNbcHJldmlvdXNQYXJlbnRJbmRleF07XHJcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XHJcbiAgICBpZihwcmV2aW91c1BhcmVudEluZGV4ID09PSBpKXtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaWYoIXByZXZpb3VzUGFyZW50KXtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGQgPSB7XHJcbiAgICAgIGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSxcclxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiBwLmRlZi5pZCxcclxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIHZhciBpQ28gPSBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpO1xyXG4gICAgY29uc29sZS5sb2coXCJpbmJyZWVkaW5nIGNvZWZmaWNpZW50XCIsIGlDbylcclxuICAgIGlmKGlDbyA+IDAuMjUpe1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KVxyXG4gIGlmKHZhbGlkUGFyZW50cy5sZW5ndGggPT09IDApe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxyXG4gIH1cclxuICB2YXIgdG90YWxTY29yZSA9IHZhbGlkUGFyZW50cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwYXJlbnQpe1xyXG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xyXG4gIH0sIDApO1xyXG4gIHZhciByID0gdG90YWxTY29yZSAqIE1hdGgucmFuZG9tKCk7XHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XHJcbiAgICB2YXIgc2NvcmUgPSB2YWxpZFBhcmVudHNbaV0uc2NvcmUudjtcclxuICAgIGlmKHIgPiBzY29yZSl7XHJcbiAgICAgIHIgPSByIC0gc2NvcmU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGk7XHJcbn1cclxuIiwiXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY2FyKSB7XHJcbiAgdmFyIG91dCA9IHtcclxuICAgIGNoYXNzaXM6IGdob3N0X2dldF9jaGFzc2lzKGNhci5jaGFzc2lzKSxcclxuICAgIHdoZWVsczogW10sXHJcbiAgICBwb3M6IHt4OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLngsIHk6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueX1cclxuICB9O1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcclxuICAgIG91dC53aGVlbHNbaV0gPSBnaG9zdF9nZXRfd2hlZWwoY2FyLndoZWVsc1tpXSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3V0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9nZXRfY2hhc3NpcyhjKSB7XHJcbiAgdmFyIGdjID0gW107XHJcblxyXG4gIGZvciAodmFyIGYgPSBjLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcblxyXG4gICAgdmFyIHAgPSB7XHJcbiAgICAgIHZ0eDogW10sXHJcbiAgICAgIG51bTogMFxyXG4gICAgfVxyXG5cclxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcy5tX3ZlcnRleENvdW50OyBpKyspIHtcclxuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2MucHVzaChwKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBnYztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcclxuICB2YXIgZ3cgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XHJcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuXHJcbiAgICB2YXIgYyA9IHtcclxuICAgICAgcG9zOiB3LkdldFdvcmxkUG9pbnQocy5tX3ApLFxyXG4gICAgICByYWQ6IHMubV9yYWRpdXMsXHJcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmFcclxuICAgIH1cclxuXHJcbiAgICBndy5wdXNoKGMpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGd3O1xyXG59XHJcbiIsIlxyXG52YXIgZ2hvc3RfZ2V0X2ZyYW1lID0gcmVxdWlyZShcIi4vY2FyLXRvLWdob3N0LmpzXCIpO1xyXG5cclxudmFyIGVuYWJsZV9naG9zdCA9IHRydWU7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnaG9zdF9jcmVhdGVfcmVwbGF5OiBnaG9zdF9jcmVhdGVfcmVwbGF5LFxyXG4gIGdob3N0X2NyZWF0ZV9naG9zdDogZ2hvc3RfY3JlYXRlX2dob3N0LFxyXG4gIGdob3N0X3BhdXNlOiBnaG9zdF9wYXVzZSxcclxuICBnaG9zdF9yZXN1bWU6IGdob3N0X3Jlc3VtZSxcclxuICBnaG9zdF9nZXRfcG9zaXRpb246IGdob3N0X2dldF9wb3NpdGlvbixcclxuICBnaG9zdF9jb21wYXJlX3RvX3JlcGxheTogZ2hvc3RfY29tcGFyZV90b19yZXBsYXksXHJcbiAgZ2hvc3RfbW92ZV9mcmFtZTogZ2hvc3RfbW92ZV9mcmFtZSxcclxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lOiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lLFxyXG4gIGdob3N0X2RyYXdfZnJhbWU6IGdob3N0X2RyYXdfZnJhbWUsXHJcbiAgZ2hvc3RfcmVzZXRfZ2hvc3Q6IGdob3N0X3Jlc2V0X2dob3N0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NyZWF0ZV9yZXBsYXkoKSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIG51bV9mcmFtZXM6IDAsXHJcbiAgICBmcmFtZXM6IFtdLFxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZXBsYXk6IG51bGwsXHJcbiAgICBmcmFtZTogMCxcclxuICAgIGRpc3Q6IC0xMDBcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgZ2hvc3QuZnJhbWUgPSAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9wYXVzZShnaG9zdCkge1xyXG4gIGlmIChnaG9zdCAhPSBudWxsKVxyXG4gICAgZ2hvc3Qub2xkX2ZyYW1lID0gZ2hvc3QuZnJhbWU7XHJcbiAgZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9yZXN1bWUoZ2hvc3QpIHtcclxuICBpZiAoZ2hvc3QgIT0gbnVsbClcclxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcclxuICByZXR1cm4gZnJhbWUucG9zO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9jb21wYXJlX3RvX3JlcGxheShyZXBsYXksIGdob3N0LCBtYXgpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAocmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIGlmIChnaG9zdC5kaXN0IDwgbWF4KSB7XHJcbiAgICBnaG9zdC5yZXBsYXkgPSByZXBsYXk7XHJcbiAgICBnaG9zdC5kaXN0ID0gbWF4O1xyXG4gICAgZ2hvc3QuZnJhbWUgPSAwO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBnaG9zdC5mcmFtZSsrO1xyXG4gIGlmIChnaG9zdC5mcmFtZSA+PSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcylcclxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3QucmVwbGF5Lm51bV9mcmFtZXMgLSAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKHJlcGxheSwgY2FyKSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKHJlcGxheSA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgZnJhbWUgPSBnaG9zdF9nZXRfZnJhbWUoY2FyKTtcclxuICByZXBsYXkuZnJhbWVzLnB1c2goZnJhbWUpO1xyXG4gIHJlcGxheS5udW1fZnJhbWVzKys7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XHJcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIGZyYW1lID0gZ2hvc3QucmVwbGF5LmZyYW1lc1tnaG9zdC5mcmFtZV07XHJcblxyXG4gIC8vIHdoZWVsIHN0eWxlXHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2VlZVwiO1xyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcmFtZS53aGVlbHMubGVuZ3RoOyBpKyspIHtcclxuICAgIGZvciAodmFyIHcgaW4gZnJhbWUud2hlZWxzW2ldKSB7XHJcbiAgICAgIGdob3N0X2RyYXdfY2lyY2xlKGN0eCwgZnJhbWUud2hlZWxzW2ldW3ddLnBvcywgZnJhbWUud2hlZWxzW2ldW3ddLnJhZCwgZnJhbWUud2hlZWxzW2ldW3ddLmFuZyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjaGFzc2lzIHN0eWxlXHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjYWFhXCI7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2VlZVwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgZm9yICh2YXIgYyBpbiBmcmFtZS5jaGFzc2lzKVxyXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZHJhd19wb2x5KGN0eCwgdnR4LCBuX3Z0eCkge1xyXG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIGN0eC5saW5lVG8odnR4W2ldLngsIHZ0eFtpXS55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyh2dHhbMF0ueCwgdnR4WzBdLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGNlbnRlciwgcmFkaXVzLCBhbmdsZSkge1xyXG4gIGN0eC5iZWdpblBhdGgoKTtcclxuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcblxyXG4gIGN0eC5tb3ZlVG8oY2VudGVyLngsIGNlbnRlci55KTtcclxuICBjdHgubGluZVRvKGNlbnRlci54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XHJcblxyXG4gIGN0eC5maWxsKCk7XHJcbiAgY3R4LnN0cm9rZSgpO1xyXG59XHJcbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgcGVyZm9ybWFuY2UgbG9jYWxTdG9yYWdlIGFsZXJ0IGNvbmZpcm0gYnRvYSBIVE1MRGl2RWxlbWVudCAqL1xyXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xyXG4vLyBHbG9iYWwgVmFyc1xyXG5cclxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xyXG52YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XHJcblxyXG52YXIgbWFuYWdlUm91bmQgPSByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKTtcclxuXHJcbnZhciBnaG9zdF9mbnMgPSByZXF1aXJlKFwiLi9naG9zdC9pbmRleC5qc1wiKTtcclxuXHJcbnZhciBkcmF3Q2FyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWNhci5qc1wiKTtcclxudmFyIGdyYXBoX2ZucyA9IHJlcXVpcmUoXCIuL2RyYXcvcGxvdC1ncmFwaHMuanNcIik7XHJcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xyXG52YXIgY3dfY2xlYXJHcmFwaGljcyA9IGdyYXBoX2Zucy5jbGVhckdyYXBoaWNzO1xyXG52YXIgY3dfZHJhd0Zsb29yID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWZsb29yLmpzXCIpO1xyXG5cclxudmFyIGdob3N0X2RyYXdfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfZHJhd19mcmFtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfZ2hvc3Q7XHJcbnZhciBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2FkZF9yZXBsYXlfZnJhbWU7XHJcbnZhciBnaG9zdF9jb21wYXJlX3RvX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jb21wYXJlX3RvX3JlcGxheTtcclxudmFyIGdob3N0X2dldF9wb3NpdGlvbiA9IGdob3N0X2Zucy5naG9zdF9nZXRfcG9zaXRpb247XHJcbnZhciBnaG9zdF9tb3ZlX2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X21vdmVfZnJhbWU7XHJcbnZhciBnaG9zdF9yZXNldF9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9yZXNldF9naG9zdFxyXG52YXIgZ2hvc3RfcGF1c2UgPSBnaG9zdF9mbnMuZ2hvc3RfcGF1c2U7XHJcbnZhciBnaG9zdF9yZXN1bWUgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzdW1lO1xyXG52YXIgZ2hvc3RfY3JlYXRlX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfcmVwbGF5O1xyXG5cclxudmFyIGN3X0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXItc3RhdHMuanNcIik7XHJcbnZhciBnaG9zdDtcclxudmFyIGNhck1hcCA9IG5ldyBNYXAoKTtcclxuXHJcbnZhciBkb0RyYXcgPSB0cnVlO1xyXG52YXIgY3dfcGF1c2VkID0gZmFsc2U7XHJcblxyXG52YXIgYm94MmRmcHMgPSA2MDtcclxudmFyIHNjcmVlbmZwcyA9IDYwO1xyXG52YXIgc2tpcFRpY2tzID0gTWF0aC5yb3VuZCgxMDAwIC8gYm94MmRmcHMpO1xyXG52YXIgbWF4RnJhbWVTa2lwID0gc2tpcFRpY2tzICogMjtcclxuXHJcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5ib3hcIik7XHJcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxudmFyIGNhbWVyYSA9IHtcclxuICBzcGVlZDogMC4wNSxcclxuICBwb3M6IHtcclxuICAgIHg6IDAsIHk6IDBcclxuICB9LFxyXG4gIHRhcmdldDogLTEsXHJcbiAgem9vbTogNzBcclxufVxyXG5cclxudmFyIG1pbmltYXBjYW1lcmEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBjYW1lcmFcIikuc3R5bGU7XHJcbnZhciBtaW5pbWFwaG9sZGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtaW5pbWFwaG9sZGVyXCIpO1xyXG5cclxudmFyIG1pbmltYXBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBcIik7XHJcbnZhciBtaW5pbWFwY3R4ID0gbWluaW1hcGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbnZhciBtaW5pbWFwc2NhbGUgPSAzO1xyXG52YXIgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcclxudmFyIGZvZ2Rpc3RhbmNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwZm9nXCIpLnN0eWxlO1xyXG5cclxuXHJcbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XHJcblxyXG5cclxudmFyIG1heF9jYXJfaGVhbHRoID0gYm94MmRmcHMgKiAxMDtcclxuXHJcbnZhciBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcclxuXHJcbnZhciBkaXN0YW5jZU1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkaXN0YW5jZW1ldGVyXCIpO1xyXG52YXIgaGVpZ2h0TWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlaWdodG1ldGVyXCIpO1xyXG5cclxudmFyIGxlYWRlclBvc2l0aW9uID0ge1xyXG4gIHg6IDAsIHk6IDBcclxufVxyXG5cclxubWluaW1hcGNhbWVyYS53aWR0aCA9IDEyICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG5taW5pbWFwY2FtZXJhLmhlaWdodCA9IDYgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XHJcblxyXG5cclxuLy8gPT09PT09PSBXT1JMRCBTVEFURSA9PT09PT1cclxudmFyIGdlbmVyYXRpb25Db25maWcgPSByZXF1aXJlKFwiLi9nZW5lcmF0aW9uLWNvbmZpZ1wiKTtcclxuXHJcblxyXG52YXIgd29ybGRfZGVmID0ge1xyXG4gIGdyYXZpdHk6IG5ldyBiMlZlYzIoMC4wLCAtOS44MSksXHJcbiAgZG9TbGVlcDogdHJ1ZSxcclxuICBmbG9vcnNlZWQ6IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpLFxyXG4gIHRpbGVEaW1lbnNpb25zOiBuZXcgYjJWZWMyKDEuNSwgMC4xNSksXHJcbiAgbWF4Rmxvb3JUaWxlczogMjAwLFxyXG4gIG11dGFibGVfZmxvb3I6IGZhbHNlLFxyXG4gIGJveDJkZnBzOiBib3gyZGZwcyxcclxuICBtb3RvclNwZWVkOiAyMCxcclxuICBtYXhfY2FyX2hlYWx0aDogbWF4X2Nhcl9oZWFsdGgsXHJcbiAgc2NoZW1hOiBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5zY2hlbWFcclxufVxyXG5cclxudmFyIGN3X2RlYWRDYXJzO1xyXG52YXIgZ3JhcGhTdGF0ZSA9IHtcclxuICBjd190b3BTY29yZXM6IFtdLFxyXG4gIGN3X2dyYXBoQXZlcmFnZTogW10sXHJcbiAgY3dfZ3JhcGhFbGl0ZTogW10sXHJcbiAgY3dfZ3JhcGhUb3A6IFtdLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gcmVzZXRHcmFwaFN0YXRlKCl7XHJcbiAgZ3JhcGhTdGF0ZSA9IHtcclxuICAgIGN3X3RvcFNjb3JlczogW10sXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxyXG4gICAgY3dfZ3JhcGhFbGl0ZTogW10sXHJcbiAgICBjd19ncmFwaFRvcDogW10sXHJcbiAgfTtcclxufVxyXG5cclxuXHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxudmFyIGdlbmVyYXRpb25TdGF0ZTtcclxuXHJcbi8vID09PT09PT09IEFjdGl2aXR5IFN0YXRlID09PT1cclxudmFyIGN1cnJlbnRSdW5uZXI7XHJcbnZhciBsb29wcyA9IDA7XHJcbnZhciBuZXh0R2FtZVRpY2sgPSAobmV3IERhdGUpLmdldFRpbWUoKTtcclxuXHJcbmZ1bmN0aW9uIHNob3dEaXN0YW5jZShkaXN0YW5jZSwgaGVpZ2h0KSB7XHJcbiAgZGlzdGFuY2VNZXRlci5pbm5lckhUTUwgPSBkaXN0YW5jZSArIFwiIG1ldGVyczxiciAvPlwiO1xyXG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xyXG4gIGlmIChkaXN0YW5jZSA+IG1pbmltYXBmb2dkaXN0YW5jZSkge1xyXG4gICAgZm9nZGlzdGFuY2Uud2lkdGggPSA4MDAgLSBNYXRoLnJvdW5kKGRpc3RhbmNlICsgMTUpICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuXHJcbi8qID09PSBFTkQgQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PSBHZW5lcmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuZnVuY3Rpb24gY3dfZ2VuZXJhdGlvblplcm8oKSB7XHJcblxyXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2V0Q2FyVUkoKXtcclxuICBjd19kZWFkQ2FycyA9IDA7XHJcbiAgbGVhZGVyUG9zaXRpb24gPSB7XHJcbiAgICB4OiAwLCB5OiAwXHJcbiAgfTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbmVyYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIudG9TdHJpbmcoKTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemUudG9TdHJpbmcoKTtcclxufVxyXG5cclxuLyogPT09PSBFTkQgR2VucmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT0gRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdTY3JlZW4oKSB7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3dfc2V0Q2FtZXJhUG9zaXRpb24oKTtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XHJcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgY3R4LnRyYW5zbGF0ZSgyMDAgLSAoY2FtZXJhX3ggKiB6b29tKSwgMjAwICsgKGNhbWVyYV95ICogem9vbSkpO1xyXG4gIGN0eC5zY2FsZSh6b29tLCAtem9vbSk7XHJcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSk7XHJcbiAgY3dfZHJhd0NhcnMoKTtcclxuICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19taW5pbWFwQ2FtZXJhKC8qIHgsIHkqLykge1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueFxyXG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueVxyXG4gIG1pbmltYXBjYW1lcmEubGVmdCA9IE1hdGgucm91bmQoKDIgKyBjYW1lcmFfeCkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG4gIG1pbmltYXBjYW1lcmEudG9wID0gTWF0aC5yb3VuZCgoMzEgLSBjYW1lcmFfeSkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFUYXJnZXQoaykge1xyXG4gIGNhbWVyYS50YXJnZXQgPSBrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFQb3NpdGlvbigpIHtcclxuICB2YXIgY2FtZXJhVGFyZ2V0UG9zaXRpb25cclxuICBpZiAoY2FtZXJhLnRhcmdldCAhPT0gLTEpIHtcclxuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gY2FyTWFwLmdldChjYW1lcmEudGFyZ2V0KS5nZXRQb3NpdGlvbigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGxlYWRlclBvc2l0aW9uO1xyXG4gIH1cclxuICB2YXIgZGlmZl95ID0gY2FtZXJhLnBvcy55IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueTtcclxuICB2YXIgZGlmZl94ID0gY2FtZXJhLnBvcy54IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgLT0gY2FtZXJhLnNwZWVkICogZGlmZl95O1xyXG4gIGNhbWVyYS5wb3MueCAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3g7XHJcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdHaG9zdFJlcGxheSgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgY2FyUG9zaXRpb24gPSBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcclxuICBjd19taW5pbWFwQ2FtZXJhKGNhbWVyYS5wb3MueCwgY2FtZXJhLnBvcy55KTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3R4LnRyYW5zbGF0ZShcclxuICAgIDIwMCAtIChjYXJQb3NpdGlvbi54ICogY2FtZXJhLnpvb20pLFxyXG4gICAgMjAwICsgKGNhclBvc2l0aW9uLnkgKiBjYW1lcmEuem9vbSlcclxuICApO1xyXG4gIGN0eC5zY2FsZShjYW1lcmEuem9vbSwgLWNhbWVyYS56b29tKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QpO1xyXG4gIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xyXG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XHJcbiAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdDYXJzKCkge1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICBmb3IgKHZhciBrID0gKGN3X2NhckFycmF5Lmxlbmd0aCAtIDEpOyBrID49IDA7IGstLSkge1xyXG4gICAgdmFyIG15Q2FyID0gY3dfY2FyQXJyYXlba107XHJcbiAgICBkcmF3Q2FyKGNhckNvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlRGlzcGxheSgpIHtcclxuICBjYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XHJcbiAgaWYgKGRvRHJhdykge1xyXG4gICAgZG9EcmF3ID0gZmFsc2U7XHJcbiAgICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gICAgY3dfcnVubmluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpICsgKDEwMDAgLyBzY3JlZW5mcHMpO1xyXG4gICAgICB3aGlsZSAodGltZSA+IHBlcmZvcm1hbmNlLm5vdygpKSB7XHJcbiAgICAgICAgc2ltdWxhdGlvblN0ZXAoKTtcclxuICAgICAgfVxyXG4gICAgfSwgMSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRvRHJhdyA9IHRydWU7XHJcbiAgICBjbGVhckludGVydmFsKGN3X3J1bm5pbmdJbnRlcnZhbCk7XHJcbiAgICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdNaW5pTWFwKCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbmV3IGIyVmVjMigtNSwgMCk7XHJcbiAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcclxuICBmb2dkaXN0YW5jZS53aWR0aCA9IFwiODAwcHhcIjtcclxuICBtaW5pbWFwY2FudmFzLndpZHRoID0gbWluaW1hcGNhbnZhcy53aWR0aDtcclxuICBtaW5pbWFwY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgbWluaW1hcGN0eC5iZWdpblBhdGgoKTtcclxuICBtaW5pbWFwY3R4Lm1vdmVUbygwLCAzNSAqIG1pbmltYXBzY2FsZSk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBmbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XHJcbiAgICBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW2tdO1xyXG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gICAgdmFyIGxhc3Rfd29ybGRfY29vcmRzID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQobGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXSk7XHJcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF93b3JsZF9jb29yZHM7XHJcbiAgICBtaW5pbWFwY3R4LmxpbmVUbygodGlsZV9wb3NpdGlvbi54ICsgNSkgKiBtaW5pbWFwc2NhbGUsICgtdGlsZV9wb3NpdGlvbi55ICsgMzUpICogbWluaW1hcHNjYWxlKTtcclxuICB9XHJcbiAgbWluaW1hcGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuLyogPT09PSBFTkQgRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciB1aUxpc3RlbmVycyA9IHtcclxuICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe1xyXG4gICAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XHJcbiAgfSxcclxuICBjYXJTdGVwKGNhcil7XHJcbiAgICB1cGRhdGVDYXJVSShjYXIpO1xyXG4gIH0sXHJcbiAgY2FyRGVhdGgoY2FySW5mbyl7XHJcblxyXG4gICAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xyXG5cclxuICAgIHZhciBjYXIgPSBjYXJJbmZvLmNhciwgc2NvcmUgPSBjYXJJbmZvLnNjb3JlO1xyXG4gICAgY2FyTWFwLmdldChjYXJJbmZvKS5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XHJcblxyXG4gICAgLy8gcmVmb2N1cyBjYW1lcmEgdG8gbGVhZGVyIG9uIGRlYXRoXHJcbiAgICBpZiAoY2FtZXJhLnRhcmdldCA9PSBjYXJJbmZvKSB7XHJcbiAgICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICBjYXJNYXAuZGVsZXRlKGNhckluZm8pO1xyXG4gICAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkoY2FyLnJlcGxheSwgZ2hvc3QsIHNjb3JlLnYpO1xyXG4gICAgc2NvcmUuaSA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG5cclxuICAgIGN3X2RlYWRDYXJzKys7XHJcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSAoZ2VuZXJhdGlvblNpemUgLSBjd19kZWFkQ2FycykudG9TdHJpbmcoKTtcclxuXHJcbiAgICAvLyBjb25zb2xlLmxvZyhsZWFkZXJQb3NpdGlvbi5sZWFkZXIsIGspXHJcbiAgICBpZiAobGVhZGVyUG9zaXRpb24ubGVhZGVyID09IGspIHtcclxuICAgICAgLy8gbGVhZGVyIGlzIGRlYWQsIGZpbmQgbmV3IGxlYWRlclxyXG4gICAgICBjd19maW5kTGVhZGVyKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZW5lcmF0aW9uRW5kKHJlc3VsdHMpe1xyXG4gICAgY2xlYW51cFJvdW5kKHJlc3VsdHMpO1xyXG4gICAgcmV0dXJuIGN3X25ld1JvdW5kKHJlc3VsdHMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2ltdWxhdGlvblN0ZXAoKSB7ICBcclxuICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhbWVMb29wKCkge1xyXG4gIGxvb3BzID0gMDtcclxuICB3aGlsZSAoIWN3X3BhdXNlZCAmJiAobmV3IERhdGUpLmdldFRpbWUoKSA+IG5leHRHYW1lVGljayAmJiBsb29wcyA8IG1heEZyYW1lU2tpcCkgeyAgIFxyXG4gICAgbmV4dEdhbWVUaWNrICs9IHNraXBUaWNrcztcclxuICAgIGxvb3BzKys7XHJcbiAgfVxyXG4gIHNpbXVsYXRpb25TdGVwKCk7XHJcbiAgY3dfZHJhd1NjcmVlbigpO1xyXG5cclxuICBpZighY3dfcGF1c2VkKSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FyVUkoY2FySW5mbyl7XHJcbiAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xyXG4gIHZhciBjYXIgPSBjYXJNYXAuZ2V0KGNhckluZm8pO1xyXG4gIHZhciBwb3NpdGlvbiA9IGNhci5nZXRQb3NpdGlvbigpO1xyXG5cclxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcclxuICBjYXIubWluaW1hcG1hcmtlci5zdHlsZS5sZWZ0ID0gTWF0aC5yb3VuZCgocG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxuICBjYXIuaGVhbHRoQmFyLndpZHRoID0gTWF0aC5yb3VuZCgoY2FyLmNhci5zdGF0ZS5oZWFsdGggLyBtYXhfY2FyX2hlYWx0aCkgKiAxMDApICsgXCIlXCI7XHJcbiAgaWYgKHBvc2l0aW9uLnggPiBsZWFkZXJQb3NpdGlvbi54KSB7XHJcbiAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcclxuICAgIC8vIGNvbnNvbGUubG9nKFwibmV3IGxlYWRlcjogXCIsIGspO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfZmluZExlYWRlcigpIHtcclxuICB2YXIgbGVhZCA9IDA7XHJcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgY3dfY2FyQXJyYXkubGVuZ3RoOyBrKyspIHtcclxuICAgIGlmICghY3dfY2FyQXJyYXlba10uYWxpdmUpIHtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICB2YXIgcG9zaXRpb24gPSBjd19jYXJBcnJheVtrXS5nZXRQb3NpdGlvbigpO1xyXG4gICAgaWYgKHBvc2l0aW9uLnggPiBsZWFkKSB7XHJcbiAgICAgIGxlYWRlclBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYXN0Rm9yd2FyZCgpe1xyXG4gIHZhciBnZW4gPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuICB3aGlsZShnZW4gPT09IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyKXtcclxuICAgIGN1cnJlbnRSdW5uZXIuc3RlcCgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cFJvdW5kKHJlc3VsdHMpe1xyXG5cclxuICByZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcclxuICAgICAgcmV0dXJuIC0xXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgZ3JhcGhTdGF0ZSA9IHBsb3RfZ3JhcGhzKFxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmFwaGNhbnZhc1wiKSxcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLFxyXG4gICAgbnVsbCxcclxuICAgIGdyYXBoU3RhdGUsXHJcbiAgICByZXN1bHRzXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbmV3Um91bmQocmVzdWx0cykge1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhbWVyYS5wb3MueSA9IDA7XHJcbiAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuXHJcbiAgZ2VuZXJhdGlvblN0YXRlID0gbWFuYWdlUm91bmQubmV4dEdlbmVyYXRpb24oXHJcbiAgICBnZW5lcmF0aW9uU3RhdGUsIHJlc3VsdHMsIGdlbmVyYXRpb25Db25maWcoKVxyXG4gICk7XHJcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxyXG4gICAgZ2hvc3QgPSBudWxsO1xyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBSRS1FTkFCTEUgR0hPU1RcclxuICAgIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxuICB9XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBzZXR1cENhclVJKCk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICByZXNldENhclVJKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0YXJ0U2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSBmYWxzZTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcFNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY2xlYXJQb3B1bGF0aW9uV29ybGQoKSB7XHJcbiAgY2FyTWFwLmZvckVhY2goZnVuY3Rpb24oY2FyKXtcclxuICAgIGNhci5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCkge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgY3dfY2xlYXJHcmFwaGljcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpKTtcclxuICByZXNldEdyYXBoU3RhdGUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRXb3JsZCgpIHtcclxuICBkb0RyYXcgPSB0cnVlO1xyXG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZTtcclxuICBjd19jbGVhclBvcHVsYXRpb25Xb3JsZCgpO1xyXG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCk7XHJcblxyXG4gIE1hdGguc2VlZHJhbmRvbSgpO1xyXG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKFxyXG4gICAgd29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnNcclxuICApO1xyXG5cclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBzZXR1cENhclVJKClcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG5cclxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0dXBDYXJVSSgpe1xyXG4gIGN1cnJlbnRSdW5uZXIuY2Fycy5tYXAoZnVuY3Rpb24oY2FySW5mbyl7XHJcbiAgICB2YXIgY2FyID0gbmV3IGN3X0NhcihjYXJJbmZvLCBjYXJNYXApO1xyXG4gICAgY2FyTWFwLnNldChjYXJJbmZvLCBjYXIpO1xyXG4gICAgY2FyLnJlcGxheSA9IGdob3N0X2NyZWF0ZV9yZXBsYXkoKTtcclxuICAgIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUoY2FyLnJlcGxheSwgY2FyLmNhci5jYXIpO1xyXG4gIH0pXHJcbn1cclxuXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zhc3QtZm9yd2FyZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBmYXN0Rm9yd2FyZCgpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNzYXZlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIHNhdmVQcm9ncmVzcygpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNyZXN0b3JlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIHJlc3RvcmVQcm9ncmVzcygpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN0b2dnbGUtZGlzcGxheVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICB0b2dnbGVEaXNwbGF5KClcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbmV3LXBvcHVsYXRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKVxyXG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XHJcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcclxuICByZXNldENhclVJKCk7XHJcbn0pXHJcblxyXG5mdW5jdGlvbiBzYXZlUHJvZ3Jlc3MoKSB7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9IEpTT04uc3RyaW5naWZ5KGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uKTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZ2VuQ291bnRlciA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19naG9zdCA9IEpTT04uc3RyaW5naWZ5KGdob3N0KTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfdG9wU2NvcmVzID0gSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd190b3BTY29yZXMpO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXN0b3JlUHJvZ3Jlc3MoKSB7XHJcbiAgaWYgKHR5cGVvZiBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09ICd1bmRlZmluZWQnIHx8IGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPT0gbnVsbCkge1xyXG4gICAgYWxlcnQoXCJObyBzYXZlZCBwcm9ncmVzcyBmb3VuZFwiKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbik7XHJcbiAgZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIgPSBsb2NhbFN0b3JhZ2UuY3dfZ2VuQ291bnRlcjtcclxuICBnaG9zdCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X2dob3N0KTtcclxuICBncmFwaFN0YXRlLmN3X3RvcFNjb3JlcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3RvcFNjb3Jlcyk7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQ7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlID0gd29ybGRfZGVmLmZsb29yc2VlZDtcclxuXHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG4gIE1hdGguc2VlZHJhbmRvbSgpO1xyXG5cclxuICByZXNldENhclVJKCk7XHJcbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY29uZmlybS1yZXNldFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBjd19jb25maXJtUmVzZXRXb3JsZCgpXHJcbn0pXHJcblxyXG5mdW5jdGlvbiBjd19jb25maXJtUmVzZXRXb3JsZCgpIHtcclxuICBpZiAoY29uZmlybSgnUmVhbGx5IHJlc2V0IHdvcmxkPycpKSB7XHJcbiAgICBjd19yZXNldFdvcmxkKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGdob3N0IHJlcGxheSBzdHVmZlxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X3BhdXNlU2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSB0cnVlO1xyXG4gIGdob3N0X3BhdXNlKGdob3N0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzdW1lU2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSBmYWxzZTtcclxuICBnaG9zdF9yZXN1bWUoZ2hvc3QpO1xyXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdGFydEdob3N0UmVwbGF5KCkge1xyXG4gIGlmICghZG9EcmF3KSB7XHJcbiAgICB0b2dnbGVEaXNwbGF5KCk7XHJcbiAgfVxyXG4gIGN3X3BhdXNlU2ltdWxhdGlvbigpO1xyXG4gIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChjd19kcmF3R2hvc3RSZXBsYXksIE1hdGgucm91bmQoMTAwMCAvIHNjcmVlbmZwcykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdG9wR2hvc3RSZXBsYXkoKSB7XHJcbiAgY2xlYXJJbnRlcnZhbChjd19naG9zdFJlcGxheUludGVydmFsKTtcclxuICBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcclxuICBjd19maW5kTGVhZGVyKCk7XHJcbiAgY2FtZXJhLnBvcy54ID0gbGVhZGVyUG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgPSBsZWFkZXJQb3NpdGlvbi55O1xyXG4gIGN3X3Jlc3VtZVNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN0b2dnbGUtZ2hvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGUudGFyZ2V0KVxyXG59KVxyXG5cclxuZnVuY3Rpb24gY3dfdG9nZ2xlR2hvc3RSZXBsYXkoYnV0dG9uKSB7XHJcbiAgaWYgKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPT0gbnVsbCkge1xyXG4gICAgY3dfc3RhcnRHaG9zdFJlcGxheSgpO1xyXG4gICAgYnV0dG9uLnZhbHVlID0gXCJSZXN1bWUgc2ltdWxhdGlvblwiO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjd19zdG9wR2hvc3RSZXBsYXkoKTtcclxuICAgIGJ1dHRvbi52YWx1ZSA9IFwiVmlldyB0b3AgcmVwbGF5XCI7XHJcbiAgfVxyXG59XHJcbi8vIGdob3N0IHJlcGxheSBzdHVmZiBFTkRcclxuXHJcbi8vIGluaXRpYWwgc3R1ZmYsIG9ubHkgY2FsbGVkIG9uY2UgKGhvcGVmdWxseSlcclxuZnVuY3Rpb24gY3dfaW5pdCgpIHtcclxuICAvLyBjbG9uZSBzaWx2ZXIgZG90IGFuZCBoZWFsdGggYmFyXHJcbiAgdmFyIG1tbSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdtaW5pbWFwbWFya2VyJylbMF07XHJcbiAgdmFyIGhiYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnaGVhbHRoYmFyJylbMF07XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG5cclxuICAgIC8vIG1pbmltYXAgbWFya2Vyc1xyXG4gICAgdmFyIG5ld2JhciA9IG1tbS5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBuZXdiYXIuaWQgPSBcImJhclwiICsgaztcclxuICAgIG5ld2Jhci5zdHlsZS5wYWRkaW5nVG9wID0gayAqIDkgKyBcInB4XCI7XHJcbiAgICBtaW5pbWFwaG9sZGVyLmFwcGVuZENoaWxkKG5ld2Jhcik7XHJcblxyXG4gICAgLy8gaGVhbHRoIGJhcnNcclxuICAgIHZhciBuZXdoZWFsdGggPSBoYmFyLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIG5ld2hlYWx0aC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIkRJVlwiKVswXS5pZCA9IFwiaGVhbHRoXCIgKyBrO1xyXG4gICAgbmV3aGVhbHRoLmNhcl9pbmRleCA9IGs7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiKS5hcHBlbmRDaGlsZChuZXdoZWFsdGgpO1xyXG4gIH1cclxuICBtbW0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChtbW0pO1xyXG4gIGhiYXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChoYmFyKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIHNldHVwQ2FyVUkoKTtcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG4gIFxyXG59XHJcblxyXG5mdW5jdGlvbiByZWxNb3VzZUNvb3JkcyhldmVudCkge1xyXG4gIHZhciB0b3RhbE9mZnNldFggPSAwO1xyXG4gIHZhciB0b3RhbE9mZnNldFkgPSAwO1xyXG4gIHZhciBjYW52YXNYID0gMDtcclxuICB2YXIgY2FudmFzWSA9IDA7XHJcbiAgdmFyIGN1cnJlbnRFbGVtZW50ID0gdGhpcztcclxuXHJcbiAgZG8ge1xyXG4gICAgdG90YWxPZmZzZXRYICs9IGN1cnJlbnRFbGVtZW50Lm9mZnNldExlZnQgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xyXG4gICAgdG90YWxPZmZzZXRZICs9IGN1cnJlbnRFbGVtZW50Lm9mZnNldFRvcCAtIGN1cnJlbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQub2Zmc2V0UGFyZW50XHJcbiAgfVxyXG4gIHdoaWxlIChjdXJyZW50RWxlbWVudCk7XHJcblxyXG4gIGNhbnZhc1ggPSBldmVudC5wYWdlWCAtIHRvdGFsT2Zmc2V0WDtcclxuICBjYW52YXNZID0gZXZlbnQucGFnZVkgLSB0b3RhbE9mZnNldFk7XHJcblxyXG4gIHJldHVybiB7eDogY2FudmFzWCwgeTogY2FudmFzWX1cclxufVxyXG5IVE1MRGl2RWxlbWVudC5wcm90b3R5cGUucmVsTW91c2VDb29yZHMgPSByZWxNb3VzZUNvb3JkcztcclxubWluaW1hcGhvbGRlci5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgdmFyIGNvb3JkcyA9IG1pbmltYXBob2xkZXIucmVsTW91c2VDb29yZHMoZXZlbnQpO1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICB2YXIgY2xvc2VzdCA9IHtcclxuICAgIHZhbHVlOiBjd19jYXJBcnJheVswXS5jYXIsXHJcbiAgICBkaXN0OiBNYXRoLmFicygoKGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KSxcclxuICAgIHg6IGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueFxyXG4gIH1cclxuXHJcbiAgdmFyIG1heFggPSAwO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY3dfY2FyQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBwb3MgPSBjd19jYXJBcnJheVtpXS5nZXRQb3NpdGlvbigpO1xyXG4gICAgdmFyIGRpc3QgPSBNYXRoLmFicygoKHBvcy54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpO1xyXG4gICAgaWYgKGRpc3QgPCBjbG9zZXN0LmRpc3QpIHtcclxuICAgICAgY2xvc2VzdC52YWx1ZSA9IGN3X2NhckFycmF5LmNhcjtcclxuICAgICAgY2xvc2VzdC5kaXN0ID0gZGlzdDtcclxuICAgICAgY2xvc2VzdC54ID0gcG9zLng7XHJcbiAgICB9XHJcbiAgICBtYXhYID0gTWF0aC5tYXgocG9zLngsIG1heFgpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGNsb3Nlc3QueCA9PSBtYXhYKSB7IC8vIGZvY3VzIG9uIGxlYWRlciBhZ2FpblxyXG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KGNsb3Nlc3QudmFsdWUpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25yYXRlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldE11dGF0aW9uKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtdXRhdGlvbnNpemVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0TXV0YXRpb25SYW5nZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmxvb3JcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0TXV0YWJsZUZsb29yKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3Jhdml0eVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRHcmF2aXR5KGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNlbGl0ZXNpemVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0RWxpdGVTaXplKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YXRpb24obXV0YXRpb24pIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5fbXV0YXRpb24gPSBwYXJzZUZsb2F0KG11dGF0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YXRpb25SYW5nZShyYW5nZSkge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLm11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcclxuICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vciA9IChjaG9pY2UgPT0gMSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldEdyYXZpdHkoY2hvaWNlKSB7XHJcbiAgd29ybGRfZGVmLmdyYXZpdHkgPSBuZXcgYjJWZWMyKDAuMCwgLXBhcnNlRmxvYXQoY2hvaWNlKSk7XHJcbiAgdmFyIHdvcmxkID0gY3VycmVudFJ1bm5lci5zY2VuZS53b3JsZFxyXG4gIC8vIENIRUNLIEdSQVZJVFkgQ0hBTkdFU1xyXG4gIGlmICh3b3JsZC5HZXRHcmF2aXR5KCkueSAhPSB3b3JsZF9kZWYuZ3Jhdml0eS55KSB7XHJcbiAgICB3b3JsZC5TZXRHcmF2aXR5KHdvcmxkX2RlZi5ncmF2aXR5KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldEVsaXRlU2l6ZShjbG9uZXMpIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5jaGFtcGlvbkxlbmd0aCA9IHBhcnNlSW50KGNsb25lcywgMTApO1xyXG59XHJcblxyXG5jd19pbml0KCk7XHJcbiIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi9yYW5kb20uanNcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBjcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGdlbmVyYXRvcil7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oaW5zdGFuY2UsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20uY3JlYXRlTm9ybWFscyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpO1xyXG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9LCB7IGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSB9KTtcclxuICB9LFxyXG4gIGNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwYXJlbnRDaG9vc2VyKXtcclxuICAgIHZhciBpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hRGVmID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xyXG4gICAgICAgIHZhciBwID0gcGFyZW50Q2hvb3NlcihpZCwga2V5LCBwYXJlbnRzKTtcclxuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGNyb3NzRGVmW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IGlkLFxyXG4gICAgICBhbmNlc3RyeTogcGFyZW50cy5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXHJcbiAgICAgICAgfTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgY3JlYXRlTXV0YXRlZENsb25lKHNjaGVtYSwgZ2VuZXJhdG9yLCBwYXJlbnQsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICAgIHNjaGVtYVByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGVcclxuICAgICAgKTtcclxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgfSwge1xyXG4gICAgICBpZDogcGFyZW50LmlkLFxyXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcztcclxuICAgICAgc3dpdGNoKHNjaGVtYVByb3AudHlwZSl7XHJcbiAgICAgICAgY2FzZSBcInNodWZmbGVcIiA6XHJcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9TaHVmZmxlKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZsb2F0XCIgOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvRmxvYXQoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcclxuICAgICAgICBjYXNlIFwiaW50ZWdlclwiOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvSW50ZWdlcihzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3NjaGVtYVByb3AudHlwZX0gb2Ygc2NoZW1hIGZvciBrZXkgJHtrZXl9YCk7XHJcbiAgICAgIH1cclxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgfSwge1xyXG4gICAgICBpZDogcGFyZW50LmlkLFxyXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9LFxyXG59XHJcbiIsInZhciBjcmVhdGUgPSByZXF1aXJlKFwiLi4vY3JlYXRlLWluc3RhbmNlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2VuZXJhdGlvblplcm86IGdlbmVyYXRpb25aZXJvLFxyXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvblxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xyXG4gIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSxcclxuICBzY2hlbWEgPSBjb25maWcuc2NoZW1hO1xyXG4gIHZhciBjd19jYXJHZW5lcmF0aW9uID0gW107XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcbiAgICB2YXIgZGVmID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKClcclxuICAgIH0pO1xyXG4gICAgZGVmLmluZGV4ID0gaztcclxuICAgIGN3X2NhckdlbmVyYXRpb24ucHVzaChkZWYpO1xyXG4gIH1cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogMCxcclxuICAgIGdlbmVyYXRpb246IGN3X2NhckdlbmVyYXRpb24sXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24oXHJcbiAgcHJldmlvdXNTdGF0ZSxcclxuICBzY29yZXMsXHJcbiAgY29uZmlnXHJcbil7XHJcbiAgdmFyIGNoYW1waW9uX2xlbmd0aCA9IGNvbmZpZy5jaGFtcGlvbkxlbmd0aCxcclxuICAgIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gICAgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSBjb25maWcuc2VsZWN0RnJvbUFsbFBhcmVudHM7XHJcblxyXG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcbiAgdmFyIG5ld2Jvcm47XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBjaGFtcGlvbl9sZW5ndGg7IGsrKykge2BgXHJcbiAgICBzY29yZXNba10uZGVmLmlzX2VsaXRlID0gdHJ1ZTtcclxuICAgIHNjb3Jlc1trXS5kZWYuaW5kZXggPSBrO1xyXG4gICAgbmV3R2VuZXJhdGlvbi5wdXNoKHNjb3Jlc1trXS5kZWYpO1xyXG4gIH1cclxuICB2YXIgcGFyZW50TGlzdCA9IFtdO1xyXG4gIGZvciAoayA9IGNoYW1waW9uX2xlbmd0aDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHZhciBwYXJlbnQxID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0KTtcclxuICAgIHZhciBwYXJlbnQyID0gcGFyZW50MTtcclxuICAgIHdoaWxlIChwYXJlbnQyID09IHBhcmVudDEpIHtcclxuICAgICAgcGFyZW50MiA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCwgcGFyZW50MSk7XHJcbiAgICB9XHJcbiAgICB2YXIgcGFpciA9IFtwYXJlbnQxLCBwYXJlbnQyXVxyXG4gICAgcGFyZW50TGlzdC5wdXNoKHBhaXIpO1xyXG4gICAgbmV3Ym9ybiA9IG1ha2VDaGlsZChjb25maWcsXHJcbiAgICAgIHBhaXIubWFwKGZ1bmN0aW9uKHBhcmVudCkgeyByZXR1cm4gc2NvcmVzW3BhcmVudF0uZGVmOyB9KVxyXG4gICAgKTtcclxuICAgIG5ld2Jvcm4gPSBtdXRhdGUoY29uZmlnLCBuZXdib3JuKTtcclxuICAgIG5ld2Jvcm4uaXNfZWxpdGUgPSBmYWxzZTtcclxuICAgIG5ld2Jvcm4uaW5kZXggPSBrO1xyXG4gICAgbmV3R2VuZXJhdGlvbi5wdXNoKG5ld2Jvcm4pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGNvdW50ZXI6IHByZXZpb3VzU3RhdGUuY291bnRlciArIDEsXHJcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxyXG4gIH07XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBtYWtlQ2hpbGQoY29uZmlnLCBwYXJlbnRzKXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIHBpY2tQYXJlbnQgPSBjb25maWcucGlja1BhcmVudDtcclxuICByZXR1cm4gY3JlYXRlLmNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwaWNrUGFyZW50KVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIG11dGF0aW9uX3JhbmdlID0gY29uZmlnLm11dGF0aW9uX3JhbmdlLFxyXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcclxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxyXG4gICAgc2NoZW1hLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20sXHJcbiAgICBwYXJlbnQsXHJcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXHJcbiAgICBnZW5fbXV0YXRpb25cclxuICApXHJcbn1cclxuIiwiXHJcblxyXG5jb25zdCByYW5kb20gPSB7XHJcbiAgc2h1ZmZsZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XHJcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXHJcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgIH0sIGdlbmVyYXRvcikpO1xyXG4gIH0sXHJcbiAgY3JlYXRlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XHJcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXHJcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgIH0sIGdlbmVyYXRvcikpO1xyXG4gIH0sXHJcbiAgY3JlYXRlTm9ybWFscyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgdmFyIGwgPSBwcm9wLmxlbmd0aDtcclxuICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xyXG4gICAgICB2YWx1ZXMucHVzaChcclxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlcztcclxuICB9LFxyXG4gIG11dGF0ZVNodWZmbGUoXHJcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICApe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb1NodWZmbGUocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICAgKSk7XHJcbiAgfSxcclxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICAgKSk7XHJcbiAgfSxcclxuICBtdXRhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG1hcFRvU2h1ZmZsZShwcm9wLCBub3JtYWxzKXtcclxuICAgIHZhciBvZmZzZXQgPSBwcm9wLm9mZnNldCB8fCAwO1xyXG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcclxuICAgIHZhciBzb3J0ZWQgPSBub3JtYWxzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLCBiKXtcclxuICAgICAgcmV0dXJuIGEgLSBiO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24odmFsKXtcclxuICAgICAgcmV0dXJuIHNvcnRlZC5pbmRleE9mKHZhbCk7XHJcbiAgICB9KS5tYXAoZnVuY3Rpb24oaSl7XHJcbiAgICAgIHJldHVybiBpICsgb2Zmc2V0O1xyXG4gICAgfSkuc2xpY2UoMCwgbGltaXQpO1xyXG4gIH0sXHJcbiAgbWFwVG9JbnRlZ2VyKHByb3AsIG5vcm1hbHMpe1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxMCxcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpLm1hcChmdW5jdGlvbihmbG9hdCl7XHJcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKGZsb2F0KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgbWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKXtcclxuICAgIHByb3AgPSB7XHJcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcclxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKG5vcm1hbCl7XHJcbiAgICAgIHZhciBtaW4gPSBwcm9wLm1pbjtcclxuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcclxuICAgICAgcmV0dXJuIG1pbiArIG5vcm1hbCAqIHJhbmdlXHJcbiAgICB9KVxyXG4gIH0sXHJcbiAgbXV0YXRlTm9ybWFscyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlXHJcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xyXG4gICAgICBpZihnZW5lcmF0b3IoKSA+IGNoYW5jZVRvTXV0YXRlKXtcclxuICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbXV0YXRlTm9ybWFsKFxyXG4gICAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgZmFjdG9yXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJhbmRvbTtcclxuXHJcbmZ1bmN0aW9uIG11dGF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIG11dGF0aW9uX3JhbmdlKXtcclxuICBpZihtdXRhdGlvbl9yYW5nZSA+IDEpe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xyXG4gIH1cclxuICB2YXIgbmV3TWluID0gb3JpZ2luYWxWYWx1ZSAtIDAuNTtcclxuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcclxuICBpZiAobmV3TWluICsgbXV0YXRpb25fcmFuZ2UgID4gMSlcclxuICAgIG5ld01pbiA9IDEgLSBtdXRhdGlvbl9yYW5nZTtcclxuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XHJcbiAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgfSwgZ2VuZXJhdG9yKTtcclxuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcclxuICBpZighcHJvcC5pbmNsdXNpdmUpe1xyXG4gICAgcmV0dXJuIGdlbmVyYXRvcigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCkgPCAwLjUgP1xyXG4gICAgZ2VuZXJhdG9yKCkgOlxyXG4gICAgMSAtIGdlbmVyYXRvcigpO1xyXG4gIH1cclxufVxyXG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cclxudmFyIHNldHVwU2NlbmUgPSByZXF1aXJlKFwiLi9zZXR1cC1zY2VuZVwiKTtcclxudmFyIGNhclJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcclxudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcnVuRGVmcztcclxuZnVuY3Rpb24gcnVuRGVmcyh3b3JsZF9kZWYsIGRlZnMsIGxpc3RlbmVycykge1xyXG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xyXG4gICAgLy8gR0hPU1QgRElTQUJMRURcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICB9XHJcblxyXG4gIHZhciBzY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcclxuICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XHJcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBidWlsZCBjYXJzXCIpO1xyXG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaW5kZXg6IGksXHJcbiAgICAgIGRlZjogZGVmLFxyXG4gICAgICBjYXI6IGRlZlRvQ2FyKGRlZiwgc2NlbmUud29ybGQsIHdvcmxkX2RlZiksXHJcbiAgICAgIHN0YXRlOiBjYXJSdW4uZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZilcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XHJcbiAgcmV0dXJuIHtcclxuICAgIHNjZW5lOiBzY2VuZSxcclxuICAgIGNhcnM6IGNhcnMsXHJcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcclxuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XHJcbiAgICAgICAgY2FyLnN0YXRlID0gY2FyUnVuLnVwZGF0ZVN0YXRlKFxyXG4gICAgICAgICAgd29ybGRfZGVmLCBjYXIuY2FyLCBjYXIuc3RhdGVcclxuICAgICAgICApO1xyXG4gICAgICAgIHZhciBzdGF0dXMgPSBjYXJSdW4uZ2V0U3RhdHVzKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcclxuICAgICAgICBsaXN0ZW5lcnMuY2FyU3RlcChjYXIpO1xyXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xyXG4gICAgICAgIGxpc3RlbmVycy5jYXJEZWF0aChjYXIpO1xyXG5cclxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcclxuICAgICAgICB2YXIgd29ybGRDYXIgPSBjYXIuY2FyO1xyXG4gICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLmNoYXNzaXMpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IHdvcmxkQ2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xyXG4gICAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIud2hlZWxzW3ddKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSlcclxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBsaXN0ZW5lcnMuZ2VuZXJhdGlvbkVuZChjYXJzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbn1cclxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXHJcblxyXG4vKlxyXG5cclxud29ybGRfZGVmID0ge1xyXG4gIGdyYXZpdHk6IHt4LCB5fSxcclxuICBkb1NsZWVwOiBib29sZWFuLFxyXG4gIGZsb29yc2VlZDogc3RyaW5nLFxyXG4gIHRpbGVEaW1lbnNpb25zLFxyXG4gIG1heEZsb29yVGlsZXMsXHJcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxyXG59XHJcblxyXG4qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xyXG5cclxuICB2YXIgd29ybGQgPSBuZXcgYjJXb3JsZCh3b3JsZF9kZWYuZ3Jhdml0eSwgd29ybGRfZGVmLmRvU2xlZXApO1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXHJcbiAgICB3b3JsZCxcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQsXHJcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXHJcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcclxuICAgIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yXHJcbiAgKTtcclxuXHJcbiAgdmFyIGxhc3RfdGlsZSA9IGZsb29yVGlsZXNbXHJcbiAgICBmbG9vclRpbGVzLmxlbmd0aCAtIDFcclxuICBdO1xyXG4gIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxyXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxyXG4gICk7XHJcbiAgd29ybGQuZmluaXNoTGluZSA9IHRpbGVfcG9zaXRpb24ueDtcclxuICByZXR1cm4ge1xyXG4gICAgd29ybGQ6IHdvcmxkLFxyXG4gICAgZmxvb3JUaWxlczogZmxvb3JUaWxlcyxcclxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yKHdvcmxkLCBmbG9vcnNlZWQsIGRpbWVuc2lvbnMsIG1heEZsb29yVGlsZXMsIG11dGFibGVfZmxvb3IpIHtcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIHZhciBjd19mbG9vclRpbGVzID0gW107XHJcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcclxuICAgIGlmICghbXV0YWJsZV9mbG9vcikge1xyXG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLCBkaW1lbnNpb25zLCB0aWxlX3Bvc2l0aW9uLCAoTWF0aC5yYW5kb20oKSAqIDMgLSAxLjUpICogMS41ICogayAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIHBhdGggaXMgbXV0YWJsZSBvdmVyIHJhY2VzLCBjcmVhdGUgc21vb3RoZXIgdHJhY2tzXHJcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcclxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGsgLyBtYXhGbG9vclRpbGVzXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcclxuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcclxuICB9XHJcbiAgcmV0dXJuIGN3X2Zsb29yVGlsZXM7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vclRpbGUod29ybGQsIGRpbSwgcG9zaXRpb24sIGFuZ2xlKSB7XHJcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xyXG5cclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcclxuXHJcbiAgdmFyIGNvb3JkcyA9IG5ldyBBcnJheSgpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xyXG5cclxuICB2YXIgY2VudGVyID0gbmV3IGIyVmVjMigwLCAwKTtcclxuXHJcbiAgdmFyIG5ld2Nvb3JkcyA9IGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpO1xyXG5cclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XHJcbiAgcmV0dXJuIGNvb3Jkcy5tYXAoZnVuY3Rpb24oY29vcmQpe1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxyXG4gICAgICB5OiBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSArIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLnksXHJcbiAgICB9O1xyXG4gIH0pO1xyXG59XHJcbiJdfQ==
