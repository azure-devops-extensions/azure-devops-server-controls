import VSS = require("VSS/VSS");

import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import Types = require("DistributedTask/Scripts/DT.Types");

export class UserActions {
    public static EditLibraryItem: string = "EDIT_LIBRARY_ITEM";
    public static DeleteLibraryItem: string = "DELETE_LIBRARY_ITEM";
    public static AddLibraryItem: string = "ADD_LIBRARY_ITEM";
    public static ShowSecurityDialog: string = "SHOW_SECURITY_DIALOG";
    public static CloneLibraryItem: string = "CLONE_LIBRARY_ITEM";
}

export class Links {
    public static VariableGroupHelpLink = "http://go.microsoft.com/fwlink/?LinkId=832652";
    public static SecureFileHelpLink = "https://go.microsoft.com/fwlink/?linkid=847116";
}

export class LibraryConstants {
    public static VariableGroupView = "VariableGroupView";
    public static SecureFileView = "SecureFileView";
    public static LibraryItemsView_SecureFiles = "SecureFiles";
    public static LibraryItemsView_VariableGroups = "VariableGroups";
    public static VariableGroup = "variablegroup";

    public static BreadCrumbLastElementKey = "LastElement";
    public static BreadCrumbLibraryKey = "Library";
}

export var VariableChangeEvent = {
    NAME_CHANGED: 0,
    VALUE_CHANGED: 1,
    IS_SECRET_CHANGED: 2,
    DELETE: 3
}

export class ExtensionArea {
    public static LibraryHub = "ms.vss-distributed-task.hub-library";
    public static OAuthConfigurationsHub = "ms.vss-distributed-task.oauthconfigurations-hub";
}

export class ExtensionRoutes {
    public static LibraryHub = "_library";
    public static OAuthConfigurationsHub = "_admin/_oauthconfigurations";
}

export class LibraryActions {
    public static UpdateErrorMessage = "UpdateErrorMessage";
    public static ClearErrorMessage = "ClearErrorMessage";
}

export var LibraryItemsIcons: { [key: string]: string; } = {};
LibraryItemsIcons[Types.LibraryItemType.VariableGroup] = "bowtie-variable-group";
LibraryItemsIcons[Types.LibraryItemType.SecureFile] = "bowtie-certificate";

export class LibraryStoreKeys {
    public static StoreKey_LibraryItemsStore = "STORE_KEY_LIBRARY_ITEMS_STORE";
    public static StoreKey_VariableGroupListStore = "STORE_KEY_VARIABLE_GROUP_LIST_STORE";
    public static StoreKey_VariableGroupStore = "STORE_KEY_VARIABLE_GROUP_STORE";
    public static StoreKey_KeyVaultVariableGroupStore = "STORE_KEY_KEYVAULT_VARIABLE_GROUP_STORE";
    public static StoreKey_SecureFileListStore = "STORE_KEY_SECURE_FILE_LIST_STORE";
    public static StoreKey_SecureFileStore = "STORE_KEY_SECURE_FILE_STORE";
    public static StoreKey_SecureFilePropertiesStore = "STORE_KEY_SECURE_FILE_PROPERTIES_STORE";
}
