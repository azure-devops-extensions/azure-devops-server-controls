import * as React from "react";
import { IHubGroupColumn, IHubItem } from "MyExperiences/Scenarios/Shared/Models";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { Favorite } from "Favorites/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { FavoriteRendererHelper } from "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";

/**
 * Contribution providing rendering of Test plans in Fabric DataList
 */
export class TestPlanRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconClass(data: FavoriteHubItemData): string {
        return "bowtie-icon bowtie-folder-plan";
    }

    public getDisplayName(data: FavoriteHubItemData): string {
        return Utils_String.decodeHtmlSpecialChars(data.favorite.artifactName);
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return Resources.Favorite_TestPlan_DeletedMessage;
    }

    public getArtifactMetadata(hubItemData: FavoriteHubItemData): JSX.Element {
        return this._getTestPlanMetaData(hubItemData.favorite.artifactProperties);
    }

    /**
     * Get list of columns with component generation factory
     */
    public getColumns(): IHubGroupColumn<FavoriteHubItem>[] {
        return [
            FavoriteRendererHelper.getIconAndNameColumnDefinition(),
            FavoriteRendererHelper.getProjectNameColumnDefinition(),
            FavoriteRendererHelper.getArtifactMetadataColumnDefinition()
        ];
    }

    public isMatch(data: Favorite, query: string): boolean {
        let metadata = data.artifactProperties;
        let contentText : string = FavoriteRendererHelper.prepareSearchableText(data) + " " + this._getMetaDataText(metadata);
        return FavoriteRendererHelper.isMatch(contentText, query);
    }

    private _getTestPlanMetaData(metadata: any) {
        if (metadata) {
            let text: string = this._getMetaDataText(metadata);
            let title: string = this._getMetaDataTitle(metadata);    
            return <span className="test-plan-metadata" title={title}>
                {text}
            </span>;
        }
        return null;
    }

    private _getMetaDataText(metadata: any): string{
        let areaPath: string = metadata.AreaPath;
        let iteration: string = metadata.Iteration;

        let iterationNameArray = iteration.split("\\");
        let iterationName: string = iterationNameArray[iterationNameArray.length - 1];
        let areaPathArray = areaPath.split("\\");
        let areaPathName: string = areaPathArray[areaPathArray.length - 1];

        return Utils_String.format(Resources.FavoriteTestPlanMetaDataText, areaPathName, iterationName);
    }

    private _getMetaDataTitle(metadata: any): string{
        let areaPath: string = metadata.AreaPath;
        let iteration: string = metadata.Iteration;
        return Utils_String.format(Resources.FavoriteTestPlanMetaDataTitle, areaPath, iteration);
    }
}

SDK.registerContent("accounthome.testPlanfavoriteitem-init", (context) => {
    return new TestPlanRenderer();
});