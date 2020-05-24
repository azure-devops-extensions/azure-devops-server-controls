import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { TemplateConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import * as StringUtils from "VSS/Utils/String";

export class BuildDefinitionNameHelper {

    public static getDefaultBuildDefinitionName(projectName: string, templateId: string, templateName: string): string {
        if (StringUtils.equals(templateId, TemplateConstants.EmptyTemplateId, true)) {
            return StringUtils.localeFormat(Resources.DefaultEmptyTemplateBuildDefinitionNameFormat, projectName);
        }
        else {
            return StringUtils.localeFormat(Resources.DefaultBuildDefinitionNameFormat, projectName, templateName);
        }
    }
}
