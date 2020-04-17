import React, { Component } from "react"
import {connect} from 'react-redux'
import { 
	Col,
    Row
} from 'reactstrap'

import WorkingOnSIA from '../components/AnnoTask/WorkingOnSIA'
import SIA from '../components/SIA/SIA'

import actions from '../actions'
const { getWorkingOnAnnoTask } = actions


class SingleImageAnnotation extends Component {
	constructor(props){
		super(props)
		this.state = {
			image: undefined
		}
	}

	componentDidMount(){
		this.props.getWorkingOnAnnoTask()
	}

	render(){
		return (
			<React.Fragment>
				<WorkingOnSIA annoTask={this.props.workingOnAnnoTask}></WorkingOnSIA>
				<SIA></SIA>
			</React.Fragment>
		)
	}
}

function mapStateToProps(state) {
    return ({ workingOnAnnoTask: state.annoTask.workingOnAnnoTask})
}

export default connect(mapStateToProps, {getWorkingOnAnnoTask})(SingleImageAnnotation)