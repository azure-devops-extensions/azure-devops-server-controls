import * as React from "react";

import { MessageBar } from "OfficeFabric/components/MessageBar/MessageBar";
import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { Component, Props, State } from "VSS/Flux/Component";

import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageMessagePanel";

export interface IPackageMessagePanelProps extends Props {
    message: string;
    isMultiline?: boolean;
}

export class PackageMessagePanel extends Component<IPackageMessagePanelProps, State> {
    public render(): JSX.Element {
        const messageBarText = this.props.message;
        const isMultiline = this.props.isMultiline === true ? true : false;

        if (messageBarText && messageBarText.length > 0) {
            return (
                <div className="package-message-panel" aria-label={PackageResources.AriaLabel_MessageBar}>
                    <TooltipHost content={messageBarText} overflowMode={TooltipOverflowMode.Parent}>
                        <MessageBar
                            className="package-message-bar"
                            messageBarType={MessageBarType.warning}
                            isMultiline={isMultiline}
                        >
                            {messageBarText}
                        </MessageBar>
                    </TooltipHost>
                </div>
            );
        }

        return null;
    }
}
