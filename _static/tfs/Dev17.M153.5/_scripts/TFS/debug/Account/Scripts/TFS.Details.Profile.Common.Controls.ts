/// <reference types="jquery" />

import TFS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import TreeViewControls = require("VSS/Controls/TreeView");
import Core = require("VSS/Utils/Core");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_UI = require("VSS/Utils/UI");
import Events_Services = require("VSS/Events/Services");

import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");

import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");

export class ProfileNav extends TreeViewControls.TreeView {
    private NodeIdCounter;
    private selectedNavItem;

    constructor(options?) {
        super(options);

        if (options && options.selectedNavItem) {
            this.selectedNavItem = options.selectedNavItem;
        }
    }

    private createLinkNode(id, text, link) {
        var node = TreeViewControls.TreeNode.create(text);
        node.id = id;
        node.title = text;
        node.expanded = false;
        node.link = link;
        return node;
    }

    public initialize() {
        this.NodeIdCounter = 1;
        var nodes = [], node, links = [
            { name: "information", text: accountResources.UserProfileInformation, url: "/_details/profile/information" },
            { name: "preferences", text: accountResources.UserProfilePreferences, url: "/_details/profile/preferences" },
        ];

        for (var link in links) {
            node = this.createLinkNode(this.NodeIdCounter, links[link].text, links[link].url);

            // Mark the selected node
            if (links[link].name == this.selectedNavItem) {
                node.selected = true;
            }

            nodes.push(node);
            this.NodeIdCounter += 1;
        }

        this.rootNode.clear();
        this.rootNode.addRange(nodes);

        super.initialize();
    }
}

TFS.classExtend(ProfileNav, TFS_Host.TfsContext.ControlExtensions);

// TODO remove this completely it should just use the message area control
/// <summary>Helper functions for setting and clearing the common message area message</summary>
export module MessageAreaHelper {
    export function SetMessageAreaMessage(text: string) {
        var messageAreaContainer = $('#common-message');
        messageAreaContainer.text(text);
        messageAreaContainer.show();
        Events_Services.getService().fire("tfs-update-messageArea", null, null);
    }

    export function ClearMessageAreaMessage() {
        var messageAreaContainer = $('#common-message');
        messageAreaContainer.text("");
        messageAreaContainer.hide();
        Events_Services.getService().fire("tfs-update-messageArea", null, null);
    }
}

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Profile.Common.Controls", exports);
