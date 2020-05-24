/**
 * Exception info
 */
export interface ExceptionInfo {
    exceptionMessage: string;
    additionalMessages?: string[];
    primaryLinkText?: string;
    primaryLinkHref?: string;
    secondaryLinkText?: string;
    secondaryLinkHref?: string;
    isSettingsException?: boolean;
}