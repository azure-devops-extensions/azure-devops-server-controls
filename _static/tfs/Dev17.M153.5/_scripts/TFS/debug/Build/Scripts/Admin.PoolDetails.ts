/// <reference types="jquery" />



import ko = require("knockout");

import { handleError } from "Build/Scripts/PlatformMessageHandlers";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Controls = require("VSS/Controls");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import IdentityPickerControls = require("VSS/Identities/Picker/Controls");
import IdentityPickerRestClient = require("VSS/Identities/Picker/RestClient");
import IdentityPickerServices = require("VSS/Identities/Picker/Services");
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import Marked = require("Presentation/Scripts/marked");
import Navigation = require("VSS/Controls/Navigation");
import Service = require("VSS/Service");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import { getPageContext } from "VSS/Context";
import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";

KnockoutCommon.initKnockoutHandlers(true);

var ManagePermission = 8;

export enum RoleType {
    Pool = 1,
    Queue = 2
}

export class AdminPoolDetailsTab extends Navigation.NavigationViewTab {
    private c_identityPickerConsumerId: string = "1B7BAA46-71CB-4031-AC52-894309DCAE0B";
    private _template: JQuery = null;
    private _viewModel: AdminPoolDetailsViewModel;
    private _identityPicker: IdentityPickerControls.IdentityPickerSearchControl;
    private _identityDisplay: IdentityPickerControls.IdentityDisplayControl;

    public initialize() {
        super.initialize();
    }

    public dispose() {
        super.dispose();

        if (this._identityPicker) {
            this._identityPicker.dispose();
        }

        if (this._identityDisplay) {
            this._identityDisplay.dispose();
        }
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        if (!this._template) {
            var tfsContext = TfsContext.getDefault();
            this._viewModel = new AdminPoolDetailsViewModel(tfsContext);
            this._template = TFS_Knockout.loadHtmlTemplate("buildvnext_admin_pool_details_tab").appendTo(this._element);
            ko.applyBindings(this._viewModel, this._template[0]);
            this._viewModel.ownerId.subscribe((newOwnerId) => this._updateOwner(newOwnerId), this);
            this._viewModel.title.subscribe((newTitle) => this._updateTitle(newTitle), this);
        }

        let isPoolReference: boolean = false;
        if (parsedState.roleType == RoleType.Queue)
        {
            // We are in the queue admin UI and therefore have pool references
            isPoolReference = true;
        }

        this._viewModel.setPool(parsedState.pool, isPoolReference);
    }

    private _updateTitle(newTitle: string) {
        this._options.navigationView.setViewTitle(newTitle);
    }

    private _updateOwner(ownerId: string) {
        this._updateIdentityPicker(ownerId);
        this._updateIdentityDisplay(ownerId);
    }

    private _updateIdentityPicker(ownerId: string) {
        if (this._identityPicker) {
            if (ownerId) {
                this._identityPicker.setEntities([], [ownerId]);
            }
            else {
                this._identityPicker.clear();
            }
        }
        else {
            // Create the Identity Picker. The Owner Id is passed into the control's create options.
            let divIdentityPicker: JQuery = this._template.find(".identity-picker");
            let identityPickerSearchOptions: IdentityPickerControls.IIdentityPickerSearchOptions = this._getDefaultIdentityPickerSearchOptions(ownerId);
            this._identityPicker = Controls.create<IdentityPickerControls.IdentityPickerSearchControl, IdentityPickerControls.IIdentityPickerSearchOptions>(
                IdentityPickerControls.IdentityPickerSearchControl,
                divIdentityPicker,
                identityPickerSearchOptions);
        }
    }

    private _updateIdentityDisplay(ownerId: string) {
        var divIdentityDisplay: JQuery = this._template.find(".identity-display");

        // We must dispose of the Identity Display and recreate because there is no "set user" function
        if (this._identityDisplay) {
            this._identityDisplay.dispose();
            this._identityDisplay = null;
            divIdentityDisplay.empty();
        }

        if (ownerId) {
            let identityDisplayOptions: IdentityPickerControls.IIdentityDisplayOptions = this._getDefaultIdentityDisplayOptions(ownerId);
            this._identityDisplay = Controls.create<IdentityPickerControls.IdentityDisplayControl, IdentityPickerControls.IIdentityDisplayOptions>(
                IdentityPickerControls.IdentityDisplayControl,
                divIdentityDisplay,
                identityDisplayOptions);
        }
    }

    private _getDefaultIdentityPickerSearchOptions(userId: string): IdentityPickerControls.IIdentityPickerSearchOptions {
        let options: IdentityPickerControls.IIdentityPickerSearchOptions;
        options = {
            identityType: { User: true, Group: true },
            operationScope: { IMS: true, Source: true },
            consumerId: this.c_identityPickerConsumerId,
            callbacks: {
                onItemSelect: (item: IdentityPickerRestClient.IEntity) => {
                    this._viewModel.saveNewPoolOwner(item);
                }
            },
            items: userId
        };
        return options;
    }

    private _getDefaultIdentityDisplayOptions(userId: string): IdentityPickerControls.IIdentityDisplayOptions {
        let options: IdentityPickerControls.IIdentityDisplayOptions;
        options = {
            identityType: { User: true, Group: true },
            operationScope: { IMS: true, Source: true },
            consumerId: this.c_identityPickerConsumerId,
            item: userId
        };
        return options;
    }
}

class AdminPoolDetailsViewModel {
    private _pool: DistributedTask.TaskAgentPool;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _markdownRenderer: MarkdownRenderer;

    public title: KnockoutObservable<string> = ko.observable<string>();
    public poolMetadata: KnockoutObservable<string> = ko.observable<string>("");
    public ownerId: KnockoutObservable<string> = ko.observable<string>();
    public hasPoolManagePermission: KnockoutObservable<boolean> = ko.observable<boolean>(false);
    public ownerVisible: KnockoutComputed<boolean>;

    constructor(tfsContext: TfsContext) {
        this._markdownRenderer = new MarkdownRenderer(this._getDefaultMarkdownOptions());
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);
        this.ownerId.extend({ notify: 'always' });
        this.ownerVisible = ko.computed(() => {
            return this.ownerId() != null || this.hasPoolManagePermission();
        });
    }

    public setPool(pool: DistributedTask.TaskAgentPool, isPoolReference: boolean) {
        if (pool && isPoolReference) {
            this._poolClient.getAgentPool(pool.id)
                .then((result) => {
                    this._setPool(result);
                }, () => {
                    this._setPool(pool);
                });
        }
        else {
            this._setPool(pool);
        }
    }

    public saveNewPoolOwner(newOwner: IdentityPickerRestClient.IEntity) {
        if (this._pool) {
            let poolToUpdate: DistributedTask.TaskAgentPool;
            poolToUpdate = {
                autoProvision: this._pool.autoProvision,
                autoSize: this._pool.autoSize,
                createdBy: this._pool.createdBy,
                createdOn: this._pool.createdOn,
                id: this._pool.id,
                isHosted: this._pool.isHosted,
                name: this._pool.name,
                owner: this._transformIEntityToIdentityRef(newOwner),
                poolType: this._pool.poolType,
                properties: this._pool.properties,
                scope: this._pool.scope,
                size: this._pool.size,
                agentCloudId: this._pool.agentCloudId
            };

            this._poolClient.updateAgentPool(poolToUpdate, this._pool.id)
                .then((updatedPool: DistributedTask.TaskAgentPool) => {
                    this._setPool(updatedPool);
                }, () => {
                    // If the update failed, reset the owner field
                    this._resetOwner();
                });
        }
    }

    private _setPool(pool: DistributedTask.TaskAgentPool) {
        this._pool = pool;
        this._checkPoolPermissions();
        this._resetPoolMetadata();
        this._resetTitle();
        this._resetOwner();
    }

    private _resetTitle() {
        if (this._pool) {
            this.title(Utils_String.format(BuildResources.PoolDetailsTitleFormat, this._pool.name));
        }
        else {
            this.title("");
        }
    }

    private _resetOwner() {
        if (this._pool && this._pool.owner) {
            var newOwnerId: string = this._pool.owner.descriptor ? this._pool.owner.descriptor : this._pool.owner.id;
            this.ownerId(newOwnerId);
        }
        else {
            this.ownerId(null);
        }
    }

    private _checkPoolPermissions() {
        this.hasPoolManagePermission(false);

        // Hosted pools will deny manage permissions
        if (this._pool && !this._pool.isHosted) {
            TaskUtils.SecurityHelper.hasAgentPoolPermission(this._pool.id, ManagePermission)
                .then((hasPermission: boolean) => {
                    this.hasPoolManagePermission(hasPermission);
                });
        }
    }

    private _resetPoolMetadata() {
        this.poolMetadata("");
        if (this._pool) {
            this._poolClient.getAgentPoolMetadata(this._pool.id)
                .then((result) => {
                    this.poolMetadata(this._markdownRenderer.renderHtml(result));
                }, () => {
                    this.poolMetadata(Utils_String.format(BuildResources.PoolMetadataNotFound, this._pool.name));
                });
        }
    }

    private _getDefaultMarkdownOptions(): MarkdownRendererOptions {
        let options: MarkdownRendererOptions;
        options = {
            breaks: true,
            linkify: true,
            typographer: false,
            emoji: true,
            hideExternalImageIcon: true,
            imageSize: true,
            katex: false,
            linkifyTlds: ["biz", "com", "edu", "gov", "net", "org", "pro", "web", "aero", "asia", "coop", "info", "museum", "name", "shop", "рф", "io"]
        };
        return options;
    }

    private _transformIEntityToIdentityRef(entity: IdentityPickerRestClient.IEntity): VSS_Common_Contracts.IdentityRef {
        const originIsAad: boolean = entity.originDirectory == "aad";
        const hasLocal: boolean = (entity.active) && (entity.localId != null) && (entity.localId != "");
        const isAad: boolean = originIsAad && !hasLocal;
        const isGroup: boolean = entity.entityType == "Group";

        return {
            id: isAad ? entity.originId : entity.localId,
            isAadIdentity: isAad,
            isContainer: isGroup,
            displayName: entity.displayName,
            descriptor: entity.subjectDescriptor ? entity.subjectDescriptor : null
        } as VSS_Common_Contracts.IdentityRef;
    }

}
