import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_String from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import { Colors } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Colors";
import { DirectoryPivotType, ITestPlan, IUserOptions } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { Fabric } from "OfficeFabric/Fabric";
import {
    IFavoriteItemPicker,
    FavoriteItemPicker,
    IFavoriteItem,
    IFavoriteItemPickerProps,
    IFavoritePickListItem
} from "Favorites/Controls/FavoriteItemPicker";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import { getDefaultWebContext } from "VSS/Context";
import { getLocalService } from "VSS/Service";
import { getService, VssService } from "VSS/Service";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { HubsService } from "VSS/Navigation/HubsService";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TestPlan } from "TFS/TestManagement/Contracts";
import { TestPlanActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanActionsCreator";
import { TestPlansHubSettingsService } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/SettingsService";
import { TestPlanStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanStore";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";

export interface IProps {
    containerStyle: React.CSSProperties;
    store: TestPlanStore;
    actionsCreator: TestPlanActionsCreator;
    getFavoriteItemPicker: (props: IFavoriteItemPickerProps) => IFavoriteItemPicker;
}

export class Breadcrumb extends React.PureComponent<IProps, TestPlan> {
    constructor(props: IProps) {
        super(props);

        this._store = this.props.store;
        this._actionsCreator = this.props.actionsCreator;
        this.state = this._store.getData();
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        const divStyle = this.props.containerStyle;
        return (
            <div style={divStyle}>
                <HubHeader
                    breadcrumbItems={this._getBreadcrumb()}
                    title={`${this.state.name}`}
                    iconProps={this._getTestPlanIcon()}
                    headerItemPicker={this._getFavoriteItemPicker()}
                    maxBreadcrumbItemWidth="600px"
                />
            </div>
        );
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this._store.getData());
    }

    @autobind
    private _getBreadcrumb(): IHubBreadcrumbItem[] {
        return [{
            key: "test-plan-breadcrumb",
            text: Resources.TestPlansText,
            onClick: this._onBreadcrumbRootClick,
            ariaLabel: Resources.NavigateToTestPlanDirectory
        }];
    }
    
    @autobind
    private _onBreadcrumbRootClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        TelemetryService.publishEvent(TelemetryService.featureNewTestPlanHub, TelemetryService.breadcrumbRootClick, Utils_String.empty);

        const url = getService(TestPlansHubSettingsService).userOptions.selectedPivot === DirectoryPivotType.all ?
            UrlHelper.getAllPageUrl() : UrlHelper.getMinePageUrl();
        const hubsService = getLocalService(HubsService);
        hubsService.navigateToHub("ms.vss-test-web.test-newtestplan-hub", url);
    }

    private _getFavoriteItemPicker: () => IFavoriteItemPicker = () => {
        const webContext = getDefaultWebContext();

        const props: IFavoriteItemPickerProps = {
            favoritesContext: {
                artifactTypes: [FavoriteTypes.TEST_PLAN],
                artifactScope: {
                    id: webContext.project.id,
                    name: webContext.project.name,
                    type: "Project"
                }
            },
            selectedItem: {
                id: this.state.id.toString(),
                name: this.state.name
            },
            getFavoriteItemIcon: (item: IFavoriteItem) => this._getTestPlanIcon(),
            getFavoriteItemHref: this._getFavoriteItemHref,
            onFavoriteClick: this._onFavoriteClick,
            onFavorited: this._onFavorited,
            onUnFavorited: this._onUnFavorited,
            getAriaLabelForItem: (item) => { return Resources.TestPlanText + " " + item.artifactName + " " + Resources.TestPlanRemoveFromFavoritesButton; }
        };

        return this.props.getFavoriteItemPicker(props);
    }

    @autobind
    private _getTestPlanIcon(): IVssIconProps {
        const iconStyles = { root: { color: Colors.darkTeal } };
        return { iconName: "test-plan", iconType: VssIconType.bowtie, styles: iconStyles };
    }

    @autobind
    private _onFavoriteClick(item: IFavoriteItem): void {
        const planId = parseInt(item.id);
        this._actionsCreator.navigateToPlan({ id: planId, name: item.name } as TestPlan);
    }

    @autobind
    private _getFavoriteItemHref(item: IFavoriteItem): string {
        const planId = parseInt(item.id);
        return UrlHelper.getPlanUrl(planId);
    }

    @autobind
    private _onFavorited(item: IFavoriteItem): void {
        TelemetryService.publishEvent(TelemetryService.featureNewTestPlanHub, TelemetryService.unfavoritedThroughBreadcrumb, Utils_String.empty);
    }

    @autobind
    private _onUnFavorited(item: IFavoriteItem): void {
        TelemetryService.publishEvent(TelemetryService.featureNewTestPlanHub, TelemetryService.unfavoritedThroughBreadcrumb, Utils_String.empty);
    }
    private _store: TestPlanStore;
    private _actionsCreator: TestPlanActionsCreator;
}

export function mountBreadcrumb(element: HTMLElement, containerStyle: React.CSSProperties): void {
    ReactDOM.render(
        <Fabric>
            <Breadcrumb containerStyle={containerStyle}
                        store={TestPlanStore.getInstance()}
                        actionsCreator={TestPlanActionsCreator.getInstance()}
                        getFavoriteItemPicker={(props: IFavoriteItemPickerProps) => new FavoriteItemPicker(props)} />
        </Fabric>, element);
}
