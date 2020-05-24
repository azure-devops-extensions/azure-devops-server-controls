import * as React from "react";

import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";

import { ContributionIds } from "PipelineWorkflow/Scripts/Common/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { IReleaseEnvironmentExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";

import { SpinnerSize } from "OfficeFabric/Spinner";


export interface IReleaseHubDataProvider {
    getReleaseEnvironmentContextPivotItemProvider(contributionId: string): ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>;
    getReleaseEnvironmentContextPivotActionProvider(contributionId: string): ContributablePivotBarActionProvider<RMContracts.ReleaseEnvironment>;
}

export class ReleaseHubDataProvider implements IReleaseHubDataProvider {
    
    private _selectedEnvironment: () => RMContracts.ReleaseEnvironment;

    constructor(selectedEnvironment: () => RMContracts.ReleaseEnvironment) {
        this._selectedEnvironment = selectedEnvironment;
    }
    
    public getReleaseEnvironmentContextPivotItemProvider(contributionId: string): ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>{
        return new ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>(
                [contributionId],
                this._getExtensionContext,
                {
                    loadingComponent: () => React.createElement(LoadingComponent, { className: "cd-contributed-pivot-loading-component", ariaLabel: Resources.Loading, size: SpinnerSize.large })
                }
            );
    }
        
    public getReleaseEnvironmentContextPivotActionProvider(contributionId: string): ContributablePivotBarActionProvider<RMContracts.ReleaseEnvironment> {
        const provider = new ContributablePivotBarActionProvider(
            [contributionId],
            (contribution: Contribution) => {
                return this._selectedEnvironment();
            });
        return provider;
    }

   private  _getExtensionContext = (): IReleaseEnvironmentExtensionContext => {
        const context: IReleaseEnvironmentExtensionContext = {
            releaseEnvironment: this._selectedEnvironment()
        };
        return context;
    }
}