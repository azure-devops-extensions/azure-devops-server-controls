import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { ReadmeEditorActionCreator } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { ActionsHub } from "RepositoryOverview/Scripts/ActionsHub";
import { RepositoryLanguageInfo } from "RepositoryOverview/Scripts/Generated/Contracts";
import { StoresHub } from "RepositoryOverview/Scripts/StoresHub";
import { LanguagesSource } from "RepositoryOverview/Scripts/Sources/LanguagesSource";
import { TelemetrySpy } from "RepositoryOverview/Scripts/TelemetrySpy";

export class ActionCreatorHub {
    constructor(
        private _actionsHub: ActionsHub,
        private _storeHub: StoresHub,
        private _languagesSource: LanguagesSource,
        public readmeEditorActionCreator: ReadmeEditorActionCreator,
    ) {
        this.readmeEditorActionCreator.initializeReadmeContentRenderer();
        this._fetchDominantLanguages();
    }

    private _fetchDominantLanguages = (): void => {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProjectLanguages, false)) {
            this._languagesSource.fetchLanguages().then(
                (languagesInfo: RepositoryLanguageInfo[]) => {
                    this._actionsHub.languagesFetched.invoke(languagesInfo);
                },
                (error: Error) => {
                    TelemetrySpy.publishFetchLanguagesFailed();
                });
        }
    }
}