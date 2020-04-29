import React, {Component} from 'react'
import {NavItem, NavLink} from 'reactstrap'
import {connect} from 'react-redux'
import actions from '../../../actions'
import {createHashHistory} from 'history'

const {changeView} = actions

const history = createHashHistory()

class ViewChanger extends Component {

    handleClick = role => {
        this
            .props
            .changeView(role, () => {
                history.push('/')
                window
                    .location
                    .reload()
            })
    }
    isActive(role) {
        if (this.props.view === role) {
            return true
        }
        return false
    }

    render() {
        if (this.props.roles !== undefined) {
            if (this.props.roles.indexOf('Designer') > -1) {
                return (
                    <React.Fragment>
                        <NavItem active={this.isActive('Designer')} className='px-3'>
                            <NavLink onClick={() => this.handleClick('Designer')} href='#'>Designer</NavLink>
                        </NavItem>
                        <NavItem active={this.isActive('Annotator')} style={{marginTop: -2}} className='px-3'>
                            <NavLink onClick={() => this.handleClick('Annotator')} href='#'>Dashboard</NavLink>
                        </NavItem>
                    </React.Fragment>
                )
            } else {
                return (
                    <React.Fragment>
                        <NavItem active={this.isActive('Annotator')} style={{marginTop: -2}} className='px-3'>
                            <NavLink onClick={() => this.handleClick('Annotator')} href='#'>Dashboard</NavLink>
                        </NavItem>
                    </React.Fragment>
                )
            }
        } else {
            return 'Loading...'
        }
    }
}

function mapStateToProps(state) {
    return {view: state.auth.view, roles: state.auth.roles}
}

export default connect(mapStateToProps, {changeView})(ViewChanger)
