import * as React from "react";
import AgileAdminResources = require("Agile/Scripts/Resources/TFS.Resources.AgileAdmin");
import * as Utils_String from "VSS/Utils/String";

export interface CustomizeProcessMessageBarProps {
    processName: string;
}

export class CustomizeProcessMessageBarComponent extends React.Component<CustomizeProcessMessageBarProps, {}> {

    public render(): JSX.Element {

        return (
            <div className="customize-process-message" hidden>
                <div className="message-area-control info-message">
                    <div className="message-icon">
                        <span className="bowtie bowtie-icon bowtie-status-info " />
                    </div>
                    <div className="message-header">
                        <span>{Utils_String.format(AgileAdminResources.CustomizeProcessMessageBarText, this.props.processName)}</span>
                        <a className="customize-process-link">{AgileAdminResources.CustomizeProcessMessageBarLinkText}</a>
                    </div>
                </div>
            </div>
        );
    }
}