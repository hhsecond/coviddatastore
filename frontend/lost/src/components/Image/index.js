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
let xOffsetAddition = 11;
let yOffsetAddition = 15;

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

      history_row_columns: [[], []],
      history_coordinates: [[], []],
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

  componentDidMount() {
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

  reset = func => {
    this.setState(
      {
        history_row_columns: [[], []],
        history_coordinates: [[], []],
        rows_columns_data: {},
        coordinates_data: {},
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

  changeHistory = () => {
    let _history_row_columns = this.state.history_row_columns;
    let _label = this.state.value.id;
    let temp1 = { [_label]: hovered_points[0] };
    let temp2 = { [_label]: hovered_points[1] };
    _history_row_columns[0].push(temp1);
    _history_row_columns[1].push(temp2);
    this.setState({ history_row_columns: _history_row_columns });

    let _history_coordinates = this.state.history_coordinates;
    temp1 = { [_label]: hovered_coordinates[0] };
    temp2 = { [_label]: hovered_coordinates[1] };
    _history_coordinates[0].push(temp1);
    _history_coordinates[1].push(temp2);
    return _history_coordinates;
    // this.setState({ history_coordinates: _history_coordinates });
  };

  addAnnotiation = () => {
    let _label = this.state.value.id;
    let _rows_columns_data = this.state.rows_columns_data;
    let _coordinates_data = this.state.coordinates_data;
    if (_label in _rows_columns_data) {
      _rows_columns_data[_label].concat(hovered_points[0]);
      _rows_columns_data[_label].concat(hovered_points[1]);
      _coordinates_data[_label].concat(hovered_coordinates[0]);
      _coordinates_data[_label].concat(hovered_coordinates[1]);
    } else {
      _rows_columns_data[_label] = [...hovered_points[0], ...hovered_points[1]];
      _coordinates_data[_label] = [
        ...hovered_coordinates[0],
        ...hovered_coordinates[1]
      ];
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

  // called when label is submitted
  handleSubmit = () => {
    if (hovered_points[0].length || hovered_points[1].length) {
      // let changeHistoryData = this.changeHistory();
      let addAnnotiationData = this.addAnnotiation();
      let changePointsLabelsData = this.changePointsLabels();

      //resetting the hovered data after
      hovered_points = [[], []];
      hovered_coordinates = [[], []];

      return new Promise(resolve => {
        this.setState(
          {
            // history_coordinates: changeHistoryData,
            // rows_columns_data: addAnnotiationData[0],
            coordinates_data: addAnnotiationData[1],
            points_to_label_mapping: changePointsLabelsData
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

  removedFromHoveredPoints = (x, y, row, column, grid_number) => {
    let _coordinates_data = this.state.coordinates_data;
    let _points_to_label_mapping = this.state.points_to_label_mapping;
    for (let key in _coordinates_data) {
      let _index = _coordinates_data[key].findIndex(
        element => element[0] == x && element[1] == y
      );
      if (_index >= 0) {
        _coordinates_data[key].splice(_index, 1);
      }
    }

    if (
      row in _points_to_label_mapping[grid_number] &&
      column in _points_to_label_mapping[grid_number][row]
    ) {
      delete _points_to_label_mapping[grid_number][row][column];
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
          <div style={{marginLeft: 20}}>{"Erase annotated points"}</div>
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
        id="imageComponent"
        style={{
          width: 1100,
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
          onMouseDown={e => {
            this.setStateWrapper({ is_mousedown: true });
          }}
          onMouseUp={e => {
            this.setStateWrapper({ is_mousedown: false });
          }}
          style={{
            position: "absolute",
            top: 0,
            marginTop: this.state.yOffset,
            left: this.state.xOffset,
            width: 1120
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
            removeHoveredPoints={this.removeHoveredPoints}
            rows_columns_data={this.state.rows_columns_data}
            addToHoveredPoints={this.addToHoveredPoints}
            removedFromHoveredPoints={this.removedFromHoveredPoints}
            imageDimentions={this.state.imageDimentions}
            is_mousedown={this.state.is_mousedown}
          />
        </div>

        <div
          onMouseDown={e => {
            this.setStateWrapper({ is_mousedown: true });
          }}
          onMouseUp={e => {
            this.setStateWrapper({ is_mousedown: false });
          }}
          style={{
            position: "absolute",
            top: yOffsetAddition,
            marginTop: this.state.yOffset,
            left: this.state.xOffset + xOffsetAddition,
            width: 1120
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
            removeHoveredPoints={this.removeHoveredPoints}
            rows_columns_data={this.state.rows_columns_data}
            addToHoveredPoints={this.addToHoveredPoints}
            removedFromHoveredPoints={this.removedFromHoveredPoints}
            imageDimentions={this.state.imageDimentions}
            is_mousedown={this.state.is_mousedown}
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
              onClick={() => this.reset(()=>{})}
            >
              Delete Unsaved Annotations
            </Button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    if (document.getElementById("imageComponent")) {
      document.getElementById("imageComponent").style.cursor = "crosshair";
    }
    return (
      <div style={{ backgroundColor: "grey", overflow: "auto" }} id="container">
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
