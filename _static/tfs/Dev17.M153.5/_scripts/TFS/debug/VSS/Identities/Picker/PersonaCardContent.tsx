import * as React from "react";

import { KeyCode } from "VSS/Utils/UI";

import { Callout } from "OfficeFabric/Callout";
import { FocusZone, FocusZoneDirection, FocusZoneTabbableElements, IFocusZone } from "OfficeFabric/FocusZone";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind, css, DelayedRender } from "OfficeFabric/Utilities";

import { getPageContext } from "VSS/Context";
import * as Component_Base from "VSS/Flux/Component";
import { ContactCard } from "VSS/Identities/Picker/ContactCard";
import { DefaultAbridgedCard } from "VSS/Identities/Picker/DefaultAbridgedCard";
import { DefaultSimpleCard } from "VSS/Identities/Picker/DefaultSimpleCard";
import { DefaultCard } from "VSS/Identities/Picker/DefaultCard";
import { OrganizationCard } from "VSS/Identities/Picker/OrganizationCard";
import { CardType, IDataState, personaCardEntity, PersonaCardProps } from "VSS/Identities/Picker/PersonaCardContracts";
import * as Utils from "VSS/Identities/Picker/PersonaCardIdentityUtils";
import { PersonaCardHeaderElement as HeaderElement } from "VSS/Identities/Picker/PersonaCardHeaderElement";
import { IPoint } from "VSS/Identities/Picker/Common";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";

export interface PersonaCardContentProps extends Component_Base.Props, PersonaCardProps {
    /*
    * Data props from parent component to get the identity, cardtype etc information
    */
    dataProps: IDataState;
    /*
    * (Optional) Onclick of any persona entity
    */
    onClickEntity?: (identity: Identities_Picker_RestClient.IEntity) => void;

    /*
    * (Optional) Onclick of any persona header
    */
    onHeaderClick?: () => void;

    /*
    * (Optional) Callback to open Organization Card
    */
    onShowOrganizationCard?: () => void;

    /*
    * (Optional) Callback to open Contact Card
    */
    onShowContactCard?: () => void;

    /*
    * (Optional) Prevent requests if working
    */
    working?: boolean;
}

/**
 * The content of the callout for the persona card. See the associated wiki page for design details:
 * https://mseng.visualstudio.com/VSOnline/_wiki?pagePath=%2FWorking-with-the-React-Profile-Card
 */
export class PersonaCardContent extends React.Component<PersonaCardContentProps> {
    private _focusZone: IFocusZone;

    // Handle key event listener when mounting and unmounting
    public componentDidMount(): void {
        this._publishTelemetry(personaCardEntity.personaCard, personaCardEntity.loaded);
    }

    public componentDidUpdate(): void {
        const isVsdUser = Utils.isVsdUser(this.props.dataProps.identity);
        /*
        * Avoid set focus getting called multiple times, since the header element will set it after it mounts/updates
        * Also for default abridged card, set it only after focus zone ref is available
        */
        if (!(this.props.dataProps.header) && !(isVsdUser)) {
            this._focusOnUpdate();
        }
    }

    // Render
    public render(): JSX.Element {
        // Get target element
        const targetElement: HTMLElement | IPoint = this.props.referenceHTMLComponent
            ? this.props.referenceHTMLComponent
            : this.props.target;
        // Use component state information to render component
        return (
            <div>
                <Callout
                    onDismiss={this._onDismissCallout}
                    target={targetElement}
                    ariaLabel={Resources_Platform.ProfileCard_AriaLabel}
                    role={"alert"}
                    isBeakVisible={false}
                    gapSpace={10}
                    className={"persona-card-callout"}
                >
                    <div>
                        {this._renderCard()}
                    </div>
                </Callout>
            </div>
        );
    }

    private _renderCard(): JSX.Element {
        const cssClassName = "persona-card-styles";
        if (this.props.working && !Utils.isCompleteIdentity(this.props.dataProps.identity)) { // Still working to get initial data
            return <div className={css(cssClassName, "loading")}>
                <DelayedRender delay={300}>
                    <Spinner
                        label={Resources_Platform.Loading}
                        type={SpinnerType.large}
                        className={"persona-card-loading-spinner"} />
                </DelayedRender>
            </div>;
        }

        const isAdOrAad = Utils.isAdUser(this.props.dataProps.identity) || Utils.isAadUser(this.props.dataProps.identity);
        const headerIdentity: Identities_Picker_RestClient.IEntity = this.props.dataProps.header || null;
        const navigationDir: FocusZoneDirection = (this.props.dataProps.cardType === CardType.Organization) ? FocusZoneDirection.vertical : FocusZoneDirection.horizontal;

        return (
            <FocusZone className={cssClassName}
                handleTabKey={FocusZoneTabbableElements.all}
                isCircularNavigation={true}
                componentRef={this._onFocusZoneRef}
                direction={navigationDir}
            >
                {
                    isAdOrAad &&
                    headerIdentity &&
                    <HeaderElement
                        identity={headerIdentity}
                        onClickFunction={this.props.onHeaderClick}
                        setFocus={this._focusOnUpdate}
                    />
                }
                {this._renderInnerCard()}
            </FocusZone>
        );
    }

    @autobind
    private _onFocusZoneRef(focusZone: IFocusZone) {
        this._focusZone = focusZone;
        this._focusOnUpdate();
    }

    @autobind
    private _focusOnUpdate(): void {
        const directReport = this.props.dataProps.directReportList;
        const identity = this.props.dataProps.identity;
        const isAadUser = Utils.isAadUser(identity);
        const isAdUser = Utils.isAdUser(identity);
        const isVsdUser = Utils.isVsdUser(identity);

        // Setting the focus only if card is loaded completely for which case directreports is not null
        if (this.props.dataProps.cardType === CardType.Default && directReport) {
            this._focusZone.focus();
        } else if (this.props.dataProps.cardType !== CardType.Default) {
            this._focusZone.focus();
        }
    }

    private _renderInnerCard(): JSX.Element {
        // Get component state data
        const { identity, managerList, directReportList } = this.props.dataProps;

        if (!identity) {
            return null;
        }

        const isVsdUser = Utils.isVsdUser(identity);
        const isWmdUser = Utils.isWmdUser(identity);
        const isAadUser = Utils.isAadUser(identity);
        const isAdUser = Utils.isAdUser(identity);

        if (isVsdUser) {
            return <DefaultAbridgedCard
                identity={identity}
                publishTelemetry={this._publishTelemetry}
            />;
        } else if (isWmdUser) {
            return <DefaultSimpleCard
                identity={identity} />;
        } else if (isAadUser || isAdUser) {
            switch (this.props.dataProps.cardType) {
                case CardType.Default:
                    const manager = managerList && managerList.length > 0 ? managerList[managerList.length - 1] : null;
                    return <DefaultCard
                        identity={identity}
                        manager={manager}
                        isPreviousHeader={!!this.props.dataProps.previousDataState || !!this.props.initialHeader}
                        showContactCard={this.props.onShowContactCard}
                        showOrganizationCard={this.props.onShowOrganizationCard}
                        onClickEntity={this.props.onClickEntity}
                        publishTelemetry={this._publishTelemetry}
                        setFocus={this._focusOnUpdate}
                    />;
                case CardType.Contact:
                    return <ContactCard
                        identity={identity}
                        publishTelemetry={this._publishTelemetry}
                    />;
                case CardType.Organization:
                    return <OrganizationCard
                        identity={identity}
                        managerList={managerList}
                        directReportList={directReportList}
                        onClickEntity={this.props.onClickEntity}
                        publishTelemetry={this._publishTelemetry}
                    />;
            }
        }

        return null;
    }

    // State change helper methods
    @autobind
    private _onDismissCallout(): void {
        if (this.props.onDismissCallback) {
            this.props.onDismissCallback();
        }
    }

    // Publish telemetry for persona/contact/organization card loading
    @autobind
    private _publishTelemetry(componentType: string, action: string, source?: string): void {
        const routeId = getPageContext().navigation.routeId;

        const telemetryProperties: IDictionaryStringTo<any> = {
            "Action": Utils_String.format("{0}{1}", componentType, action),
        }

        if (this.props.consumer) {
            telemetryProperties["Consumer"] = this.props.consumer;
        }

        if (source) {
            telemetryProperties["Source"] = source;
        }

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            routeId,
            personaCardEntity.featureName,
            telemetryProperties)
        );
    }
}