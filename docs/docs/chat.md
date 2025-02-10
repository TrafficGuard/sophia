# AI Chat

TypedAI provides a chat interface like chatgpt.com or claude.ai.

## LLM selection

The LLM model selection can be changed over a conversation.

The model selection also allows selecting the composite implementations of the LLM interface such as multi-agent debate/review implementations or
fallbacks across multiple.

## Attachments

Images and PDF files can be attached to a message. However, it is required that the LLM selected supports all the file/image types
in the new and previous messages, otherwise an error will occur.

## Keyboard shortcuts

- **Ctrl - M**: Open the LLM model selection
- **Ctrl - A**: Add attachment
- **Ctrl - I**: Open/close the chat info/settings panel
- **Ctrl - E**: Toggle enter sends the message or adds a new line
<!--
- **Ctrl - C**: Toggle caching (Anthropic models only)
-->

## Screenshots

![Chats](https://public.trafficguard.ai/typedai/chat.png)
