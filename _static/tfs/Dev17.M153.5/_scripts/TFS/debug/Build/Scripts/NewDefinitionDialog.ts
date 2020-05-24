import BuildTemplateWizard = require("Build/Scripts/Controls.AddTemplatesWizard");
import Telemetry = require("Build/Scripts/Telemetry");

import {BuildLinks, DesignerActions} from "Build.Common/Scripts/Linking";

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";

import Context = require("VSS/Context");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import Locations = require("VSS/Locations");
import Navigation_Services = require("VSS/Navigation/Services");

import BuildContracts = require("TFS/Build/Contracts");

export interface INewDefinitionDialogOptions {
    source?: string;
    repositoryContext?: RepositoryContext;
    branchName?: string;
    deleteCallback?: (template: BuildContracts.BuildDefinitionTemplate) => IPromise<any>;
    successAction?: string;
    folderPath?: string;
    hideFolderPicker?: boolean;
}

export function showNewBuildDefinitionDialog(options: INewDefinitionDialogOptions) {
    let vm = new BuildTemplateWizard.TemplatesWizardDialogModel({
        repositoryContext: options.repositoryContext,
        branchName: options.branchName,
        deleteCallback: options.deleteCallback,
        openCreatedDefinitionInNewTab: true,
        refreshTemplatesOnLoad: true,
        selectedTemplateId: "vsBuild",
        successCallback: (data: BuildTemplateWizard.ITemplateWizardCompleteResult) => {
            onNewBuildDefinitionWizardSuccess(data, options);
        },
        cancelCallback: (data: BuildTemplateWizard.ITemplateWizardCompleteResult) => {
            onNewBuildDefinitionWizardCancel(data, options);
        },
        folderPath: options.folderPath,
        hideFolderPicker: options.hideFolderPicker
    });
    Dialogs.show(BuildTemplateWizard.TemplatesWizardDialog, vm);
}

function onNewBuildDefinitionWizardSuccess(data: BuildTemplateWizard.ITemplateWizardCompleteResult, options: INewDefinitionDialogOptions) {
    options = options || {};

    let telemetryProperties = {};
    telemetryProperties[Telemetry.Properties.TemplateName] = data.templateId;
    telemetryProperties[Telemetry.Properties.RepositoryType] = data.repoType;
    telemetryProperties[Telemetry.Properties.CIChecked] = data.enableCI;
    telemetryProperties[Telemetry.Properties.DefaultQueueName] = data.queue ? data.queue.name : "";
    telemetryProperties[Telemetry.Properties.Outcome] = "Created";

    Telemetry.publishEvent(Telemetry.Features.NewBuildDefinition, options.source, telemetryProperties);

    let actionUrl = BuildLinks.getNewDefinitionLink(DesignerActions.SimpleProcess, {
        "templateId": data.templateId,
        "isNew": 1,
        "repoId": data.repoId,
        "repoType": data.repoType,
        "branchName": data.branchName,
        "enableCI": data.enableCI,
        "queueId": data.queue.id,
        "folderPath": data.folderPath
    });

    Events_Action.getService().performAction(options.successAction || Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
        url: actionUrl
    });
}

function onNewBuildDefinitionWizardCancel(data: BuildTemplateWizard.ITemplateWizardCompleteResult, options: INewDefinitionDialogOptions) {
    options = options || {};

    let telemetryProperties = {};
    telemetryProperties[Telemetry.Properties.TemplateName] = data.templateId;
    telemetryProperties[Telemetry.Properties.RepositoryType] = data.repoType;
    telemetryProperties[Telemetry.Properties.CIChecked] = data.enableCI;
    telemetryProperties[Telemetry.Properties.DefaultQueueName] = data.queue ? data.queue.name : "";
    telemetryProperties[Telemetry.Properties.Outcome] = "Cancelled";

    Telemetry.publishEvent(Telemetry.Features.NewBuildDefinition, options.source, telemetryProperties);
}