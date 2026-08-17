export enum ChatErrorCode {
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND',
  NOT_CHAT_MEMBER = 'NOT_CHAT_MEMBER',
  INVALID_CHAT_TYPE = 'INVALID_CHAT_TYPE',
}

export const ChatErrorMessages: Record<ChatErrorCode, string> = {
  [ChatErrorCode.CHAT_NOT_FOUND]: 'Chat not found',
  [ChatErrorCode.NOT_CHAT_MEMBER]: 'You are not a member of this chat',
  [ChatErrorCode.INVALID_CHAT_TYPE]: 'Invalid chat type',
};
