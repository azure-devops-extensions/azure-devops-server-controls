import { Properties } from "DistributedTaskControls/Common/Telemetry";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { PipelineDefinitionRequestCreationSource_Type } from "PipelineWorkflow/Scripts/Common/Types";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";

import { HubIds } from "PipelineWorkflow/Scripts/Editor/Common/Constants";

import { ReleaseDefinition } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { getPageContext } from "VSS/Context";

export class DefinitionUtils {

    public static isDefinitionNameValid(definitionName: string): boolean {
        if (!definitionName) {
            return false;
        }
        return true;
    }

    public static createDefinitionProperties(pageSource: string): IDictionaryStringTo<any> {
        let properties: IDictionaryStringTo<any> = {};
        properties[Properties.DefinitionCreationSource] = pageSource || PipelineDefinitionRequestCreationSource_Type[PipelineDefinitionRequestCreationSource_Type.Other];
        return properties;
    }

    public static isV2EnvironmentRankLogicApplied(definition: ReleaseDefinition): boolean {
        let isV2EnvironmentRankLogicApplied = false;
        if (this._isHosted()){
            return true;
        }

        if (definition && definition.properties) {
            let container = definition.properties[this.c_environmentRankLogicPropertyName];
            if (container) {
                isV2EnvironmentRankLogicApplied = container.$value === this.c_v2EnvironmentRankLogicVersion;
            }
        }

        return isV2EnvironmentRankLogicApplied;
    }

    public static setV2EnvironmentRankLogic(definition: ReleaseDefinition): void {
        if (this._isHosted()){
            return;
        }

        if (definition && !this.isV2EnvironmentRankLogicApplied(definition)) {
            if (!definition.properties) {
                definition.properties = {};
            }

            definition.properties[this.c_environmentRankLogicPropertyName] = this.c_v2EnvironmentRankLogicVersion;
        }
    }

    public static getReleaseDefinitionUrl(action: string, state: any): string {
        return DtcUtils.getUrlForExtension(HubIds.ReleaseDefinitionHubId, action, state, true);
    }

    private static _isHosted(): boolean {
        const pageContext = getPageContext();
        if (pageContext && pageContext.webAccessConfiguration) {
            return pageContext.webAccessConfiguration.isHosted;
        }
        else {
            return  false;
        }
    }

    private static readonly c_environmentRankLogicPropertyName = "System.EnvironmentRankLogicVersion";
    private static readonly c_v2EnvironmentRankLogicVersion = "2";
}