export module GraphSettingsConstants {
    export const GraphRowLimit = 1000;
    export const EmptyLineLengthLimit = 20;
    export const GraphColumnDefaultWidth = 80;
}

export module GraphMessageType {
    export const AuthorFiltered = "AuthorFiltered";
    export const RowLimitReached = "RowLimitReached";
    export const FeatureEnabled = "FeatureEnabled";
    export const RenameHistory = "RenameHistory";
}

export module GraphMessageDismissedKeys {
    export const AuthorFilteredMessageDismissed = "AuthorFilteredMessageDismissed";
    export const RowLimitReachedMessageDismissed = "RowLimitReachedMessageDismissed";
    export const FeatureEnabledMessageDismissed = "FeatureEnabledMessageDismissed";
    export const RenameHistoryMessageDismissed = "RenameHistoryMessageDismissed";
}