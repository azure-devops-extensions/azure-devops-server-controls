
//----------------------------------------------------------
// Generated file, DO NOT EDIT.

// Generated data for the following assemblies:
// ClassLibrary1
//----------------------------------------------------------


export module PersistedNotificationResourceIds {
    export var NotificationsId = "e889ffce-9f0a-4c6c-b749-7fb1ecfa6950";
    export var RecipientMetadataId = "1aaff2d2-e2f9-4784-9f93-412a9f2efd86";
    export var AreaName = "PersistedNotification";
    export var NotificationsResource = "Notifications";
    export var RecipientMetadataResource = "RecipientMetadata";
}

export module PersistedNotificationResourceVersions {
    export var NotificationsResourcePreviewVersion = 1;
    export var RecipientMetadataPreviewVersion = 1;
}

export interface Notification {
    actionUrl: string;
    category: string;
    content: string;
    createdTime: Date;
    id: any;
    recipient: string;
    scope: string;
}

export interface RecipientMetadata {
    idOfMostRecentNotification: any;
    idOfMostRecentSeenNotification: any;
    numberOfUnseenNotifications: number;
    recipientId: string;
}

export var TypeInfo = {
    Notification: {
        fields: <any>null
    },
    RecipientMetadata: {
        fields: <any>null
    }
}

TypeInfo.Notification.fields = {
    createdTime: {
        isDate: true
    }
}


