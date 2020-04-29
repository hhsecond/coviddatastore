import React, { Component } from "react";
import { connect } from "react-redux";
import actions from "../../actions";
import "semantic-ui-css/semantic.min.css";

import "./lost-sia/src/SIA.scss";

import { createHashHistory } from "history";
import "react-notifications/lib/notifications.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ImageComponent from "../Image";
import "./style.css";

let colors = ["#00cc44", "#996633", "#ff3300", "#0099ff", "#ff00ff", "#ffff00", "#336600", "#ff6600"];

const {
  siaLayoutUpdate,
  getSiaAnnos,
  getSiaLabels,
  getSiaConfig,
  siaSetSVG,
  getSiaImage,
  siaUpdateAnnos,
  siaSendFinishToBackend,
  selectAnnotation,
  siaShowImgLabelInput,
  siaImgIsJunk,
  getWorkingOnAnnoTask,
  siaGetNextImage,
  siaGetPrevImage
} = actions;

class SIA extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fullscreenCSS: "",
      didMount: false,
      image: {
        id: undefined,
        data: undefined
      },
      layoutOffset: {
        left: 20,
        top: 0,
        bottom: 5,
        right: 5
      },
      notification: undefined
    };
    this.siteHistory = createHashHistory();

    // this.container = React.createRef()
    this.canvas = React.createRef();
  }

  componentDidMount() {
    // document.body.style.overflow = "hidden"
    this.setState({ didMount: true });
    window.addEventListener("resize", this.props.siaLayoutUpdate);
    this.props.getSiaAnnos(-1);
    this.props.getSiaLabels();
    this.props.getSiaConfig();
    // console.warn('We are not using real SIA config')
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.props.siaLayoutUpdate);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.getNextImage !== this.props.getNextImage) {
      if (this.props.getNextImage) {
        // const newAnnos = this.canvas.current.getAnnos();
        // this.canvas.current.unloadImage();
        // console.log("getNextImage newAnnos", newAnnos);
        this.setState({
          image: {
            id: undefined,
            data: undefined
          }
        });
        this.props.siaImgIsJunk(false);
        // this.props.siaUpdateAnnos(newAnnos).then(r => {
        //   console.log("SIA REQUEST: Updated Annos", r);
        this.props.getSiaAnnos(this.props.getNextImage);
        // });
      }
    }
    if (prevProps.getPrevImage !== this.props.getPrevImage) {
      if (this.props.getPrevImage) {
        // const newAnnos = this.canvas.current.getAnnos();
        // this.canvas.current.unloadImage();
        this.setState({
          image: {
            id: undefined,
            data: undefined
          }
        });
        this.props.siaImgIsJunk(false);
        // this.props.siaUpdateAnnos(newAnnos).then(() => {
        this.props.getSiaAnnos(this.props.getPrevImage, "prev");
        // });
      }
    }
    if (prevProps.annos !== this.props.annos) {
      // this.props.siaImgIsJunk(this.props.annos.image.isJunk);
    }
    if (prevProps.taskFinished !== this.props.taskFinished) {
      // const newAnnos = this.canvas.current.getAnnos();
      // this.props.siaUpdateAnnos(newAnnos).then(() => {
      //   this.props.siaSendFinishToBackend().then(() => {
      //     this.siteHistory.push("/dashboard");
      //   });
      // });
    }
    if (this.props.annos.image) {
      if (prevProps.annos.image) {
        if (this.props.annos.image.id !== prevProps.annos.image.id) {
          this.requestImageFromBackend();
        }
      } else {
        this.requestImageFromBackend();
      }
    }
  }

  requestImageFromBackend() {
    this.props.getSiaImage(this.props.annos.image.url).then(response => {
      this.setState({
        image: {
          // ...this.state.image,
          id: this.props.annos.image.id,
          data: window.URL.createObjectURL(response)
        }
      });
    });
    this.props.getWorkingOnAnnoTask();
  }

  render() {
    return (
      <div>
        {this.state.image.data ? (
          <ImageComponent
            labels={this.props.possibleLabels}
            colors={colors}
            annos={this.props.annos}
            imageUrl={this.state.image.data}
            imageId={this.state.image.id}
            prevImage={() => {
              this.props.siaGetPrevImage(this.state.image.id);
            }}
            nextImage={() => {
              this.props.siaGetNextImage(this.state.image.id);
            }}
          />
        ) : (
          <div className="loader-parent" style={{ marginTop: 270 }}>
            <div className="loader"></div>
          </div>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    fullscreenMode: state.sia.fullscreenMode,
    selectedAnno: state.sia.selectedAnno,
    svg: state.sia.svg,
    annos: state.sia.annos,
    getNextImage: state.sia.getNextImage,
    getPrevImage: state.sia.getPrevImage,
    uiConfig: state.sia.uiConfig,
    layoutUpdate: state.sia.layoutUpdate,
    selectedTool: state.sia.selectedTool,
    appliedFullscreen: state.sia.appliedFullscreen,
    imageLoaded: state.sia.imageLoaded,
    requestAnnoUpdate: state.sia.requestAnnoUpdate,
    taskFinished: state.sia.taskFinished,
    possibleLabels: state.sia.possibleLabels,
    imgLabelInput: state.sia.imgLabelInput,
    canvasConfig: state.sia.config,
    isJunk: state.sia.isJunk
  };
}

export default connect(
  mapStateToProps,
  {
    siaLayoutUpdate,
    getSiaAnnos,
    getSiaConfig,
    getSiaLabels,
    siaSetSVG,
    getSiaImage,
    siaUpdateAnnos,
    siaSendFinishToBackend,
    selectAnnotation,
    siaShowImgLabelInput,
    siaImgIsJunk,
    getWorkingOnAnnoTask,
    siaGetNextImage,
    siaGetPrevImage
  },
  null,
  {}
)(SIA);
