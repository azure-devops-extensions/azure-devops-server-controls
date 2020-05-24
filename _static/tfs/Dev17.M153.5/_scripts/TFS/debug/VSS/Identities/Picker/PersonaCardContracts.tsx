import * as Component_Base from "VSS/Flux/Component";
import * as Picker_Controls from "VSS/Identities/Picker/Controls";
import { HeaderElementProps } from "VSS/Identities/Picker/PersonaCardHeaderElement";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import { IPoint } from "VSS/Identities/Picker/Common";

export enum CardType { Default, Contact, Organization };

export interface IDataState {
    header: Identities_Picker_RestClient.IEntity;
    identity: Identities_Picker_RestClient.IEntity;
    managerList: Identities_Picker_RestClient.IEntity[];
    directReportList: Identities_Picker_RestClient.IEntity[];
    previousDataState: IDataState;
    cardType: CardType;
    displayName: string;
    imageUrl: string;
    email: string;
    source?: string;
}

export namespace personaCardEntity {
    export const contactCard = "ContactCard";
    export const clicked = "Clicked";
    export const featureName = "PersonaCard";
    export const loaded = "Loaded";
    export const orgCard = "OrgCard";
    export const orgCardManagerChain = "OrgCardManagerChain";
    export const orgCardDirectReport = "OrgCardDirectReport";
    export const personaCard = "PersonaCard";
    export const reportingManager = "ReportingManager";
}

/*
 * Definitions for PersonaCard.
 */
export interface PersonaCardProps extends Component_Base.Props {
    /*
    * (Optional) Initial identity object, if available.
    */
    identity?: Identities_Picker_RestClient.IEntity;

    /*
    * (Optional) Unique attribute (entityID or signInAddress or uniqueName) to get identity object (if no identity available).
    */
    uniqueAttribute?: string;

    /*
    * Consumer id passed from the caller of the persona card and passed into the identity call.
    */
    consumerId: string;

    /*
    * EntityOperationsFacade for getting identity call (required).
    */
    entityOperationsFacade: Picker_Controls.EntityOperationsFacade;

    /*
    * (Optional) Initial header props to use if content is hosted inside an external component
    */
    initialHeader?: HeaderElementProps;

    /*
    * (Optional) Display name, if passed, in will be used to display when identity service fails to fetch the identity
    */
    displayName?: string;

    /*
    * (Optional) Image url, if passed, in will be used to display when identity service fails to fetch the identity
    */
    imageUrl?: string;

    /*
    * (Optional) Reference HTML component.
    * @deprecated use target instead
    */
    referenceHTMLComponent?: HTMLElement;

    /*
    * (Optional) The target that the PersonCard should try to position itself based on.
    * Can be an HTMLElement or a point object with the X and Y coordinates set
    */
    target?: HTMLElement | IPoint;

    /*
    * (Optional) Callback when card is dismissed.
    */
    onDismissCallback?: () => void;

    /*
    * Telemetry property to be logged specifying consumer of persona card
    */
    consumer?: string;
}