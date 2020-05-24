// TODO - Mova all contents of this file to utils in DT and delete it

import { first as firstInArray } from "VSS/Utils/Array";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { getMajorVersion, getMajorVersionSpec } from "DistributedTasksCommon/TFS.Tasks.Utils";

export function getLatestVersion(allVersions: DTContracts.TaskDefinition[]): DTContracts.TaskDefinition {
    const sortedVersions = allVersions.sort((a: DTContracts.TaskDefinition, b: DTContracts.TaskDefinition) => {
        return b.version.major - a.version.major;
    });

    return firstInArray(sortedVersions);
}

export function getTaskDefinitionWithVersionSpec(allTaskVersions: DTContracts.TaskDefinition[], versionSpec: string): DTContracts.TaskDefinition {
    const majorVersion = getMajorVersion(versionSpec);
    return firstInArray(allTaskVersions, (taskDefinition: DTContracts.TaskDefinition) => {
        return taskDefinition.version.major === majorVersion;
    });
}

export function getAllVersionSpecs(allTaskVersions: DTContracts.TaskDefinition[]): string[] {
    return allTaskVersions.map((taskDefinition: DTContracts.TaskDefinition) => {
        return getMajorVersionSpec(taskDefinition.version);
    });
}
