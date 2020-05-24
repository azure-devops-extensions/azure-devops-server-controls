/// <reference types="jquery" />

import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as BuildContracts from "TFS/Build/Contracts";

import { LinkingUtilities } from "VSS/Artifacts/Services";
import { ToolNames } from "VSS/Artifacts/Constants";

/**
 * Gets a URI for the supplied definition
 * @param definition
 */
export function getDefinitionUri(definition: BuildContracts.DefinitionReference): string {
    return definition.uri || LinkingUtilities.encodeUri({
        id: definition.id.toString(),
        tool: ToolNames.TeamBuild,
        type: "Definition"
    });
}

/**
 * Indicates whether the supplied definition is a Desginer (phases/steps) definition
 * @param definition
 * @returns true if the definition is a Designer definition, false if it is not, or if it's null
 */
export function isDesignerDefinition(definition: BuildContracts.BuildDefinition): boolean {
    // null or no process => false
    if (!definition || !definition.process) {
        return false;
    }

    return definition.process.type === ProcessType.Designer;
}

/**
 * Indicates whether the supplied definition is a YAML definition
 * @param definition
 * @returns true if the definition is a YAML definition, false if it is not, or if it's null
 */
export function isYamlDefinition(definition: BuildContracts.BuildDefinition): boolean {
    // null or no process => false
    if (!definition || !definition.process) {
        return false;
    }

    return definition.process.type === ProcessType.Yaml;
}

/**
 * Gets all steps defined in the supplied definition
 * @param definition
 * @returns the steps in the definition (across all phases) or an empty array if the definition is null or does not have phases
 */
export function getAllSteps(definition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinitionStep[] {
    const result: BuildContracts.BuildDefinitionStep[] = [];
    const phases = getPhases(definition);
    phases.forEach((phase) => {
        result.push.apply(result, phase.steps);
    });

    return result;
}

/**
 * Gets the phases defined in the supplied definition
 * @param definition The definition
 * @returns the phases in the definition, or an empty array if there are no phases
 */
export function getPhases(definition: BuildContracts.BuildDefinition): BuildContracts.Phase[] {
    const process = getDesignerProcess(definition);
    return (process ? process.phases : undefined) || [];
}

/**
 * Gets a DesignerProcess from the definition
 * @param definition The definition
 * @returns The definition's process, or null if the definition is not a designer definition
 */
export function getDesignerProcess(definition: BuildContracts.BuildDefinition): BuildContracts.DesignerProcess {
    let process: BuildContracts.DesignerProcess = null;

    if (isDesignerDefinition(definition)) {
        process = definition.process as BuildContracts.DesignerProcess;
    }

    return process;
}

export function toBuildDefinition3_2(definition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition3_2 {
    if (definition) {
        const legacyDefinition: BuildContracts.BuildDefinition3_2 = {
            authoredBy: definition.authoredBy,
            badgeEnabled: definition.badgeEnabled,
            build: [],
            buildNumberFormat: definition.buildNumberFormat,
            comment: definition.comment,
            createdDate: definition.createdDate,
            demands: definition.demands,
            description: definition.description,
            draftOf: definition.draftOf,
            drafts: [],
            dropLocation: definition.dropLocation,
            id: definition.id,
            jobAuthorizationScope: definition.jobAuthorizationScope,
            jobCancelTimeoutInMinutes: definition.jobCancelTimeoutInMinutes,
            jobTimeoutInMinutes: definition.jobTimeoutInMinutes,
            latestBuild: definition.latestBuild,
            latestCompletedBuild: definition.latestCompletedBuild,
            metrics: definition.metrics,
            name: definition.name,
            options: definition.options,
            path: definition.path,
            processParameters: definition.processParameters,
            project: definition.project,
            properties: definition.properties,
            quality: definition.quality,
            queue: definition.queue,
            queueStatus: definition.queueStatus,
            repository: definition.repository,
            retentionRules: definition.retentionRules,
            revision: definition.revision,
            tags: definition.tags,
            triggers: definition.triggers,
            type: definition.type,
            uri: definition.uri,
            url: definition.url,
            variables: definition.variables,
            _links: definition._links
        };

        if (definition.process && definition.process.type === ProcessType.Designer) {
            const designerProcess = definition.process as BuildContracts.DesignerProcess;
            if (designerProcess.phases && designerProcess.phases.length > 0) {
                legacyDefinition.build = legacyDefinition.build.concat(designerProcess.phases[0].steps);
            }
        }

        return legacyDefinition;
    }
}

export function toBuildDefinition(definition: BuildContracts.BuildDefinition3_2): BuildContracts.BuildDefinition {
    if (definition) {
        const phase: BuildContracts.Phase = {
            steps: []
        } as BuildContracts.Phase;

        const designerProcess: BuildContracts.DesignerProcess = {
            phases: [phase],
            type: ProcessType.Designer
        };

        if (definition.build && definition.build.length > 0) {
            phase.steps = phase.steps.concat(definition.build);
        }

        const modernDefinition: BuildContracts.BuildDefinition = {
            authoredBy: definition.authoredBy,
            badgeEnabled: definition.badgeEnabled,
            buildNumberFormat: definition.buildNumberFormat,
            comment: definition.comment,
            createdDate: definition.createdDate,
            demands: definition.demands,
            description: definition.description,
            draftOf: definition.draftOf,
            drafts: [],
            dropLocation: definition.dropLocation,
            id: definition.id,
            jobAuthorizationScope: definition.jobAuthorizationScope,
            jobCancelTimeoutInMinutes: definition.jobCancelTimeoutInMinutes,
            jobTimeoutInMinutes: definition.jobTimeoutInMinutes,
            latestBuild: definition.latestBuild,
            latestCompletedBuild: definition.latestCompletedBuild,
            metrics: definition.metrics,
            name: definition.name,
            options: definition.options,
            path: definition.path,
            process: designerProcess,
            processParameters: definition.processParameters,
            project: definition.project,
            properties: definition.properties,
            quality: definition.quality,
            queue: definition.queue,
            queueStatus: definition.queueStatus,
            repository: definition.repository,
            retentionRules: definition.retentionRules,
            revision: definition.revision,
            tags: definition.tags,
            triggers: definition.triggers,
            type: definition.type,
            uri: definition.uri,
            url: definition.url,
            variables: definition.variables,
            _links: definition._links,
            variableGroups: []
        };

        return modernDefinition;
    }
}
