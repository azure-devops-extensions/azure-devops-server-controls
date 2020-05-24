import { IYamlTemplateDefinition, IYamlTemplateItem } from "DistributedTaskControls/Common/Types";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

const __configAsCodeTemplateGroupKey = "__ConfigAsCodeTemplateGroup";
const __yamlTemplateKey = "__YAMLTemplate";

export function getYamlTemplateItem(): IYamlTemplateItem {
    return {
        definition: {
            id: __yamlTemplateKey,
            name: Resources.YamlTemplateName,
            description: Resources.YamlTemplateDescription,
            iconClassName: "bowtie-icon bowtie-file-code",
            groupId: __configAsCodeTemplateGroupKey
        },
        group: {
            key: __configAsCodeTemplateGroupKey,
            name: Resources.ConfigAsCodeText,
            startIndex: 0,
            count: 1
        }
    };
}
