import * as React from "react";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/ClonePopupTitle"

export interface ClonePopupTitleProps {
    title: string;
    showOnlyCommandLine: boolean;
    headingLevel: number;
}

export const ClonePopupTitle = (props: ClonePopupTitleProps): JSX.Element => {
    return (
        <div>
            <div
                className={"clone-popup-title"}
                role={"heading"}
                aria-level={props.headingLevel}>
                {props.title}
            </div>
            {!props.showOnlyCommandLine &&
                <div className={"clone-popup-message"}>{VCResources.ClonePopup_Message}</div>
            }
        </div>
    );
}