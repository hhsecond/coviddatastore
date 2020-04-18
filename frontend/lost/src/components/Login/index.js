import React, { Component } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import bgimage from "../../assets/hangar.jpg";
import "./index.css";

class Home extends Component {
  render() {
    return (
      <Col>
        <div
          className="row home-container"
          style={{
            backgroundImage: `url(${bgimage})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            height: "calc(100vh)",
            flex: 1
          }}
        >
          <div
            // className="flexBox"
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: "82%"
            }}
          >
            <div style={{ flex: 1 }}>
              <div className="col content">
                <h1 className="title">Hangar</h1>
                <p className="desc" style={{ fontSize: 25 }}>
                  A Version Control for Tensor Data. Commit, branch, merge,
                  revert, and collaborate in the data-defined software era.
                </p>
                <Button
                  // variant="primary"
                  className="btn-large"
                  onClick={() => {
                    window.open(
                      "https://hangar-py.readthedocs.io/en/latest/index.html",
                      "_blank"
                    );
                  }}
                >
                  Explore
                </Button>
              </div>
            </div>
            <div style={{ flex: 0.5, width: 10 }}>
              {/* <Form onChange={this.props.onChange} onSubmit={this.props.onSubmit}>
                <Form.Group controlId="formBasicEmail">
                  <Form.Label class="labelForm">Email address</Form.Label>
                  <Form.Control placeholder="Enter email" />
                  <Form.Text className="text-muted" />
                </Form.Group>

                <Form.Group controlId="formBasicPassword">
                  <Form.Label class="labelForm">Password</Form.Label>
                  <Form.Control type="password" placeholder="Password" />
                </Form.Group>
                <br />
                <Button className="buttonForm" variant="primary" type="submit">
                  Submit
                </Button>
              </Form> */}
              {/* <form onSubmit={()=>{alert('kk')}}> */}
                <div style={{ color: "white", fontSize: 20, marginBottom: 10 }}>
                  Username:{" "}
                </div>
                <div style={{marginBottom: 20}}>
                  <input
                    style={{height: 30, width: 180, fontSize: 15}}
                    name="username"
                    type="text"
                    value={this.props.username}
                    onChange={this.props.onChange}
                  />
                </div>
                <div style={{ color: "white", fontSize: 20, marginBottom: 10 }}>
                  Password:{" "}
                </div>
                <div style={{marginBottom: 20}}>
                <input
                style={{height: 30, width: 180, fontSize: 15}}
                  name="password"
                  type="password"
                  value={this.props.passsword}
                  onChange={this.props.onChange}
                />
                </div>
                <Button onClick={this.props.onSubmit} className="buttonForm" variant="primary" type="submit">
                  Submit
                </Button>
                {/* <input style={{backgroundColor:'#f5a540', width:90, height: 30}}  type="submit" value="Submit" /> */}
              {/* </form> */}
            </div>
          </div>
        </div>
      </Col>
    );
  }
}

export default Home;
