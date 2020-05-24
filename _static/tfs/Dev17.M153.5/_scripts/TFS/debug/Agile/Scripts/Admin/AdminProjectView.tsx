import * as React from "react";
import * as VSS_Controls from "VSS/Controls";
import { CustomizeProcessMessageBarComponent } from "Agile/Scripts/Admin/CustomizeProcessMessageBar";
import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");

import "Agile/Scripts/Admin/ProjectWork";

export interface AdminProjectViewComponentProps {
    title: string;
    processName: string;
    viewOptionsJson: string;
}

export class AdminProjectViewComponent extends React.Component<AdminProjectViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find(".options").html(this.props.viewOptionsJson);

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return (
            <div className={"hub-view work-view"} ref={this._ensureEnhancements}>
                <div className="hub-title">{this.props.title}</div>
                {this.props.processName && <CustomizeProcessMessageBarComponent processName={this.props.processName} />}
                <div className="hub-content">
                    <div className="hub-pivot" role="navigation">
                        <div className="views">
                            <ul className="empty pivot-view enhance project-admin-work-pivot" role="tablist">
                                <li className="selected" data-id="iterations" role="presentation">
                                    <a aria-posinset={1} aria-setsize={2} href="#_a=iterations" role="tab">{AgileResources.AdminIterations_Index_Title}</a>
                                </li>
                                <li data-id="areas" role="presentation">
                                    <a aria-posinset={2} aria-setsize={2} href="#_a=areas" role="tab">{AgileResources.AdminAreas_Title}</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="hub-pivot-content" role="main">
                        <div className="project-admin-work">
                            <script className="options" type="application/json"></script>
                            <div className="iterations-control"></div>
                            <div className="areas-control"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}