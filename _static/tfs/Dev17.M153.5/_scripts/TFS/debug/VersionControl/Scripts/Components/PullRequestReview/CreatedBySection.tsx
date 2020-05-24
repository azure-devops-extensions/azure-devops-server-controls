import * as React from "react";

import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import { Component as IdentityImage } from "Presentation/Scripts/TFS/Components/IdentityImage";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityRef } from "VSS/WebApi/Contracts";

import "VSS/LoaderPlugins/Css!VersionControl/CreatedBySection";

export interface CreatedBySectionProps extends React.Props<void> {
    className: string;
    createdBy: IdentityRef;
    creationDate: Date;
    tfsContext: TfsContext;
}

export class CreatedBySection extends React.Component<CreatedBySectionProps, {}> {
    public render(): JSX.Element {
        const createdByDisplayName = this._getCreatedByDisplay();

        return (
            <div className={css("vc-pullrequest-created-by-section", this.props.className)}>
                <IdentityImage
                    cssClass={css("vc-pullrequest-title-user-image", "cursor-hover-card")}
                    size="small"
                    identity={this.props.createdBy}
                    tfsContext={this.props.tfsContext}
                    showProfileCardOnClick={true}
                    isTabStop={true}
                />
                <TooltipHost
                    hostClassName={"created-by-label"}
                    content={createdByDisplayName}
                    directionalHint={DirectionalHint.bottomCenter}
                    overflowMode={TooltipOverflowMode.Self}>
                    <span>{createdByDisplayName}</span>
                </TooltipHost>
            </div>
        );
    }

    private _getCreatedByDisplay(): string {
        if (this.props.creationDate) {
            return this.props.createdBy.displayName;
        }

        return "";
    }
}