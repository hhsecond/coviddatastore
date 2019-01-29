
import { NodeTemplate, mouse,  } from "l3p-frontend"

import DrawableView from "../DrawableView"

import DEFAULTS from "./point.defaults"
import "./point.styles.scss"

import imageInterface from "components/image/imageInterface"


export default class PointView extends DrawableView{
    constructor(config: any){
        super()
        const { position, isNoAnnotation } = config
        const { x, y } = position
        this.isNoAnnotation = isNoAnnotation
        this.html = new NodeTemplate(/*html*/`
            <svg class="sia-point drawable">
                <g data-ref="position-node" transform="translate(${x},${y})">
                    <g data-ref="container-node" 
                        transform="translate(
                            ${-DEFAULTS.getOutlineRadius(isNoAnnotation) - DEFAULTS.getRadius(isNoAnnotation)},
                            ${-DEFAULTS.getOutlineRadius(isNoAnnotation)})"
                    ></g>
                    <circle data-ref="collision-node"
                        r="${DEFAULTS.getRadius(isNoAnnotation)}"
                        fill="black">
                    </circle>
                    <circle data-ref="cursor-node"
                        r="${DEFAULTS.getOutlineRadius(isNoAnnotation)}" 
                        fill="transparent"
                        stroke="black"
                        stroke-width="${DEFAULTS.getStrokeWidth()}"
                        class="drawable-collision-node drawable-disabled">
                    </circle>
                </g>
            </svg>
        `)
        this.rootNode = this.html.root
        this.positionNode = this.html.refs["position-node"]
        this.cursorNode = this.html.refs["cursor-node"]
        this.collisionNode = this.html.refs["collision-node"]

        this.ccss = {
            rootNode: this.rootNode.style,
            positionNode: this.positionNode.style,
            collisionNode: this.collisionNode.style,
            cursorNode: this.cursorNode.style,
        }        
    }
    onZoomChange(zoom){
        this.html.refs["collision-node"].setAttribute("r", `${DEFAULTS.getRadius(this.isNoAnnotation)}`)
        this.html.refs["cursor-node"].setAttribute("r", `${DEFAULTS.getOutlineRadius(this.isNoAnnotation)}`)
        this.html.refs["cursor-node"].setAttribute("stroke-width", `${DEFAULTS.getStrokeWidth()}`)
    }

    hover(){
    }
    unhover(){
    }
    select(changeable: boolean){
        if(!changeable){
            this.cursorNode.classList.toggle("drawable-locked", true)
        }
        this.cursorNode.classList.toggle(mouse.CURSORS.MOVE.class, true)
    }
    unselect(){
        this.cursorNode.classList.toggle("drawable-locked", false)
        this.cursorNode.classList.toggle(mouse.CURSORS.MOVE.class, false)
    }

    // @extensible
    setPosition(coord: any){
        super.setPosition(coord)
    }

    // @required
    setColor(color: String){
        this.collisionNode.setAttribute("fill", color)
    }
    // @required
    setStrokeColor(color: String){
        this.cursorNode.setAttribute("stroke", color)
    }

    // @override
    bringToFront(){
        // If this is no Annotation append it again to the container it belongs to to appear above other points.
        if(this.html.root.drawablePresenter.model.isNoAnnotation){
            this.html.root.closest(`svg.drawable g[data-ref="points"]`).appendChild(this.html.root)
        } 
        // Else append this view again to the container it belongs to, to make it appear above all other drawables. (default from DrawableView.js)
        else {
            imageInterface.getDrawableContainer().appendChild(this.html.root)
        }
    }
}

