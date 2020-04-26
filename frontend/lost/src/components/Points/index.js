import React from "react";
import "./index.css";

export default class Point extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    this.state = {
      backgroundColor: "grey",
      label: null,
      imageUrl: this.props.imageUrl
    };
    [this.row, this.column] = this.props.row_column.split("_");
  }

  setStateWrapper = key_value_dict => {
    this.setState(key_value_dict);
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (prevProps.label_data) {
      if (this.props.label_data) {
      } else {
        this.setState({ backgroundColor: "grey" });
      }
    }
  };

  componentDidMount() {
    let xCoordinate = this.getXCoordinate(
      this.props.row,
      this.props.column,
      this.props.xOffset + this.props.xOffsetAddition,
      this.myRef.current.getBoundingClientRect()["width"]
    );
    let yCoordinate = this.getYCoordinate(
      this.props.row,
      this.props.column,
      this.props.yOffset + 11 + this.props.yOffsetAddition,
      this.myRef.current.getBoundingClientRect()["height"]
    );
    if (
      xCoordinate in this.props.static_data.data &&
      yCoordinate in this.props.static_data.data[xCoordinate]
    ) {
      this.setState({
        backgroundColor: this.props.colors[
          this.props.static_data.data[xCoordinate][yCoordinate]
        ]
      });
    }
  }

  getXCoordinate = (row, column, xOffset, width) => {
    let xCoordinate = null;
    if (column > 0) {
      xCoordinate = xOffset + width + (column - 1) * (20 + width) + 20;
    } else {
      xCoordinate = xOffset;
    }
    return xCoordinate + 2;
  };

  getYCoordinate = (row, column, yOffset, height) => {
    let yCoordinate = null;
    if (row > 0) {
      yCoordinate = yOffset + row * 22;
    } else {
      yCoordinate = yOffset;
    }

    return yCoordinate + 2;
  };

  onHover = e => {
    if (this.props.is_mousedown) {
      let xCoordinate = this.getXCoordinate(
        this.props.row,
        this.props.column,
        this.props.xOffset + this.props.xOffsetAddition,
        this.myRef.current.getBoundingClientRect()["width"]
      );
      let yCoordinate = this.getYCoordinate(
        this.props.row,
        this.props.column,
        this.props.yOffset + 11 + this.props.yOffsetAddition,
        this.myRef.current.getBoundingClientRect()["height"]
      );
      if (this.props.color == "grey") {
        if (this.state.backgroundColor !== "grey") {
          if (
            xCoordinate in this.props.static_data.data &&
            yCoordinate in this.props.static_data.data[xCoordinate]
          ) {
          } else {
            this.props.removedFromHoveredPoints(
              Math.round(xCoordinate),
              Math.round(yCoordinate),
              parseInt(this.row),
              parseInt(this.column),
              this.props.grid_number
            );
            //reset
          }
        }
      } else {
        if (
          this.state.label === null &&
          this.state.backgroundColor === "grey"
        ) {
          if (this.props.color) {
            if (
              yCoordinate <= this.props.imageDimentions.height &&
              xCoordinate <= this.props.imageDimentions.width
            ) {
              this.setStateWrapper({ backgroundColor: this.props.color });
              this.props.addToHoveredPoints(
                Math.round(xCoordinate),
                Math.round(yCoordinate),
                parseInt(this.row),
                parseInt(this.column),
                this.props.grid_number
              );
            }
          }
        }
      }
    }
  };

  render() {
    return (
      <span
        ref={this.myRef}
        style={{ backgroundColor: this.state.backgroundColor }}
        onMouseOver={this.onHover}
      />
    );
  }
}
