import PersistedNotificationConstants = require("Presentation/Scripts/TFS/Generated/TFS.PersistedNotification.Constants");
import WebApi_RestClient = require("VSS/WebApi/RestClient");

export class PersistedNotificationHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetRecipientNotifications() {
        return this._beginRequest<PersistedNotificationConstants.Notification[]>({
            area: PersistedNotificationConstants.PersistedNotificationResourceIds.AreaName,
            locationId: PersistedNotificationConstants.PersistedNotificationResourceIds.NotificationsId,
            responseType: PersistedNotificationConstants.TypeInfo.Notification,
            responseIsCollection: true
        });
    }

    public beginGetRecipientMetadata() {
        return this._beginRequest<PersistedNotificationConstants.RecipientMetadata>({
            area: PersistedNotificationConstants.PersistedNotificationResourceIds.AreaName,
            locationId: PersistedNotificationConstants.PersistedNotificationResourceIds.RecipientMetadataId,
            responseType: PersistedNotificationConstants.TypeInfo.RecipientMetadata
        });
    }

    public beginUpdateRecipientMetadata(metadata: PersistedNotificationConstants.RecipientMetadata) {
        return this._beginRequest<PersistedNotificationConstants.RecipientMetadata>({
            area: PersistedNotificationConstants.PersistedNotificationResourceIds.AreaName,
            locationId: PersistedNotificationConstants.PersistedNotificationResourceIds.RecipientMetadataId,
            httpMethod: 'PATCH',
            data: metadata,
            responseType: PersistedNotificationConstants.TypeInfo.RecipientMetadata
        });
    }
}
