/// <reference types="jquery" />

import Utils_String = require("VSS/Utils/String");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";

export class BoardGenerator {

    /**
     * Create the board root node based on the board settings
     * @param {any} boardSettings - Object containing the board settings on which the root node is built.
     * @returns {IBoardNode} - Returns the created board root node
     */
    public static createBoardRootNode(boardSettings: any): Boards.IBoardNodeMetadata {
        if (!boardSettings) {
            return null;
        }

        var boardColumns = boardSettings.columns.sort((column1, column2) => {
            return column1.order - column2.order;
        });

        var baseBoardMembers: Boards.IBoardMemberMetadata[] = [];

        boardColumns.forEach((column: Boards.IBoardColumn, index: number, columns: Boards.IBoardColumn[]) => {
            let layoutCssClass: string;
            let boardColumnType: string;
            let memberLimit: Boards.MemberLimit;
            let itemComparer: Boards.IFunctionReference;
            let childNode: Boards.IBoardNodeMetadata = null;

            switch (column.columnType) {
                case Boards.ColumnType.INCOMING:
                    layoutCssClass = "proposed";
                    boardColumnType = Boards.BoardColumnType.INCOMING;
                    itemComparer = this._getBoardMemberItemComparer(Boards.ColumnType.INCOMING, boardSettings);
                    break;

                case Boards.ColumnType.INPROGRESS:
                    layoutCssClass = "inprogress";
                    boardColumnType = Boards.BoardColumnType.INPROGRESS;
                    memberLimit = { limit: column.itemLimit };
                    itemComparer = this._getBoardMemberItemComparer(Boards.ColumnType.INPROGRESS, boardSettings);

                    if (column.isSplit) {
                        layoutCssClass += " split";

                        var doingDoneMembers: Boards.IBoardMemberMetadata[] = [
                            {
                                id: Utils_String.EmptyGuidString,
                                title: AgileControlsResources.ColumnDoingStateLabel,
                                values: ["false"],
                                canAddNewItemButton: false,
                                itemOrdering: itemComparer,
                                layoutOptions: {
                                    cssClass: "inprogress split-column"
                                },
                                handlesNull: true
                            },
                            {
                                id: Utils_String.EmptyGuidString,
                                title: AgileControlsResources.ColumnDoneStateLabel,
                                values: ["true"],
                                canAddNewItemButton: false,
                                itemOrdering: itemComparer,
                                layoutOptions: {
                                    cssClass: "inprogress split-column"
                                }
                            }];

                        childNode = {
                            fieldName: boardSettings.boardFields[Boards.BoardFieldType.DoneField],
                            layoutStyle: Boards.BoardNodeLayoutStyle.HORIZONTAL,
                            members: doingDoneMembers
                        };
                    }
                    break;

                case Boards.ColumnType.OUTGOING:
                    layoutCssClass = "complete";
                    boardColumnType = Boards.BoardColumnType.OUTGOING;
                    itemComparer = this._getBoardMemberItemComparer(Boards.ColumnType.OUTGOING, boardSettings);
                    break;

                default:
                    break;
            }

            baseBoardMembers.push({
                id: column.id ? column.id : Utils_String.EmptyGuidString,
                title: column.name,
                values: [column.name],
                canAddNewItemButton: BoardGenerator.canAddNewItemButton(boardColumnType),
                itemOrdering: itemComparer,
                layoutOptions: {
                    cssClass: layoutCssClass
                },
                childNode: childNode,
                limits: memberLimit,
                metadata: {
                    boardColumnType: boardColumnType
                },
                description: column.description
            });
        });

        return this._constructRootNode(baseBoardMembers, boardSettings);
    }

    public static canAddNewItemButton(boardColumnType: string): boolean {
        return boardColumnType === Boards.BoardColumnType.INCOMING && haveBacklogManagementPermission();
    }

    private static _getBoardMemberItemComparer(boardColumnType: Boards.BoardColumnType, boardSettings: Boards.IBoardSettings): Boards.IFunctionReference {
        var itemComparer: Boards.IFunctionReference = null;

        switch (boardColumnType) {
            case Boards.ColumnType.INCOMING:
            case Boards.ColumnType.INPROGRESS:
                itemComparer = {
                    id: "proposedInProgressItemComparer",
                    data: {
                        fields: {
                            orderField: boardSettings.sortableFieldsByColumnType[Boards.BoardColumnType.INPROGRESS.toLowerCase()]
                        }
                    }
                };
                break;
            case Boards.ColumnType.OUTGOING:
                itemComparer = {
                    id: "completedItemComparer",
                    data: {
                        fields: {
                            closedDateField: boardSettings.sortableFieldsByColumnType[Boards.BoardColumnType.OUTGOING.toLowerCase()]
                        }
                    }
                };
                break;
            default:
                break;
        }

        return itemComparer;
    }

    private static _constructRootNode(baseBoardMembers: Boards.IBoardMemberMetadata[], boardSettings: Boards.IBoardSettings): Boards.IBoardNodeMetadata {
        var inProgressMembers = baseBoardMembers.filter((member: Boards.IBoardMemberMetadata, index: number, members: Boards.IBoardMemberMetadata[]) => {
            return Utils_String.ignoreCaseComparer(member.metadata.boardColumnType, Boards.BoardColumnType.INPROGRESS) === 0;
        });

        if (inProgressMembers && inProgressMembers.length > 0
            && boardSettings.rows && boardSettings.rows.length > 1) {

            var inProgressColumnNames: string[] = [];

            inProgressMembers.forEach((member: Boards.IBoardMemberMetadata, index: number, members: Boards.IBoardMemberMetadata[]) => {
                inProgressColumnNames.push(member.values[0]);
            });

            var swimLaneChildNode: Boards.IBoardNodeMetadata = {
                fieldName: boardSettings.boardFields[Boards.BoardFieldType.ColumnField],
                layoutStyle: Boards.BoardNodeLayoutStyle.HORIZONTAL,
                members: inProgressMembers
            }

            var swimlaneMembers: Boards.IBoardMemberMetadata[] = [];
            boardSettings.rows.forEach((row: Boards.IBoardRow, index: number, rows: Boards.IBoardRow[]) => {
                swimlaneMembers.push({
                    id: row.id ? row.id : Utils_String.EmptyGuidString,
                    title: row.name,
                    values: [row.name],
                    canAddNewItemButton: false,
                    childNode: swimLaneChildNode,
                    layoutOptions: {
                        cssClass: "swimlane"
                    },
                    itemOrdering: null,
                    handlesNull: Utils_String.isEmptyGuid(row.id)
                });
            });

            var swimlanesChildNode: Boards.IBoardNodeMetadata = {
                fieldName: boardSettings.boardFields[Boards.BoardFieldType.RowField],
                layoutStyle: Boards.BoardNodeLayoutStyle.VERTICAL,
                members: swimlaneMembers
            }

            var swimlanesBoardMember: Boards.IBoardMemberMetadata = {
                id: Utils_String.EmptyGuidString, // This informs that there is a swimlane node
                title: inProgressColumnNames[0],
                values: inProgressColumnNames,
                canAddNewItemButton: false,
                layoutOptions: {
                    cssClass: "swimlanes"
                },
                itemOrdering: null,
                childNode: swimlanesChildNode,
                metadata: {
                    boardColumnType: Boards.BoardColumnType.INPROGRESS
                }
            }

            var members: Boards.IBoardMemberMetadata[] = [baseBoardMembers[0]];
            members.push(swimlanesBoardMember);
            members.push(baseBoardMembers[baseBoardMembers.length - 1]);

            return {
                fieldName: boardSettings.boardFields[Boards.BoardFieldType.ColumnField],
                layoutStyle: Boards.BoardNodeLayoutStyle.HORIZONTAL,
                members: members
            }
        } else {
            return {
                fieldName: boardSettings.boardFields[Boards.BoardFieldType.ColumnField],
                layoutStyle: Boards.BoardNodeLayoutStyle.HORIZONTAL,
                members: baseBoardMembers
            }
        }
    }
}
