/// <reference types="react" />
/// <reference types="react-dom" />

import * as ComponentBase from "VSS/Flux/Component";
import { IHubStore, HubItemGroup, HubData, IHubItem, IHubGroupColumn, IHubHeaderProps } from "MyExperiences/Scenarios/Shared/Models";
import { HubActions } from "MyExperiences/Scenarios/Shared/Actions";
import * as React from "react";
import { Fabric } from "OfficeFabric/Fabric";
import * as HubHeader from "MyExperiences/Scenarios/Shared/Components/HubHeader";
import * as HubSpinner from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import * as HubAlert from "MyExperiences/Scenarios/Shared/Components/HubAlert";
import * as HubGroupReorder from "MyExperiences/Scenarios/Shared/Components/HubGroupReorderComponent";
import * as ProjectsErrorPage from "Presentation/Scripts/TFS/Components/GenericPageError";
import * as ProjectsPageErrorProps from "MyExperiences/Scenarios/Projects/ProjectsPageError";
import * as ZeroData from "Presentation/Scripts/TFS/Components/ZeroData"
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubViewComponent";

export const PageErrorClassName: string = "project-list-error";


export class HubViewComponent extends React.Component<HubData, {}> {

     private renderAlert(): JSX.Element {
        if (!this.props.alert) {
            return null;
        }
        return (
            <HubAlert.HubAlert>
                {this.props.alert}
            </HubAlert.HubAlert>
        );
     }

     private renderContent(): JSX.Element {
         let headerProps: IHubHeaderProps = this.props.header;

         if (this.props.isLoading) {
             return <HubSpinner.HubSpinner alignment={HubSpinner.Alignment.center} />;
         }

         let content: JSX.Element;
         if (this.props.zeroData) {
             headerProps.filter = null;
             headerProps.title = null;
             content = <ZeroData.ZeroData {...this.props.zeroData} />;
         } else if (this.props.groups != null) {
             if (this.props.groups.length === 0) {
                 if (this.props.isFilterInUse) {
                     content = <div className="zero-search-result">{MyExperiencesResources.Search_NoResultsFound}</div>;
                 } else if (!this.props.alert) {
                     content = (
                         <div className={PageErrorClassName}>
                             <ProjectsErrorPage.PageError {...ProjectsPageErrorProps.ProjectsPageError} />
                         </div>
                     );
                 }
             } else {
                 content = (<HubGroupReorder.HubGroupReorderComponent
                     groups={this.props.groups}
                     allowGroupReordering={this.props.allowGroupReordering}
                 />);
             }
         }

         if (content) {
             return (
                 <div className="hub-view-content">
                     <HubHeader.HubHeader {...headerProps} />
                     {content}
                 </div>
             );
         }

         return null;
     };

    public render(): JSX.Element {
        return (
            <Fabric className="hub-view-component ms-u-fadeIn200">
                {this.renderAlert()}
                {this.renderContent()}
            </Fabric>
        );
    };
}