import React from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { Redirect } from "react-router-dom";

import { API_URL } from "../../settings";

import "./index.css";
import Grid from "../Grid";

let colors = {};
let label_id_to_label = {};
let hovered_points = [[], []];
let hovered_coordinates = [[], []];
// let points_to_delete = 
let xOffsetAddition = 11;
let yOffsetAddition = 15;

let controlPressed = false;
let zPrressed = false;

function InstructionModal(props) {
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Instructions
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ol>
          <li>Select a label from radio button below</li>
          <li>Click and hover over the points on image to annotate</li>
          <li>Label can be changed as desired</li>
          <li>
            Click on next image or previous image button to save annotation
          </li>
        </ol>
        - Arrow keys can be used to navigate over image when zoomed in.
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default class Image extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    this.state = {
      imageLoaded: false,
      imageDimentions: { width: null, height: null },
      boxDimention: { width: null, height: null },
      modalShow: false,
      posting: false,
      xOffset: 0,
      yOffset: 0,
      is_undo_disabled: false,
      canAnnotate: true,

      // history_row_columns: [[], []],
      // history_coordinates: [[], []],
      history_row_columns: [],
      history_coordinates: [],
      is_mousedown: false,

      rows_columns_data: {},
      coordinates_data: {},
      static_data: {
        imageUrl: null,
        data: {}
      },
      colors: {},
      // final_data: [],

      points_to_label_mapping: [{}, {}],
      value: { label: null, id: null },
      color: null
    };
  }

  keyDown = e => {
    // console.log(e.keyCode, 'keydown')
    if (controlPressed == false && e.keyCode == 17) {
      controlPressed = true;
    }
    if (controlPressed == true && zPrressed == false && e.keyCode == 90) {
      console.log("YEY");
      this.undo();
    }

    if (zPrressed == false && e.keyCode == 90) {
      zPrressed = true;
    }
  };

  keyUp = e => {
    // console.log(e.keyCode, 'keyup')
    if (zPrressed == true && e.keyCode == 90) {
      zPrressed = false;
    }
    if (controlPressed == true && e.keyCode == 17) {
      controlPressed = false;
    }
  };

  componentDidMount() {
    document.addEventListener("keydown", this.keyDown, false);
    document.addEventListener("keyup", this.keyUp, false);
    this.random_offset = {
      // removing addition of 1 will be breaking change
      x: (this.props.imageId % 9) + 1,
      y: (this.props.imageId % 6) + 5
    };
    this.setState({
      xOffset: this.random_offset.x,
      yOffset: this.random_offset.y * -1
    });
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.keyDown, false);
    document.removeEventListener("keyup", this.keyUp, false);
  }

  reset = func => {
    this.setState(
      {
        // history_row_columns: [[], []],
        // history_coordinates: [[], []],
        history_row_columns: [],
        history_coordinates: [],
        rows_columns_data: {},
        coordinates_data: {},
        is_undo_disabled: false,
        redirect: false,
        static_data: {
          imageUrl: null,
          data: {}
        },
        // final_data: [],
        points_to_label_mapping: [{}, {}],
        imageLoaded: false,
        value: { label: null, id: null },
        color: null
      },
      () => {
        func();
      }
    );
  };

  onImgLoad = ({ target: img }) => {
    // alert(img.offsetHeight+'   '+img.offsetWidth)
    this.setStateWrapper({
      imageDimentions: { height: img.offsetHeight, width: img.offsetWidth },
      imageLoaded: true
    });
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (this.state.static_data.imageUrl != this.props.imageUrl) {
      let data = {};
      if (this.props.annos.annotations.polygons.length) {
        for (let i of this.props.annos.annotations.polygons) {
          for (let j of i.data) {
            if (j.x in data) {
            } else {
              data[j.x] = {};
            }
            data[j.x][j.y] = i.labelIds[0];
          }
        }
      }
      let _colors = {};
      if (Object.keys(this.state.colors).length == 0) {
        if (Object.keys(colors).length == 0) {
        } else {
          _colors = colors;
        }
      }

      this.setState({
        static_data: {
          imageUrl: this.props.imageUrl,
          data: data
        },
        colors: _colors
      });
    }
  };

  setStateWrapper = key_value_dict => {
    this.setState(key_value_dict);
  };

  addToHistory = () => {
    let _history_row_columns = this.state.history_row_columns;
    let _label = this.state.value.id;
    // console.log("&&&&&&&&&&", hovered_points)
    // let temp1 = { [_label]: hovered_points[0] };
    // let temp2 = { [_label]: hovered_points[1] };
    // _history_row_columns[0].push(temp1);
    // _history_row_columns[1].push(temp2);
    _history_row_columns.push({
      label: _label,
      points: [hovered_points[0], hovered_points[1]],
      [_label]: [hovered_points[0], hovered_points[1]]
    });
    // this.setState({ history_row_columns: _history_row_columns });

    let _history_coordinates = this.state.history_coordinates;
    // temp1 = { [_label]: hovered_coordinates[0] };
    // temp2 = { [_label]: hovered_coordinates[1] };
    // _history_coordinates[0].push(temp1);
    // _history_coordinates[1].push(temp2);
    _history_coordinates.push({
      label: _label,
      points: [hovered_coordinates[0], hovered_coordinates[1]],
      [_label]: [hovered_coordinates[0], hovered_coordinates[1]]
    });
    return [_history_row_columns, _history_coordinates];
    // this.setState({ history_coordinates: _history_coordinates });
  };

  addAnnotiation = () => {
    let _label = this.state.value.id;
    let _rows_columns_data = this.state.rows_columns_data;
    let _coordinates_data = this.state.coordinates_data;
    try {
      if (_label in _rows_columns_data) {
        _rows_columns_data[_label].concat(hovered_points[0]);
        _rows_columns_data[_label].concat(hovered_points[1]);
        _coordinates_data[_label].concat(hovered_coordinates[0]);
        _coordinates_data[_label].concat(hovered_coordinates[1]);
      } else {
        _rows_columns_data[_label] = [
          ...hovered_points[0],
          ...hovered_points[1]
        ];
        _coordinates_data[_label] = [
          ...hovered_coordinates[0],
          ...hovered_coordinates[1]
        ];
      }
    } catch (e) {
      console.log(_coordinates_data, "!!!!!!!!!!!!!!!!!!!!!!!!!!!!", _label);
    }
    return [_rows_columns_data, _coordinates_data];
  };

  changePointsLabels = () => {
    let _label = this.state.value.id;
    let _points_to_label_mapping = this.state.points_to_label_mapping;
    let ii = 0;
    while (ii < 2) {
      for (let i = 0; i < hovered_points[ii].length; i++) {
        if (hovered_points[ii][i][0] in _points_to_label_mapping[ii]) {
          if (
            hovered_points[ii][i][1] in
            _points_to_label_mapping[ii][hovered_points[ii][i][0]]
          ) {
          } else {
            _points_to_label_mapping[ii][hovered_points[ii][i][0]][
              hovered_points[ii][i][1]
            ] = { label_id: _label, colors: colors[_label] };
          }
        } else {
          _points_to_label_mapping[ii][hovered_points[ii][i][0]] = {
            [hovered_points[ii][i][1]]: {
              label_id: _label,
              colors: colors[_label]
            }
          };
        }
      }
      ii++;
    }

    return _points_to_label_mapping;
  };

  changeCanAnnotate = async value => {
    return new Promise(resolve => {
      this.setState({ canAnnotate: value }, resolve);
    });
  };

  // called when label is submitted
  handleSubmit = async () => {
    if (hovered_points[0].length || hovered_points[1].length) {
      await this.changeCanAnnotate(false);
      let changeHistoryData = this.addToHistory();
      let addAnnotiationData = this.addAnnotiation();
      let changePointsLabelsData = this.changePointsLabels();

      //resetting the hovered data after
      hovered_points = [[], []];
      hovered_coordinates = [[], []];

      return new Promise(resolve => {
        this.setState(
          {
            history_row_columns: changeHistoryData[0],
            history_coordinates: changeHistoryData[1],
            // rows_columns_data: addAnnotiationData[0],
            coordinates_data: addAnnotiationData[1],
            points_to_label_mapping: changePointsLabelsData,
            canAnnotate: true
          },
          resolve
        );
      });
    }
  };

  addToHoveredPoints = (x, y, row, column, grid_number) => {
    hovered_points[grid_number].push([row, column]);
    hovered_coordinates[grid_number].push([x, y]);
  };

  removePointFromLabel = (x, y, row, column, grid_number, label_id) => {
    let _coordinates_data = this.state.coordinates_data
    let _index = _coordinates_data[label_id].findIndex(
      element =>
        element[0] == x &&
        element[1] == y
    );
    // console.log("*************", x, y, row, column, grid_number, label_id, this.state.coordinates_data, _index)
    this.setState({coordinates_data:_coordinates_data}, this.addToHoveredPoints(x, y, row, column, grid_number))
    if (_index >= 0) {
      if (_coordinates_data[label_id].length == 1) {
        delete _coordinates_data[label_id];
      } else {
        _coordinates_data[label_id].splice(_index, 1);
      }
    }else{

    }
    // addToHoveredPoints
    // hovered_points[grid_number].push([row, column]);
    // hovered_coordinates[grid_number].push([x, y]);
  };

  // removeFromHoveredPoints = (x, y, row, column, grid_number) => {
  removeFromHoveredPoints = (
    coordinates_list,
    row_column_list,
    grid_number
  ) => {
    let _coordinates_data = this.state.coordinates_data;
    let _points_to_label_mapping = this.state.points_to_label_mapping;
    for (let i = 0; i < coordinates_list.length; i++) {
      for (let key in _coordinates_data) {
        let _index = _coordinates_data[key].findIndex(
          element =>
            element[0] == coordinates_list[i][0] &&
            element[1] == coordinates_list[i][1]
        );
        if (_index >= 0) {
          if (_coordinates_data[key].length == 1) {
            delete _coordinates_data[key];
          } else {
            _coordinates_data[key].splice(_index, 1);
          }
        }
      }

      if (
        row_column_list[i][0] in _points_to_label_mapping[grid_number] &&
        row_column_list[i][1] in
          _points_to_label_mapping[grid_number][row_column_list[i][0]]
      ) {
        delete _points_to_label_mapping[grid_number][row_column_list[i][0]][
          row_column_list[i][1]
        ];
      }
    }

    this.setState({
      coordinates_data: _coordinates_data,
      points_to_label_mapping: _points_to_label_mapping
    });
  };

  setModalShow = value => {
    this.setState({ modalShow: value });
  };

  onClickNextButton = async imageProp => {
    await this.handleSubmit();
    if (Object.keys(this.state.coordinates_data).length !== 0) {
      this.postAnnotationAsync().then(data => {
        this.setState({ posting: false }, () => {
          this.reset(this.props.nextImage);
        });
      });
    } else {
      this.reset(this.props.nextImage);
    }
  };

  onClickFinishButton = async imageProp => {
    await this.handleSubmit();
    if (Object.keys(this.state.coordinates_data).length !== 0) {
      this.postAnnotationAsync().then(data => {
        this.setState({ redirect: true });
      });
    } else {
      this.setState({ redirect: true });
    }
  };

  renderNextButton = () => {
    if (this.state.redirect) {
      return <Redirect to="/dashboard" />;
    }
    if (this.props.annos.image.isLast) {
      return (
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            this.onClickFinishButton();
          }}
        >
          Finish
        </Button>
      );
      //
    } else {
      return (
        <Button
          type="button"
          disabled={this.state.posting}
          onClick={() => {
            this.onClickNextButton();
          }}
        >
          {this.state.posting ? (
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          ) : (
            "Next Image"
          )}
        </Button>
      );
    }
  };

  postAnnotationAsync = () => {
    let payload;
    let data = [];
    let label_data = {};
    for (let key in this.state.coordinates_data) {
      label_data = {
        labelIds: [key],
        mode: "view",
        status: "new",
        type: "polygon",
        data: []
      };
      for (let co of this.state.coordinates_data[key]) {
        label_data["data"].push({ x: co[0], y: co[1] });
      }
      data.push(label_data);
    }
    payload = {
      imgId: this.props.imageId,
      imgLabelIds: [],
      imgLabelChanged: false,
      annotations: {
        bBoxes: [],
        lines: [],
        points: [],
        polygons: data
      },
      isJunk: null
    };
    this.setState({ posting: true });

    return axios
      .post(API_URL + "/sia/update", payload)
      .then(response => {
        return response;
      })
      .catch(e => {
        return e;
      });
    // return axios.get(API_URL + '/sia/label').then((response)=>{return response}).catch(e=> {return e} )
  };

  renderPrevButton = () => {
    return (
      <Button
        type="button"
        disabled={this.state.posting}
        onClick={() => {
          this.onClickPrevButton();
        }}
      >
        Previous Image
      </Button>
    );
  };

  onClickPrevButton = async imageProp => {
    await this.handleSubmit();
    if (Object.keys(this.state.coordinates_data).length !== 0) {
      this.postAnnotationAsync().then(data => {
        this.setState({ posting: false }, () => {
          this.reset(this.props.prevImage);
        });
      });
    } else {
      this.reset(this.props.prevImage);
    }
  };

  onChangeOfLabel = async (value, index) => {
    await this.handleSubmit();
    if (value.label == "erase") {
      this.setState({
        value: { label: value.label, id: value.id },
        color: "grey"
      });
    } else {
      this.setState({
        value: { label: value.label, id: value.id },
        color: this.props.colors[index]
      });
    }
  };

  undo = async () => {
    await this.changeCanAnnotate(false);
    if (this.state.history_coordinates.length > 0) {
      let _history_coordinates = this.state.history_coordinates;
      let _history_row_columns = this.state.history_row_columns;
      let _last_element_coordinates =
        _history_coordinates[_history_coordinates.length - 1];
      let _last_element_row_column =
        _history_row_columns[_history_row_columns.length - 1];
      _history_coordinates.pop();
      _history_row_columns.pop();
      this.removeFromHoveredPoints(
        _last_element_coordinates["points"][0],
        _last_element_row_column["points"][0],
        0
      );
      this.removeFromHoveredPoints(
        _last_element_coordinates["points"][1],
        _last_element_row_column["points"][1],
        1
      );
      this.setState({
        history_coordinates: _history_coordinates,
        history_row_columns: _history_row_columns,
        is_undo_disabled: false,
        canAnnotate: true
      });
    } else {
      if (this.state.is_undo_disabled == true) {
        this.setState({
          is_undo_disabled: false,
          canAnnotate: true
        });
      }
    }
  };

  renderLabels = () => {
    return (
      <React.Fragment>
        <div className="input-screen-erase">
          <input
            type="radio"
            checked={this.state.value.label === "erase"}
            name="colors"
            onChange={e => {
              this.onChangeOfLabel({ label: "erase", id: -1 }, -1);
            }}
          />
          <div style={{ marginLeft: 20 }}>{"Erase annotated points"}</div>
        </div>
        {this.props.labels.map((value, index) => {
          if (value.label in colors) {
          } else {
            colors[value.id] = this.props.colors[index];
          }
          if (value.id in label_id_to_label) {
          } else {
            label_id_to_label[value.id] = value.label;
          }

          return (
            <div className="input-screen">
              <input
                type="radio"
                checked={value.label === this.state.value.label}
                name="colors"
                onChange={e => {
                  this.onChangeOfLabel(value, index);
                }}
              />
              <div style={{ marginLeft: 10 }}>{value.label}</div>
              <div
                style={{
                  marginLeft: 10,
                  backgroundColor: this.props.colors[index],
                  height: 10,
                  width: 10
                }}
              />
            </div>
          );
        })}
      </React.Fragment>
    );
  };

  renderImage = () => {
    return (
      <div
        onMouseDown={e => {
          this.setStateWrapper({ is_mousedown: true });
        }}
        onMouseUp={e => {
          this.setStateWrapper({ is_mousedown: false }, this.handleSubmit());
        }}
        id="imageComponent"
        style={{
          width: this.state.imageDimentions.width
            ? this.state.imageDimentions.width
            : 0,
          margin: "auto",
          position: "relative"
        }}
        className="selectDisable"
      >
        <img
          ref={this.myRef}
          alt="annotation display"
          onLoad={this.onImgLoad}
          src={this.props.imageUrl}
          className="image"
          draggable="false"
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            marginTop: this.state.yOffset,
            left: this.state.xOffset,
            width: this.state.imageDimentions.width
              ? this.state.imageDimentions.width + 30
              : 0
          }}
        >
          <Grid
            xOffsetAddition={0}
            yOffsetAddition={0}
            xOffset={this.state.xOffset}
            yOffset={this.state.yOffset}
            random_offset={this.random_offset}
            colors={this.state.colors}
            static_data={this.state.static_data}
            imageRef={this.myRef}
            xMargin={
              this.myRef.current
                ? this.myRef.current.getBoundingClientRect()["x"]
                : null
            }
            yMargin={
              this.myRef.current
                ? this.myRef.current.getBoundingClientRect()["y"]
                : null
            }
            color={this.state.color}
            label={this.state.value.label}
            label_id={this.state.value.id}
            image_url={this.props.imageUrl}
            key={"0grid"}
            grid_number={0}
            points_to_label_mapping={this.state.points_to_label_mapping[0]}
            rows_columns_data={this.state.rows_columns_data}
            addToHoveredPoints={this.addToHoveredPoints}
            removeFromHoveredPoints={this.removeFromHoveredPoints}
            imageDimentions={this.state.imageDimentions}
            is_mousedown={this.state.is_mousedown}
            removePointFromLabel={this.removePointFromLabel}
          />
        </div>

        <div
          // onMouseDown={e => {
          //   this.setStateWrapper({ is_mousedown: true });
          // }}
          // onMouseUp={e => {
          //   this.setStateWrapper({ is_mousedown: false }, this.handleSubmit());
          //   // await this.handleSubmit();
          // }}
          style={{
            position: "absolute",
            top: yOffsetAddition,
            marginTop: this.state.yOffset,
            left: this.state.xOffset + xOffsetAddition,
            width: this.state.imageDimentions.width
              ? this.state.imageDimentions.width + 30
              : 0
          }}
        >
          <Grid
            xOffsetAddition={xOffsetAddition}
            yOffsetAddition={yOffsetAddition}
            xOffset={this.state.xOffset}
            yOffset={this.state.yOffset}
            random_offset={this.random_offset}
            colors={this.state.colors}
            static_data={this.state.static_data}
            imageRef={this.myRef}
            xMargin={
              this.myRef.current
                ? this.myRef.current.getBoundingClientRect()["x"]
                : null
            }
            yMargin={
              this.myRef.current
                ? this.myRef.current.getBoundingClientRect()["y"]
                : null
            }
            color={this.state.color}
            label={this.state.value.label}
            label_id={this.state.value.id}
            image_url={this.props.imageUrl}
            key={"1grid"}
            grid_number={1}
            points_to_label_mapping={this.state.points_to_label_mapping[1]}
            rows_columns_data={this.state.rows_columns_data}
            addToHoveredPoints={this.addToHoveredPoints}
            removeFromHoveredPoints={this.removeFromHoveredPoints}
            imageDimentions={this.state.imageDimentions}
            is_mousedown={this.state.is_mousedown}
            removePointFromLabel={this.removePointFromLabel}
          />
        </div>
      </div>
    );
  };

  renderControls = () => {
    return (
      <div
        style={{
          // marginTop: 10,
          // borderStyle: "solid",
          // borderColor: "red",
          justifyContent: "space-around"
        }}
        className="center-screen"
      >
        <div>
          <div style={{ marginBottom: 5, textDecoration: "underline" }}>
            <b>Select a label</b>
          </div>
          {this.props.labels.length ? this.renderLabels() : null}

          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <Button
              variant="warning"
              type="button"
              onClick={() => this.setModalShow(true)}
            >
              Instructions
            </Button>

            <InstructionModal
              show={this.state.modalShow}
              onHide={() => this.setModalShow(false)}
            />
          </div>
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <Button
              variant="danger"
              type="button"
              onClick={() => this.reset(() => {})}
            >
              Delete All Unsaved Annotations
            </Button>
          </div>
          <div
            style={{
              marginTop: 20,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-around"
            }}
          >
            <Button
              variant="warning"
              type="button"
              disabled={this.state.is_undo_disabled}
              onClick={() => {
                this.setState({ is_undo_disabled: true }, this.undo);
              }}
            >
              Undo
            </Button>
            <Button
              variant="warning"
              type="button"
              onClick={() => this.reset(() => {})}
            >
              Redo
            </Button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    console.log(
      "!!!!!@@@@@!!!!!",
      this.state.coordinates_data
    );
    if (document.getElementById("imageComponent")) {
      document.getElementById("imageComponent").style.cursor = this.state
        .canAnnotate
        ? "crosshair"
        : "wait";
    }
    if (document.getElementById("container")) {
      if (this.state.canAnnotate) {
        document.getElementById("container").style.cursor = "auto";
      } else {
        document.getElementById("container").style.cursor = "wait";
      }
    }
    return (
      <div
        id="imageParent"
        style={{ backgroundColor: "grey", overflow: "auto" }}
        id="container"
      >
        <div style={{ textAlign: "center", color: "white", marginBottom: 30 }}>
          {this.props.annos.image.url}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            marginLeft: 20,
            marginRight: 20
          }}
        >
          <div style={{ marginTop: 30 }}>{this.renderPrevButton()}</div>
          <div style={{ flex: 0.5 }}>{this.renderControls()}</div>
          <div style={{ flex: 2.5 }}>
            {this.state.xOffset == 0 || this.state.yOffset == 0
              ? null
              : this.renderImage()}
          </div>
          <div style={{ marginTop: 30 }}>{this.renderNextButton()}</div>
        </div>
        <div style={{ marginBottom: 30, height: 30 }} />
      </div>
    );
  }
}
