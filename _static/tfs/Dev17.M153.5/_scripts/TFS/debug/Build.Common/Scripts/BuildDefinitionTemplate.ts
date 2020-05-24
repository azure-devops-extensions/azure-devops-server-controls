import { toBuildDefinition, toBuildDefinition3_2 } from "Build.Common/Scripts/BuildDefinition";

import { BuildDefinitionTemplate, BuildDefinitionTemplate3_2 } from "TFS/Build/Contracts";

/**
 * Converts a legacy (pre-phases) build definition template to the new format
 * @param template
 */
export function toBuildDefinitionTemplate(template: BuildDefinitionTemplate3_2): BuildDefinitionTemplate {
    if (!template) {
        return null;
    }

    let result: BuildDefinitionTemplate = {
        canDelete: template.canDelete,
        category: template.category,
        defaultHostedQueue: template.defaultHostedQueue,
        description: template.description,
        icons: template.icons,
        iconTaskId: template.iconTaskId,
        id: template.id,
        name: template.name,
        template: toBuildDefinition(template.template)
    };

    return result;
}

/**
 * Converts a build definition template to the legacy (pre-phases) format
 * @param template
 */
export function toBuildDefinitionTemplate3_2(template: BuildDefinitionTemplate): BuildDefinitionTemplate3_2 {
    if (!template) {
        return null;
    }

    let result: BuildDefinitionTemplate3_2 = {
        canDelete: template.canDelete,
        category: template.category,
        defaultHostedQueue: template.defaultHostedQueue,
        description: template.description,
        icons: template.icons,
        iconTaskId: template.iconTaskId,
        id: template.id,
        name: template.name,
        template: toBuildDefinition3_2(template.template)
    };

    return result;
}