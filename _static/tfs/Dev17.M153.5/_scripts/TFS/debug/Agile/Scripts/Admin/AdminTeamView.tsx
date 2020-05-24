import * as React from "react";
import * as VSS_Controls from "VSS/Controls";
import { CustomizeProcessMessageBarComponent } from "Agile/Scripts/Admin/CustomizeProcessMessageBar";
import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import AgileAdminResources = require("Agile/Scripts/Resources/TFS.Resources.AgileAdmin");

import "Agile/Scripts/Admin/Work";

export interface AdminTeamViewComponentProps {
    isTeamFieldAreaPath: boolean;
    processName: string;
    projectViewOptionsJson: string;
    teamViewOptionsJson: string;
    teamSettingsControlOptions: string;
    teamFieldDataOptions: string;
    title: string;
}

export class AdminTeamViewComponent extends React.Component<AdminTeamViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("div.team-admin-work > .options").html(this.props.teamViewOptionsJson);
        $container.find(".project-work-model").html(this.props.projectViewOptionsJson);
        $container.find("div.team-settings-control > .options").html(this.props.teamSettingsControlOptions);

        if (!this.props.isTeamFieldAreaPath) {
            $container.find("div.data-content > .options").html(this.props.teamFieldDataOptions);
        }

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {
        let teamFieldArea = (
            <li data-id="areas" role="presentation">
                <a aria-posinset={3} aria-setsize={4} href="#_a=areas" role="tab">{AgileResources.AdminAreas_Title}</a>
            </li>
        );

        if (!this.props.isTeamFieldAreaPath) {
            teamFieldArea = (
                <li data-id="team-field" role="presentation">
                    <a aria-posinset={3} aria-setsize={4} href="#_a=team-field" role="tab">{AgileResources.AdminTeamWorkItems_Title}</a>
                </li>
            );
        }

        return (
            <div className={"hub-view"} ref={this._ensureEnhancements}>
                <div className="hub-title">{this.props.title}</div>
                {this.props.processName && <CustomizeProcessMessageBarComponent processName={this.props.processName} />}
                <div className="hub-content">
                    <div className="hub-pivot" role="navigation">
                        <div className="views">
                            <ul className="empty pivot-view enhance work-admin-pivot" role="tablist">
                                <li className="selected" data-id="general" role="presentation">
                                    <a aria-posinset={1} aria-setsize={4} href="#_a=general" role="tab">{AgileAdminResources.GeneralSettings}</a>
                                </li>
                                <li data-id="iterations" role="presentation">
                                    <a aria-posinset={2} aria-setsize={4} href="#_a=iterations" role="tab">{AgileResources.AdminIterations_Index_Title}</a>
                                </li>
                                {teamFieldArea}
                                <li data-id="templates" role="presentation">
                                    <a aria-posinset={4} aria-setsize={4} href="#_a=templates" role="tab">{AgileAdminResources.WorkItemTemplates_View_Title_Default}</a>
                                </li>
                            </ul>
                        </div>
                        <div className="filters"></div>
                    </div>
                    <div className="hub-pivot-content" role="main">
                        <div className="team-admin-work bowtie">
                            <script className="options" type="application/json"></script>
                            <script className="project-work-model" type="application/json"></script>
                            <div className="team-settings-control">
                                <script className="options" type="application/json"></script>
                            </div>
                            <div className="team-iterations-control"></div>
                            {
                                (this.props.isTeamFieldAreaPath) ?
                                    <div className="team-areas-control"></div> :
                                    <div className="team-field-control">
                                        <div className="data-content">
                                            <script className="options" type="application/json"></script>
                                        </div>
                                    </div>
                            }
                            <div className="templates-control"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}