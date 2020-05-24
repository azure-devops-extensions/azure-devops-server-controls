/// <reference types="jquery" />

import Constants = require("Build/Scripts/Constants");
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import BuildContracts = require("TFS/Build/Contracts");
import DTContracts = require("TFS/DistributedTask/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");
import MachineManagement = require("MachineManagement/Contracts")

import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import NavigationService = require("VSS/Navigation/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService, getLocalService } from "VSS/Service";
import Utils_UI = require("VSS/Utils/UI");
import Events_Action = require("VSS/Events/Action");

function getStringRepoType(type: RepositoryType): string {
    switch (type) {
        case RepositoryType.Git:
            return RepositoryTypes.TfsGit;
        case RepositoryType.GitHub:
            return RepositoryTypes.GitHub;
        case RepositoryType.Tfvc:
            return RepositoryTypes.TfsVersionControl;
        default:
            return undefined;
    }
}

export function createDefaultRepositoryPromise(projectInfo: VCContracts.VersionControlProjectInfo, repositoryFactories: RepositoryFactory.RepositoryFactory[], repositoryContext?: RepositoryContext): IPromise<BuildContracts.BuildRepository> {
    var defaultFactory: RepositoryFactory.RepositoryFactory = null;

    $.each(repositoryFactories, (index, factory: RepositoryFactory.RepositoryFactory) => {
        if (repositoryContext) {
            // if we have repoContext, get corresponding factory
            if (Utils_String.ignoreCaseComparer(factory.type, getStringRepoType(repositoryContext.getRepositoryType())) != -1) {
                defaultFactory = factory;
                return false;
            }
        }
        else if (factory.isPrimary) {
            defaultFactory = factory;
            return false;
        }
    });

    defaultFactory = defaultFactory || repositoryFactories[0];
    if (defaultFactory) {
        return repositoryContext ? defaultFactory.createNewRepository(repositoryContext) : defaultFactory.createNewRepository();
    }
    else {
        return null;
    }
}

export function getDefaultQueue(queues: DTContracts.TaskAgentQueue[], pools: DTContracts.TaskAgentPool[]) {
    if (!queues || !pools) {
        return null;
    }
    // get hosted pool ids
    var hostedPoolIds = pools.filter((pool) => {
        return pool.isHosted;
    }).map((pool) => {
        return pool.id;
    });

    // get first queue for a hosted pool
    var agentQueue = queues.filter((queue: DTContracts.TaskAgentQueue) => {
        return hostedPoolIds.some((id: number) => {
            return id === queue.pool.id;
        });
    })[0];

    return convertToBuildQueue(agentQueue || queues[0]);
}

export function getDefaultHostedImage(images: MachineManagement.FriendlyImageName[]) {
    if (!images) {
        return null;
    }

    return Utils_Array.first(images, (image => image.isDefault === true));
}

export function updateHostedImageNameProperty(definition: BuildContracts.BuildDefinition, imageName: MachineManagement.FriendlyImageName): any {
    if (!definition.properties) {
        definition.properties = {};
    }

    if (!!imageName) {
        definition.properties[Constants.WellKnownProperties.HostedAgentImageIdKey] = {
            type: 'System.String',
            value: imageName.id
        };
    }
    else if (definition.properties.hasOwnProperty(Constants.WellKnownProperties.HostedAgentImageIdKey && !imageName)) {
        delete definition.properties[Constants.WellKnownProperties.HostedAgentImageIdKey];
    }
}

export function getHostedImageIdProperty(definition: BuildContracts.BuildDefinition): any {
    if (definition.properties && definition.properties.hasOwnProperty(Constants.WellKnownProperties.HostedAgentImageIdKey)) {
        return definition.properties[Constants.WellKnownProperties.HostedAgentImageIdKey].$value;
    }

    return undefined;
}


export function convertToBuildQueue(queue: DTContracts.TaskAgentQueue): BuildContracts.AgentPoolQueue {
    if (!queue) {
        return null;
    }
    else {
        return <BuildContracts.AgentPoolQueue>{
            id: queue.id,
            name: queue.name,
            pool: <BuildContracts.TaskAgentPoolReference>{
                id: queue.pool.id,
                name: queue.pool.name,
                isHosted: queue.pool.isHosted
            }
        };
    }
}

export function openRelativeUrl(relativeUrl: string): void {
    let baseUrl: string = TfsContext.getDefault().getActionUrl();
    let urlToNavigate = baseUrl + relativeUrl;
    window.location.href = urlToNavigate;
}

export function openUrl(url: string): void {
    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
        url: url
    });
}

export function getFolderPathFromUrl(): string {
    let urlState = this.getUrlState();
    let folderPath = (urlState && urlState.path) ? urlState.path : Constants.BuildDefinitionRootPath;
    return folderPath;
}

export function getSourceFromUrl(): string {
    let urlState = this.getUrlState();
    let source = (urlState && urlState.source) ? urlState.source : Constants.OthersSource;
    return source;
}

export function getUrlState() {
    let historyService = NavigationService.getHistoryService();
    return historyService.getCurrentState();
}

export function downloadAsJsonFile(content: string, nameOfFile: string): void {
    let exportedFileName = nameOfFile.concat(".json");
    let file = new Blob([content], { type: 'application/json' });

    //needed for IE10
    if (window.navigator && window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(file, exportedFileName);
    }
    else {
        let a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.setAttribute("download", exportedFileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

export class AccessibilityHelper {
    public static triggerClickOnEnterOrSpaceKeyPress(event: JQueryEventObject): boolean {
        return AccessibilityHelper.triggerClickOnKeyPress(event, [Utils_UI.KeyCode.ENTER, Utils_UI.KeyCode.SPACE]);
    }

    public static triggerClickOnKeyPress(event: JQueryEventObject, keyCodes: Utils_UI.KeyCode[]): boolean {
        if (!!keyCodes && keyCodes.length > 0) {
            let firstKeyCode = Utils_Array.first(keyCodes, (keyCode: Utils_UI.KeyCode) => { return AccessibilityHelper.isKeyPressEvent(event, keyCode); })
            if (!!firstKeyCode) {
                // Do not act on aria-disabled elements
                if ($(event.target).attr("aria-disabled") !== "true") {
                    $(event.target).click();
                }

                return false;
            }
        }

        return true;
    }

    public static isKeyPressEvent(event: JQueryEventObject, keyCode: Utils_UI.KeyCode): boolean {
        if (!event) {
            return false;
        }

        var actualKeyCode = (event.keyCode) ? event.keyCode : event.which;

        if (actualKeyCode === keyCode) {
            return true;
        }

        return false;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Utils", exports);
