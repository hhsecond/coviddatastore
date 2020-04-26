import React from "react";
import "./index.css";
import Point from "../Points";

export default class Grid extends React.Component {
  constructor(props) {
    super(props);
  }

  point_label_data = (i, num_columns) => {
    try {
      return this.props.points_to_label_mapping[num_columns][i];
    } catch (e) {
      return null;
    }
  };

  renderColumn = (num_columns, num_points) => {
    let _num = num_points;
    let _list = [];
    let i = 0;
    for (i = 0; i < _num; i++) {
      _list.push(
        <Point
          xOffsetAddition={this.props.xOffsetAddition}
          yOffsetAddition={this.props.yOffsetAddition}
          xOffset={this.props.xOffset}
          yOffset={this.props.yOffset}
          imageRef={this.props.imageRef}
          colors={this.props.colors}
          static_data={this.props.static_data}
          xMargin={this.props.xMargin}
          yMargin={this.props.yMargin}
          color={this.props.color}
          label={this.props.label}
          label_id={this.props.label_id}
          imageUrl={this.props.imageUrl}
          key={num_columns.toString() + "_" + i.toString()}
          column={i}
          row={num_columns}
          grid_number={this.props.grid_number}
          label_data={this.point_label_data(i, num_columns)}
          removeHoveredPoints={this.props.removeHoveredPoints}
          row_column={num_columns.toString() + "_" + i.toString()}
          addToHoveredPoints={this.props.addToHoveredPoints}
          is_mousedown={this.props.is_mousedown}
          imageDimentions={this.props.imageDimentions}
          removedFromHoveredPoints={this.props.removedFromHoveredPoints}
        />
      );
    }
    return _list;
  };

  renderRow = () => {
    let num_rows = Math.floor(this.props.imageDimentions.height / 21);
    let num_points = Math.floor(this.props.imageDimentions.width / 23) + 1;
    let _list = [];
    let i = 0;
    for (i = 0; i < num_rows - 1; i++) {
      _list.push(
        <div
          style={{ height: 22 }}
          key={i.toString() + "_" + this.props.grid_number.toString()}
          onMouseDown={() => {}}
        >
          {this.props.static_data.imageUrl
            ? this.renderColumn(i, num_points)
            : null}
        </div>
      );
    }
    return _list;
  };

  render() {
    return <div>{this.renderRow()}</div>;
  }
}
