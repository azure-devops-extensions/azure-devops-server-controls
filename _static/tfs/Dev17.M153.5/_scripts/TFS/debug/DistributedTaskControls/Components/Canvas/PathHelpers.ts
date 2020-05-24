import * as Types from "DistributedTaskControls/Components/Canvas/Types";
import * as StringUtils from "VSS/Utils/String";

/**
 * A simple utility which provider syntactic sugar to build a path.
 * There are no validation on the path. 
 */
export class PathBuilder {

    public start(from: Types.IPoint): PathBuilder {
        this._pathBuilder += " " + StringUtils.format("M{0},{1}", from.x, from.y);
        return this;
    }

    public line(to: Types.IPoint): PathBuilder {
        this._pathBuilder += " " + StringUtils.format("L{0},{1}", to.x, to.y);
        return this;
    }

    public quadraticBezier(to: Types.IPoint, controlPoint: Types.IPoint): PathBuilder {
        this._pathBuilder += " " + StringUtils.format("Q {0} {1}, {2} {3}", controlPoint.x, controlPoint.y, to.x, to.y);
        return this;
    }

    public arc(to: Types.IPoint, radiusX: number, radiusY: number, largeArcFlag: number, sweepFlag: number) {
        this._pathBuilder += " " + StringUtils.format("A {0} {1} {2} {3} {4} {5} {6}", radiusX, radiusY, 0, largeArcFlag, sweepFlag, to.x, to.y);
        return this;
    }

    public toString(){
        return  this._pathBuilder;
    }

    private _pathBuilder: string = StringUtils.empty;
}