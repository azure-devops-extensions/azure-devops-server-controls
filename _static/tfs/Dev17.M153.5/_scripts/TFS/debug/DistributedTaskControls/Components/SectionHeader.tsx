/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/SectionHeader";

export interface IProps extends Base.IProps {
    sectionLabel: string;
}

export class SectionHeader extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className={css("dtc-section-header", this.props.cssClass)}>
                <div className="dtc-section-label">
                    {this.props.sectionLabel}
                </div>
                <div className="dtc-section-line">
                    <hr />
                </div>
            </div>
        );
    }
}