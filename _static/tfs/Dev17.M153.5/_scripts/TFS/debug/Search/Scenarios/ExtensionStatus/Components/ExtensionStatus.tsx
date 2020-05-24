import * as React from "react";
import * as Container from "Search/Scenarios/ExtensionStatus/Components/Container";
import * as SharedOverlay from "Search/Scenarios/Shared/Components/SearchOverlay";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as String_Utils from "VSS/Utils/String";
import * as ExtensionManagement_Util from "Search/Scenarios/ExtensionStatus/Util";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { DefaultButton } from "OfficeFabric/Button";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import "VSS/LoaderPlugins/Css!Search/Scenarios/ExtensionStatus/Components/ExtensionStatus";

export const ExtensionStatusContainer = Container.create(
    ["extensionStore"],
    ({ extensionStoreState }, props) => {
        const allExtensionsData = extensionStoreState.allExtensionsData,        
            extensionStoreInitialized = extensionStoreState.isInitialized,
            isError = extensionStoreState.isError,
            extensionDetail = extensionStoreInitialized 
                ? ExtensionManagement_Util.updateExtensionStatus(props.extensionDetail, allExtensionsData)
                : props.extensionDetail,
            extensionName = extensionDetail.extensionName,
            isAdmin = extensionDetail.userHasManageExtensionPermission,
            extensionRequestedByUser = extensionDetail.userHasRequestedExtension,
            extensionDisabled = extensionDetail.isExtensionDisabled,
            marketplaceUrl = extensionDetail.extensionMarketplaceUrl,
            extensionDetailUrl = extensionDetail.extensionDetailUrl,
            manageExtensionsUrl = ExtensionManagement_Util.getManageExtensionsUrl(),
            imgUrl = TfsContext.getDefault().configuration.getResourcesFile("NoResults.svg"),
            loadingMessage = Resources.ExtensionLoadingMessage.replace("{0}", extensionName);
        return (
            <div className="search-View--container absolute-full">
                <div className="extension-request">
                    {
                        extensionStoreInitialized ?
                        <div className="extension-message-container">
                            <img className="img-icon" src={imgUrl} alt="" />
                            {
                                extensionRequestedByUser ?
                                <div>
                                {
                                    getExtensionActionMessageElement(extensionName, Resources.ExtensionAlreadyRequestedMessage, marketplaceUrl)
                                }
                                </div>
                                :
                                <div>
                                {
                                    extensionDisabled ?
                                        <div>
                                            {
                                                getExtensionActionMessageElement(extensionName, Resources.ExtensionEnableMessage, manageExtensionsUrl)
                                            }
                                            {
                                                getNonAdminMessageElement(isAdmin, Resources.ExtensionEnableOperation)
                                            }
                                        </div>
                                        :
                                        <div>
                                            {
                                                getExtensionActionMessageElement(extensionName, Resources.ExtensionInstallMessage, extensionDetailUrl)
                                            }
                                            {
                                                getNonAdminMessageElement(isAdmin, Resources.ExtensionInstallOperation)
                                            }                                                
                                            <DefaultButton
                                                primary={true}
                                                id="marketplace-navigate"
                                                ariaLabel={"marketplace-navigate"} 
                                                onClick={() =>props.actionCreator.navigateToMarketplace(marketplaceUrl)}>{Resources.GoToMarketplaceButtonText}
                                            </DefaultButton>
                                        </div>
                                }
                                </div>
                            }
                        </div>
                        : 
                        <div>
                        {
                            isError ?
                            <div>
                                {
                                    getErrorMessageContainer(extensionName)
                                }
                            </div>
                            :
                            <SharedOverlay.SearchOverlay spinnerText={loadingMessage} />
                        }
                        </div>
                    }
                </div>
            </div>);
    });

function getNonAdminMessageElement(isAdmin: boolean, operationName: string): JSX.Element {
    const message = Resources.ExtensionNonAdminMessage.replace("{0}", operationName);
    return (
        <div>
        {
            isAdmin ? null : <div className="request-admin-message">{message}</div>
        }
        </div>);
}

function getExtensionActionMessageElement(extensionName: string, actionMessage: string, actionUrl: string): JSX.Element {
    return (
        <div className="extension-install-message">
            <FormatComponent format={actionMessage}>
                {
                    <a href={actionUrl} target="_blank">{extensionName}</a>
                }
            </FormatComponent>
        </div>);
}

function getErrorMessageContainer(extensionName: string): JSX.Element {
    return (
        <div>
            <div className="extension-install-message">{Resources.ServiceErrorMessage}</div>
            <div className="no-results-suggestion">
                <FormatComponent format={Resources.ServiceErrorHelpText}>
                    <a href={constructFeedbackLink(extensionName)} target="_blank">
                        {Resources.LetUsKnowLabel}
                    </a>
                </FormatComponent>
            </div>
        </div>);
}

function constructFeedbackLink(extensionName: string): string {
    const activityId = TfsContext.getDefault().activityId;
    const entity = String_Utils.format("{0} extension status", extensionName);
    return String_Utils.format(SearchConstants.Feedback_Link_Content_Format, entity, activityId);
}