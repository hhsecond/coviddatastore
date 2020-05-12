import React from "react";
import "./index.css";
import {
  distance_between_two_vertical_points as xDiff,
  minimum_left_margin,
  minimum_top_margin,
  default_label,
  default_color,
  colors
} from "../../utils/variables";
import "./index.css";
import Button from "react-bootstrap/Button";
import { Redirect } from "react-router-dom";
import { saveAnnotationApi } from "../../api/image";
import Spinner from "react-bootstrap/Spinner";


var _yoffset = Math.sqrt(2 * xDiff * (2 * xDiff) - xDiff * xDiff);

let controlPressed = false;
let zPrressed = false;
let shiftPressed = false

class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.isMouseDown = false;
    this.undo_stack = [];
    this.redo_stack = [];
    this.temp_stack = [];
    this.points_label_map = {};
    this.points_label_map_original = {};
    this.state = {
      width: null,
      height: null,
      marginLeft: null,
      marginTop: null,
      // imageLoading: true,
      posting: false,
      value: null,
      deletelater_index: 0,
      redirect: false
    };
  }

  keyDown = e => {
    if (controlPressed == false && e.keyCode == 17) {
      controlPressed = true;
    }

    if (controlPressed == true && zPrressed == false && e.keyCode == 90) {
      if(shiftPressed == true){
        this.redo()
      }else{
        this.undo();
      }
    }

    if (zPrressed == false && e.keyCode == 90) {
      zPrressed = true;
    }
    if (shiftPressed == false && e.keyCode == 16) {
      shiftPressed = true;
    }
  };

  keyUp = e => {
    if (zPrressed == true && e.keyCode == 90) {
      zPrressed = false;
    }
    if (controlPressed == true && e.keyCode == 17) {
      controlPressed = false;
    }
    if (shiftPressed == true && e.keyCode == 16) {
      shiftPressed = false;
    }
  };

  getYCoordinated = (x, y) => {
    let yLeft = null;
    let yRight = null;
    let yLeftTop = null;
    let yLeftDown = null;
    let yRightTop = null;
    let yRightDown = null;
    if (Math.trunc(x) % 2 == 0) {
      if (y > this.state.marginTop + _yoffset) {
        yLeft = (y - this.state.marginTop) / (_yoffset * 2) + 1;
        yLeftTop =
          this.state.marginTop + (Math.floor(yLeft) - 1) * (_yoffset * 2);
        yLeftDown =
          this.state.marginTop + (Math.ceil(yLeft) - 1) * (_yoffset * 2);
        yRight = (y - (this.state.marginTop + _yoffset)) / (_yoffset * 2) + 1;
        yRightTop =
          this.state.marginTop +
          _yoffset +
          (Math.floor(yRight) - 1) * (_yoffset * 2);
        yRightDown =
          this.state.marginTop +
          _yoffset +
          (Math.ceil(yRight) - 1) * (_yoffset * 2);
      } else {
        if (y < this.state.marginTop) {
          yLeftTop = -1;
          yLeftDown = this.state.marginTop;

          yRightTop = -1;
          yRightDown = this.state.marginTop + _yoffset;
        } else {
          yLeftTop = this.state.marginTop;
          yLeftDown = this.state.marginTop + _yoffset * 2;
          yRightTop = -1;
          yRightDown = this.state.marginTop + _yoffset;
        }
      }
    } else {
      if (y > this.state.marginTop + _yoffset) {
        yLeft = (y - (this.state.marginTop + _yoffset)) / (_yoffset * 2) + 1;
        yLeftTop =
          this.state.marginTop +
          _yoffset +
          (Math.floor(yLeft) - 1) * (_yoffset * 2);
        yLeftDown =
          this.state.marginTop +
          _yoffset +
          (Math.ceil(yLeft) - 1) * (_yoffset * 2);
        yRight = (y - this.state.marginTop) / (_yoffset * 2) + 1;
        yRightTop =
          this.state.marginTop + (Math.floor(yRight) - 1) * (_yoffset * 2);
        yRightDown =
          this.state.marginTop + (Math.ceil(yRight) - 1) * (_yoffset * 2);
      } else {
        if (y < this.state.marginTop) {
          yLeftTop = -1;
          yLeftDown = this.state.marginTop + _yoffset;
          yRightTop = -1;
          yRightDown = this.state.marginTop;
        } else {
          yLeftTop = -1;
          yLeftDown = this.state.marginTop + _yoffset;
          yRightTop = this.state.marginTop;
          yRightDown = this.state.marginTop + _yoffset * 2;
        }
      }
    }
    return [yLeftTop, yLeftDown, yRightTop, yRightDown];
  };

  getXCoordinate = (left, right) => {
    if (left == 0) {
      return [-1, this.state.marginLeft + xDiff * (right - 1)];
    } else {
      return [
        this.state.marginLeft + xDiff * (left - 1),
        this.state.marginLeft + xDiff * (right - 1)
      ];
    }
  };

  distanceBetweenPoints = (a, b) => {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  };

  getNearestCoordinate = (coordinates_list, x, y, offset_limit) => {
    // let _distances = []
    let coordinates = null;
    let _min = 9999999;
    let _d = null;
    for (let i = 0; i < coordinates_list.length; i++) {
      _d = this.distanceBetweenPoints(coordinates_list[i], [x, y]);
      if (_d < _min) {
        _min = _d;
        coordinates = coordinates_list[i];
      }
    }
    if (_min > offset_limit) {
      return null;
    }

    return coordinates;
  };

  paintCoordinate = (ctx, _coordinate, value, add_to_stack = true) => {
    if (_coordinate) {
      if (_coordinate[0] in this.points_label_map) {
        if (_coordinate[1] in this.points_label_map[_coordinate[0]]) {
          // point already colored

          if (
            this.points_label_map[_coordinate[0]][_coordinate[1]]["id"] !==
            value["id"]
          ) {
            // hovered over already colored point with a different color
            if (value["color_id"] == -1) {
              // erase colored points
              if (add_to_stack == true) {
                this.temp_stack.push([
                  ..._coordinate,
                  this.points_label_map[_coordinate[0]][_coordinate[1]]["id"],
                  this.points_label_map[_coordinate[0]][_coordinate[1]][
                    "color_id"
                  ]
                ]);
              }
              this.drawDots(
                ctx,
                _coordinate[0],
                _coordinate[1],
                2.2,
                default_color
              );
              delete this.points_label_map[_coordinate[0]][_coordinate[1]];
            } else {
              // hovered over already colored point with a different color
              this.points_label_map[_coordinate[0]][_coordinate[1]] = value;
              if (add_to_stack == true) {
                this.temp_stack.push(_coordinate);
              }
              this.drawDots(
                ctx,
                _coordinate[0],
                _coordinate[1],
                2,
                colors[value["color_id"]]
              );
            }
          }
        } else {
          // point not colored

          if (value["color_id"] == -1) {
          } else {
            this.points_label_map[_coordinate[0]][_coordinate[1]] = value;
            if (add_to_stack == true) {
              this.temp_stack.push(_coordinate);
            }
            this.drawDots(
              ctx,
              _coordinate[0],
              _coordinate[1],
              2,
              colors[value["color_id"]]
            );
          }
        }
      } else {
        // point not colored

        if (value["color_id"] == -1) {
        } else {
          this.points_label_map[_coordinate[0]] = {
            [_coordinate[1]]: value
          };
          if (add_to_stack == true) {
            this.temp_stack.push(_coordinate);
          }
          this.drawDots(
            ctx,
            _coordinate[0],
            _coordinate[1],
            2,
            colors[value["color_id"]]
          );
        }
      }
    }
  };

  labelDots = (x, y, value, offset_limit, add_to_stack = true) => {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext("2d");

    let _x_number, _x_numberLeft, _x_numberRight;

    let coordinates_list = [];

    if (x - this.state.marginLeft > 0) {
      _x_number = (x - this.state.marginLeft) / xDiff + 1;
      _x_numberLeft = Math.floor(_x_number);
      _x_numberRight = Math.ceil(_x_number);
    } else {
      _x_numberLeft = 0;
      _x_numberRight = 1;
    }
    [_x_numberLeft, _x_numberRight] = this.getXCoordinate(
      _x_numberLeft,
      _x_numberRight
    );

    let yList = this.getYCoordinated(_x_number, y);

    for (let i = 0; i < 2; i++) {
      if (yList[i] !== -1 && _x_numberLeft !== -1) {
        coordinates_list.push([_x_numberLeft, yList[i]]);
      }
    }
    for (let i = 2; i < 4; i++) {
      if (yList[i] !== -1 && _x_numberRight !== -1) {
        coordinates_list.push([_x_numberRight, yList[i]]);
      }
    }

    let _coordinate = this.getNearestCoordinate(
      coordinates_list,
      x,
      y,
      offset_limit
    );

    this.paintCoordinate(ctx, _coordinate, value, add_to_stack);
  };

  drawDots = (ctx, x, y, radius, color) => {
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
  };

  drawDefaultDots = ctx => {
    let _temp = 0;
    for (
      let x = this.state.marginLeft;
      x < this.state.width;
      x = x + xDiff, _temp++
    ) {
      for (
        let y = this.state.marginTop;
        y < this.state.height;
        y = y + _yoffset * 2
      ) {
        if (_temp % 2 == 0) {
          this.drawDots(ctx, x, y + _yoffset, 2, default_color);
        } else {
          this.drawDots(ctx, x, y, 2, default_color);
        }
      }
    }
  };

  getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  deleteFromPointsLabelMap = (x, y) => {
    if (x in this.points_label_map && y in this.points_label_map[x]) {
      delete this.points_label_map[x][y];
    }
  };

  undo = () => {
    if (this.undo_stack.length > 0) {
      let last = this.undo_stack.pop();
      this.redo_stack.push(last);

      if (last["id"] == -1) {
        for (let i of last["points"]) {
          this.labelDots(i[0], i[1], { id: i[2], color_id: i[3] }, 0, false);
        }
      } else {
        for (let i of last["points"]) {
          this.labelDots(i[0], i[1], { id: -1, color_id: -1 }, 0, false);
        }

        if (this.undo_stack.length > 0) {
          last = this.undo_stack[this.undo_stack.length - 1];
          for (let i of last["points"]) {
            this.labelDots(
              i[0],
              i[1],
              { id: last["id"], color_id: last["color_id"] },
              0,
              false
            );
          }
        }
      }
    }
  };

  redo = () => {

    if (this.redo_stack.length > 0) {
      let last = this.redo_stack.pop();
      this.undo_stack.push(last);

      if (last["id"] == -1) {
        for (let i of last["points"]) {
          this.labelDots(i[0], i[1], { id: -1, color_id: -1 }, 0, false);
        }
      } else {
        for (let i of last["points"]) {
          this.labelDots(
            i[0],
            i[1],
            { id: last["id"], color_id: last["color_id"] },
            0,
            false
          );
        }
      }
    }
  };

  getPayload = () => {
    let _data = [];
    let _label_data = {};
    let is_data_present = false;

    for (let x in this.points_label_map) {
      for (let y in this.points_label_map[x]) {
        if (
          x in this.points_label_map_original &&
          y in this.points_label_map_original[x]
        ) {
          if (
            this.points_label_map_original[x][y]["label_id"] ==
            this.points_label_map[x][y]["id"]
          ) {
          } else {
            is_data_present = true;
            _data.push({
              type: "point",
              id: this.points_label_map_original[x][y]["id"],
              data: { x: x, y: y },
              mode: "view",
              status: "changed",
              labelIds: [this.points_label_map[x][y]["id"]],
              selectedNode: 0
            });
          }
        } else {
          is_data_present = true;
          _data.push({
            type: "point",
            data: { x: x, y: y },
            mode: "view",
            status: "new",
            labelIds: [this.points_label_map[x][y]["id"]],
            selectedNode: 0
          });
        }
      }
    }

    for (let x in this.points_label_map_original) {
      for (let y in this.points_label_map_original[x]) {
        if (x in this.points_label_map && y in this.points_label_map[x]) {
        } else {
          is_data_present = true;
          _data.push({
            type: "point",
            id: this.points_label_map_original[x][y]["id"],
            data: { x: x, y: y },
            mode: "view",
            status: "deleted",
            labelIds: [this.points_label_map_original[x][y]["label_id"]],
            selectedNode: 0
          });
        }
      }
    }

    let payload = {
      imgId: this.props.imageId,
      url: this.props.annos['image']['url'],
      imgLabelIds: [],
      imgLabelChanged: false,
      annotations: {
        bBoxes: [],
        lines: [],
        points: _data,
        polygons: []
      },
      isJunk: null
    };
    if (is_data_present == true) {
      return payload;
    } else {
      return null;
    }
  };

  nextImage = () => {
    this.setState({ posting: true }, () => {
      let payload = this.getPayload();
      if (payload !== null) {
        saveAnnotationApi(payload).then(response => {
          this.setState({ posting: false }, () => {
            this.points_label_map = {};
            this.undo_stack = [];
            this.redo_stack = [];
            this.props.nextImage();
          });
        });
      } else {
        this.setState({ posting: false }, () => {
          this.points_label_map = {};
          this.undo_stack = [];
          this.redo_stack = [];
          this.props.nextImage();
        });
      }
    });
  };

  prevImage = () => {
    this.setState({ posting: true }, () => {
      let payload = this.getPayload();

      if (payload !== null) {
        saveAnnotationApi(payload).then(response => {
          this.setState({ posting: false }, () => {
            this.points_label_map = {};
            this.undo_stack = [];
            this.redo_stack = [];
            this.props.prevImage();
          });
        });
      } else {
        this.setState({ posting: false }, () => {
          this.points_label_map = {};
          this.undo_stack = [];
          this.redo_stack = [];
          this.props.prevImage();
        });
      }
    });
  };

  finish = () => {
    this.setState({ posting: true }, () => {
      let payload = this.getPayload();

      saveAnnotationApi(payload).then(response => {
        this.setState({ posting: false }, () => {
          this.points_label_map = {};
          this.undo_stack = [];
          this.redo_stack = [];
          this.setState({ redirect: true });
        });
      });
    });
  };

  onChangeOfLabel = (_value, _index) => {
    let value = _value;
    if (value["id"] === -1) {
      value["color_id"] = -1;
    } else {
      value["color_id"] = _index;
    }
    this.setState({
      value: value
    });
  };

  renderLabels = _labels => {
    let labels = require("rfdc")({ proto: true })(_labels);
    let returnElement = [];
    labels.unshift({
      id: -1,
      label: "Remove Label",
      nameAndClass: "Consolidation (Covid19)",
      description: ""
    });
    for (let i = 0; i < labels.length; i++) {
      returnElement.push(
        <div className="input-screen">
          <input
            type="radio"
            // checked={value.label === this.state.value.label}
            name="colors"
            onChange={e => {
              this.onChangeOfLabel(labels[i], i);
            }}
          />
          <div style={{ marginLeft: 10 }}>{labels[i].label}</div>
          <div
            style={{
              marginLeft: 10,
              backgroundColor: labels[i].id == -1 ? default_color : colors[i],
              height: 10,
              width: 10
            }}
          />
        </div>
      );
    }

    return returnElement;
  };

  renderLeftSideControls = () => {
    return (
      <div>
        {/* <div
          onClick={() => {
            console.log(
              "*****",
              this.undo_stack,
              this.redo_stack,
              this.points_label_map
            );
          }}
        >
          {" "}
          console
        </div>  */}
        <h5 style={{ textAlign: "center" }}>
          <u>Select a label</u>
        </h5>
        {this.props.labels.length ? this.renderLabels(this.props.labels) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-around",
            marginTop: 20
          }}
        >
          <Button type="button" onClick={() => this.undo()}>
            Undo
          </Button>
          <Button type="button" onClick={() => this.redo()}>
            Redo
          </Button>
        </div>
      </div>
    );
  };

  renderPreviousButton = () => {
    if(this.props.annos['image']['isFirst'] == true){
      return null
    }
    return (
      <Button type="button" onClick={() => this.prevImage()}>
        {this.state.posting?<Spinner animation="border" size="sm" />:'Previous Image'}
      </Button>
    );
  };

  renderNextButton = () => {
    return (
      <Button type="button" onClick={() => this.nextImage()}>
        {this.state.posting?<Spinner animation="border" size="sm" />:'Next Image'}
      </Button>
    );
  };

  renderFinishButton = () => {
    return (
      <Button type="button" onClick={() => this.finish()}>
        Finish
      </Button>
    );
  };

  getColorIndex = (data, labels, all_colors) => {
    for (let label_index = 0; label_index < labels.length; label_index++) {
      if (labels[label_index]["id"] == data["labelIds"][0]) {
        return label_index + 1;
      }
    }
  };

  drawOrigionalpoints = () => {
    let data = {};
    if (this.props.annos.annotations.points.length) {
      for (let i of this.props.annos.annotations.points) {
        let color_index = this.getColorIndex(i, this.props.labels, colors);
        if (i.data["x"] in data) {
        } else {
          data[i.data["x"]] = {};
        }
        this.labelDots(
          i.data["x"],
          i.data["y"],
          { id: i["labelIds"][0], color_id: color_index },
          0.1,
          false
        );
        data[i.data["x"]][i.data["y"]] = {
          label_id: i.labelIds[0],
          id: i["id"]
        };
      }
      this.points_label_map_original = data;
    }
  };

  componentWillUnmount() {
    document.removeEventListener("keydown", this.keyDown, false);
    document.removeEventListener("keyup", this.keyUp, false);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.keyDown, false);
    document.addEventListener("keyup", this.keyUp, false);
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext("2d");
    var _img_ = new Image();

    _img_.onload = () => {
      let _marinLeft = (this.props.imageId % 10) + minimum_left_margin;
      let _marinTop = (this.props.imageId % 10) + minimum_top_margin;
      this.setState(
        {
          width: _img_.width,
          height: _img_.height,
          marginLeft: _marinLeft,
          marginTop: _marinTop
          // imageLoading: false
        },
        () => {
          ctx.drawImage(_img_, 0, 0);
          this.drawDefaultDots(ctx);
          this.drawOrigionalpoints();
        }
      );
    };

    // _img_.src = "https://www.telegraph.co.uk/content/dam/news/2017/11/11/Lam1_trans%2B%2BnAdySV0BR-4fDN_-_p756cVfcy8zLGPV4EhRkjQy7tg.jpg";
    _img_.src = this.props.imageUrl;

    canvas.addEventListener(
      "mousemove",
      evt => {
        if (this.isMouseDown == true && this.state.value !== null) {
          var mousePos = this.getMousePos(canvas, evt);
          this.labelDots(mousePos.x, mousePos.y, this.state.value, 9);
          this.redo_stack = [];
        }
      },
      false
    );

    canvas.addEventListener(
      "mousedown",
      evt => {
        this.isMouseDown = true;
      },
      false
    );

    canvas.addEventListener(
      "mouseup",
      evt => {
        this.isMouseDown = false;
        if (this.state.value !== null && this.temp_stack.length > 0) {
          this.undo_stack.push({
            points: this.temp_stack,
            id: this.state.value["id"],
            color_id: this.state.value["color_id"]
          });
          this.temp_stack = [];
        }
      },
      false
    );

    canvas.addEventListener(
      "mouseleave",
      evt => {
        this.isMouseDown = false;
        if (this.state.value !== null && this.temp_stack.length > 0) {
          this.undo_stack.push({
            points: this.temp_stack,
            id: this.state.value["id"],
            color_id: this.state.value["color_id"]
          });
          this.temp_stack = [];
        }
      },
      false
    );
  }

  render() {
    return (
      <div style={{ overflow: "auto", backgroundColor: "grey" }}>
        {this.state.redirect ? <Redirect to="/dashboard" /> : null}
        <div style={{ textAlign: "center", color: "white", marginBottom: 30 }}>
          {this.props.annos.image.url}
        </div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div
            style={{
              marginLeft: 10
            }}
          >
            {this.renderPreviousButton()}
          </div>
          <div className="left-control">{this.renderLeftSideControls()}</div>
          <canvas
            // id="canvasid"
            ref="canvas"
            width={this.state.width}
            height={this.state.height}
          />
          <div
            style={{
              marginLeft: 10,
              marginRight: 20
            }}
          >
            {this.props.annos.image.isLast
              ? this.renderFinishButton()
              : this.renderNextButton()}
          </div>
        </div>
      </div>
    );
  }
}
export default Canvas;
