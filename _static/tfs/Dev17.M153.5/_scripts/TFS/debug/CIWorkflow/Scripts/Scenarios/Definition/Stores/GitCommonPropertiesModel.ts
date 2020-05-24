import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import { IGitPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { ICommonGitState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CommonGitState";

import { Boolean } from "DistributedTaskControls/Common/Primitives";

import { BuildRepository, RepositoryCleanOptions } from "TFS/Build/Contracts";

import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

export class GitCommonPropertiesModel {
    private _shallowFetchStatus: boolean = false;
    private _originalShallowFetchStatus: boolean = false;
    private static readonly _defaultFetchDepth: string = "15";

    constructor(private _repository, private _originalRepository, private _isRepositoryCleanDisabled: () => boolean) {
        this._initializeRepository(this._repository);
        this._initializeRepository(this._originalRepository);
    }

    public updateStateChangeFromPayload(payload: IGitPayload): void {
        if (payload.checkoutSubmodules !== undefined) {
            this._repository.checkoutSubmodules = payload.checkoutSubmodules;
        }

        if (payload.checkoutNestedSubmodules !== undefined) {
            this._repository.properties[RepositoryProperties.CheckoutNestedSubmodules] = Boolean.toString(payload.checkoutNestedSubmodules);
        }

        if (payload.cleanOption) {
            this._repository.properties[RepositoryProperties.CleanOptions] = payload.cleanOption;
        }

        if (payload.gitLfsSupport !== undefined) {
            this._repository.properties[RepositoryProperties.GitLfsSupport] = Boolean.toString(payload.gitLfsSupport);
        }

        if (payload.skipSyncSources !== undefined) {
            this._repository.properties[RepositoryProperties.SkipSyncSource] = Boolean.toString(payload.skipSyncSources);
        }

        if (payload.shallowFetchStatus !== undefined) {
            this._shallowFetchStatus = payload.shallowFetchStatus;
        }

        if (payload.fetchDepth !== undefined) {
            this._repository.properties[RepositoryProperties.FetchDepth] = payload.fetchDepth.trim();
        }
    }

    public updateRepositoryFromBuildDefinition(repository: BuildRepository, originalRepository: BuildRepository) {
        this._repository = repository;
        this._originalRepository = originalRepository;

        this._originalShallowFetchStatus = ScmUtils.getShallowFetchStatus(this._repository.properties);
        this._shallowFetchStatus = this._originalShallowFetchStatus;

        this._setDefaultRepositoryProperties(this._repository);
        this._setDefaultRepositoryProperties(this._originalRepository);
    }

    public updateVisitor(repository: BuildRepository) {
        if (ScmUtils.isFetchDepthEmpty(repository.properties, this.getShallowFetchStatus())) {
            repository.properties[RepositoryProperties.FetchDepth] = "0";
        }
    }

    public isDirty(): boolean {
        return (
            this._repository.checkoutSubmodules !== this._originalRepository.checkoutSubmodules ||
            this._isShallowFetchStatusDirty() ||
            this.areRepositoryPropertiesDirty()
        );
    }

    public isValid(): boolean {
        return (this._shallowFetchStatus ? this.isFetchDepthValid(this._repository.properties[RepositoryProperties.FetchDepth]) : true);
    }

    public getCleanOption(): string {
        return this._repository.properties[RepositoryProperties.CleanOptions] || RepositoryCleanOptions.Source.toString();
    }

    public getSkipSyncStatus(): boolean {
        return Boolean.fromString(this._repository.properties[RepositoryProperties.SkipSyncSource]);
    }

    public getGitLfsSupportStatus(): boolean {
        return Boolean.fromString(this._repository.properties[RepositoryProperties.GitLfsSupport]);
    }

    public getShallowFetchStatus(): boolean {
        return this._shallowFetchStatus;
    }

    public getFetchDepth(): string {
        if (this._repository.properties[RepositoryProperties.FetchDepth]) {
            return this._repository.properties[RepositoryProperties.FetchDepth];
        }
        else if (this._repository.properties.hasOwnProperty(RepositoryProperties.FetchDepth)
            && Utils_String.equals(this._repository.properties[RepositoryProperties.FetchDepth], Utils_String.empty)) {
            return Utils_String.empty;
        }

        // TODO: pradeepn: Why is property set on Get. This is wrong. 
        this._repository.properties[RepositoryProperties.FetchDepth] = GitCommonPropertiesModel._defaultFetchDepth;
        return GitCommonPropertiesModel._defaultFetchDepth;
    }

    public isCheckoutSubmodulesEnabled(): boolean {
        return this._repository.checkoutSubmodules || false;
    }

    public isCheckoutNestedSubmodulesEnabled(): boolean {
        if (this._repository.checkoutSubmodules) {
            return Boolean.fromString(this._repository.properties[RepositoryProperties.CheckoutNestedSubmodules]);
        }

        return false;
    }

    public isFetchDepthValid(value: string): boolean {
        if ((this._shallowFetchStatus === false) || (!!value && Utils_Number.isPositiveNumber(value))) {
            return true;
        }

        return false;
    }

    public areRepositoryPropertiesDirty(): boolean {
        if (this._repository.properties) {
            return (
                !Utils_String.equals(this._repository.properties[RepositoryProperties.GitLfsSupport], this._originalRepository.properties[RepositoryProperties.GitLfsSupport], true) ||
                !Utils_String.equals(this._repository.properties[RepositoryProperties.SkipSyncSource], this._originalRepository.properties[RepositoryProperties.SkipSyncSource], true) ||
                (this._shallowFetchStatus && !Utils_String.equals(this._repository.properties[RepositoryProperties.FetchDepth], this._originalRepository.properties[RepositoryProperties.FetchDepth], true)) ||
                (!this._isRepositoryCleanDisabled() && !Utils_String.equals(this._repository.properties[RepositoryProperties.CleanOptions], this._originalRepository.properties[RepositoryProperties.CleanOptions], true)) ||
                (this._repository.checkoutSubmodules && !Utils_String.equals(this._repository.properties[RepositoryProperties.CheckoutNestedSubmodules], this._originalRepository.properties[RepositoryProperties.CheckoutNestedSubmodules], true))
            );
        }

        return false;
    }

    private _isShallowFetchStatusDirty(): boolean {
        if (this._shallowFetchStatus !== this._originalShallowFetchStatus) {
            return true;
        }

        return false;
    }

    private _initializeRepository(repository: BuildRepository) {
        repository.properties[RepositoryProperties.GitLfsSupport] = Boolean.falseString;
        repository.properties[RepositoryProperties.SkipSyncSource] = Boolean.falseString;
        repository.properties[RepositoryProperties.CheckoutNestedSubmodules] = Boolean.falseString;
        repository.checkoutSubmodules = false;
        repository.clean = Boolean.falseString;
    }

    private _setDefaultRepositoryProperties(repository: BuildRepository): void {
        if (!repository.properties) {
            repository.properties = {};
        }
        if (!repository.properties[RepositoryProperties.CleanOptions]) {
            repository.properties[RepositoryProperties.CleanOptions] = "0";
        }
        if (!repository.properties[RepositoryProperties.FetchDepth]) {
            repository.properties[RepositoryProperties.FetchDepth] = "0";
        }
        if (!repository.properties[RepositoryProperties.GitLfsSupport]) {
            repository.properties[RepositoryProperties.GitLfsSupport] = Boolean.falseString;
        }
        if (!repository.properties[RepositoryProperties.SkipSyncSource]) {
            repository.properties[RepositoryProperties.SkipSyncSource] = Boolean.falseString;
        }
        if (!repository.properties[RepositoryProperties.CheckoutNestedSubmodules]) {
            repository.properties[RepositoryProperties.CheckoutNestedSubmodules] = Boolean.falseString;
        }
    }
}
