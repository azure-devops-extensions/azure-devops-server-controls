import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";

export class HistorySourcesHub {
	public historyCommitsSource: HistoryCommitsSource;
	public permissionsSource: GitPermissionsSource;
}
