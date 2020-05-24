/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IHTMLStringDetails } from "DistributedTaskControls/Common/FriendlyDate";

import { TooltipHost } from  "OfficeFabric/Tooltip";


export interface IFriendlyDateRendereProps extends Base.IProps {
    dateObj: IHTMLStringDetails;
}

export class FriendlyDateRenderer extends Base.Component<IFriendlyDateRendereProps, Base.IStateless> {

    public render(): JSX.Element {
        const dateDetails = this.props.dateObj;
        return (
            <span className={this.props.cssClass}>
                 {
                        <TooltipHost content={dateDetails.tooltip}>
                            {
                                dateDetails.useStrongFont && (
                                    <strong>
                                        <span data-is-focusable={true} tabIndex={-1}> {dateDetails.html}</span>
                                    </strong>
                                )
                            }
                            {
                                !dateDetails.useStrongFont && (
                                    <span data-is-focusable={true} tabIndex={-1}> {dateDetails.html}</span>
                                )
                            }
                        </TooltipHost>
                    }
            </span>
        );
       
    }
        
}
