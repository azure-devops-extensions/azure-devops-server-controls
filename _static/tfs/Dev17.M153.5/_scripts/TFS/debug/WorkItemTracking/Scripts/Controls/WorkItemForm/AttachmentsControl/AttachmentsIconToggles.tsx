import * as React from "react";
import WitResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { IconButton, IButtonProps } from "OfficeFabric/Button";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";

export interface IAttachmentIconTogglesProps {
    thumbnailIconProps: IButtonProps;
    gridIconProps: IButtonProps;
}

export class AttachmentIconToggles extends React.Component<IAttachmentIconTogglesProps> {

    public render(): JSX.Element {
        return (
            <div className="change-view-buttons">
                <TooltipHost content={WitResources.AttachmentsGridViewIconAriaLabel} directionalHint={DirectionalHint.bottomCenter}>
                    <IconButton
                        {...this.props.gridIconProps}
                    />
                </TooltipHost>
                <TooltipHost content={WitResources.AttachmentsThumbnailViewIconAriaLabel} directionalHint={DirectionalHint.bottomCenter}>
                    <IconButton
                        {...this.props.thumbnailIconProps}
                    />
                </TooltipHost>
            </div>
        );
    }
}
