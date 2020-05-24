/// <reference types="react" />

import * as React from "react";

import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { VersionControlProperties } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { GitCommonSettings } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GitCommonSettings";
import { Component as VCAdvancedSettings } from "CIWorkflow/Scripts/Scenarios/Definition/Components/VersionControlAdvancedSettings";
import { ISourceLabelOption, ISourceLabelProps } from "CIWorkflow/Scripts/Common/ScmUtils";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";

export interface IGitAdvancedSettingsProps extends Base.IProps {
    id: string;
    showAdvancedSettings: boolean;
    isReadOnly: boolean;
    cleanRepository?: string;
    isCleanRepositoryEnabled?: boolean;
    checkoutSubmodules?: boolean;
    checkoutNestedSubmodules?: boolean;
    cleanOptions?: string;
    gitLfsSupportStatus?: boolean;
    skipSyncSourcesStatus?: boolean;
    shallowFetch?: boolean;
    shallowFetchDepth?: string;
    showLabelSourcesOption?: boolean;
    sourceLabel?: ISourceLabelProps;
    sourceLabelOption?:  ISourceLabelOption[];
    validateLabelSourcesFormat?: (value: string) => string;
    showReportStatusOption?: boolean;
    reportBuildStatus?: boolean;
    getErrorMessage?: (newValue: string) => string;
}

export class GitAdvancedSettings extends Base.Component<IGitAdvancedSettingsProps, Base.IStateless> {
    private _versionControlActionsCreator: VersionControlActionsCreator;

    constructor(props: IGitAdvancedSettingsProps) {
        super(props);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);
    }

    public render(): JSX.Element {
        return (
            <div className="ci-github-tab-item">
                <VCAdvancedSettings
                    repoType={this.props.id}
                    showAdvancedSettings={this.props.showAdvancedSettings}
                    cleanRepository={this.props.cleanRepository}
                    cleanOptions={this.props.cleanOptions}
                    isCleanRepositoryEnabled={this.props.isCleanRepositoryEnabled}
                    reportBuildStatus={this.props.reportBuildStatus}
                    showLabelSourcesOption={this.props.showLabelSourcesOption}
                    sourceLabelOptions={this.props.sourceLabelOption}
                    sourceLabel={this.props.sourceLabel}
                    validateLabelSourcesFormat={this.props.validateLabelSourcesFormat}
                    showReportStatusOption={this.props.showReportStatusOption}
                    onReportBuildStatusOptionChanged={this._onReportBuildStatusOptionChanged}
                    onCleanRepositoryOptionChanged={this._onCleanRepositoryOptionChanged}
                    onSelectedSourceLabelOptionChanged={this._onSelectedSourceLabelOptionChanged}
                    onSelectedSourceLabelFormatChanged={this._onSelectedSourceLabelFormatChanged}
                    onCleanOptionChanged={this._handleCleanOptionsChange}
                    isReadOnly={this.props.isReadOnly}>
                    <GitCommonSettings
                        checkoutSubmodules={this.props.checkoutSubmodules}
                        checkoutNestedSubmodules={this.props.checkoutNestedSubmodules}
                        gitLfsSupportStatus={this.props.gitLfsSupportStatus}
                        skipSyncSourcesStatus={this.props.skipSyncSourcesStatus}
                        shallowFetch={this.props.shallowFetch}
                        shallowFetchDepth= {this.props.shallowFetchDepth }
                        onCheckoutSubmodulesOptionChanged={this._onCheckoutSubmodulesOptionChanged}
                        onSubmoduleCheckoutRecursiveLevelChanged={this._onSubmoduleCheckoutRecursiveLevelChanged}
                        onGitLfsSupportOptionChanged={this._onGitLfsSupportOptionChanged }
                        onSkipSyncSourcesOptionChanged={this._onSkipSyncSourcesOptionChanged }
                        onShallowFetchOptionChanged={this._onShallowFetchOptionChanged }
                        onShallowFetchDepthChanged={this._onShallowFetchDepthChanged}
                        getErrorMessage={this.props.getErrorMessage}
                        onNotifyValidation={this._onNotifyValidation}
                        isReadOnly={this.props.isReadOnly}>
                    </GitCommonSettings>
                </VCAdvancedSettings>
            </div>
        );
    }

    private _onNotifyValidation = (value: string) => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.fetchDepth, value);
    }

    private _onCheckoutSubmodulesOptionChanged = (isChecked?: boolean): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.checkoutSubmodules, Boolean.toString(!!isChecked));
    }

    private _onSubmoduleCheckoutRecursiveLevelChanged = (options: IDropdownOption, index: number): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.checkoutNestedSubmodules, options.key as string);
    }

    private _onCleanRepositoryOptionChanged = (newValue: string): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanRepository, newValue);
    }

    private _onReportBuildStatusOptionChanged = (isChecked?: boolean): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.reportBuildStatus, Boolean.toString(!!isChecked));
    }

    private _onGitLfsSupportOptionChanged = (isChecked?: boolean): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.largeFileSupport, Boolean.toString(!!isChecked));
    }

    private _onSkipSyncSourcesOptionChanged = (isChecked?: boolean): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.skipSyncSources, Boolean.toString(!!isChecked));
    }

    private _onShallowFetchOptionChanged = (isChecked?: boolean): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.shallowFetchStatus, Boolean.toString(!!isChecked));
    }

    private _handleCleanOptionsChange = (options: IDropdownOption, index: number): void => {
        const selectedCleanOption: number = parseInt(options.key.toString()) - 1;
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanOption, selectedCleanOption.toString());
    }

    private _onShallowFetchDepthChanged = (newValue: string) => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.fetchDepth, newValue);
    }

    private _onSelectedSourceLabelOptionChanged = (selectedSourceOption: IChoiceGroupOption): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.sourceLabelOption, (selectedSourceOption.key as string));
    }

    private _onSelectedSourceLabelFormatChanged = (selectedSourceLabelFormat: string): void => {
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.sourceLabelFormat, selectedSourceLabelFormat);
    }
}
