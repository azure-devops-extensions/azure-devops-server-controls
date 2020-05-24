/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IPoint, Constants, depthScaleModifier } from "DistributedTaskControls/Components/Canvas/Types";
import { PathBuilder } from "DistributedTaskControls/Components/Canvas/PathHelpers";

import * as StringUtils from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Canvas/Edge";

export interface IEdgeProps extends Base.IProps {
    
    from: IPoint;

    to: IPoint;

    /**
     * Indicates if the edge spans stages.
     */
    crossStages?: boolean;

    /**
     * Indicates the vertical displacement of from point. This information
     * is used to space edges. 
     */
    fromDepth?: number;

    /**
     * Indicates the vertical displacement of quadraticBezier
     * in edge
     */
    quadraticBezierVerticalDisplacement?: number;

    /**
     * Used in unit tests to show path labels.
     */
    showLabels?: boolean;
}

// Draws edge that is meant for a particular layout of graph that is used in CI/CD. 
export class Edge extends Base.Component<IEdgeProps, Base.IStateless> {

    public render(): JSX.Element {

        let { from, to } = this.props;
        let pathAttribute = StringUtils.empty;
        let fromDepth = this.props.fromDepth || 0;

        if (from.x > to.x) {
            Diag.logError("Edge can only be drawn from left to right.");
        }

        if (from.y === to.y || from.x === to.x) {

            /* Node --------- Node */

            // Just draw vertical line connecting points at same height or same depth or edges that run cross stages.
            pathAttribute = new PathBuilder().start(from).line(to).toString();
        }
        else {

            // This is an edge from top to bottom.
            let horizontalDistance = to.x - from.x;

            // Start the path builder from
            let pathBuilder = new PathBuilder().start(from);


            // Edges are drawn using the following logic:
            // 1. Starts from the "from" point
            // 2. Curve (with quadraticBezier) to an intermediate point
            //      - The verticalDisplacement (dy) of intermediate point is fixed.
            //      - The horizontalDisplacement (dx) is dependent on the scaled depth of the from point. 
            //          - When drawing an edge from bottom to top, more the depth of the from point, more is the horizontalDisplacement (limited to distance between points to prevent overlap with "to"")
            //          - When drawing an edge from top to bottom, more the depth of the from point, less is the horizontalDisplacement (limited to 0 to prevent overlap with "from")
            //      - The logic is applied to ensure that edges from nodes at different depth in stages do no overlap.
            if (from.y > to.y) {
                
                let intermediatePointX = from.x + Math.min(horizontalDistance / 2 + depthScaleModifier(fromDepth), horizontalDistance - Constants.minOffset);

                // Edge from bottom to top

                /*
                                x1--x2---- to
                                |   |
                                |   |
                                |   |
                                |   |
                                |   |
                                |   |
                from1 ----------x1  |    (x1 -> intermediatePointX1) 
                                    |
                from2 --------------x2   (x2 -> intermediatePointX2) 
                */
                pathBuilder
                    .quadraticBezier(
                    {
                        x: intermediatePointX,
                        y: from.y - this._getQuadraticBezierVerticalDisplacement()
                    },
                    {
                        x: intermediatePointX,
                        y: from.y
                    })
                    .line({ x: intermediatePointX, y: to.y + this._getQuadraticBezierVerticalDisplacement() }) // Vertical line at the center
                    .quadraticBezier(
                    {
                        x: to.x,
                        y: to.y
                    },
                    {
                        x: intermediatePointX,
                        y: to.y
                    });

                pathAttribute = pathBuilder.toString();
            }
            else if (from.y < to.y) { // Implicit condition. Written for readability

                let intermediatePointX = from.x + Math.max(horizontalDistance / 2 - depthScaleModifier(fromDepth), Constants.minOffset);

                // Edge from top to bottom.
                /*
                from1 ----------x1
                                |
                from2 -----x2   |
                           |    |
                           |    |
                           |    |
                           |    |
                           x2---x1-- to
                */

                pathBuilder
                    .quadraticBezier(
                    {
                        x: intermediatePointX,
                        y: from.y + this._getQuadraticBezierVerticalDisplacement()
                    },
                    {
                        x: intermediatePointX,
                        y: from.y
                    })
                    .line({ x: intermediatePointX, y: to.y - this._getQuadraticBezierVerticalDisplacement() }) // Vertical line at the center
                    .quadraticBezier(
                    {
                        x: to.x,
                        y: to.y
                    },
                    {
                        x: intermediatePointX,
                        y: to.y
                    });

                pathAttribute = pathBuilder.toString();
            }
        }

        if (!this.props.showLabels) {
            return <path className={css("dtc-canvas-path", this.props.cssClass)} d={pathAttribute} />;
        }
        else {
            return (
                <g>
                    <text x={from.x} y={from.y} fontSize="12px">{"(" + from.x + "," + from.y + ")"}</text>
                    <path className={css("dtc-canvas-path", this.props.cssClass)} d={pathAttribute} />;
                    <text x={to.x} y={to.y} textAnchor="end" fontSize="12px">{"(" + to.x + "," + to.y + ")"}</text>
                </g>
                );
        }
    }

    private _getQuadraticBezierVerticalDisplacement(): number {
        if (this.props.quadraticBezierVerticalDisplacement) {
            return this.props.quadraticBezierVerticalDisplacement;
        }
        return Constants.verticalDisplacement;
    }
}