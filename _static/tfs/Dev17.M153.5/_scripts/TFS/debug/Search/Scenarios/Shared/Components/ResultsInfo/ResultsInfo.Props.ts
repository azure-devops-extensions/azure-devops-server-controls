export interface IResultsInfoProps {
    infoMessage: string;

    mailToLink: string;

    isHosted: boolean;

    /**
    * Invoked upon link click
    */
    onFeedbackLinkInvoked?: () => void;
}