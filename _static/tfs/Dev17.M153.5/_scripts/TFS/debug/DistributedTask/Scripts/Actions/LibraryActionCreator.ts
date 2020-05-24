import Constants = require("DistributedTask/Scripts/Constants");
import Model = require("DistributedTask/Scripts/DT.VariableGroup.Model");
import SecureFilesModel = require("DistributedTask/Scripts/DT.SecureFile.Model");
import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import * as VGPolicy_Actions from "DistributedTask/Scripts/Actions/VariableGroupPolicyActions";
import { SecureFilePropertyActions } from "DistributedTask/Scripts/Actions/SecureFilePropertyActions";
import Events_Services = require("VSS/Events/Services");

import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { VariablesConverter } from "DistributedTask/Scripts/DT.Converters";
import { VariableGroupType } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";

import Context = require("VSS/Context");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Navigation_Services = require("VSS/Navigation/Services");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import DTContracts = require("TFS/DistributedTask/Contracts");

import { FeatureFlag_ResourceAuthForVGEndpoint } from "DistributedTaskControls/Common/Common";


export class LibraryActionCreator {

    constructor() {
        this._model = new Model.VariableGroups();
        this._secureFilesModel = new SecureFilesModel.SecureFiles();
        this._processVariablesActionCreator = ActionCreatorManager.GetActionCreator<ProcessVariablesActionCreator>(ProcessVariablesActionCreator);
        this._secureFilePropertiesActions = ActionsHubManager.GetActionsHub<SecureFilePropertyActions>(SecureFilePropertyActions);
        let connection: Service.VssConnection = new Service.VssConnection(Context.getDefaultWebContext());
        this._connectedServicesClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);
        this._isResourceAuthorizationEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_ResourceAuthForVGEndpoint);
        if (this._isResourceAuthorizationEnabled) {
            this.vGPolicyActions = ActionsHubManager.GetActionsHub<VGPolicy_Actions.VariableGroupPolicyActions>(VGPolicy_Actions.VariableGroupPolicyActions);
        }
    }

    public static getInstance(): LibraryActionCreator {
        if (!LibraryActionCreator.libraryActionCreator) {
            LibraryActionCreator.libraryActionCreator = new LibraryActionCreator();
        }

        return LibraryActionCreator.libraryActionCreator;
    }

    public createOrUpdateVariableGroup(variableGroup: Model.VariableGroup, shouldAuthorize: boolean) {
        PerfTelemetryManager.instance.startScenario(TelemetryScenarios.saveVariableGroup);
        if (variableGroup.id <= 0) {
            this.createVariableGroup(variableGroup, shouldAuthorize);
        } else {
            this.updateVariableGroup(variableGroup);
        }
    }

    public createVariableGroup(variableGroup: Model.VariableGroup, shouldAuthorize: boolean) {
        let vg: Model.VariableGroup = {
            id: null,
            type: variableGroup.type,
            name: variableGroup.name,
            description: variableGroup.description,
            providerData: variableGroup.providerData,
            createdBy: null,
            createdOn: null,
            modifiedBy: null,
            modifiedOn: null,
            isShared: false,
            variables: variableGroup.variables
        };

        let addVariableGroupPromise = this._model.beginAddVariableGroup(vg, shouldAuthorize);

        addVariableGroupPromise.then((newVariableGroup: Model.VariableGroup) => {
            if (this._isResourceAuthorizationEnabled) {
                this.vGPolicyActions.setSavedState.invoke(shouldAuthorize);
            }
            Library_Actions.loadVariableGroup.invoke(newVariableGroup);
            this.invokeProcessVariablesAction(newVariableGroup);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
            PerfTelemetryManager.instance.endScenario(TelemetryScenarios.saveVariableGroup);
        });
    }

    public deleteVariableGroup(variableGroupId: number) {
        PerfTelemetryManager.instance.startScenario(TelemetryScenarios.deleteVariableGroup);
        let deleteVariableGroupPromise = this._model.beginDeleteVariableGroup(variableGroupId);
        deleteVariableGroupPromise.then(() => {
            Library_Actions.deleteVariableGroup.invoke(variableGroupId);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
            PerfTelemetryManager.instance.endScenario(TelemetryScenarios.deleteVariableGroup);
        });
    }

    public updateVariableGroup(variableGroup: Model.VariableGroup) {
        let vg: Model.VariableGroup = {
            id: variableGroup.id,
            type: variableGroup.type,
            name: variableGroup.name,
            description: variableGroup.description,
            providerData: variableGroup.providerData,
            createdBy: null,
            modifiedBy: null,
            modifiedOn: null,
            isShared: variableGroup.isShared,
            variables: variableGroup.variables
        };

        let updateVariableGroupPromise = this._model.beginUpdateVariableGroup(vg);
        updateVariableGroupPromise.then((variableGroup: Model.VariableGroup) => {
            Library_Actions.loadVariableGroup.invoke(variableGroup);
            this.invokeProcessVariablesAction(variableGroup, true);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
            PerfTelemetryManager.instance.endScenario(TelemetryScenarios.saveVariableGroup);
        });
    }

    public getVariableGroup(variableGroupId: number) {
        PerfTelemetryManager.instance.startScenario(TelemetryScenarios.getVariableGroup);
        let getVariableGroupPromise = this._model.beginGetVariableGroup(variableGroupId);
        getVariableGroupPromise.then((variableGroup: Model.VariableGroup) => {
            Library_Actions.getVariableGroup.invoke(variableGroup);
            this.invokeProcessVariablesAction(variableGroup);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
            PerfTelemetryManager.instance.endScenario(TelemetryScenarios.getVariableGroup);
        });
    }

    public getVariableGroups() {
        PerfTelemetryManager.instance.startScenario(TelemetryScenarios.getVariableGroups);
        let getVariableGroupsPromise = this._model.beginGetVariableGroups();
        getVariableGroupsPromise.then((variableGroups: Model.VariableGroup[]) => {
            Library_Actions.getVariableGroups.invoke(variableGroups);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
            PerfTelemetryManager.instance.endScenario(TelemetryScenarios.getVariableGroups);
        });
    }

    public cloneVariableGroup(variableGroupId: number) {
        let getVariableGroupPromise = this._model.beginGetVariableGroup(variableGroupId);
        getVariableGroupPromise.then((variableGroup: Model.VariableGroup) => {
            let variableGroupOriginalName: string = variableGroup.name;
            variableGroup.name = variableGroup.name + " - " + Resources.CopyText;
            variableGroup.id = 0;
            variableGroup.createdBy = null;
            variableGroup.modifiedBy = null;
            variableGroup.modifiedOn = null;
            if (variableGroup.type === Model.VariableGroupType.AzureKeyVault) {
                let serviceEndpointId = (variableGroup.providerData as DTContracts.AzureKeyVaultVariableGroupProviderData).serviceEndpointId;
                this._connectedServicesClient.beginGetEndpoint(serviceEndpointId).then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                    if (JSON.stringify(endpoint.data) === "{}") {
                        // As data is empty so user do not have read permission on endpoint
                        Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, Utils_String.localeFormat(Resources.CloneVariableGroupError, variableGroupOriginalName));
                    } else {
                        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.VariableGroupView, variableGroupId: 0 });
                        Library_Actions.cloneVariableGroup.invoke(variableGroup);
                    }
                }, (err: any) => {
                    Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
                });
            } else {
                variableGroup.variables.forEach(variable => {
                    if (variable.isSecret) {
                        variable.hasSecretValueBeenReset = true;
                        variable.hasVariableBeenUpdatedByUser = false;
                    }
                });

                Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.VariableGroupView, variableGroupId: 0 });
                Library_Actions.cloneVariableGroup.invoke(variableGroup);
                this.invokeProcessVariablesAction(variableGroup);
            }
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
        });
    }

    private invokeProcessVariablesAction(variableGroup: Model.VariableGroup, update: boolean = false) {
        var variablesList = [];
        if (VariableGroupType.isVstsVariableGroupType(variableGroup.type)) {
            variablesList = VariablesConverter.toProcessVariable(variableGroup.variables);
        }

        if (update) {
            this._processVariablesActionCreator.updateProcessVariables({
                definitionId: variableGroup.id,
                variableList: variablesList,
                skipSystemVariables: true
            });
        }
        else {
            this._processVariablesActionCreator.createProcessVariables({
                definitionId: variableGroup.id,
                variableList: variablesList,
                skipSystemVariables: true
            });
        }
    }

    public uploadSecureFile(secureFile: SecureFilesModel.SecureFile, file: File) {
        let sf: SecureFilesModel.SecureFile = {
            id: null,
            name: secureFile.name,
            createdBy: null,
            createdOn: null,
            modifiedBy: null,
            modifiedOn: null,
            properties: secureFile.properties
        };

        let uploadSecureFilePromise = this._secureFilesModel.beginUploadSecureFile(sf, file);
        uploadSecureFilePromise.then((newSecureFile: SecureFilesModel.SecureFile) => {
            Library_Actions.uploadSecureFile.invoke(newSecureFile);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
        });
    }

    public deleteSecureFile(secureFileId: string) {
        let deleteSecureFilePromise = this._secureFilesModel.beginDeleteSecureFile(secureFileId);
        deleteSecureFilePromise.then(() => {
            Library_Actions.deleteSecureFile.invoke(secureFileId);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
        });
    }

    public updateSecureFile(secureFile: SecureFilesModel.SecureFile) {
        let sf: SecureFilesModel.SecureFile = {
            id: secureFile.id,
            name: secureFile.name,
            createdBy: null,
            createdOn: null,
            modifiedBy: null,
            modifiedOn: null,
            properties: secureFile.properties
        };

        let updateSecureFilePromise = this._secureFilesModel.beginUpdateSecureFile(sf);
        updateSecureFilePromise.then((secureFile: SecureFilesModel.SecureFile) => {
            Library_Actions.loadSecureFile.invoke(secureFile);
            this._secureFilePropertiesActions.setProperties.invoke({
                properties: sf.properties
            });
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
        });
    }

    public getSecureFile(secureFileId: string) {
        let getSecureFilePromise = this._secureFilesModel.beginGetSecureFile(secureFileId);
        getSecureFilePromise.then((securefile: SecureFilesModel.SecureFile) => {
            Library_Actions.getSecureFile.invoke(securefile);
            this._secureFilePropertiesActions.setProperties.invoke({
                properties: securefile.properties
            });
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
        });
    }

    public getSecureFiles() {
        let getSecureFilesPromise = this._secureFilesModel.beginGetSecureFiles();
        getSecureFilesPromise.then((secureFiles: SecureFilesModel.SecureFile[]) => {
            Library_Actions.getSecureFiles.invoke(secureFiles);
        }, (err: any) => {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err);
        });
    }

    private _model: Model.VariableGroups;
    private _secureFilesModel: SecureFilesModel.SecureFiles;
    private static libraryActionCreator: LibraryActionCreator = null;
    private _processVariablesActionCreator: ProcessVariablesActionCreator;
    private _secureFilePropertiesActions: SecureFilePropertyActions;
    private _connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService;
    private vGPolicyActions: VGPolicy_Actions.VariableGroupPolicyActions;
    private _isResourceAuthorizationEnabled: boolean;
}