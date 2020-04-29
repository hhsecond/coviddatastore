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
    if (column > 0) {
      return xOffset + width + (column - 1) * (14 + width) + 14 + width/2;
    } else {
      return xOffset + width/2;
    }
  };

  getYCoordinate = (row, column, yOffset, height) => {
    if (row > 0) {
      return yOffset + height + (row - 1) * (20 + height)+ 20 + height/2;
    } else {
      return yOffset + height/2;
    }
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
              xCoordinate,
              yCoordinate,
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
                xCoordinate,
                yCoordinate,
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
        className="span"
        ref={this.myRef}
        onMouseOver={this.onHover}
      >
        <div style={{display:'flex', flexDirection:'row', flexWrap: 'wrap'}}>
          <div style={{ width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
          <div style={{backgroundColor: this.state.backgroundColor, width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
          <div style={{ width:3, height:3}}></div>
        </div>
      </span>
    );
  }
}
