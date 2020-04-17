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

  renderColumn = (num_columns, num_rows) => {
    let _num = num_rows;
    let _list = [];
    let i = 0;
    for (i = 0; i < _num; i++) {
      _list.push(
        <Point
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
        />
      );
    }
    return _list;
  };

  renderRow = () => {
    let _num = Math.floor(this.props.imageDimentions.height / 20);
    // let _num = 9
    let num_rows = Math.floor(this.props.imageDimentions.width / 12) - 1;
    // let num_rows = 2;
    let _list = [];
    let i = 0;
    for (i = 0; i < _num-1; i++) {
      _list.push(
        <div
          key={i.toString() + "_" + this.props.grid_number.toString()}
          style={{}}
          onMouseDown={() => {}}
        >
          {this.props.static_data.imageUrl?this.renderColumn(i, num_rows):null}
        </div>
      );
    }
    return _list;
  };

  render() {
    return <div>{this.renderRow()}</div>;
  }
}
