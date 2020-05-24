/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { JobAuthorizationScope } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { BuildJobStore, IBuildJobState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildJobStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { BuildAuthorizationScope } from "TFS/Build/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskInput";

export interface Props extends Base.IProps {
    isReadOnly?: boolean;
}

export class BuildJobDetailsView extends Base.Component<Props, IBuildJobState> {
    private _store: BuildJobStore;
    private _actionCreator: BuildDefinitionActionsCreator;

    public componentWillMount() {
        this._store = StoreManager.GetStore<BuildJobStore>(BuildJobStore);
        this.setState(this._store.getState());
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let jobCancelTimeoutInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.MarkDownJobCancelTimeout)
        };
        let buildJobAuthInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.MarkDownJobScopeAuthorization)
        };
        let buildJobTimeoutInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.MarkDownJobTimeout)
        };

        const showAuthorizationScopeDropdown = this.state.projectVisibility !== ProjectVisibility.Public;

        return (
            <div className="agents-options-section">
                { showAuthorizationScopeDropdown && 
                    <div className="input-field-component">
                        <DropDownInputControl
                            label={Resources.BuildJobAuthorizationScope}
                            infoProps={buildJobAuthInfoProps}
                            options={this._getScopes(this.state.jobAuthorizationScope)}
                            onValueChanged={(val: IDropDownItem) => { this._scopeChanged(val.option); }}
                            selectedKey={this._getSelectedKey(this.state.jobAuthorizationScope)} 
                            errorMessage={ this._getJobAuthorizationScopeErrorMessage(this.state.jobAuthorizationScope) }
                            disabled={!!this.props.isReadOnly} />
                    </div>
                }

                <div className="input-field-component">
                    <StringInputComponent
                        label={Resources.BuildJobTimeout}
                        infoProps={buildJobTimeoutInfoProps}
                        value={this.state.jobTimeoutInMinutes}
                        onValueChanged={this._onBuildJobTimeoutChanged}
                        getErrorMessage={(value: string) => { return this._getJobTimeoutErrorMessage(value); }}
                        disabled={!!this.props.isReadOnly} />
                </div>

                <div className="input-field-component">
                    <StringInputComponent
                        label={Resources.BuildJobCancelTimeout}
                        infoProps={jobCancelTimeoutInfoProps}
                        value={this.state.jobCancelTimeoutInMinutes}
                        onValueChanged={this._onBuildJobCancelTimeoutChanged}
                        getErrorMessage={(value: string) => { return this._getJobCancelTimeoutErrorMessage(value); }}
                        disabled={!!this.props.isReadOnly} />
                </div>
            </div>
        );
    }

    private _getCallOutContent(markdownText: string): ICalloutContentProps {
        let buildJobAuthorizationCallOutProps: ICalloutContentProps = {
            calloutMarkdown: markdownText
        };
        return buildJobAuthorizationCallOutProps;
    }

    private _onBuildJobTimeoutChanged = (value: string) => {
        this._actionCreator.updateBuildJobTimeout(value);
    }

    private _onBuildJobCancelTimeoutChanged = (value: string) => {
        this._actionCreator.updateBuildJobCancelTimeout(value);
    }

    private _scopeChanged = (newValue: IDropdownOption) => {
        this._actionCreator.updateScope(Number(newValue.key));
    }

    private _getSelectedKey = (scope: number) => {
        // Used mainly for Discard flow as after discard flow component does not which item to select.
        let selectedKey: JobAuthorizationScope;
        if (scope === JobAuthorizationScope.ProjectCollection) {
            selectedKey = JobAuthorizationScope.ProjectCollection;
        }
        else if (scope === JobAuthorizationScope.Project) {
            selectedKey = JobAuthorizationScope.Project;
        }
        return selectedKey;
    }

    private _getScopes(scope: number): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        options.push(
            {
                key: JobAuthorizationScope.ProjectCollection,
                text: DTCResources.ProjectCollection,
                selected: (scope === JobAuthorizationScope.ProjectCollection)
            } as IDropdownOption,
            {
                key: JobAuthorizationScope.Project,
                text: DTCResources.Project,
                selected: (scope === JobAuthorizationScope.Project)
            } as IDropdownOption
        );

        return options;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _getJobAuthorizationScopeErrorMessage(scope: BuildAuthorizationScope): string {
        return !this._store.isValidJobAuthorizationScope(scope) ? Resources.InvalidAuthScopeErrorMessage : Utils_String.empty;
    }

    private _getJobTimeoutErrorMessage(value: string): string {
        let errorMessage: string = Utils_String.empty;
        if (!this._store.isValidJobTimeoutValue(value)) {
            errorMessage = DTCResources.PositiveValidNumberErrorMessage;
        }
        return errorMessage;
    }

    private _getJobCancelTimeoutErrorMessage(value: string): string {
        let errorMessage: string = Utils_String.empty;
        if (!this._store.isValidJobCancelTimeoutValue(value)) {
            errorMessage = DTCResources.PositiveValidCancelTimeoutErrorMessage;
        }
        return errorMessage;
    }
}
