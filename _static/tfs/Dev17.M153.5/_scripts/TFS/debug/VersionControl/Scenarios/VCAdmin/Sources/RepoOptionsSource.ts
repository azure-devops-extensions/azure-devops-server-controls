/// Copyright (c) Microsoft Corporation. All rights reserved.

import { IVersionControlClientService } from "VersionControl/Scripts/IVersionControlClientService";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { SettingKeys, getTfvcWebEditEnabled, setTfvcRepositorySettings } from "VersionControl/Scripts/VersionControlSettings";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"

enum RepoOptionsMode {
    AllGitRepos,
    GitRepo,
    TfvcRepo,
}

export interface IRepoOptionsSource {
    getVCOptions(): IPromise<VCTypes.RepositoryOption[]>;
    updateVCOption(optionKey: string, optionValue: boolean): IPromise<void>;
}

export class RepoOptionsSource implements IRepoOptionsSource {
    private repoContext: RepositoryContext;
    private mode: RepoOptionsMode;

    constructor(context: RepositoryContext) {
        this.repoContext = context;

        if (context instanceof TfvcRepositoryContext) {
            this.mode = RepoOptionsMode.TfvcRepo;
        } else if (context.getRepositoryId() === VCTypes.Constants.AllReposId) {
            this.mode = RepoOptionsMode.AllGitRepos;
        } else {
            this.mode = RepoOptionsMode.GitRepo;
        }
    }

    public getVCOptions(): IPromise<VCTypes.RepositoryOption[]> {
        switch(this.mode) {
            case RepoOptionsMode.AllGitRepos:
                return this.getAllGitReposOptions();
            case RepoOptionsMode.GitRepo:
                return this.getGitRepoOptions();
            case RepoOptionsMode.TfvcRepo:
                return this.getTfvcRepoOptions();
        }
    }

    public updateVCOption(optionKey: string, optionValue: boolean): IPromise<void> {
        if (this.mode === RepoOptionsMode.GitRepo || this.mode === RepoOptionsMode.AllGitRepos) {

            const vcOption: VCTypes.RepositoryOption = {
                key: optionKey,
                value: optionValue
            } as VCTypes.RepositoryOption;

            const context = this.repoContext;

            return new Promise<void>(function(resolve, reject) {
                context.getClient().beginUpdateRepositoryOption(
                    context,
                    vcOption, 
                    () => { resolve(); },
                    (errorMessage) => { reject(errorMessage); }
                )}
            );
        } else {
            const entries: { [key: string]: any } = { [optionKey]: optionValue };
            return setTfvcRepositorySettings(entries, this.repoContext.getTfsContext().navigation.projectId);
        }
    }

    private getAllGitReposOptions(): IPromise<VCTypes.RepositoryOption[]> {
        const localContext = this.repoContext;
        return new Promise<VCTypes.RepositoryOption[]>(function(resolve, reject) {
            localContext.getClient().beginGetAllGitRepositoriesOptions(
                (data: VCTypes.RepositoryOption[]) => {
                    resolve(data);
                },
                (error: any) => {
                    reject(error);
                }
            );
        });
    }

    private getGitRepoOptions(): IPromise<VCTypes.RepositoryOption[]> {
        const localContext = this.repoContext;
        return new Promise<VCTypes.RepositoryOption[]>(function(resolve, reject) {
            localContext.getClient().beginGetRepositoryOptions(localContext,
                (data: VCTypes.RepositoryOption[]) => {
                    resolve(data);
                },
                (error: any) => {
                    reject(error);
                }
            );
        });
    }

    private getTfvcRepoOptions(): IPromise<VCTypes.RepositoryOption[]> {
        return getTfvcWebEditEnabled(this.repoContext.getTfsContext().navigation.projectId)
        .then((enabled: boolean) => {
            return [{
                displayHtml: VCResources.TfvcWebEditEnabledOption,
                key: SettingKeys.tfvcWebEditEnabled,
                value: enabled,
                usesSettingsService: true,
                category: "",
                updateError: null
            }];
        });
    }
}
