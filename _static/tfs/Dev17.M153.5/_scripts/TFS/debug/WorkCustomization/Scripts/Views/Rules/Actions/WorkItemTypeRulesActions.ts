import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessRestClient = require("TFS/WorkItemTracking/ProcessRestClient");
import { RuleConditionTypes } from "WorkCustomization/Scripts/Constants";
import { RuleUtils } from "WorkCustomization/Scripts/Utils/RuleUtils";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { IGetWorkItemTypePayload } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { ProcessCustomizationTelemetry } from "WorkCustomization/Scripts/Utils/Telemetry";
import { setDialogAction, DialogType as DialogActionsDialogType } from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { ProcessRule } from "TFS/WorkItemTracking/ProcessContracts";

export interface IWorkItemTypeRulesPayload {
    rules: ProcessRule[];
}

export interface IWorkItemTypeRulesActions {
    endFetchRules: Action<IWorkItemTypeRulesPayload>;
    endDeleteRule: Action<string>;
    saveRule: Action<ProcessRule>;
    derivedWitCreated: Action<IGetWorkItemTypePayload>;
}

export class WorkItemTypeRulesActionCreator {
    private _actions: IWorkItemTypeRulesActions;

    constructor() {
        this._actions = {
            endFetchRules: new Action<IWorkItemTypeRulesPayload>(),
            endDeleteRule: new Action<string>(),
            saveRule: new Action<ProcessRule>(),
            derivedWitCreated: new Action<IGetWorkItemTypePayload>()
        }
    }

    public getActions(): IWorkItemTypeRulesActions {
        return this._actions;
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

    public addRule(newRule: ProcessRule): void {
        this._actions.saveRule.invoke(newRule);
    }

    public launchDeleteRuleConfirmationDialog(processId: string, witRef: string, ruleToDelete: ProcessRule, index:number, hasDeletePermissions: boolean,
        nextRule: ProcessRule, setRule: (rule: ProcessRule) => void): void {
        let errorBarId: string = "rules-confirmation-dialog";
        setDialogAction.invoke({
            dialogType: DialogActionsDialogType.DeleteRule,
            data: {
                deleteRule: () => {
                    this.beginDeleteWorkItemTypeRule(processId, witRef, ruleToDelete.id).then(() => {
                        setDialogAction.invoke({
                            dialogType: DialogActionsDialogType.None,
                            data: null
                        });
                        setRule(nextRule);
                    });
                },
                rule: ruleToDelete,
                index: index,
                title: Resources.DeleteRuleDialogTitle,
                errorBarId: errorBarId,
                cssClass: "destroy-field-dialog",
                confirmButtonText: Resources.DeleteRuleButtonText,
                isInputDisabled: !hasDeletePermissions,
                upfrontErrorMessage: hasDeletePermissions ? null : Resources.DeleteRulePermissionError
            }
        });
    }
}