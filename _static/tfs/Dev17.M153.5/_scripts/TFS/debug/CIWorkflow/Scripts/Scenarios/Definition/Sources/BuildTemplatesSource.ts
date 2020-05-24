import * as Q from "q";

import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { TemplateConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ServiceClientFactory } from "CIWorkflow/Scripts/Service/ServiceClientFactory";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { ITemplateDefinition, TemplateDefinitionCategory } from "DistributedTaskControls/Common/Types";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { ITemplatesSource } from "DistributedTaskControls/Sources/TemplatesSource";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import * as BuildContracts from "TFS/Build/Contracts";
import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class BuildTemplatesSource extends SourceBase implements ITemplatesSource {
    
    private _templatesMap: IDictionaryStringTo<BuildContracts.BuildDefinitionTemplate>;
    private _templateCategoryToGroupIdMap: { [key: number]: string };

    public static getKey(): string {
        return "BuildTemplatesSource";
    }

    /**
     * @brief Updates Build definition template list
     */
    public updateTemplateList(): IPromise<ITemplateDefinition[]> {
        if (this._templatesMap
            || this._populateTemplatesMap(WebPageData.WebPageDataHelper.getAllTemplates())) {
            return this._getTemplateDefinitions();
        }
        else {
            return ServiceClientFactory
                .getServiceClient()
                .getDefinitionTemplates()
                .then((templateList: BuildContracts.BuildDefinitionTemplate[]) => {
                    this._populateTemplatesMap(templateList);
                    return this._getTemplateDefinitions();
                }, (error) => {
                    return Q.reject(error);
                });
        }
    }

    /**
     * @brief Gets buildDefinition template for a given templateId
     * @param templateId
     */
    public getBuildDefinitionTemplate(templateId: string): IPromise<BuildContracts.BuildDefinitionTemplate> {
        if (this._templatesMap && this._templatesMap[templateId]) {
            return Q.resolve(this._templatesMap[templateId]);
        }
        else {
            let buildDefinitionTemplates = WebPageData.WebPageDataHelper.getAllTemplates();
            if (this._populateTemplatesMap(buildDefinitionTemplates)) {
                return Q.resolve(this._templatesMap[templateId]);
            }
            else {
                let preFetchedTemplate = WebPageData.WebPageDataHelper.getSelectedTemplate();
                if (preFetchedTemplate && preFetchedTemplate.id === templateId) {
                    return Q.resolve(preFetchedTemplate);
                }
                else {
                    return TaskDefinitionSource.instance().getTaskDefinitionList().then((tasks: DistributedTaskContracts.TaskDefinition[]) => {
                        return ServiceClientFactory.getServiceClient().getDefinitionTemplate(templateId);
                    });
                }
            }
        }
    }

    public deleteTemplate(templateId: string): IPromise<any> {
        return ServiceClientFactory.getServiceClient().deleteDefinitionTemplate(templateId)
            .then(() => {
                if (this._templatesMap && this._templatesMap[templateId]) {
                    delete this._templatesMap[templateId];
                }
                Q.resolve(null);
            });
    }

    public static instance(): BuildTemplatesSource {
        return SourceManager.getSource(BuildTemplatesSource);
    }

    /**
     * @brief Converts Build definition template to DTC definition template
     */
    private _getTemplateDefinitions(): IPromise<ITemplateDefinition[]> {
        let templateDefinitions: ITemplateDefinition[] = [];
        let templateList = this._getBuildDefinitionTemplateList();

        templateList.forEach((template: BuildContracts.BuildDefinitionTemplate) => {
            if (!Utils_String.equals(TemplateConstants.EmptyTemplateId, template.id, true)) {
                templateDefinitions.push({
                    description: template.description,
                    iconUrl: template.icons ? template.icons["image/png"] : Utils_String.empty,
                    id: template.id,
                    name: template.name,
                    groupId: this._getGroupId(template),
                    canDelete: template.canDelete,
                    category: template.category,
                    defaultHostedQueue: template.defaultHostedQueue
                });
            }
        });

        // Insert the empty template at last
        let emptyTemplate = templateList.filter(e => e.id === TemplateConstants.EmptyTemplateId)[0];
        if (!!emptyTemplate) {
            templateDefinitions.push({
                description: emptyTemplate.description,
                iconUrl: emptyTemplate.icons ? emptyTemplate.icons["image/png"] : Utils_String.empty,
                id: emptyTemplate.id,
                name: emptyTemplate.name,
                groupId: this._getGroupId(emptyTemplate),
                canDelete: emptyTemplate.canDelete,
                category: emptyTemplate.category,
                defaultHostedQueue: emptyTemplate.defaultHostedQueue
            });
        }

        return Q.resolve(templateDefinitions);
    }

    private _getGroupId(template: BuildContracts.BuildDefinitionTemplate): string {
        let templateCategory = this._getTemplateDefinitionCategory(template);
        if (!this._templateCategoryToGroupIdMap) {
            this._templateCategoryToGroupIdMap = [];
            this._templateCategoryToGroupIdMap[TemplateDefinitionCategory.Featured] = Resources.FeaturedGroup;
            this._templateCategoryToGroupIdMap[TemplateDefinitionCategory.Others] = Resources.OthersGroup;
            this._templateCategoryToGroupIdMap[TemplateDefinitionCategory.Custom] = DTCResources.Custom;
        }
        return this._templateCategoryToGroupIdMap[templateCategory];
    }

    private _getTemplateDefinitionCategory(template: BuildContracts.BuildDefinitionTemplate): TemplateDefinitionCategory {
        let category = TemplateDefinitionCategory.Others;
        switch (template.id) {
            case "vsBuild":         // .NET Desktop
            case "AspNetBuild":     // ASP.NET
            case "AzureWeb":        // Azure Web App for ASP.NET
            case "android":         // Android
            case "container":       // Docker container
            case "maven":           // Maven
            case "PythonPackage":   // Python package
            case "Xcode":           // Xcode
                category = TemplateDefinitionCategory.Featured;
                break;
            default:
                if (template.canDelete) {
                    category = TemplateDefinitionCategory.Custom;
                }
        }
        return category;
    }

    private _getBuildDefinitionTemplateList(): BuildContracts.BuildDefinitionTemplate[] {
        let templateList: BuildContracts.BuildDefinitionTemplate[] = [];
        if (this._templatesMap) {
            Object.keys(this._templatesMap).forEach((key: string) => {
                templateList.push(this._templatesMap[key]);
            });
        }

        templateList.sort(this._buildDefinitionTemplateComparer);
        return templateList;
    }

    private _buildDefinitionTemplateComparer = (templateA: BuildContracts.BuildDefinitionTemplate,
        templateB: BuildContracts.BuildDefinitionTemplate): number => {
        let templateSortKeyA = this._getTemplateDefinitionCategory(templateA) + templateA.name;
        let templateSortKeyB = this._getTemplateDefinitionCategory(templateB) + templateB.name;

        return Utils_String.ignoreCaseComparer(templateSortKeyA, templateSortKeyB);
    }

    private _populateTemplatesMap(buildDefinitionTemplates: BuildContracts.BuildDefinitionTemplate[]): boolean {
        let succeeded: boolean = false;
        if (buildDefinitionTemplates && buildDefinitionTemplates.length > 0) {
            this._templatesMap = {};
            buildDefinitionTemplates.forEach((buildDefintionTemplate: BuildContracts.BuildDefinitionTemplate) => {
                this._templatesMap[buildDefintionTemplate.id] = buildDefintionTemplate;
            });
            succeeded = true;
        }
        return succeeded;
    }
}
