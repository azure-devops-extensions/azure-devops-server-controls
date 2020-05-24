import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ProcessRule, UpdateProcessRuleRequest, ProcessWorkItemType, CustomizationType, CreateProcessRuleRequest} from "TFS/WorkItemTracking/ProcessContracts";
import ProcessRestClient = require("TFS/WorkItemTracking/ProcessRestClient");
import { RuleConditionTypes } from "WorkCustomization/Scripts/Constants";
import { RuleUtils } from "WorkCustomization/Scripts/Utils/RuleUtils";
import { WorkItemTypeFieldsActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypeFieldsActions";
import { IGetWorkItemTypePayload, WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { ProcessCustomizationTelemetry } from "WorkCustomization/Scripts/Utils/Telemetry";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { StatesActionCreator } from "WorkCustomization/Scripts/Actions/StatesActions";
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";

export interface IWorkItemTypeRulesPayload {
    rules: ProcessRule[];
}

export interface IRulesDataActions {
    endFetchRules: Action<IWorkItemTypeRulesPayload>;
    endDeleteRule: Action<string>;
    endSaveRule: Action<ProcessRule>;
}

export class RulesDataActionsCreator {
    private _actions: IRulesDataActions;

    constructor() {
        this._actions = {
            endFetchRules: new Action<IWorkItemTypeRulesPayload>(),
            endDeleteRule: new Action<string>(),
            endSaveRule: new Action<ProcessRule>()
        }
    }

    public getActions(): IRulesDataActions {
        return this._actions;
    }

    public beginSaveRule(ruleToSave: ProcessRule, processId: string, witRefNameForRules: string, errorBarId?: string, onSaveCompleteAction?: Action<ProcessRule>): Q.Promise<void> {
        let serverRule: ProcessRule = RuleUtils.translateClientRuleToServerRule(ruleToSave);

        return Q(WorkItemTypesActionCreator.beginGetWorkItemType(processId, witRefNameForRules)
            .then(wit => {
                let witFetched: ProcessWorkItemType = wit.workItemType;

                let errorCallback: (Error: any) => void = (error: any) => {
                    showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
                };

                let successCallback : (rule: ProcessRule, processId: string, witRefNameForRules: string ) => void = (rule: ProcessRule,  processId: string, witRefNameForRules: string) =>{
                    ProcessCustomizationTelemetry.onRuleSaved(ruleToSave, processId, witRefNameForRules);
                    clearErrorAction.invoke(null);
                    let translatedRule = RuleUtils.translateServerRuleToClientRule(rule);
                    this._actions.endSaveRule.invoke(translatedRule);
                    if (onSaveCompleteAction) {
                        onSaveCompleteAction.invoke(translatedRule);
                    }
                };

                let successCallBackForWIT : (rule : ProcessRule, processId : string, witCreated: IGetWorkItemTypePayload ) => void = (rule : ProcessRule, processId : string, witCreated: IGetWorkItemTypePayload) => {
                    // we use ruleToSave to preserve condition/action ordering from server
                    ProcessCustomizationTelemetry.onRuleSaved(ruleToSave, processId, witRefNameForRules);
                    clearErrorAction.invoke(null);
                    Q.allSettled<any>([WorkItemTypeFieldsActionCreator.beginGetWorkItemTypeAllFieldsData(processId,witCreated.workItemType.referenceName), StatesActionCreator.beginGetWorkItemTypeStates(processId, witCreated.workItemType.referenceName)]).then(() => {
                    let translatedRule = RuleUtils.translateServerRuleToClientRule(rule);
                    this._actions.endSaveRule.invoke(translatedRule);
                        if (onSaveCompleteAction) {
                            onSaveCompleteAction.invoke(translatedRule);
                        }
                    });
                };
                
                if (witFetched.customization == CustomizationType.System) {

                    return WorkItemTypesActionCreator.beginCreateDerivedWorkItemType(processId, witFetched, false, errorBarId)
                        .then<void>(witCreated => {
                            UrlUtils.replaceCurrentWorkItemTypeId(witCreated.workItemType.referenceName);
                            if(serverRule.id){
                                return ProcessUtils.getProcessClient().updateProcessWorkItemTypeRule(serverRule, processId,witRefNameForRules , witCreated.workItemType.referenceName)
                                .then<void>(rule => {
                                    successCallBackForWIT(rule, processId, witCreated)}, errorCallback);
                            }
                            else{
                                return ProcessUtils.getProcessClient().addProcessWorkItemTypeRule(serverRule, processId, witCreated.workItemType.referenceName)
                                .then<void>(rule => {
                                    successCallBackForWIT(rule, processId, witCreated)}, errorCallback);
                            }
                        });
                }
                else {
                    if(serverRule.id){
                        return ProcessUtils.getProcessClient().updateProcessWorkItemTypeRule(serverRule, processId, witRefNameForRules, serverRule.id)
                        .then<void>(rule => {successCallback(rule, processId, witRefNameForRules)},errorCallback);
                    }else{
                        return ProcessUtils.getProcessClient().addProcessWorkItemTypeRule(serverRule, processId, witRefNameForRules)
                        .then<void>(rule =>{successCallback(rule, processId, witRefNameForRules)},errorCallback);
                    }
                }
            }));
    }

    public beginFetchWorkItemTypeRules(processId: string, witRefName: string, errorBarId?: string): IPromise<void> {
        let client = ProcessUtils.getProcessClient();

        let successCallback = (rules: ProcessRule[]) => {
            clearErrorAction.invoke(null);
            this._actions.endFetchRules.invoke({ rules: rules.map(r => RuleUtils.translateServerRuleToClientRule(r)) });
        };

        let errorCallback = (error: TfsError) => {
            showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
        }
        
        return client.getProcessWorkItemTypeRules(processId, witRefName).then<void>(successCallback, errorCallback);
    }

    public beginDeleteWorkItemTypeRule(processId: string, witRefName: string, ruleId: string, errorBarId?: string): Q.IPromise<void> {
        let client = ProcessUtils.getProcessClient();
        let successCallback = () => {
            clearErrorAction.invoke(null);
            this._actions.endDeleteRule.invoke(ruleId);
            ProcessCustomizationTelemetry.onRuleDeleted(processId, witRefName);
        };

        let errorCallback = (error: TfsError) => {
            showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
        }

        return client.deleteProcessWorkItemTypeRule(processId, witRefName, ruleId).then<void>(successCallback, errorCallback);
    }
}