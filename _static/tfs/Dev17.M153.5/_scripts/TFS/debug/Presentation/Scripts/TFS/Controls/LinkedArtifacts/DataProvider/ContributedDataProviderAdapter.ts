import Q = require("q");
import Service = require("VSS/Service");
import VssContext = require("VSS/Context");
import StringUtils = require("VSS/Utils/String");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getBackgroundHost } from "VSS/Contributions/Controls";
import { Contribution } from "VSS/Contributions/Contracts";
import { ExtensionService } from "VSS/Contributions/Services";
import { ILinkedArtifactsDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import Diag = require("VSS/Diag");
import VSSError = require("VSS/Error");
import { 
    InternalKnownColumns, IHostArtifact, IInternalLinkedArtifactDisplayData, IInternalLinkedArtifactPrimaryData, IColumn 
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { 
    KnownColumns, ILinkedArtifact, ILinkedArtifactAdditionalData, IContributedArtifactLinkProvider, 
    ILinkedArtifactDisplayData, ILinkedArtifactPrimaryData, ArtifactIconType 
} from "TFS/WorkItemTracking/ExtensionContracts";
import { makeCopy } from "Presentation/Scripts/TFS/TFS.Core.Utils";

const c_artifactLinksTargetContributionId = "ms.vss-work-web.workitem-artifact-links";

/**
 * TODO: Verify that getBackgroundHost method does not create host every time 
 * it is called. If it does, create a cache of ILinkedArtifactsDataProvider here!
 *
 * Get data provider instance from one of the extensions for the given tool.
 * @param tool Tool to return data provider for.
 * @returns Promise resolving to data provider instance
 */
export function getContributedLinkedArtifactDataProvider(tool: string): IPromise<ILinkedArtifactsDataProvider>{

    return getLinkedArtifactContributionByTool(tool).then((contribution)=>{
        return getBackgroundHost(contribution);
    }).then((contributionHost)=>{
        return contributionHost.getRegisteredInstance<IContributedArtifactLinkProvider>("ArtifactLinkProvider", VssContext.getDefaultWebContext());
    }).then(artifactLinkProvider => {
        return new ContributedDataProviderAdapter(tool, artifactLinkProvider as any);
    });
}

function getLinkedArtifactContributionByTool(tool: string): IPromise<Contribution>{

    // Get contribution by Tool
    return Service.getService(ExtensionService).getContributionsForTargets([c_artifactLinksTargetContributionId])
    .then((contributions: Contribution[])=>{
        
        // Filter entries by toolId.
        const contibutionsForTool = contributions.filter((c)=> {
            return StringUtils.ignoreCaseComparer(tool, c.properties["toolId"]) == 0;
        });

        if(contibutionsForTool.length === 0)
        {
            Diag.Debug.fail("No contribution found which supports tool: '" + tool + "'");
            const err = new Error("No contribution found which supports tool: '" + tool + "'");
            VSSError.publishErrorToTelemetry(err);
            throw err;
        }

        // Ideally, there should only be 1 contribution for each tool, 
        // but since we do not have control over extension manifests yet, making it forgiving.
        if(contibutionsForTool.length > 1) 
        {
            Diag.Debug.fail("Multiple contributions registered for tool " + tool + ". Taking the first one and ignoring others.");
            VSSError.publishErrorToTelemetry(new Error("Multiple contributions registered for tool " + tool + ". Taking the first one and ignoring others."));
        }
        
        return contibutionsForTool[0];
    });
}

/**
 * ContributedDataProviderAdapter:
 * Adaptor class for ILinkedArtifactsDataProvider provided by extension implementing IContributedArtifactLinkProvider.
 * To display artifacts linked to a workitem, each provider tool (like Build, VC, etc.) implements ILinkedArtifactsDataProvider interface, which 
 * is used to fetch data to be displayed in UI.
 * But for artifacts, which are contributed by extensions (like "Found in release"), extensions need to implement 
 * IContributedArtifactLinkProvider interface. This interface makes the implementation simple for the extension author, while the
 * complexity resides in internal interface.
 * ContributedDataProviderAdapter class acts as adaptor between extension interface IContributedArtifactLinkProvider and 
 * internal class ILinkedArtifactsDataProvider.
 **/
export class ContributedDataProviderAdapter implements ILinkedArtifactsDataProvider {

    private _artifactLinkProvider: IContributedArtifactLinkProvider;

    constructor(public readonly supportedTool: string, artifactLinkProvider:IContributedArtifactLinkProvider){
        Diag.Debug.assertIsNotNull(artifactLinkProvider);
        this._artifactLinkProvider = artifactLinkProvider;
    }

    public beginGetDisplayData(
        linkedArtifacts: ILinkedArtifact[],
        columns: IColumn[],
        tfsContext: TfsContext,
        hostArtifact?: IHostArtifact): IPromise<IInternalLinkedArtifactDisplayData[]>
    {
        // Don't send original object ref to third party extn.
        return this._artifactLinkProvider.getDisplayData(makeCopy(linkedArtifacts))
        .then((linkedArtifactDisplayData: ILinkedArtifactDisplayData[])=>{
                
                // Create a map of artifact id to ILinkedArtifact for fast lookup.
                const linkedArtifactMap: { [id: string]: ILinkedArtifact } = {};
                for(const linkedArtifact of linkedArtifacts){
                    linkedArtifactMap[linkedArtifact.id] = linkedArtifact;
                }

                return linkedArtifactDisplayData.map((displayDataItem: ILinkedArtifactDisplayData)=>{
                    try{
                        this._verifyDataReturnedByExtension(displayDataItem, linkedArtifactMap[displayDataItem.id]);
                    }
                    catch(ex){
                        displayDataItem.error = ex;
                    }
                    
                    return this._toInternalDisplayData(displayDataItem);
                });
            },
            (err)=>{
                // Something went wrong in extension code. Log it and move forward.
                Diag.Debug.fail(err);
                VSSError.publishErrorToTelemetry(err);
                return linkedArtifacts.map((la: ILinkedArtifact)=>{
                    return err;
                });
            });
    }

    private _verifyDataReturnedByExtension(displayDataItem: ILinkedArtifactDisplayData, originalLinkedArtifact: ILinkedArtifact): void{
        // Verify the fields which are not expected to be changed by extension.
        if( StringUtils.ignoreCaseComparer(displayDataItem.linkType, originalLinkedArtifact.linkType) != 0 ||
            StringUtils.ignoreCaseComparer(displayDataItem.tool, originalLinkedArtifact.tool) != 0 ||
            StringUtils.ignoreCaseComparer(displayDataItem.type, originalLinkedArtifact.type) != 0 ||
            StringUtils.ignoreCaseComparer(displayDataItem.id, originalLinkedArtifact.id) != 0 )
        {
            const err = new Error("Read-only fields in LinkedArtifact id ${originalLinkedArtifact.id} changed by extension.");
            VSSError.publishErrorToTelemetry(err);
            throw err;
        }
    }

    private _toInternalDisplayData(displayDataItem: ILinkedArtifactDisplayData): IInternalLinkedArtifactDisplayData{
        return {
            uri: displayDataItem.uri,
            tool: displayDataItem.tool,
            type: displayDataItem.type,
            id: displayDataItem.id,
            linkType: displayDataItem.linkType,
            linkTypeDisplayName: displayDataItem.linkTypeDisplayName,
            comment: displayDataItem.comment,
            primaryData: this._toInternalLinkedArtifactPrimaryData(displayDataItem.primaryData, displayDataItem),
            additionalData: this._toInternalAdditionalDataDictionary(displayDataItem.additionalData),
            error: displayDataItem.error
        }
    }

    private _toInternalLinkedArtifactPrimaryData(primaryData: ILinkedArtifactPrimaryData, displayDataItem: ILinkedArtifactDisplayData): IInternalLinkedArtifactPrimaryData{
        return {
            typeIcon: primaryData.typeIcon,
            displayId: primaryData.displayId,
            title: primaryData.title,
            href: primaryData.href,
            typeName: displayDataItem.linkTypeDisplayName,
            callback: null,
            miscData: null
        }
    }

    private _toInternalAdditionalDataDictionary(additionalData: IDictionaryStringTo<ILinkedArtifactAdditionalData>): IDictionaryStringTo<ILinkedArtifactAdditionalData>{

         let convertedAdditionalData: IDictionaryStringTo<ILinkedArtifactAdditionalData> = {};

         if(!!additionalData[KnownColumns.State]){
            convertedAdditionalData[InternalKnownColumns.State.refName] = additionalData[KnownColumns.State];
         }
         if(!!additionalData[KnownColumns.LastUpdate]){
            convertedAdditionalData[InternalKnownColumns.LastUpdate.refName] = additionalData[KnownColumns.LastUpdate];
         }

         return convertedAdditionalData;
    }
}