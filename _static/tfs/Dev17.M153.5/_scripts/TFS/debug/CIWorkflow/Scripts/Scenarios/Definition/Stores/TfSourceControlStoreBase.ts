import { RepositoryProperties, BuildVariables } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { SourcesSelectionActionsCreator, ITfSouceControlPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlStoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";
import { ISourceLabelOption, ISourceLabelProps, ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager} from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Boolean } from "DistributedTaskControls/Common/Primitives";

import { BuildResult, BuildDefinition } from "TFS/Build/Contracts";
import { VersionControlProjectInfo } from "TFS/VersionControl/Contracts";

import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Store for select code source in build definition work flow
 */
export abstract class TfSourceControlStoreBase extends VersionControlStoreBase {
    protected _projectInfo: VersionControlProjectInfo;
    protected _buildDefinitionActions: Actions.BuildDefinitionActions;
    protected _sourceSelectionActionsCreator: SourcesSelectionActionsCreator;
    private _sourceLabelFormat: string = this.getDefaultSourceLabelFormat();

    public initialize(): void {
        super.initialize();

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._sourceSelectionActionsCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionsCreator.RefreshProjectInfo.addListener(this._handleRefreshProjectInfo);
    }

    protected disposeInternal(): void {
        this._sourceSelectionActionsCreator.RefreshProjectInfo.removeListener(this._handleRefreshProjectInfo);

        super.disposeInternal();
    }

    public getSourceLabelOptions(): ISourceLabelOption[] {
        return ScmUtils.getSourceLabelOptions();
    }

    public isLabelFormatValid(): boolean {
        if (Utils_String.equals(BuildResult.None.toString(), this._repository.properties[RepositoryProperties.LabelSources], true) ||
            !this.validateLabelSourcesFormat(this._repository.properties[RepositoryProperties.LabelSourcesFormat])) {
            return true;
        }
        return false;
    }

    public getDefaultSourceLabelFormat(): string {
        return ScmUtils.getDefaultSourceLabelFormat();
    }

    public validateLabelSourcesFormat(labelSourcesFormat: string): string {
        return ScmUtils.validateLabelSourcesFormat(labelSourcesFormat);
    }

    protected _getReportBuildStatusOption(): boolean {
        if (this._repository.properties && this._repository.properties[RepositoryProperties.ReportBuildStatus]) {
            return Boolean.fromString(this._repository.properties[RepositoryProperties.ReportBuildStatus]);
        }

        return false;
    }

    protected updateStatesFromBuildDefinition(definition: BuildDefinition) {
        super.updateStatesFromBuildDefinition(definition);
        if (this._repository &&
            this._repository.properties &&
            this._repository.properties[RepositoryProperties.LabelSourcesFormat]) {
            this._sourceLabelFormat = this._repository.properties[RepositoryProperties.LabelSourcesFormat];
        }
    }

    protected _getSelectedSourceLabel(): ISourceLabelProps {
        let sourceLabelOption: string = BuildResult.None.toString();
        let sourceLabelFormat: string = this._sourceLabelFormat;
        let showSourceLabelOption: boolean = false;

        if (this._repository.properties) {

            if (this._repository.properties[RepositoryProperties.LabelSources]) {
                sourceLabelOption = this._repository.properties[RepositoryProperties.LabelSources];
            }

            if (sourceLabelOption !== BuildResult.None.toString()) {
                showSourceLabelOption = true;
            }
        }

        return {
            sourceLabelOption: sourceLabelOption,
            sourceLabelFormat: sourceLabelFormat,
            showSourceLabelFormat: showSourceLabelOption
        } as ISourceLabelProps;
    }

    protected areRepositoryPropertiesDirty(): boolean {
        if (this._repository.properties) {
            return (this._isLabelSourcesOptionDirty() ||
                (this.isRepositoryCleanEnabled() && this._repository.properties[RepositoryProperties.CleanOptions] !== this._originalRepository.properties[RepositoryProperties.CleanOptions]));
        }

        return false;
    }

    protected updateStateFromChangePayload(payload: ITfSouceControlPayload): void {
        if (payload.sourceLabelOption) {
            this._repository.properties[RepositoryProperties.LabelSources] = payload.sourceLabelOption;
            if (Utils_String.equals(BuildResult.None.toString(), this._repository.properties[RepositoryProperties.LabelSources], true)) {
                this._repository.properties[RepositoryProperties.LabelSourcesFormat] = Utils_String.empty;
            }
            else if (!this._repository.properties[RepositoryProperties.LabelSourcesFormat]) {
                this._repository.properties[RepositoryProperties.LabelSourcesFormat] = this._sourceLabelFormat;
            }
        }

        if (payload.sourceLabelFormat !== undefined) {
            let sourceLabelFormat: string = payload.sourceLabelFormat.trim();
            this._repository.properties[RepositoryProperties.LabelSourcesFormat] = sourceLabelFormat;
            this._sourceLabelFormat = sourceLabelFormat;
        }

        super.updateStateFromChangePayload(payload);
    }

    private _isLabelSourcesOptionDirty(): boolean {
        if (Utils_String.equals(BuildResult.None.toString(), this._repository.properties[RepositoryProperties.LabelSources], true) &&
            Utils_String.equals(BuildResult.None.toString(), this._originalRepository.properties[RepositoryProperties.LabelSources], true)) {
            return false;
        }

        return ((this._repository.properties[RepositoryProperties.LabelSources] !== this._originalRepository.properties[RepositoryProperties.LabelSources]) ||
            (this._repository.properties[RepositoryProperties.LabelSourcesFormat] !== this._originalRepository.properties[RepositoryProperties.LabelSourcesFormat]));
    }

    private _handleRefreshProjectInfo = (payload: VersionControlProjectInfo) => {
        if (payload) {
            this._projectInfo = payload;
            this.emitChanged();
        }
    }
}
