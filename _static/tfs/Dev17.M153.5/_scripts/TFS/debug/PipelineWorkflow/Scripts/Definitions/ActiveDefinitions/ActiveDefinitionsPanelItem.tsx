import * as React from "react";

import * as Diag from "VSS/Diag";

import { Item } from "DistributedTaskControls/Common/Item";

import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveDefinitionsPanelItemOverview } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsPanelItemOverview";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsHubTelemetry } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { ActiveDefinitionDetails } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionDetails";
import { ActiveDefinitionsConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsContent";

export class ActiveDefinitionsPanelItem implements Item {

    constructor(private _id: number | string, private _definition: IActiveDefinitionReference, private _showSubtitle: boolean, private _isSearchedItem: boolean, private _favoriteInProgressId?: number, private _isRecentSection?: boolean) { }

    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overview) {
            this._overview = (
                <ActiveDefinitionsPanelItemOverview
                    item={this}
                    definition={this._definition}
                    showSubtitle={this._showSubtitle}
                    favoriteInProgressId={this._favoriteInProgressId}
                    isRecentSection={this._isRecentSection}
                />);
        }

        return this._overview;
    }

    public getDetails(instanceId?: string): JSX.Element {
        if (!this._details) {
            this._details = (
                <ActiveDefinitionDetails
                    instanceId={ActiveDefinitionsConstants.ActiveDefinitionDetailsInstanceId}
                    definitionId={this._definition.id}
                    folderPath={this._definition.path}
                    definitionName={this._definition.name}
                    definitionEnvironmentCurrentReleaseMap={this._definition.definitionEnvironmentCurrentReleaseMap}
                    isSearchedItem={this._isSearchedItem}
                    definitionReferenceType={this._definition.definitionType}
                />);
        }

        Diag.logVerbose("getDetails def ID: " + this._definition.id);
        return this._details;
    }

    public getKey(): string {
        return "active-definitions-panel-item-" + this._id;
    }

    public getDefinition(): IActiveDefinitionReference {
        return this._definition;
    }

    private _overview: JSX.Element;
    private _details: JSX.Element;
}