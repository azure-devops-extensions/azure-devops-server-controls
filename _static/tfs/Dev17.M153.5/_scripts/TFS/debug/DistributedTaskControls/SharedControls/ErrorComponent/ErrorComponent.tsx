import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css, DelayedRender } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

export interface IErrorComponentProps extends Base.IProps {
    cssClass?: string;
    errorMessage: string;
    id?: string;
}

/**
 * Component to show error message with error icon in red
 */
export class ErrorComponent extends Base.Component<IErrorComponentProps, Base.IStateless> {

    public render(): JSX.Element {
        let className: string = css(this.props.cssClass, "dtc-error", "ms-font-s");
        
        return (
            <span className={"dtc-error-component-container"} id={this.props.id}>
                <div aria-live={"assertive"}>
                    <DelayedRender>
                        <div className={className}>
                            <i className="bowtie-icon bowtie-status-error-outline left" />
                            {this.props.errorMessage}
                        </div>
                    </DelayedRender>
                </div>
            </span>
        );
    }
}