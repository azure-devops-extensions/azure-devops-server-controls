/**
 * @brief ArtifactStoreUtility
 */

import { ArtifactTypes } from "ReleaseManagement/Core/Constants";

import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IArtifactItem } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerStore";
import {
    PipelineArtifactDefinition,
    PipelineArtifactConstants,
    PipelineArtifactDefinitionConstants,
    PipelineArtifactSourceReference
} from "PipelineWorkflow/Scripts/Common/Types";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import VssContext = require("VSS/Context");

/**
 * @brief Artifact store utility
 */
export class ArtifactStoreUtility {

    public static compareArtifact(newArtifact: PipelineArtifactDefinition, oldArtifact: PipelineArtifactDefinition): boolean {
        return this._compareArtifactObjectsByProperties(oldArtifact, newArtifact);
    }

     public static getArtifactDetailsMessage(
         artifacts: string[],
         artifactSourceName: string,
         defaultVersionId?: string,
         defaultVersionBranch?: string,
         defaultVersionTags?: string,
         defaultVersionValue?: string,
         sourceDefinitionUrl?: string): string {

         if (!!artifactSourceName) {
             artifactSourceName = Utils_String.htmlEncode(artifactSourceName);
         }

         if (!ArtifactStoreUtility._hasItems(artifacts) &&
             Utils_String.ignoreCaseComparer(defaultVersionId, PipelineArtifactDefinitionConstants.SelectDuringReleaseCreationType) !== 0) {

             if (sourceDefinitionUrl) {
                 return Utils_String.format(Resources.NoArtifactsMessageForBuild, sourceDefinitionUrl, artifactSourceName);
             }
             return Utils_String.localeFormat(Resources.NoArtifactsDisplayMessage, artifactSourceName);
         }

         let totalArtifacts: number = artifacts.length;
         let encodedArtifacts: string[] = [];
         artifacts.forEach((artifact: string) => {
             encodedArtifacts.push(Utils_String.htmlEncode(artifact));
         });

         let artifactDisplayMessage: string = Utils_String.empty;

         artifactDisplayMessage = ArtifactStoreUtility._getArtifactDisplayMessage(defaultVersionId, artifactSourceName, defaultVersionBranch, defaultVersionTags, defaultVersionValue);

         if (artifactDisplayMessage === Utils_String.empty || artifactDisplayMessage === Resources.ArtifactsDisplayMessageSelectDuringReleaseCreation) {
             return artifactDisplayMessage;
         }
         else {
             return ArtifactStoreUtility._getModifiedArtifactDisplayMessage(totalArtifacts, artifactDisplayMessage, encodedArtifacts);
         }
     }

     public static getArtifactDefaultVersion(artifact: PipelineArtifactDefinition): string {
        let artifactDefaultVersion = Resources.DefaultArtifactSpecifyAtReleaseCreation;
        let defaultVersionType = PipelineArtifactConstants.DefaultVersionType;
        
        if (artifact.definitionReference[defaultVersionType]) {
            switch (artifact.definitionReference[defaultVersionType].id) {
                case PipelineArtifactConstants.Latest:
                artifactDefaultVersion = artifact.definitionReference[defaultVersionType].name;
                    break;
                case PipelineArtifactConstants.LatestWithBranchAndTags:
                    let branch = ArtifactStoreUtility._getArtifactDefaultVersionBranchValue(artifact);
                    let tags = ArtifactStoreUtility._getArtifactDefaultVersionTagsValue(artifact);
                    let hasBranch = !ArtifactStoreUtility._isNullOrEmpty(branch);
                    let hasTags = !ArtifactStoreUtility._isNullOrEmpty(tags);
                    if (hasBranch && hasTags) {
                        artifactDefaultVersion = Utils_String.localeFormat(Resources.LatestFromBranchWithTags, branch, tags);
                    } 
                    else if (hasBranch && !hasTags) {
                        artifactDefaultVersion = Utils_String.localeFormat(Resources.LatestFromBranch, branch);
                    } 
                    else if (!hasBranch && hasTags) {
                        artifactDefaultVersion = Utils_String.localeFormat(Resources.LatestWithTags, tags);
                    } 
                    else {
                        artifactDefaultVersion = Utils_String.localeFormat(Resources.LatestFromAllBranchesAndNoTagsFilter);
                    }
                    break;
                case PipelineArtifactConstants.SpecificVersion:
                    artifactDefaultVersion = Utils_String.localeFormat("{0}: {1}", 
                        artifact.definitionReference[defaultVersionType].name,
                        ArtifactStoreUtility._getArtifactDefaultVersionSpecificValue(artifact));
                    break;
                case PipelineArtifactConstants.SelectDuringReleaseCreation:
                    artifactDefaultVersion = artifact.definitionReference[defaultVersionType].name;
                    break;
            }
        }

        return artifactDefaultVersion;
    }

     public static getBuildDefinitionUrl(projectId: string, definitionId: string): string {
         const webContext = VssContext.getDefaultWebContext();
         const rootPath = webContext.account.uri;
         const collectionId = webContext.collection.id;
         const url = Utils_String.format("{0}/_permalink/_build/index?collectionId={1}&projectId={2}&definitionId={3}", rootPath, collectionId, projectId, definitionId);
         return url;
     }

    private static _getArtifactDefaultVersionBranchValue(artifact: PipelineArtifactDefinition): string {
        let defaultVersionTypeId = Utils_String.empty;
        let defaultVersionBranchValue = Utils_String.empty;
        let defaultVersionType = PipelineArtifactConstants.DefaultVersionType;
        let defaultVersionBranch = PipelineArtifactConstants.DefaultVersionBranch;
        let optionFromBranchAndTags = PipelineArtifactConstants.LatestWithBranchAndTags;

        if (ArtifactStoreUtility._hasDefinitionReferenceProperty(artifact.definitionReference, defaultVersionType)) {
            defaultVersionTypeId = artifact.definitionReference[defaultVersionType].id;
        }

        if (!!defaultVersionTypeId
            && Utils_String.localeIgnoreCaseComparer(defaultVersionTypeId, optionFromBranchAndTags) === 0
            && !!artifact.definitionReference[defaultVersionBranch]) {
            defaultVersionBranchValue = artifact.definitionReference[defaultVersionBranch].name;
        }

        return defaultVersionBranchValue;
    }

    private static _getArtifactDefaultVersionTagsValue(artifact: PipelineArtifactDefinition): string {
        let defaultVersionTypeId = Utils_String.empty;
        let defaultVersionTagsValue = Utils_String.empty;
        let defaultVersionType = PipelineArtifactConstants.DefaultVersionType;
        let defaultVersionTags = PipelineArtifactConstants.DefaultVersionTags;
        let optionFromBranchAndTags = PipelineArtifactConstants.LatestWithBranchAndTags;

        if (ArtifactStoreUtility._hasDefinitionReferenceProperty(artifact.definitionReference, defaultVersionType)) {
            defaultVersionTypeId = artifact.definitionReference[defaultVersionType].id;
        }

        if (!!defaultVersionTypeId
            && Utils_String.localeIgnoreCaseComparer(defaultVersionTypeId, optionFromBranchAndTags) === 0
            && !!artifact.definitionReference[defaultVersionTags]) {
            defaultVersionTagsValue = artifact.definitionReference[defaultVersionTags].name;
        }

        return defaultVersionTagsValue;
    }

    private static _getArtifactDefaultVersionSpecificValue(artifact: PipelineArtifactDefinition): string {
        let defaultVersionTypeId = Utils_String.empty;
        let defaultVersionValue = Utils_String.empty;
        let defaultVersionType = PipelineArtifactConstants.DefaultVersionType;
        let defaultVersionSpecific = PipelineArtifactConstants.DefaultVersionSpecific;
        let optionSpecificVersion = PipelineArtifactConstants.SpecificVersion;

        if (ArtifactStoreUtility._hasDefinitionReferenceProperty(artifact.definitionReference, defaultVersionType)) {
            defaultVersionTypeId = artifact.definitionReference[defaultVersionType].id;
        }

        if (!!defaultVersionTypeId
            && Utils_String.localeIgnoreCaseComparer(defaultVersionTypeId, optionSpecificVersion) === 0
            && !!artifact.definitionReference[defaultVersionSpecific]) {
            defaultVersionValue = artifact.definitionReference[defaultVersionSpecific].name;
        }

        return defaultVersionValue;
    }

    private static _hasDefinitionReferenceProperty(definitionReference: IDictionaryStringTo<PipelineArtifactSourceReference>, property: string): boolean {
        return (definitionReference && definitionReference.hasOwnProperty(property));
    }

    public static isBuildArtifact(artifactType: string): boolean {
         if (Utils_String.ignoreCaseComparer(artifactType, ArtifactTypes.BuildArtifactType) === 0) {
             return true;
         }
         return false;
     }

     public static isTfvcArtifact(artifactType: string): boolean {
         if (Utils_String.ignoreCaseComparer(artifactType, ArtifactTypes.TfvcArtifactType) === 0) {
             return true;
         }
         return false;
     }

     public static convertFromArtifactDownloadInputArtifactItems(artifactDownloadInputItems: string[]): string[] {
         let artifactItems: string[] = [];
         if (artifactDownloadInputItems) {
             artifactDownloadInputItems.forEach((artifactDownloadInputItem) => {
                 if (Utils_String.endsWith(artifactDownloadInputItem, "\\**", Utils_String.localeIgnoreCaseComparer) ||
                     Utils_String.endsWith(artifactDownloadInputItem, "/**", Utils_String.localeIgnoreCaseComparer)) {
                     artifactDownloadInputItem = artifactDownloadInputItem.substring(0, artifactDownloadInputItem.length - 3);
                 }

                artifactItems.push(artifactDownloadInputItem);
            });
         }

        return artifactItems;
     }

     public static convertToArtifactDownloadInputArtifactItems(artifactItems: string[], sourceArtifactItems: IArtifactItem[]): string[] {
         let downloadInputArtifactItems: string[] = [];
         if (artifactItems) {
            artifactItems.forEach((artifactItem) => {
                let sourceArtifactItem = Utils_Array.first(sourceArtifactItems, (item: IArtifactItem) => { return Utils_String.equals(item.itemPath, artifactItem, true); });
                let isFolder: boolean = !sourceArtifactItem || sourceArtifactItem.isFolder;

                if (isFolder) {
                    downloadInputArtifactItems.push(Utils_String.format("{0}/**", artifactItem));
                }
                else {
                    downloadInputArtifactItems.push(Utils_String.format("{0}", artifactItem));
                }
            });
         }

         return downloadInputArtifactItems;
     }

     private static _getModifiedArtifactDisplayMessage(totalArtifacts: number, artifactDisplayMessage: string, encodedArtifacts: string[]): string {
         if (totalArtifacts <= ArtifactsConstants.MaxNumberOfArtifactsToDisplay) {
             let artifactsToBePublishedMessage: string = Utils_String.localeFormat(Resources.ArtifactsToBePublishedMessage, encodedArtifacts.join(", "));
             return Utils_String.format(Resources.AvailableArtifactsDisplayMessage, artifactDisplayMessage, artifactsToBePublishedMessage);
         }
         else {
             let artifactsToBeDisplayed = encodedArtifacts.slice(0, ArtifactsConstants.MaxNumberOfArtifactsToDisplay).join(", ");
             let remainingArtifacts = encodedArtifacts.slice(ArtifactsConstants.MaxNumberOfArtifactsToDisplay, encodedArtifacts.length).join(", ");

             let moreArtifactsMessage: string = Utils_String.localeFormat(Resources.MoreArtifacts, totalArtifacts - ArtifactsConstants.MaxNumberOfArtifactsToDisplay);
             artifactsToBeDisplayed = artifactsToBeDisplayed.concat(` ${Resources.ConjunctionForArtifactsDisplayMessage} <div class='more-artifact-message' title='${remainingArtifacts}'>${moreArtifactsMessage}</div>`);

             let artifactsToBePublished: string = Utils_String.localeFormat(Resources.ArtifactsToBePublishedMessage, artifactsToBeDisplayed);
             return Utils_String.format(Resources.AvailableArtifactsDisplayMessage, artifactDisplayMessage, artifactsToBePublished);
         }
     }

     private static _getArtifactDisplayMessage(defaultVersionId: string, artifactSourceName: string, defaultVersionBranch: string, defaultVersionTags: string, defaultVersionValue: string): string {
         let artifactDisplayMessage: string = Utils_String.empty;
         let isDefaultVersionBranchNullOrEmpty: boolean = ArtifactStoreUtility._isNullOrEmpty(defaultVersionBranch);
         let isDefaultVersionTagsNullOrEmpty: boolean = ArtifactStoreUtility._isNullOrEmpty(defaultVersionTags);

         if (!!defaultVersionId) {
             switch (defaultVersionId) {
                 case PipelineArtifactDefinitionConstants.LatestType:
                     artifactDisplayMessage = Utils_String.localeFormat(
                         Resources.ArtifactsDisplayMessageLatest,
                         artifactSourceName);
                     break;
                 case PipelineArtifactDefinitionConstants.LatestWithBranchAndTagsType:
                     if (!isDefaultVersionBranchNullOrEmpty && !isDefaultVersionTagsNullOrEmpty) {
                         artifactDisplayMessage = Utils_String.localeFormat(
                             Resources.ArtifactsDisplayMessageLatestWithBranchAndTags,
                             artifactSourceName,
                             Utils_String.htmlEncode(defaultVersionBranch),
                             Utils_String.htmlEncode(defaultVersionTags));
                         break;
                     }
                     else if (!isDefaultVersionBranchNullOrEmpty && isDefaultVersionTagsNullOrEmpty) {
                         artifactDisplayMessage = Utils_String.localeFormat(
                             Resources.ArtifactsDisplayMessageLatestWithBranchAndNoTags,
                             artifactSourceName,
                             Utils_String.htmlEncode(defaultVersionBranch));
                         break;
                     }
                     else if (isDefaultVersionBranchNullOrEmpty && !isDefaultVersionTagsNullOrEmpty) {
                         artifactDisplayMessage = Utils_String.localeFormat(
                             Resources.ArtifactsDisplayMessageLatestWithNoBranchAndTags,
                             artifactSourceName,
                             Utils_String.htmlEncode(defaultVersionTags));
                         break;
                     }
                     else {
                         artifactDisplayMessage = Utils_String.localeFormat(
                             Resources.ArtifactsDisplayMessageLatestWithAllBranchAndAllTags,
                             artifactSourceName);
                         break;
                     }
                 case PipelineArtifactDefinitionConstants.SpecificVersionType:
                     if (!ArtifactStoreUtility._isNullOrEmpty(defaultVersionValue)) {
                         artifactDisplayMessage = Utils_String.localeFormat(
                             Resources.ArtifactsDisplayMessageSpecificVersion,
                             artifactSourceName,
                             Utils_String.htmlEncode(defaultVersionValue));
                         break;
                     }
                     else {
                         return Utils_String.empty;
                     }
                 case PipelineArtifactDefinitionConstants.SelectDuringReleaseCreationType:
                     return Resources.ArtifactsDisplayMessageSelectDuringReleaseCreation;
             }
         }
         else {
             artifactDisplayMessage = Utils_String.localeFormat(Resources.ArtifactsDisplayMessage, artifactSourceName);
         }

         return artifactDisplayMessage;
     }

     private static _isNullOrEmpty(param: string): boolean {
         let value: string = param;
         if (value) {
             value = value.trim();
         }

         if (value === undefined || value === null || value === Utils_String.empty) {
             return true;
         }
         return false;
     }

     private static _hasItems(array: any[]): boolean {
         return (!!array && array.length > 0);
     }

    private static _compareArtifactMetaData(newArtifact: PipelineArtifactDefinition, oldArtifact: PipelineArtifactDefinition): boolean {

        if (newArtifact && oldArtifact &&
            (newArtifact.isPrimary !== oldArtifact.isPrimary ||
                Utils_String.localeIgnoreCaseComparer(newArtifact.alias, oldArtifact.alias) !== 0 ||
                Utils_String.ignoreCaseComparer(newArtifact.type, oldArtifact.type) !== 0)) {
            return false;
        }

        return true;
    }

    private static _compareDefaultVersionDetails(newDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>,
        oldDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>): boolean {

        let newDefaultVersion: PipelineArtifactSourceReference = newDefinition[PipelineArtifactConstants.DefaultVersionType];
        let oldDefaultVersion: PipelineArtifactSourceReference = oldDefinition[PipelineArtifactConstants.DefaultVersionType];

        if ((!newDefaultVersion && oldDefaultVersion) || (newDefaultVersion && !oldDefaultVersion)) {
            return false;
        }

        if (newDefaultVersion && oldDefaultVersion && Utils_String.ignoreCaseComparer(newDefaultVersion.id, oldDefaultVersion.id) !== 0) {
            return false;
        }

        return true;
    }

    private static _compareBranchDetails(newDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>,
        oldDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>): boolean {

        let newDefaultVersion: PipelineArtifactSourceReference = newDefinition[PipelineArtifactConstants.DefaultVersionType];
        if (newDefaultVersion && Utils_String.localeIgnoreCaseComparer(newDefaultVersion.id,
            PipelineArtifactConstants.LatestWithBranchAndTags) === 0 &&
            (!this._artifactSourceReferenceIsIdentical(newDefinition[PipelineArtifactConstants.DefaultVersionBranch],
                oldDefinition[PipelineArtifactConstants.DefaultVersionBranch]))) {
            return false;
        }

         return true;
    }

    private static _compareTagDetails(newDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>,
        oldDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>): boolean {

        let newDefaultVersion: PipelineArtifactSourceReference = newDefinition[PipelineArtifactConstants.DefaultVersionType];
        if (newDefaultVersion && Utils_String.localeIgnoreCaseComparer(newDefaultVersion.id,
            PipelineArtifactConstants.LatestWithBranchAndTags) === 0 &&
            (!this._tagsAreIdentical(newDefinition[PipelineArtifactConstants.DefaultVersionTags],
                    oldDefinition[PipelineArtifactConstants.DefaultVersionTags]))) {
            return false;
        }

        return true;
    }

    private static _compareVersionSpecificDetails(newDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>,
        oldDefinition: IDictionaryStringTo<PipelineArtifactSourceReference>): boolean {

        let newDefaultVersion: PipelineArtifactSourceReference = newDefinition[PipelineArtifactConstants.DefaultVersionType];
        if (newDefaultVersion && Utils_String.ignoreCaseComparer(newDefaultVersion.id, PipelineArtifactConstants.SpecificVersion) === 0 &&
            !this._artifactSourceReferenceIsIdentical(newDefinition[PipelineArtifactConstants.DefaultVersionSpecific],
                oldDefinition[PipelineArtifactConstants.DefaultVersionSpecific])) {
            return false;
        }

        return true;
    }

    private static _artifactSourceReferenceIsIdentical(newReference: PipelineArtifactSourceReference,
        oldReference: PipelineArtifactSourceReference): boolean {

        let newReferenceId: string = !!newReference ? newReference.id : Utils_String.empty;
        let oldReferenceId: string = !!oldReference ? oldReference.id : Utils_String.empty;

        return Utils_String.ignoreCaseComparer(newReferenceId, oldReferenceId) === 0;
    }

    private static _tagsAreIdentical(newDefaultVersionTags: PipelineArtifactSourceReference,
                              oldDefaultVersionTags: PipelineArtifactSourceReference): boolean {

        let newTags: string[] = this._retrieveTags(newDefaultVersionTags);
        let oldTags: string[] = this._retrieveTags(oldDefaultVersionTags);

        if (newTags.length !== oldTags.length) {
            return false;
        }

        return Utils_Array.arrayEquals(newTags, oldTags, (s1: string, s2: string): boolean => {
            return Utils_String.localeIgnoreCaseComparer(s1, s2) === 0;
        });
    }

    private static _retrieveTags(tags: PipelineArtifactSourceReference): string[] {
        let tagsString: string = !!tags ? tags.id : null;
        return (!!tagsString ? tagsString.split(ArtifactsConstants.TagSplittingSeparator) : []);
    }

    private static _compareArtifactObjectsByProperties(firstObject: any, secondObject: any, ignoreCase: boolean = false) {
        if (!firstObject && !secondObject) {
            return true;
        }

        if (!firstObject || !secondObject) {
            return false;
        }

        if (firstObject === secondObject) {
            return true;
        }

        for (let property in firstObject) {
            if (!secondObject.hasOwnProperty(property)) {
                return false;
            }

            if (typeof(firstObject[property]) !== typeof(secondObject[property])) {
                return false;
            }

            if (firstObject[property] !== null && firstObject[property] instanceof Object) {
                
                let ignoreCaseNext: boolean = ignoreCase;
                if (Utils_String.ignoreCaseComparer(property, PipelineArtifactConstants.DefaultVersionBranch) === 0 ||
                    Utils_String.ignoreCaseComparer(property, PipelineArtifactConstants.DefaultVersionTags) === 0) {
                    ignoreCaseNext = true;
                }

                if (!this._compareArtifactObjectsByProperties(firstObject[property], secondObject[property], ignoreCaseNext)) {
                    return false;
                }
            }
            else if (typeof firstObject[property] === "string" && ignoreCase) {
                if (Utils_String.ignoreCaseComparer(firstObject[property], secondObject[property]) !== 0) {
                    return false;
                }
            }
            else if (firstObject[property] !== secondObject[property]) {
                return false;
            }
        }
        
        return true;
    }
}