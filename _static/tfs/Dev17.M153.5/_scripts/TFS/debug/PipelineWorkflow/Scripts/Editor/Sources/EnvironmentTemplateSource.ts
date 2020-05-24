/**
 * @brief Source for functionality related to Pipeline Definition
 */
import * as Q from "q";

import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ITemplateDefinition } from "DistributedTaskControls/Common/Types";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ITemplatesSource } from "DistributedTaskControls/Sources/TemplatesSource";

import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { TemplateConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Source for Environment Templates
 */
export class EnvironmentTemplateSource extends ReleaseManagementSourceBase implements ITemplatesSource {

    public static getKey(): string {
        return "EnvironmentTemplateSource";
    }

    public static instance(): EnvironmentTemplateSource {
        return SourceManager.getSource(EnvironmentTemplateSource);
    }

    public updateTemplateList(forceRefresh?: boolean): IPromise<ITemplateDefinition[]> {
        if (!this._listTemplatesPromise || !!forceRefresh) {
            this._listTemplatesPromise = this._getTemplateDefinitions(!!forceRefresh);
        }

        return this._listTemplatesPromise;
    }

    public saveEnvironmentAsTemplate(template: RMContracts.ReleaseDefinitionEnvironmentTemplate): IPromise<RMContracts.ReleaseDefinitionEnvironmentTemplate> {
        return this.getClient().saveEnvironmentAsTemplate(template);
    } 

    public deleteTemplate(templateId?: string): IPromise<void> {
        return this.getClient().deleteTemplate(templateId);
    }

    public getEmptyEnvironmentTemplateQueueId(): IPromise<number> {
        let prefetchedTemplate: RMContracts.ReleaseDefinitionEnvironmentTemplate = ReleaseEditorWebPageDataHelper.instance().getEmptyEnvironmentTemplate();
        if (!!prefetchedTemplate && prefetchedTemplate.environment) {
            let deployPhase: RMContracts.AgentBasedDeployPhase = prefetchedTemplate.environment.deployPhases[0] as RMContracts.AgentBasedDeployPhase;
            let deploymentInput: RMContracts.AgentDeploymentInput = deployPhase.deploymentInput as RMContracts.AgentDeploymentInput;
            Q.resolve(deploymentInput.queueId); 
        }

        return this.getClient().getEnvironmentTemplate(TemplateConstants.EmptyTemplateGuid).then((template: RMContracts.ReleaseDefinitionEnvironmentTemplate) => {
            if (template.environment) {
                let deployPhase: RMContracts.AgentBasedDeployPhase = template.environment.deployPhases[0] as RMContracts.AgentBasedDeployPhase;
                let deploymentInput: RMContracts.AgentDeploymentInput = deployPhase.deploymentInput as RMContracts.AgentDeploymentInput;
                return Q.resolve(deploymentInput.queueId);
            }
            else {
                return Q.resolve(1);
            }
        });
    }

    private _getTemplateDefinitions(forceRefresh: boolean): IPromise<ITemplateDefinition[]> {
        let templateDefinitions: ITemplateDefinition[] = [];

        if (!forceRefresh) {
            let prefetchedTemplates = ReleaseEditorWebPageDataHelper.instance().getReleaseDefinitionEnvironmentTemplates();
            if (!!prefetchedTemplates) {
                templateDefinitions = this._orderTemplates(prefetchedTemplates.map(this._convertRMTemplatetoDTTemplate));
                return Q.resolve(templateDefinitions);
            }
        }

        return this.getClient().getEnvironmentTemplates().then((templateList: RMContracts.ReleaseDefinitionEnvironmentTemplate[]) => {
            templateDefinitions = this._orderTemplates(templateList.map(this._convertRMTemplatetoDTTemplate));
            return Q.resolve(templateDefinitions);
        });
    }

    private _convertRMTemplatetoDTTemplate = (template: RMContracts.ReleaseDefinitionEnvironmentTemplate): ITemplateDefinition => {
        return {
            description: template.description,
            iconUrl: template.iconUri,
            id: template.id,
            name: template.name,
            groupId: this._getGroupId(template.id, template.canDelete),
            tasks: [],
            canDelete: template.canDelete,
            category: template.category,
            defaultHostedQueue: null
        };
    }

    private _orderTemplates(templateList: ITemplateDefinition[]) {
        let orderedTemplateList: ITemplateDefinition[] = [];

        // This is the order which is given in WI #968061
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_azureAppService));
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_deployJava));
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_deployNodeApp));
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_deployPhp));
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_deployPython));
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_deployKubernetes));
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === EnvironmentTemplateSource.c_iisWebsiteAndSql));

        let remainingList = templateList.filter(e => {
            let id = e.id.toLowerCase();
            return id !== EnvironmentTemplateSource.c_azureAppService &&
                    id !== EnvironmentTemplateSource.c_deployJava &&
                    id !== EnvironmentTemplateSource.c_deployNodeApp &&
                    id !== EnvironmentTemplateSource.c_deployPhp &&
                    id !== EnvironmentTemplateSource.c_deployPython &&
                    id !== EnvironmentTemplateSource.c_deployKubernetes &&
                    id !== EnvironmentTemplateSource.c_iisWebsiteAndSql &&
                    id !== TemplateConstants.EmptyTemplateGuid;
        });
        remainingList.sort( (a: ITemplateDefinition, b: ITemplateDefinition) => { return Utils_String.localeIgnoreCaseComparer(a.name, b.name); });
        orderedTemplateList = orderedTemplateList.concat(remainingList);

        // Empty Template should be last
        orderedTemplateList = orderedTemplateList.concat(templateList.filter(e => e.id.toLowerCase() === TemplateConstants.EmptyTemplateGuid));
        return orderedTemplateList;
    }

    private _getGroupId(id: string, canDelete: boolean): string {
        switch (id.toLowerCase()){
            case EnvironmentTemplateSource.c_azureAppService:
            case EnvironmentTemplateSource.c_deployJava:
            case EnvironmentTemplateSource.c_deployNodeApp:
            case EnvironmentTemplateSource.c_deployPhp:
            case EnvironmentTemplateSource.c_deployPython:
            case EnvironmentTemplateSource.c_deployKubernetes:
            case EnvironmentTemplateSource.c_iisWebsiteAndSql:
                return Resources.FeaturedCategory;
            default:
                if (canDelete) {
                    return DTCResources.Custom;
                }
                return Resources.OthersCategory;
        }
    }

    // We are hardcoding these values since server is not returning any featured list in the order in which we want.
    public static readonly c_azureAppService = "f6a07a4f-1e1f-41c0-abab-eee4b3c9117f";  // Azure App Service Deployment
    public static readonly c_deployJava = "dbe30e61-9eb9-4591-85e1-56a9b803ef9f";       // Deploy Java App to Azure App Service
    public static readonly c_deployNodeApp = "328048ed-7966-49df-9503-3adc2fc2ca4e";    // Deploy Node.js App to Azure App Service
    public static readonly c_deployPhp = "f6a07a4f-1e1f-41c0-abab-eee4b3c9117e";        // Deploy PHP App to Azure App Service
    public static readonly c_deployPython = "97cd97a9-9f1a-419c-b6fa-368c574192a1";     // Deploy Python App to Azure App Service
    public static readonly c_deployKubernetes = "644d4d86-7ddf-42f7-9689-ae9344057ba4"; // Deploy to Kubernetes cluster
    public static readonly c_iisWebsiteAndSql = "77c28ae4-df38-4cfb-accb-3fd088dd609b"; // IIS Website and SQL Database Deployment
    private _listTemplatesPromise: IPromise<ITemplateDefinition[]>;
    public static readonly c_deploymentCategory = "Deployment";
}
