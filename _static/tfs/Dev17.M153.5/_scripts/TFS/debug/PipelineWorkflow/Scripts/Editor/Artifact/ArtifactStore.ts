/**
 * @brief ArtifactDataStore
 */

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import {
    PipelineDefinition,
    PipelineArtifactTypeDefinition,
    PipelineArtifactTriggerConfiguration,
    PipelineArtifactDefinition,
    PipelineArtifactConstants,
    PipelineArtifactDefinitionConstants,
    PipelineArtifactSourceReference,
    PipelineArtifactFilter,
    PipelineTriggerBase,
    PipelineArtifactSourceTrigger,
    PipelineSourceRepoTrigger,
    PipelineArtifactTypes,
    PipelineTriggerType,
    IArtifactTriggersMap,
    PipelinePullRequestTrigger,
    PipelineReleaseTriggerType
} from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { IUpdateArtifactPayload, IUpdateAliasPayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActions";
import { ArtifactStoreUtility } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStoreUtility";
import { ArtifactActions, IUpdateArtifactTypePayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActions";
import { ArtifactTypeListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListStore";
import { ArtifactTypeStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { ArtifactTriggerStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerStore";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { IArtifactTriggerConditionOptions } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";
import { IArtifactTriggerOptions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerStore";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { PullRequestTriggerStore, IPullRequestTriggerStoreOptions } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerStore";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_Array from "VSS/Utils/Array";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";
import * as VssContext from "VSS/Context";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_HTML from "VSS/Utils/Html";

export interface IArtifactsDefinitionVisitor {
    artifact: PipelineArtifactDefinition;
    definition: PipelineDefinition;
}

export interface IArtifactStoreArgs {
    artifact: PipelineArtifactDefinition;
    trigger: PipelineTriggerBase;
    pullRequestTrigger: PipelinePullRequestTrigger;
    isAliasDuplicated: (artifactId: string, alias: string) => boolean;
    id: string;
    isTemporary: boolean;
    artifactTypeDefinition: PipelineArtifactTypeDefinition;
}

/**
 * @brief The store contains information about Artifact
 */
export class ArtifactStore extends AggregatorDataStoreBase {

    constructor(storeArgs: IArtifactStoreArgs) {
        super();
        this._initializeArtifact(storeArgs);
        this._isAliasDuplicated = storeArgs.isAliasDuplicated;
        this._artifactActions = ActionsHubManager.GetActionsHub<ArtifactActions>(ArtifactActions);
        this._artifactTypeDefinition = storeArgs.artifactTypeDefinition;
    }


    public initialize(instanceId: string): void {

        super.initialize(instanceId);

        this._artifactActions.changeArtifactType.addListener(this._handleChangeArtifactType);
        this._artifactActions.setPrimaryArtifact.addListener(this._setPrimaryArtifact);
        this._artifactActions.updateAlias.addListener(this._updateAlias);
        this._artifactActions.updateArtifact.addListener(this._updateArtifact);
        this._artifactActions.updateArtifacts.addListener(this._updateArtifacts);
        this._artifactActions.updateTemporaryArtifact.addListener(this._updateTemporaryArtifact);
        this._artifactActions.refreshArtifacts.addListener(this._refreshArtifacts);
        this._artifactActions.markingArtifactIsDeleting.addListener(this._handleMarkingIsDeleting);
        this._artifactTypeDataStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, this.getInstanceId());
        this.addToStoreList(this._artifactTypeDataStore);

        // Creating Trigger store with Triggers for only those artifacts which are of type Build or Git
        let isTriggerArtifact = ArtifactTriggerUtils.isReleaseTriggerSupportedInArtifact(this._currentArtifact.type, this.getArtifactTriggerConfiguration());
        if (isTriggerArtifact) {
            this._createArtifactTriggerStore();
        }

        // We are always creating store so that while doing getStore we don't need to again check whether we support pr triggers or not.
        this._createPullRequestTriggerStore();
    }

    public disposeInternal(): void {
        this._artifactActions.changeArtifactType.removeListener(this._handleChangeArtifactType);
        this._artifactActions.refreshArtifacts.removeListener(this._refreshArtifacts);
        this._artifactActions.updateAlias.removeListener(this._updateAlias);
        this._artifactActions.setPrimaryArtifact.removeListener(this._setPrimaryArtifact);
        this._artifactActions.updateArtifact.removeListener(this._updateArtifact);
        this._artifactActions.updateArtifacts.removeListener(this._updateArtifacts);
        this._artifactActions.updateTemporaryArtifact.removeListener(this._updateTemporaryArtifact);
        this._artifactActions.markingArtifactIsDeleting.removeListener(this._handleMarkingIsDeleting);

        super.disposeInternal();
    }

    public updateVisitor(visitor: IArtifactsDefinitionVisitor): void {
        if (this._artifactTriggerStore) {
            this._artifactTriggerStore.updateVisitor(visitor.definition);
        }

        if (this._pullRequestTriggerStore) {
            this._pullRequestTriggerStore.updateVisitor(visitor.definition);
        }

        ArtifactUtility.normalizeDefinitionInput(this._currentArtifact);
        
        JQueryWrapper.extendDeep(visitor.artifact, this._currentArtifact);
    }

    /**
     * @brief Returns the store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactStoreKey;
    }

    public isDirty(): boolean {
        return (!ArtifactStoreUtility.compareArtifact(this._currentArtifact, this._originalArtifact)
            || (this._artifactTriggerStore ? this._artifactTriggerStore.isDirty() : false))
            || (this._pullRequestTriggerStore ? this._pullRequestTriggerStore.isDirty() : false);
    }

    public isValid(): boolean {
        let isArtifactTriggerStoreValid: boolean = true;
        if (ArtifactTriggerUtils.isReleaseTriggerSupportedInArtifact(this._currentArtifact.type, this.getArtifactTriggerConfiguration())
            && this._artifactTriggerStore
            && this._artifactTriggerStore.getState().isToggleEnabled) {
            isArtifactTriggerStoreValid = this._artifactTriggerStore.isValid();
        }

        // If the store exists then check isValid otherwise if it doesn't exist, its valid always
        let isPullRequestTriggerStoreValid: boolean = this._pullRequestTriggerStore ? this._pullRequestTriggerStore.isValid() : true;

        return isArtifactTriggerStoreValid && isPullRequestTriggerStoreValid && this.isArtifactPropertiesValid();
    }

    public isArtifactPropertiesValid(): boolean {
        let artifactTypeStore: ArtifactTypeStore = this._getArtifactStore();
        let isInputStoreValid: boolean = artifactTypeStore ? this._isInputStoreValid(artifactTypeStore) : true;
        return isInputStoreValid && this._isAliasValid();
    }

    public getState(): PipelineArtifactDefinition {
        return this._currentArtifact;
    }

    public isPrimary(): boolean {
        return this._currentArtifact.isPrimary;
    }

    public getArtifactType(): string {
        return this._currentArtifact.type;
    }

    public getArtifactStoreInstanceId(): string {
        return this.getInstanceId();
    }

    public getAlias(): string {
        return this._currentArtifact.alias;
    }

    public isTemporary(): boolean {
        return this._isTemporary;
    }

    public getProjectId(): string {
        let projectDefinitionReference = this._currentArtifact.definitionReference[PipelineArtifactDefinitionConstants.ProjectId];
        return (projectDefinitionReference && projectDefinitionReference.id)
            ? projectDefinitionReference.id
            : VssContext.getDefaultWebContext().project.id;
    }

    public getDefinitionId(): string {
        // this is being called for finding repo type and repoId, hence return first definitionId.

        return ArtifactUtility.getDefinitionIdOfArtifact(this._currentArtifact);
    }

    public getSourceDefinitionUrl(): string {
        let sourceDefinitionUrl: string = Utils_String.empty;
        if (this._currentArtifact &&
            (ArtifactStoreUtility.isBuildArtifact(this._currentArtifact.type) ||
                ArtifactStoreUtility.isTfvcArtifact(this._currentArtifact.type))) {
            if (this._currentArtifact.definitionReference && this._currentArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl)) {
                sourceDefinitionUrl = this._currentArtifact.definitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl].id;
            }
        }
        return sourceDefinitionUrl;
    }

    public getWarningMessage(): string {
        // if any of the original or current is null, this check is redundant.
        if (!this._originalArtifact.alias || !this._currentArtifact.alias) {
            return null;
        }

        return this._originalArtifact.alias !== this._currentArtifact.alias ? Resources.ArtifactAliasChangedWarningMessage : null;
    }

    public isArtifactDeleting(): boolean {
        return this._isDeleting;
    }

    public getAliasErrorMessage(alias): string {
        if (DtcUtils.isNullOrWhiteSpace(alias)) {
            return Resources.SourceAliasCannotBeEmpty;
        }

        if (alias.length > ArtifactsConstants.ArtifactAliasMaxLength) {
            return Resources.ArtifactAliasLengthValidationError;
        }

        if (this._isAliasDuplicated(this.getInstanceId(), alias)) {
            return Utils_String.localeFormat(Resources.DuplicateAlias, alias);
        }

        if (ArtifactsConstants.ArtifactAliasRegx.test(alias)) {
            return (Utils_String.localeFormat(Resources.ArtifactAliasHasInvalidCharacters, Utils_HTML.HtmlNormalizer.normalize(alias)));
        }

        return Utils_String.empty;
    }

    public isPullRequestTriggerConfigured(): boolean {
        return this._pullRequestTriggerStore ? this._pullRequestTriggerStore.getState().isToggleEnabled : false;
    }

    public getArtifactTypeDefinition(): PipelineArtifactTypeDefinition {
        return this._artifactTypeDefinition;
    }

    public getArtifactTriggerConfiguration(): PipelineArtifactTriggerConfiguration {
        return (!!this._artifactTypeDefinition) ? this._artifactTypeDefinition.artifactTriggerConfiguration : null;
    }

    public getTriggerType(): PipelineReleaseTriggerType {
        if (!!this._artifactTypeDefinition) {
            return ArtifactTriggerUtils.getReleaseTriggerTypeOfArtifact(this._artifactTypeDefinition.artifactType);
        }
        else {
            return PipelineTriggerType.Undefined;
        }
    }

    private _createPullRequestTriggerStore(): any {
        this.addToStoreList(this._pullRequestTriggerStore = StoreManager.CreateStore<PullRequestTriggerStore, IPullRequestTriggerStoreOptions>(PullRequestTriggerStore, this.getInstanceId(),
            {
                trigger: this._pullRequestTrigger,
                getArtifactAlias: Utils_Core.delegate(this, this.getAlias)
            })
        );
    }

    private _updateTemporaryArtifact = (instanceId: string) => {
        if (this.getInstanceId() === instanceId) {
            this._isTemporary = false;
            this.emitChanged();
        }
    }

    private _isInputStoreValid(artifactTypeStore: ArtifactTypeStore): boolean {
        if (this._isTemporary) {
            return artifactTypeStore.isValid() && artifactTypeStore.isArtifactIdValid();
        }
        else {
            return artifactTypeStore.isValid();
        }
    }

    private _handleChangeArtifactType = (payload: IUpdateArtifactTypePayload) => {
        if (payload && payload.instanceId === this.getInstanceId()) {
            this._currentArtifact = {
                type: payload.artifactType,
                definitionReference: {},
                alias: Utils_String.empty,
                isPrimary: this._currentArtifact.isPrimary,
                sourceId: Utils_String.empty,
                isRetained: this._currentArtifact.isRetained
            };
            this._updateArtifactInputs();
        }
        this.emitChanged();
    }

    private _updateArtifactInputs(): void {
        // update artifactTypeDefinition also when artifact type changes
        this._artifactTypeDefinition = this._artifactTypeDataStore.getArtifactTypeDefinition(this._currentArtifact.type);

        if (this._artifactTypeDefinition && this._artifactTypeDefinition.inputDescriptors) {
            this._artifactTypeDefinition.inputDescriptors.forEach((input) => {
                if (Utils_String.ignoreCaseComparer(input.id, PipelineArtifactDefinitionConstants.ArtifactId) !== 0) {
                    this._currentArtifact.definitionReference[input.id] = { name: Utils_String.empty, id: Utils_String.empty };
                }
            });
        }
    }

    private _createArtifactTriggerStore(): void {
        //Getting definitionID and projectId for the artifact source

        let definitionId: string = this.getDefinitionId();
        if (this._currentArtifact.type === PipelineArtifactTypes.Build) {
            let id: number = parseInt(definitionId);
            if (isNaN(id)) {
                Diag.logError("Error: ParseInt returned NaN for definitionId: " + definitionId);
                return;
            }
        }

        this.addToStoreList(this._artifactTriggerStore = StoreManager.CreateStore<ArtifactTriggerStore, IArtifactTriggerOptions>(ArtifactTriggerStore, this.getInstanceId(),
            {
                isTriggerEnabled: !!this._trigger,
                createReleaseOnBuildTagging: ArtifactTriggerUtils.isCreateReleaseOnBuildTagging(this._trigger),
                triggerConditions: ArtifactTriggerUtils.getTriggerConditions(this._trigger),
                getAliasCallback: Utils_Core.delegate(this, this.getAlias),
                getArtifactTypeCallback: Utils_Core.delegate(this, this.getArtifactType),
                getArtifactStoreInstanceId: Utils_Core.delegate(this, this.getArtifactStoreInstanceId),
                getReleaseTriggerType: Utils_Core.delegate(this, this.getTriggerType)
            } as IArtifactTriggerOptions));
    }

    private _isAliasValid(): boolean {
        const aliasErrorMessage = this.getAliasErrorMessage(this._currentArtifact.alias);
        return !aliasErrorMessage;
    }

    private _getArtifactStore(): ArtifactTypeStore {
        let artifactTypeListStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, this.getInstanceId());
        return artifactTypeListStore ? artifactTypeListStore.getSelectedArtifactTypeStore() : null;
    }

    /**
     * @brief required for refreshing errors across artifacts in scenarios like duplicate alias
     */
    private _refreshArtifacts = (): void => {
        this.emitChanged();
    }

    /**
     * @brief handles updating alias
     */
    private _updateAlias = (payload: IUpdateAliasPayload): void => {
        if (!payload || !payload.artifactId) {
            return;
        }

        if (Utils_String.ignoreCaseComparer(this.getInstanceId(), payload.artifactId) !== 0) {
            return;
        }

        this._currentArtifact.alias = payload.alias;
        this.emitChanged();
    }

    private _setPrimaryArtifact = (artifactId: string): void => {
        if (!artifactId) {
            return;
        }

        if (Utils_String.ignoreCaseComparer(this.getInstanceId(), artifactId) !== 0) {
            this._currentArtifact.isPrimary = false;
            this.emitChanged();
            return;
        }

        this._currentArtifact.isPrimary = true;
        this.emitChanged();
    }

    /**
     * @brief handles updating the artifact
     */
    private _updateArtifact = (payload: IUpdateArtifactPayload): void => {
        if (!payload || !payload.artifact || !payload.artifactId) {
            return;
        }

        if (Utils_String.ignoreCaseComparer(this.getInstanceId(), payload.artifactId) !== 0) {
            return;
        }

        this._currentArtifact = payload.artifact;
        this.emitChanged();
    }

    private _initializeArtifact(storeArgs: IArtifactStoreArgs) {
        this._originalArtifact = <PipelineArtifactDefinition>JQueryWrapper.extendDeep({}, storeArgs.artifact);
        if (this._originalArtifact.definitionReference && (this._originalArtifact.type === PipelineArtifactTypes.Build)) {
            if (!this._originalArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefaultVersionTagsId)) {
                this._originalArtifact.definitionReference[PipelineArtifactDefinitionConstants.DefaultVersionTagsId] = { id: Utils_String.empty, name: Utils_String.empty };
            }

            if (!this._originalArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefaultVersionBranchId)) {
                this._originalArtifact.definitionReference[PipelineArtifactDefinitionConstants.DefaultVersionBranchId] = { id: Utils_String.empty, name: Utils_String.empty };
            }

            if (!this._originalArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefaultVersionSpecificId)) {
                this._originalArtifact.definitionReference[PipelineArtifactDefinitionConstants.DefaultVersionSpecificId] = { id: Utils_String.empty, name: Utils_String.empty };
            }

            if (!this._originalArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefaultVersionTypeId)) {
                this._originalArtifact.definitionReference[PipelineArtifactDefinitionConstants.DefaultVersionTypeId]
                    = FeatureFlagUtils.isDefaultToLatestArtifactVersionEnabled()
                        ? { id: PipelineArtifactDefinitionConstants.LatestType, name: Resources.DefaultArtifactLatestText }
                        : { id: PipelineArtifactDefinitionConstants.SelectDuringReleaseCreationType, name: Resources.DefaultArtifactSpecifyAtReleaseCreation };
            }
        }
        else if (this._originalArtifact.definitionReference && this._isGitGitHubOrTfvcArtifact()) {
            if (!this._originalArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefaultVersionSpecificId)) {
                this._originalArtifact.definitionReference[PipelineArtifactDefinitionConstants.DefaultVersionSpecificId] = { id: Utils_String.empty, name: Utils_String.empty };
            }

            if (!this._originalArtifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefaultVersionTypeId)) {
                this._originalArtifact.definitionReference[PipelineArtifactDefinitionConstants.DefaultVersionTypeId]
                    = FeatureFlagUtils.isDefaultToLatestArtifactVersionEnabled()
                        ? { id: PipelineArtifactDefinitionConstants.LatestFromBranchType, name: Resources.DefaultArtifactLatestFromBranch }
                        : { id: PipelineArtifactDefinitionConstants.SelectDuringReleaseCreationType, name: Resources.DefaultArtifactSpecifyAtReleaseCreation };
            }
        }

        this._currentArtifact = <PipelineArtifactDefinition>JQueryWrapper.extendDeep({}, this._originalArtifact);
        this._trigger = storeArgs.trigger;
        this._pullRequestTrigger = storeArgs.pullRequestTrigger;
        this._isTemporary = storeArgs.isTemporary;
        this._isDeleting = false;
    }

    private _isGitGitHubOrTfvcArtifact() {
        return this._originalArtifact.type === PipelineArtifactTypes.GitId ||
            this._originalArtifact.type === PipelineArtifactTypes.GitHubId ||
            this._originalArtifact.type === PipelineArtifactTypes.TfvcId;
    }

    private _updateArtifacts = (artifactTriggerMapArray: IArtifactTriggersMap[]) => {

        if (!artifactTriggerMapArray) {
            return;
        }

        let currentArtifactTriggerMap: IArtifactTriggersMap;
        let arraySize = artifactTriggerMapArray.length;
        for (let artifactIndex: number = 0; artifactIndex < arraySize; artifactIndex++) {
            let artifactTriggerMap: IArtifactTriggersMap = artifactTriggerMapArray[artifactIndex];
            if (Utils_String.ignoreCaseComparer(artifactTriggerMap.artifact.alias, this.getState().alias) === 0) {
                currentArtifactTriggerMap = artifactTriggerMap;
            }
        }

        if (currentArtifactTriggerMap) {
            let emitChanged: boolean = this._shouldEmitChangeOnSave(currentArtifactTriggerMap);
            this._originalArtifact = <PipelineArtifactDefinition>JQueryWrapper.extendDeep({}, currentArtifactTriggerMap.artifact);
            this._currentArtifact = <PipelineArtifactDefinition>JQueryWrapper.extendDeep({}, currentArtifactTriggerMap.artifact);
            this._trigger = currentArtifactTriggerMap.trigger;
            if (emitChanged) {
                this.emitChanged();
            }
        }

    }

    private _shouldEmitChangeOnSave(currentArtifactTriggerMap: IArtifactTriggersMap): boolean {
        let emitChanged: boolean = false;
        const newSourceDefinition = currentArtifactTriggerMap.artifact.definitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl];
        const oldSourceDefinition = this._currentArtifact.definitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl];
        if ((!oldSourceDefinition && newSourceDefinition) ||
            (oldSourceDefinition && !newSourceDefinition)) {
            emitChanged = true;
        } else if (!!newSourceDefinition &&
            !!oldSourceDefinition &&
            Utils_String.ignoreCaseComparer(newSourceDefinition.id, oldSourceDefinition.id) !== 0) {
            // source definition url of newly added artifact changes on save
            emitChanged = true;
        }

        return emitChanged;
    }

    private _handleMarkingIsDeleting = (instanceId: string) => {
        if (this.getInstanceId() === instanceId) {
            this._isDeleting = true;
            this.emitChanged();
        }
    }

    private _artifactTriggerStore: ArtifactTriggerStore;
    private _trigger: PipelineTriggerBase;
    private _pullRequestTriggerStore: PullRequestTriggerStore;
    private _pullRequestTrigger: PipelinePullRequestTrigger;
    private _currentArtifact: PipelineArtifactDefinition;
    private _originalArtifact: PipelineArtifactDefinition;

    private _artifactActions: ArtifactActions;
    private _isAliasDuplicated: (artifactId: string, alias: string) => boolean;
    private _isTemporary: boolean = false;
    private _isDeleting: boolean = false;
    private _artifactTypeDataStore: ArtifactTypeListStore;
    private _artifactTypeDefinition: PipelineArtifactTypeDefinition;
}