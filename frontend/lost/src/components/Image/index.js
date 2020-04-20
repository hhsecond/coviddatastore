import React from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { Redirect } from "react-router-dom";

import { API_URL } from "../../settings";

import "./index.css";
import Grid from "../Grid";
import { state } from "l3p-frontend";

let colors = {};
let label_id_to_label = {};
let hovered_points = [[], []];
let hovered_coordinates = [[], []];

// {"imgId":3,"imgLabelIds":[],"imgLabelChanged":false,"annotations":{"bBoxes":[],"lines":[],"points":[{"type":"point","data":{"x":0.3122846765714825,"y":0.4170911048166566},"mode":"view","status":"new","labelIds":[35],"selectedNode":0},{"type":"point","data":{"x":0.6858377243959223,"y":0.3039049115771725},"mode":"view","status":"new","labelIds":[35],"selectedNode":0},{"type":"point","data":{"x":0.5839596204438023,"y":0.5727221205209473},"mode":"view","status":"new","labelIds":[36],"selectedNode":0}],"polygons":[]},"isJunk":null}
// http://localhost/api/sia/update
// {"imgId":13,"imgLabelIds":[],"imgLabelChanged":false,"annotations":{"bBoxes":[],"lines":[],"points":[],"polygons":[{"type":"polygon","data":[{"x":0.25513675614361775,"y":0.31026252983293556},{"x":0.4264470612919301,"y":0.4128878281622912},{"x":0.1974087964541426,"y":0.711217183770883},{"x":0.1974087964541426,"y":0.711217183770883}],"mode":"editLabel","status":"new","labelIds":[35],"selectedNode":3}]},"isJunk":null}

function MyVerticallyCenteredModal(props) {
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
          <li>Click and hover over the points on image</li>
          <li>Click Save when you are done with selecting points</li>
          <li>Repeat or go to next or previous image</li>
        </ol>
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
      x: this.props.imageId%10,
      y: this.props.imageId%6+5
    };
    this.setState({ xOffset: this.random_offset.x, yOffset: this.random_offset.y*-1});
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
          // if (value.label in colors) {
          // } else {
          //   colors[value.id] = this.props.colors[index];
          // }
          if (this.props.labels.length) {
            for (let i of this.props.labels) {
              // console.log("@@@@@@@labels", i)
            }
          }
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
    this.setState({ history_coordinates: _history_coordinates });
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
    this.setState({
      rows_columns_data: _rows_columns_data,
      coordinates_data: _coordinates_data
    });

    // let _final_data = this.state.final_data;
    // for (let i of hovered_coordinates[0]) {
    //   _final_data.push({
    //     "x": i[0], "y": i[1]

    //     // type: "polygon",
    //     // data: { x: i[0], y: i[1] },
    //     // mode: "editLabel",
    //     // status: "new",
    //     // labelIds: [this.state.value.id],
    //     // selectedNode: 0
    //   });
    // }
    // for (let i of hovered_coordinates[1]) {
    //   _final_data.push({
    //     type: "polygon",
    //     data: { x: i[0], y: i[1] },
    //     mode: "editLabel",
    //     status: "new",
    //     labelIds: [this.state.value.id],
    //     selectedNode: 0
    //   });
    // }
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
    this.setState({
      points_to_label_mapping: _points_to_label_mapping
    });
  };

  // called when label is submitted
  handleSubmit = () => {
    if (hovered_points[0].length || hovered_points[1].length) {
      this.changeHistory();
      this.addAnnotiation();
      this.changePointsLabels();

      //resetting the hovered data after
      hovered_points = [[], []];
      hovered_coordinates = [[], []];
    } else {
    }
    // this.setState({ label: null });
  };

  addToHoveredPoints = (x, y, row, column, grid_number) => {
    // if(y > this.state.imageDimentions.height){}else{
    x = x - this.myRef.current.getBoundingClientRect().left;
    hovered_points[grid_number].push([row, column]);
    hovered_coordinates[grid_number].push([x, y]);
    // }
  };

  setModalShow = value => {
    this.setState({ modalShow: value });
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
            this.setState({ redirect: true });
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
            if (hovered_points[0].length || hovered_points[1].length) {
              alert("unsaved data");
            } else {
              // this.reset(this.props.nextImage);
              if (Object.keys(this.state.coordinates_data).length !== 0) {
                this.postAnnotationAsync().then(data => {
                  this.setState({ posting: false }, () => {
                    this.reset(this.props.nextImage);
                  });
                });
              } else {
                this.reset(this.props.nextImage);
              }
            }
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

  render() {
    // console.log(
    //   "!!!!static_data",
    //   this.props.annos
    // );
    // if(this.myRef.current){
    //   console.log(this.myRef.current.getBoundingClientRect()["y"])
    // }else{
    //   console.log(this.myRef.current)
    // }
    return (
      <div style={{ backgroundColor: "grey" }}>
        <div style={{ textAlign: "center", color: "white", marginBottom: 30 }}>
          {this.props.annos.image.url}
        </div>
        <div
          style={{
            width: 1100,
            margin: "auto",
            position: "relative"
            // borderStyle: "solid",
            // borderColor: "grey",
            // borderWidth: 15,
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
          {/* {this.state.imageLoaded ? (
            <div
              onMouseDown={e => {
                this.setStateWrapper({ is_mousedown: true });
              }}
              onMouseUp={e => {
                this.setStateWrapper({ is_mousedown: false });
              }}
              className="overlay"
            >
              {
                <React.Fragment>
                  <Grid
                    random_offset={this.random_offset}
                    colors={this.state.colors}
                    static_data={this.state.static_data}
                    xMargin={this.myRef.current.getBoundingClientRect()["x"]}
                    yMargin={this.myRef.current?this.myRef.current.getBoundingClientRect()["y"]:null}
                    color={this.state.color}
                    label={this.state.value.label}
                    label_id={this.state.value.id}
                    image_url={this.props.imageUrl}
                    key={"0grid"}
                    grid_number={0}
                    points_to_label_mapping={
                      this.state.points_to_label_mapping[0]
                    }
                    removeHoveredPoints={this.removeHoveredPoints}
                    rows_columns_data={this.state.rows_columns_data}
                    addToHoveredPoints={this.addToHoveredPoints}
                    imageDimentions={this.state.imageDimentions}
                    is_mousedown={this.state.is_mousedown}
                  />
                </React.Fragment>
              }
            </div>
          ) : null} */}

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
              random_offset={this.random_offset}
              colors={this.state.colors}
              static_data={this.state.static_data}
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
              imageDimentions={this.state.imageDimentions}
              is_mousedown={this.state.is_mousedown}
            />
          </div>

          {/* {this.state.imageLoaded ? (
            <div
              onMouseDown={e => {
                this.setStateWrapper({ is_mousedown: true });
              }}
              onMouseUp={e => {
                this.setStateWrapper({ is_mousedown: false });
              }}
              className="overlay-new"
            >
              {
                <React.Fragment>
                  <Grid
                    random_offset={this.random_offset}
                    colors={this.state.colors}
                    static_data={this.state.static_data}
                    xMargin={this.myRef.current.getBoundingClientRect()["x"]}
                    yMargin={this.myRef.current?this.myRef.current.getBoundingClientRect()["y"]:null}
                    color={this.state.color}
                    label={this.state.value.label}
                    label_id={this.state.value.id}
                    imageUrl={this.props.imageUrl}
                    key={"1grid"}
                    grid_number={1}
                    points_to_label_mapping={
                      this.state.points_to_label_mapping[1]
                    }
                    removeHoveredPoints={this.removeHoveredPoints}
                    rows_columns_data={this.state.rows_columns_data}
                    addToHoveredPoints={this.addToHoveredPoints}
                    imageDimentions={this.state.imageDimentions}
                    is_mousedown={this.state.is_mousedown}
                  />
                </React.Fragment>
              }
            </div>
          ) : null} */}

          <div
            onMouseDown={e => {
              this.setStateWrapper({ is_mousedown: true });
            }}
            onMouseUp={e => {
              this.setStateWrapper({ is_mousedown: false });
            }}
            style={{
              position: "absolute",
              top: 7.5,
              marginTop: this.state.yOffset,
              left: this.state.xOffset+6,
              width: 1120
            }}
          >
            <Grid
              random_offset={this.random_offset}
              colors={this.state.colors}
              static_data={this.state.static_data}
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
              imageDimentions={this.state.imageDimentions}
              is_mousedown={this.state.is_mousedown}
            />
          </div>


        </div>
        {this.state.imageLoaded ? (
          <div
            style={{ marginTop: 10, marginBottom: 20 }}
            className="center-screen"
          >
            <Button
              type="button"
              disabled={this.state.posting}
              onClick={() => {
                if (hovered_points[0].length || hovered_points[1].length) {
                  alert("unsaved data");
                } else {
                  this.reset(this.props.prevImage);
                  // this.props.
                }
              }}
            >
              Previous Image
            </Button>

            <div>
              <div style={{ marginBottom: 5, textDecoration: "underline" }}>
                Select a label
              </div>
              {this.props.labels.length
                ? this.props.labels.map((value, index) => {
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
                            this.handleSubmit();
                            this.setState({
                              value: { label: value.label, id: value.id },
                              color: this.props.colors[index]
                            });
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
                  })
                : null}
              <Button
                style={{ marginTop: 10 }}
                type="button"
                onClick={() => {
                  this.handleSubmit();
                }}
              >
                SAVE
              </Button>

              <div style={{ marginTop: 20, marginBottom: 20 }}>
                <Button
                  variant="warning"
                  type="button"
                  onClick={() => this.setModalShow(true)}
                >
                  Instructions
                </Button>

                <MyVerticallyCenteredModal
                  show={this.state.modalShow}
                  onHide={() => this.setModalShow(false)}
                />
              </div>
            </div>
            {this.renderNextButton()}
          </div>
        ) : null}
      </div>
    );
  }
}
