/*tslint:disable:insecure-random*/

import * as React from "react";
import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Mapping/Components/SkeletonTitle";

export class SkeletonTitle extends React.PureComponent {
    private _width: number;
    constructor(props: {}) {
        super(props);

        this._width = this._computeRandomWidth();
    }

    public render(): JSX.Element {
        return (
            <div className="skeleton-title" style={{ width: `${this._width}%` }} />
        );
    }

    private _computeRandomWidth(): number {
        let random = Math.random() * 100;
        random = Math.max(20, Math.min(80, random));

        return random;
    }
}