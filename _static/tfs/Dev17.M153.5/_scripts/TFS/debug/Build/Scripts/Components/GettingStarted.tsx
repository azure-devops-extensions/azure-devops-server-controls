/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import { ButtonWithBowtieIcon, IButtonWithBowtieIconProps } from "Build/Scripts/Components/ButtonWithBowtieIcon";
import { LinkWithBowtieIcon } from "Build/Scripts/Components/LinkWithBowtieIcon";
import BuildModelsCommon = require("Build/Scripts/Constants");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import NewDefinitionDialog_NO_REQUIRE = require("Build/Scripts/NewDefinitionDialog");

import { BuildCustomerIntelligenceInfo } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import Events_Action = require("VSS/Events/Action");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_String = require("VSS/Utils/String");
import VSS_Events = require("VSS/Events/Services");

import "VSS/LoaderPlugins/Css!Build/GettingStarted";

export interface Props extends TFS_React.IProps {
    projectName: string;
    options?: NewDefinitionDialog_NO_REQUIRE.INewDefinitionDialogOptions;
    showDefinitionHelper?: boolean;
    showAgentHelper?: boolean;
}

export class GettingStarted extends React.Component<Props, TFS_React.IState> {
    public render(): JSX.Element {
        let message = null;
        let actions: JSX.Element[] = [];

        let agentPrimaryAction = <ButtonWithBowtieIcon
            key="agent"
            isCta={true}
            onClick={this.onConfigureAgentClicked}
            iconClassName="bowtie-math-plus-light"
            label={BuildResources.GettingStartedAgentsColdStartLabel} />;

        if (this.props.showDefinitionHelper) {
            let isCta = false;
            if (this.props.showAgentHelper) {
                message = Utils_String.format(BuildResources.ProjectHasNoAgentsAndDefinitions, this.props.projectName);
                actions.push(agentPrimaryAction);
            }
            else {
                message = Utils_String.format(BuildResources.ProjectHasNoDefinitionsYet, this.props.projectName);
                isCta = true;
            }

            actions.push(<ButtonWithBowtieIcon
                key="definition"
                onClick={this.onNewDefinitionClicked}
                iconClassName="bowtie-math-plus-light"
                label={BuildResources.NewDefinition}
                isCta={isCta}
            />);
        }
        else if (this.props.showAgentHelper) {
            message = Utils_String.format(BuildResources.ProjectHasNoAgentsConfigured, this.props.projectName);
            actions.push(agentPrimaryAction);
        }

        return <div className="build-getting-started">
            <div className="getting-started-icon">
                <div className="icon bowtie-icon bowtie-build"></div>
            </div>
            <div className="getting-started-content">
                <div className="getting-started-banner">{BuildResources.GettingStartedBanner}</div>
                <div className="getting-started-message">{message}</div>
                <div className="getting-started-actions">
                    {actions}
                    <LinkWithBowtieIcon className="btn-link" href="https://go.microsoft.com/fwlink/?LinkID=798503" iconClassName="bowtie-status-help-outline" label={BuildResources.GettingStartedButtonText} />
                </div>
            </div>
        </div>
    }

    protected onConfigureAgentClicked = () => {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(BuildCustomerIntelligenceInfo.Area, "new-agent", { "source": "GettingStartedComponent" }));

        let eventService = VSS_Events.getService();
        eventService.fire(BuildModelsCommon.UserActions.NewAgent, this);
    }

    protected onNewDefinitionClicked = () => {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(BuildCustomerIntelligenceInfo.Area, "new-definition", { "source": "GettingStartedComponent" }));

        let eventService = VSS_Events.getService();
        eventService.fire(BuildModelsCommon.UserActions.NewDefinition, this, this.props.options);
    }
}
