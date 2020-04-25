import React, { Component } from "react";
import PropTypes from "prop-types";

const propTypes = {
  children: PropTypes.node
};

const defaultProps = {};

class DefaultFooter extends Component {
  render() {
    // eslint-disable-next-line
    const { children, ...attributes } = this.props;

    return (
        <div style={{margin: "auto", marginTop: 30, marginBottom: 30 }}>
          <div style={{ fontSize: "large", textAlign:'center' }}>A platform to collaboratively annotate covid19 dataset</div>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width:210, marginLeft: 110}}>
            <div >Built with</div>
            <svg
              style={{ marginTop: 4 }}
              class="bi bi-heart-fill"
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
              fill="red"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"
                clip-rule="evenodd"
              />
            </svg>
            <div>. Powered by</div>
            <a href="https://hangar-py.readthedocs.io/en/latest/index.html">Hangar</a>
          </div>
        </div>
    );
  }
}

DefaultFooter.propTypes = propTypes;
DefaultFooter.defaultProps = defaultProps;

export default DefaultFooter;
