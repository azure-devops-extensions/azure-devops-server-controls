import * as React from "react";
import * as Utils_String from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/GettingStartedTitle"

export interface GettingStartedTitleProps {
    title: string;
    headingLevel: number;
}

export const GettingStartedTitle = (props: GettingStartedTitleProps): JSX.Element => {
    return (
        <div
            className="getting-started-text"
            role="heading"
            aria-level={props.headingLevel}>
            {props.title}
        </div>
    );
}