import * as Q from "q";

import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/YamlDefinitionActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import { IRepository, IRepositoryItem } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { VersionControlSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlSource";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as BuildContracts from "TFS/Build/Contracts";
import { GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";

export class YamlDefinitionActionsCreator  extends ActionsBase.ActionCreatorBase {
    private _actions: Actions.YamlDefinitionActions;
    private _versionControlSource: VersionControlSource;
    private readonly _vstsCIYamlFilename: string = "azure-pipelines.yml";

    public static getKey(): string {
        return ActionCreatorKeys.YamlDefinition_ActionCreator;
    }

    public initialize(): void {
        this._versionControlSource = new VersionControlSource();
        this._actions = ActionsHubManager.GetActionsHub<Actions.YamlDefinitionActions>(Actions.YamlDefinitionActions);
    }

    public setListUnusedYamlFilesEnabled(isEnabled: boolean): void {
        this._actions.setListUnusedYamlFilesEnabled.invoke({ value: isEnabled });
    }

    public listUnusedYamlFiles(connectionId: string, sourceProvider: SourceProvider, repository: IRepository, branch: string): IPromise<void> {
        if (!sourceProvider || !sourceProvider.canDiscoverExistingYamlDefinitions()) {
            return Q.resolve();
        }

        const repositoryType = sourceProvider.getRepositoryType();
        const currentProjectId = TfsContext.getDefault().contextData.project.id;

        return Q.all([
            this._versionControlSource.getRepositoryPathContent(sourceProvider, connectionId, repository, branch, "/"),
            BuildDefinitionSource.instance().getDefinitions({
                project: currentProjectId,
                includeAllProperties: true,
                processType: ProcessType.Yaml,
                yamlFilename: this._vstsCIYamlFilename,
                repositoryId: repository.id,
                repositoryType: repositoryType
            })
        ]).then(
            results => {
                const files = results[0] as IRepositoryItem[];
                const yamlFiles = files.filter(i => !i.isContainer && i.path === this._vstsCIYamlFilename);

                const getDefinitionsResult = results[1] as GetDefinitionsResult;
                const definitions = getDefinitionsResult.definitions.filter(d => d.quality === BuildContracts.DefinitionQuality.Definition);
                const yamlProcesses = definitions.map(d => (d as BuildContracts.BuildDefinition).process as BuildContracts.YamlProcess);

                // remove yaml files that already have a definition associated with them
                const yamlFilesWithoutDefinitions = yamlFiles.filter(f => !yamlProcesses.some(p => p.yamlFilename === f.path));

                this._actions.listUnusedYamlFiles.invoke({
                    connectionId: connectionId,
                    repositoryType: repositoryType,
                    items: yamlFilesWithoutDefinitions
                });
            },
            error => {
                this._actions.listUnusedYamlFiles.invoke({
                    connectionId: connectionId,
                    repositoryType: repositoryType,
                    errorMessage: error.message || error,
                    items: null
                });
            }
        );
    }
}