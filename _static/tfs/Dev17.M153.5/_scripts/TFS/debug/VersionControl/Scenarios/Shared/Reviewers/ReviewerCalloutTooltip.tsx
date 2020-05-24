import * as React from "react";
import { CalloutTooltip, CalloutTooltipProps } from "VersionControl/Scenarios/Shared/CalloutTooltip";
import { Callout, ICalloutProps } from "OfficeFabric/Callout";
import { IBaseProps } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!VersionControl/ReviewerCalloutTooltip";

export interface ReviewerCalloutTooltipProps extends IBaseProps {
    hasFocusableElements?: boolean;
    ariaLabel?: string;
    id?: string;
    calloutProps: ICalloutProps;
}

export class ReviewerCalloutTooltip extends React.Component<ReviewerCalloutTooltipProps, {}> {

    public render(): JSX.Element {
        return <CalloutTooltip {...this._getProps()} >
           {this.props.children}
        </CalloutTooltip>;
    }

    private _getProps(): CalloutTooltipProps {
        return {
            ...this.props,
            className: "vc-pullrequest-review-callout",
            calloutProps: {
                ...this.props.calloutProps,
                className: "vc-pullrequest-review-delay",
                gapSpace: 8,
            },
        } as ReviewerCalloutTooltipProps;
    }
}