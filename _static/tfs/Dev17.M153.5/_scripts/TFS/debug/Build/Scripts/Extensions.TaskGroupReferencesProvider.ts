import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as ClientServices_NoRequire from "Build.Common/Scripts/ClientServices";

import { GetDefinitionsOptions, GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";

import { ITaskGroupReferencesProvider, ITaskGroupReferenceGroup, ITaskGroupReference } from "DistributedTask/TaskGroups/ExtensionContracts";

import { usingWithPromise } from "Presentation/Scripts/TFS/TFS.Using";

import { BuildDefinitionReference } from "TFS/Build/Contracts";

import * as SDK_Shim from "VSS/SDK/Shim"
import { getService } from "VSS/Service";
import { empty as emptyString, localeIgnoreCaseComparer as localeIgnoreCaseStringComparer } from "VSS/Utils/String";

export class BuildDefinitionTaskGroupReferenceProvider implements ITaskGroupReferencesProvider {

    public fetchTaskGroupReferences(taskGroupId: string): IPromise<ITaskGroupReferenceGroup> {
        return usingWithPromise("Build.Common/Scripts/ClientServices")
            .then((ClientServices: typeof ClientServices_NoRequire) => {
                const filter: GetDefinitionsOptions = {
                    taskIdFilter: taskGroupId
                };

                return getService(ClientServices.BuildClientService).getDefinitions(filter)
                    .then((definitionsResult: GetDefinitionsResult) => {
                        const definitions: BuildDefinitionReference[] = definitionsResult.definitions;

                        const references: ITaskGroupReference[] = definitions.map((definition: BuildDefinitionReference) => {
                            return {
                                displayName: definition.name,
                                url: (definition._links && definition._links.editor && definition._links.editor.href) || emptyString
                            } as ITaskGroupReference;

                        }).sort((ref1: ITaskGroupReference, ref2: ITaskGroupReference) => {
                            return localeIgnoreCaseStringComparer(ref1.displayName, ref2.displayName);
                        });

                        return {
                            referenceIcon: "bowtie-build",
                            references: references,
                            displayName: BuildResources.BuildDefinitions
                        } as ITaskGroupReferenceGroup;
                    });

            });
    }
}

SDK_Shim.registerContent("build.TaskGroupReferences", (context) => {
    return new BuildDefinitionTaskGroupReferenceProvider();
});